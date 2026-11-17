import { useState } from 'react'
import { getLang, useI18n } from '@/lib/i18n'
import { toast, toastErr } from '@/lib/ui'
import { APP_VERSION, RELEASES, pick, type ReleaseKind } from '@/lib/releases'
import { Ic } from './Icon'

/* Release Notes — numéro de version, bouton de mise à jour, puis le journal de toutes les modifications
   (ajouté / modifié / corrigé). Les données viennent de `lib/releases.ts`. */

const KIND_KEY: Record<ReleaseKind, string> = { added: 'rn.added', changed: 'rn.changed', fixed: 'rn.fixed' }
const KIND_ICON: Record<ReleaseKind, string> = { added: 'plus', changed: 'edit', fixed: 'check' }
const KIND_ORDER: ReleaseKind[] = ['added', 'changed', 'fixed']

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Cherche une nouvelle version du service worker (PWA) ; recharge si elle est installée. */
async function checkForUpdate(): Promise<'updated' | 'current'> {
  const reg = await navigator.serviceWorker?.getRegistration()
  if (!reg) return 'current'
  await reg.update()
  const incoming = reg.installing || reg.waiting
  if (!incoming) return 'current'
  await new Promise<void>((resolve) => {
    const done = () => { if (incoming.state === 'activated' || incoming.state === 'installed') resolve() }
    incoming.addEventListener('statechange', done)
    done()
    setTimeout(resolve, 15000)
  })
  return 'updated'
}

export function ReleaseNotes() {
  const { t } = useI18n()
  const lang = getLang()
  const [busy, setBusy] = useState(false)

  async function onCheck() {
    if (busy) return
    setBusy(true)
    try {
      const r = await checkForUpdate()
      if (r === 'updated') { toast(t('rn.updating')); setTimeout(() => location.reload(), 600) }
      else toast(t('rn.upToDate'))
    } catch {
      toastErr(t('rn.updateFail'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rn">
      <div className="card rn-hero">
        <div className="rn-hero-main">
          <div className="rn-label">{t('rn.current')}</div>
          <div className="rn-version">v{APP_VERSION}</div>
          <p className="rn-intro">{t('rn.intro')}</p>
        </div>
        <button type="button" className="btn primary" onClick={onCheck} disabled={busy}>
          <Ic name="refresh" s={16} /> {busy ? t('rn.checking') : t('rn.check')}
        </button>
      </div>

      <ol className="rn-list">
        {RELEASES.map((r, i) => (
          <li key={r.version} className="card rn-release">
            <header className="rn-head">
              <span className="rn-badge">v{r.version}</span>
              {i === 0 && <span className="rn-latest">{t('rn.latest')}</span>}
              <time className="rn-date" dateTime={r.date}>{formatDate(r.date, lang)}</time>
            </header>
            <h2 className="rn-title">{pick(r.title, lang)}</h2>
            {KIND_ORDER.map((kind) => {
              const items = r.items.filter((it) => it.kind === kind)
              if (!items.length) return null
              return (
                <section key={kind} className="rn-group">
                  <h3 className={'rn-kind ' + kind}><Ic name={KIND_ICON[kind]} s={14} /> {t(KIND_KEY[kind])}</h3>
                  <ul>
                    {items.map((it, k) => (
                      <li key={k}>
                        <span>{pick(it.text, lang)}</span>
                        {it.on && <span className="rn-target">{t(it.on === 'web' ? 'rn.web' : 'rn.mobile')}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </li>
        ))}
      </ol>
    </div>
  )
}
