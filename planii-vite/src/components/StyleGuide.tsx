import { useState } from 'react'
import { applyTheme, getTheme, type Theme } from '@/lib/theme'

/* Guide de style vivant du Design System Planii.
   Lit les valeurs CSS réelles → toujours synchronisé avec le code.
   Accessible sur /style-guide (ou #/style-guide), sans authentification. */

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 id={id} style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 14px', paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>{title}</h2>
      {children}
    </section>
  )
}

function Swatch({ v, label, tick }: { v: string; label: string; tick: number }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
      <div style={{ height: 60, background: cssVar(v) }} />
      <div style={{ padding: '9px 11px' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{v.replace('--', '')} · {cssVar(v) || '—'}</div>
      </div>
      {/* tick force un re-render au changement de thème */}
      <span style={{ display: 'none' }}>{tick}</span>
    </div>
  )
}

const NEUTRAL: [string, string][] = [['--bg', 'Fond'], ['--surface', 'Surface'], ['--surface-2', 'Surface 2'], ['--line', 'Ligne'], ['--line-strong', 'Ligne forte'], ['--text', 'Texte'], ['--muted', 'Discret'], ['--hint', 'Indice']]
const ACCENT: [string, string][] = [['--accent', 'Accent'], ['--accent-bg', 'Accent fond'], ['--accent-2', 'Accent clair']]
const SEMANTIC: [string, string][] = [['--danger', 'Danger'], ['--danger-bg', 'Danger fond'], ['--warn', 'Attention'], ['--warn-bg', 'Attention fond'], ['--ok', 'Succès'], ['--ok-bg', 'Succès fond'], ['--blue', 'Info'], ['--blue-bg', 'Info fond'], ['--gold', 'Or']]
const SPACE = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-8', '--space-10', '--space-12']
const RADII: [string, string][] = [['--radius-sm', 'sm'], ['--radius-md', 'md'], ['--radius-lg', 'lg'], ['--radius-xl', 'xl'], ['--radius-pill', 'pill']]
const TYPE: [string, string][] = [['--text-3xl', 'Titre de page'], ['--text-2xl', 'Statistique'], ['--text-xl', 'Titre section'], ['--text-lg', 'Titre carte'], ['--text-md', 'Corps'], ['--text-base', 'Champ'], ['--text-sm', 'Sous-texte'], ['--text-xs', 'Micro']]
const SHADOWS: [string, string][] = [['--shadow-sm', 'sm'], ['--shadow-md', 'md'], ['--shadow-lg', 'lg']]

export function StyleGuide() {
  const [theme, setTheme] = useState<Theme>(getTheme())
  const [tick, setTick] = useState(0)
  const setT = (t: Theme) => { setTheme(t); applyTheme(t); setTick((k) => k + 1) }

  const grid = (min: number): React.CSSProperties => ({ display: 'grid', gap: 12, gridTemplateColumns: `repeat(auto-fill,minmax(${min}px,1fr))` })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 22px 90px' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 24 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
              <b style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff', boxShadow: '10px 0 0 rgba(255,255,255,.55)', display: 'block' }} />
            </span>
            Planii <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Design System</span>
          </div>
          <div className="theme-seg" style={{ maxWidth: 260 }}>
            {(['light', 'dark', 'auto'] as Theme[]).map((t) => (
              <button key={t} className={theme === t ? 'on' : ''} onClick={() => setT(t)}>
                <span className="ti">{t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🖥️'}</span>{t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Auto'}
              </button>
            ))}
          </div>
        </header>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 8px' }}>Source de vérité vivante — les valeurs ci-dessous sont lues directement depuis le CSS. Bascule le thème pour comparer clair / sombre.</p>

        <Section id="couleurs" title="Couleurs">
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '16px 0 10px' }}>Neutres &amp; surfaces</h3>
          <div style={grid(150)}>{NEUTRAL.map(([v, l]) => <Swatch key={v} v={v} label={l} tick={tick} />)}</div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px' }}>Accent (violet — couleur principale)</h3>
          <div style={grid(150)}>{ACCENT.map(([v, l]) => <Swatch key={v} v={v} label={l} tick={tick} />)}</div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px' }}>Sémantiques (états)</h3>
          <div style={grid(150)}>{SEMANTIC.map(([v, l]) => <Swatch key={v} v={v} label={l} tick={tick} />)}</div>
        </Section>

        <Section id="typo" title="Typographie">
          <div className="card">
            {TYPE.map(([v, l]) => (
              <div key={v} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ width: 130, color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{v.replace('--text-', '')} · {cssVar(v)}</span>
                <span style={{ fontSize: `var(${v})`, fontWeight: v === '--text-3xl' || v === '--text-2xl' ? 800 : v === '--text-lg' ? 600 : 400 }}>{l}</span>
              </div>
            ))}
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0' }}>Police système · interlignage 1.5 · graisses 400 / 600 / 700 / 800.</p>
          </div>
        </Section>

        <Section id="espace" title="Espacement (base 4px)">
          <div className="card">
            {SPACE.map((v) => (
              <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '5px 0' }}>
                <span style={{ width: 90, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{v.replace('--', '')} · {cssVar(v)}</span>
                <span style={{ height: 16, width: `var(${v})`, background: 'var(--accent)', borderRadius: 3 }} />
              </div>
            ))}
          </div>
        </Section>

        <Section id="rayons" title="Rayons">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {RADII.map(([v, l]) => (
              <div key={v} style={{ textAlign: 'center' }}>
                <div style={{ width: 76, height: 76, background: 'var(--accent-bg)', border: '2px solid var(--accent)', borderRadius: `var(${v})` }} />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{l} · {cssVar(v)}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="ombres" title="Élévation">
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {SHADOWS.map(([v, l]) => (
              <div key={v} style={{ textAlign: 'center' }}>
                <div style={{ width: 120, height: 76, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: `var(${v})` }} />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>shadow-{l}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="mouvement" title="Mouvement">
          <div className="card" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)', lineHeight: 2 }}>
            --dur-fast : {cssVar('--dur-fast')} &nbsp;·&nbsp; --dur-base : {cssVar('--dur-base')} &nbsp;·&nbsp; --dur-slow : {cssVar('--dur-slow')}<br />
            --ease-out &nbsp;·&nbsp; --ease-in-out &nbsp;|&nbsp; respecte <code>prefers-reduced-motion</code>
          </div>
        </Section>

        <Section id="composants" title="Composants">
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 10px' }}>Boutons</h3>
          <div className="card">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn primary">Principal</button>
              <button className="btn">Secondaire</button>
              <button className="btn ghost">Fantôme</button>
              <button className="btn danger">Danger</button>
              <button className="btn primary" disabled>Désactivé</button>
              <button className="btn sm primary">Petit</button>
              <button className="btn-link">Lien</button>
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px' }}>Pastilles, chips &amp; priorités</h3>
          <div className="card">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="pill acc">Accent</span><span className="pill ok">Terminé</span><span className="pill warn">Attention</span><span className="pill danger">En retard</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="chip tt-a">Chef de projet</span><span className="chip tt-b">Développeur</span><span className="chip tt-c">Consultant</span><span className="chip">Neutre</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6].map((n) => <span key={n} className={'pflag pf' + n}>P{n}</span>)}
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px' }}>Champs, onglets &amp; stats</h3>
          <div className="card">
            <div className="field"><label>Intitulé</label><input placeholder="Ex. Envoyer les visuels" /></div>
            <div className="tabs" style={{ display: 'inline-flex', marginBottom: 16 }}>
              <button className="on">Tâches</button><button>Équipe</button><button>Activité</button>
            </div>
            <div style={grid(150)}>
              <div className="stat-card"><div className="stat-ico">👤</div><div className="stat-val">8</div><div className="stat-lbl">Utilisateurs</div></div>
              <div className="stat-card"><div className="stat-ico">📁</div><div className="stat-val">21</div><div className="stat-lbl">Projets</div></div>
              <div className="stat-card"><div className="stat-ico">🎯</div><div className="stat-val">25%</div><div className="stat-lbl">Terminées</div></div>
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px' }}>Divers</h3>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="avatar">BL</span>
                <div><div style={{ fontWeight: 600 }}>Berton Lutina</div><div className="sub">Avatar — initiales sur accent pâle</div></div>
              </div>
              <div className="mini-bar"><i style={{ width: '62%', background: 'var(--accent)' }} /></div>
            </div>
            <div className="banner">💡 Bannière d'information — fond accent pâle, bordure accent.</div>
          </div>
        </Section>

        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 40, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          Généré depuis <code style={{ fontFamily: 'var(--font-mono)' }}>planii-vite/src/index.css</code>. Export machine : <code style={{ fontFamily: 'var(--font-mono)' }}>design-tokens.json</code> (format W3C, importable dans Figma).
        </p>
      </div>
    </div>
  )
}
