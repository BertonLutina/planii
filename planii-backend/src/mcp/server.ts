import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { env } from '../config/env'
import type { McpPrincipal } from '../oauth/oauth.service'
import { registerTool } from './tooling'
import { allTools } from './tools'

const INSTRUCTIONS = `Planii est une plateforme de projets partagés (clients, prestataires, équipes, groupes). Tu agis au nom de l'utilisateur connecté, avec exactement ses droits : si Planii refuse une action, explique-le simplement.
- Les dates s'écrivent AAAA-MM-JJ, les heures HH:MM (24 h). Calcule « demain », « vendredi », etc. à partir de la date du jour.
- Priorité : 1 = la plus urgente, 6 = la moins urgente.
- Pour assigner une tâche ou inviter à un rendez-vous, il faut des ids de membres : utilise planii_get_me (moi) ou planii_get_project (équipe).
- Les statuts d'un projet (todo, in_progress, review, done…) sont listés par planii_get_project.
- Les suppressions sont irréversibles : demande toujours l'accord explicite de l'utilisateur avant confirm=true.
- Les listes sont paginées ; ne charge pas tout si une page suffit.`

/** Un serveur MCP par requête (mode sans état) : les outils sont liés à l'utilisateur et à ses permissions. */
export function createMcpServer(p: McpPrincipal) {
  const server = new McpServer(
    {
      name: 'planii',
      title: 'Planii',
      version: '1.0.0',
      websiteUrl: env.webUrl,
      icons: [
        { src: `${env.apiUrl}/icon.png`, mimeType: 'image/png', sizes: ['512x512'] },
        { src: `${env.apiUrl}/icon-192.png`, mimeType: 'image/png', sizes: ['192x192'] },
      ],
    },
    { instructions: INSTRUCTIONS },
  )
  for (const d of allTools) registerTool(server, p, d)
  return server
}
