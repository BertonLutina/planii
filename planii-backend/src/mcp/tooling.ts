import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ZodRawShape } from 'zod'
import { HttpError } from '../core/http-error'
import { logger } from '../logger'
import { type McpPrincipal, type Scope, writeAudit } from '../oauth/oauth.service'

/** Définition déclarative d'un outil MCP : ajouter un outil = ajouter un objet, sans toucher au reste. */
export type ToolDef<S extends ZodRawShape = ZodRawShape> = {
  name: string
  title: string
  description: string
  /** Scope OAuth requis. read = lecture, write = création/modification, delete = suppression. */
  scope: Scope
  input: S
  /** Courte description de la cible pour l'historique (jamais de données sensibles en plus). */
  summarize?: (args: Record<string, unknown>) => string
  handler: (args: Record<string, unknown>, p: McpPrincipal) => Promise<Record<string, unknown>>
}

export const tool = <S extends ZodRawShape>(d: ToolDef<S>) => d as unknown as ToolDef

/* Limites de consommation par connexion (en mémoire : suffisant pour une instance ; à externaliser si on scale). */
const WINDOW_MS = 60_000
const LIMITS = { read: 120, write: 40 }
const hits = new Map<string, number[]>()

export function rateLimited(connectionId: string, write: boolean): boolean {
  const key = connectionId + (write ? ':w' : ':r')
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS)
  if (arr.length >= (write ? LIMITS.write : LIMITS.read)) { hits.set(key, arr); return true }
  arr.push(now)
  hits.set(key, arr)
  return false
}
export const _resetRateLimits = () => hits.clear()

const textResult = (data: Record<string, unknown>, isError = false) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }],
  ...(isError ? { isError: true } : { structuredContent: data }),
})

const errorResult = (message: string) => textResult({ error: message }, true)

export function registerTool(server: McpServer, p: McpPrincipal, d: ToolDef) {
  const write = d.scope !== 'planii:read'
  const readOnly = d.scope === 'planii:read'
  ;(server as unknown as { registerTool: (...a: unknown[]) => unknown }).registerTool(
    d.name,
    {
      title: d.title,
      description: d.description,
      inputSchema: d.input,
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint: d.scope === 'planii:delete',
        idempotentHint: readOnly,
        openWorldHint: false,
      },
    },
    async (args: Record<string, unknown>) => {
      const summary = d.summarize ? d.summarize(args) : ''
      if (!p.scopes.includes(d.scope)) {
        await writeAudit(p, d.name, write, false, `refusé : permission ${d.scope} non accordée`)
        return errorResult(`Permission refusée : cette action demande l’autorisation « ${d.scope} », que l’utilisateur n’a pas accordée à cette application. Il peut la reconnecter dans Planii (Profil → Assistants IA).`)
      }
      if (rateLimited(p.connectionId, write)) {
        await writeAudit(p, d.name, write, false, 'refusé : trop d’appels')
        return errorResult('Trop d’appels en peu de temps. Attendez une minute avant de réessayer.')
      }
      try {
        const out = await d.handler(args, p)
        if (write) await writeAudit(p, d.name, true, true, summary)
        else await writeAudit(p, d.name, false, true, summary)
        return textResult(out)
      } catch (e) {
        if (e instanceof HttpError) {
          await writeAudit(p, d.name, write, false, `${e.status} ${e.message}`)
          return errorResult(e.message)
        }
        logger.error({ err: e, tool: d.name }, 'Erreur outil MCP')
        await writeAudit(p, d.name, write, false, 'erreur serveur')
        return errorResult('Erreur interne de Planii. Réessayez plus tard.')
      }
    },
  )
}
