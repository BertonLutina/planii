import { useState } from 'react'
import { applyTheme, effectiveTheme, getTheme } from '@/lib/theme'
import '@/landing.css'

/**
 * Page d'accueil publique. Affichée tant que le visiteur n'est pas connecté.
 * `onLogin` → écran de connexion, `onStart` → écran d'inscription.
 * Le thème réutilise applyTheme() : la landing et l'app restent synchronisées.
 */
export function Landing({ onLogin, onStart }: { onLogin: () => void; onStart: () => void }) {
  const [dark, setDark] = useState(() => effectiveTheme(getTheme()) === 'dark')
  const flip = () => { const next = dark ? 'light' : 'dark'; applyTheme(next); setDark(next === 'dark') }

  return (
    <div className="lp">
      {/* ============================ NAV ============================ */}
      <header className="lp-nav">
        <div className="lp-nav-in">
          <button className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Planii">
            <Logo id="nav" /><span>Planii</span>
          </button>
          <nav className="lp-links">
            <a href="#plateforme">Plateforme</a>
            <a href="#fonctions">Fonctionnalités</a>
            <a href="#assistants-ia">Assistants IA</a>
            <a href="#mobile">Mobile</a>
            <a href="#classement">Classement</a>
          </nav>
          <div className="lp-act">
            <button className="lp-tbtn" onClick={flip} aria-label="Changer de thème" title="Changer de thème">
              {dark
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
            </button>
            <button className="lp-login" onClick={onLogin}>Se connecter</button>
            <button className="lp-btn pri sm" onClick={onStart}>Commencer gratuitement</button>
          </div>
        </div>
      </header>

      {/* ============================ HÉROS ============================ */}
      <section className="lp-hero">
        <div className="lp-glow"><i className="a" /><i className="b" /><i className="c" /></div>

        <div className="lp-w lp-head">
          <span className="lp-eyebrow"><i />Temps réel · Web, iOS et Android<b>→</b></span>
          <h1>Vos projets avancent. <em>Vous gardez la main.</em></h1>
          <p className="lp-lead">
            Planii réunit vos projets partagés, vos tâches, votre agenda et vos réunions dans un seul espace
            de travail. Chaque échéance suivie, chaque décision tracée, chaque équipe alignée.
          </p>
          <div className="lp-cta">
            <button className="lp-btn pri" onClick={onStart}>Commencer gratuitement →</button>
            <button className="lp-btn gho" onClick={onLogin}>J'ai déjà un compte</button>
          </div>
          <p className="lp-note"><b>Aucune carte bancaire</b><i /><b>Forfait gratuit illimité</b><i /><b>Données hébergées en Europe</b></p>
        </div>

        {/* collage de maquettes */}
        <div className="lp-w lp-art">
          <div className="lp-collage">
            <div className="lp-col">
              <Mock title="Accueil">
                <div className="lp-hello">Bonjour, Alice</div>
                <div className="lp-hello-sub">5 points à surveiller maintenant.</div>
                <div className="lp-day">
                  <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden="true">
                    <circle cx="31" cy="31" r="26" fill="none" stroke="var(--lp-line2)" strokeWidth="6" />
                    <circle cx="31" cy="31" r="26" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray="163" strokeDashoffset="109" transform="rotate(-90 31 31)" />
                    <text x="31" y="35" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--lp-text)">1/3</text>
                  </svg>
                  <div className="lp-day-t">
                    <small>Ta journée</small>
                    <b>Envoyer le devis au client</b>
                    <span>Refonte du site · <em>en retard de 2 j</em></span>
                    <i className="lp-minibtn">✓ Terminer</i>
                  </div>
                </div>
                <div className="lp-kpis">
                  <div className="dg"><span>En retard</span><b>1</b></div>
                  <div><span>Aujourd'hui</span><b>1</b></div>
                  <div><span>Priorités</span><b>3</b></div>
                </div>
              </Mock>

              <Mock title="Refonte du site — tâches">
                <div className="lp-gh"><i style={{ background: 'var(--hint)' }} />À faire<em>2</em></div>
                <TaskLine title="Relire le contrat" sub="Travail" p="p3" due="26 nov." />
                <TaskLine title="Réserver la salle" sub="Travail" p="p4" due="29 nov." />
                <div className="lp-gh" style={{ marginTop: 14 }}><i style={{ background: 'var(--blue)' }} />En cours<em>2</em></div>
                <TaskLine title="Envoyer le devis au client" sub="Travail · 2 commentaires" p="p1" due="en retard de 2 j" late />
                <TaskLine title="Préparer la maquette d'accueil" sub="Bug" p="p2" due="dans 3 j" />
              </Mock>
            </div>

            <div className="lp-col">
              <Mock title="Mon score">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--lp-hint)', fontWeight: 600 }}>Mon score</div>
                    <div className="lp-n" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.045em', marginTop: 3 }}>
                      1 240 <span style={{ fontSize: 14, color: 'var(--lp-hint)', fontWeight: 600 }}>pts</span>
                    </div>
                  </div>
                  <span className="lp-pill ac">Niveau 7</span>
                </div>
                <div className="lp-bar" style={{ marginTop: 16 }}><i style={{ width: '68%' }} /></div>
                <div style={{ fontSize: 12, color: 'var(--lp-hint)', marginTop: 10 }}>Plus que 160 pts pour le niveau 8</div>
              </Mock>

              <Mock title="Agenda — mars">
                <MonthGrid />
                <div className="lp-r" style={{ marginTop: 14 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-2)', flex: 'none' }} />
                  <span className="lp-t">Point hebdo client — 11 h 00</span>
                </div>
              </Mock>

              <Mock title="Meeting — Refonte site">
                <div style={{ display: 'flex', gap: 9 }}>
                  <div style={{ flex: 1, aspectRatio: '16/10', borderRadius: 12, background: 'var(--lp-acc-bg)', border: '1px solid var(--lp-line)', display: 'grid', placeItems: 'center' }}>
                    <span className="lp-a" style={{ width: 34, height: 34, fontSize: 12 }}>AM</span>
                  </div>
                  <div style={{ flex: 1, aspectRatio: '16/10', borderRadius: 12, background: 'var(--lp-ok-bg)', border: '1px solid var(--lp-line)', display: 'grid', placeItems: 'center' }}>
                    <span className="lp-a ok" style={{ width: 34, height: 34, fontSize: 12 }}>LK</span>
                  </div>
                </div>
                <div className="lp-r" style={{ marginTop: 11 }}>
                  <span className="lp-pill ac">＋</span><span className="lp-t">Créer une tâche depuis le meeting</span>
                </div>
              </Mock>
            </div>
          </div>
        </div>
      </section>

      {/* =============== VISUEL « TABLEAU DE PROJET » (sous le collage) =============== */}
      <section className="lp-w lp-boardsec">
        <div className="lp-boardhead">
          <span className="lp-kicker">Le projet en entier, d'un seul coup d'œil</span>
          <h3>Les tâches, l'équipe et ce qui vient de se passer.</h3>
          <p>Le tableau montre l'état réel du projet ; les cartes qui en sortent racontent la dernière action.</p>
        </div>
        <ProjectBoard />
      </section>

      {/* ============================ BANDEAU ============================ */}
      <div className="lp-band">
        <div className="lp-w lp-band-in">
          <span>Conçu pour les équipes qui livrent</span>
          <div className="lp-stats">
            {[['3', 'types de projets'], ['6', 'niveaux de priorité'], ['4', 'vues de travail'], ['0 €', 'pour démarrer']].map(([n, l]) => (
              <div key={l}><b>{n}</b><span>{l}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================ TYPES DE PROJETS ============================ */}
      <section className="lp-sec" id="plateforme">
        <div className="lp-w">
          <div className="lp-sh">
            <span className="lp-kicker">Une plateforme, tous vos modes de travail</span>
            <h2>Un espace qui s'adapte à chaque relation de travail</h2>
            <p>
              Que vous pilotiez un client unique, une équipe de prestataires ou un collectif, Planii vous donne
              la bonne structure dès la création du projet — avec les rôles, les droits et les invitations qui vont avec.
            </p>
          </div>
          <div className="lp-types">
            <Type tone="acc" title="1-à-1" desc="Un client, un prestataire. La relation la plus simple, avec un fil de tâches clair et un historique complet."
              items={["Lien d'invitation à usage unique", 'Validation des livrables', 'Historique de chaque échange']}
              icon={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />
            <Type tone="bl" title="Équipe" desc="Un client, plusieurs prestataires, un chef de projet. Chacun voit ce qui le concerne, vous voyez l'ensemble."
              items={['Rôles réutilisables et personnalisés', 'Transfert de tâches entre membres', 'Relances automatiques sur les retards']}
              icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>} />
            <Type tone="ok" title="Groupe" desc="Communauté, association, famille. Tout le monde propose, tout le monde vote, personne ne perd le fil."
              items={['Sondages intégrés', 'Tâches « à prendre »', "Journal d'activité partagé"]}
              icon={<><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>} />
          </div>
        </div>
      </section>

      {/* ============================ FONCTIONNALITÉS ============================ */}
      <section className="lp-sec" id="fonctions" style={{ paddingTop: 0 }}>
        <div className="lp-w">
          <div className="lp-frow" style={{ marginTop: 0 }}>
            <div className="lp-ftxt">
              <span className="lp-kicker">Tâches &amp; priorités</span>
              <h3>Six niveaux de priorité. Zéro ambiguïté.</h3>
              <p>De P1 (critique) à P6 (quand il y aura le temps), chaque tâche porte son niveau, son échéance, son responsable et ses heures estimées. La couleur n'est jamais seule : le niveau est toujours écrit.</p>
              <FList items={[
                ['Sous-tâches et dépendances', 'découpez sans perdre le lien avec la tâche mère.'],
                ['Statuts personnalisables', 'à faire, en cours, en revue, transféré, terminé.'],
                ['Heures estimées et passées', "l'écart est visible avant qu'il devienne un problème."],
                ['Transfert de tâche', 'le parcours complet reste tracé, du premier au dernier responsable.'],
              ]} />
            </div>
            <Mock title="Détail de tâche">
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.028em' }}>Livrer la maquette du site vitrine</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 13, flexWrap: 'wrap' }}>
                <span className="lp-p p1">P1 — la plus urgente</span>
                <span className="lp-pill ac">En cours</span>
                <span className="lp-pill wn">Échéance demain</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                <div className="lp-r"><span className="lp-a">AM</span><span className="lp-t">Amina M. — responsable</span></div>
                <div className="lp-r"><span className="lp-t lp-n">12 h estimées · 8 h passées</span></div>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.11em', textTransform: 'uppercase', color: 'var(--lp-hint)', margin: '22px 0 11px' }}>Sous-tâches</div>
              <Row title="Wireframes desktop" done />
              <Row title="Palette et typographie" done />
              <Row title="Écrans mobiles" p="p2" />
              <div className="lp-bar" style={{ marginTop: 18 }}><i style={{ width: '66%' }} /></div>
              <div style={{ fontSize: 12, color: 'var(--lp-hint)', marginTop: 9 }}>2 sous-tâches sur 3 terminées</div>
            </Mock>
          </div>

          <div className="lp-frow rev">
            <Mock title="Agenda — semaine"><WeekGrid /></Mock>
            <div className="lp-ftxt">
              <span className="lp-kicker">Agenda &amp; rendez-vous</span>
              <h3>Toutes vos échéances, tous projets confondus.</h3>
              <p>Mois, semaine, agenda ou année : Planii réunit les dates de vos tâches et vos rendez-vous dans une seule vue. Créez un rendez-vous rattaché à un projet, sélectionnez les participants — ils sont prévenus par e-mail.</p>
              <FList items={[
                ['Quatre vues', 'mois, semaine, agenda, année.'],
                ['Rendez-vous par projet', 'créneau, description, participants.'],
                ['Notifications e-mail', 'création, modification, rappel la veille.'],
                ['Détection des retards', "les échéances dépassées remontent d'elles-mêmes."],
              ]} />
            </div>
          </div>

          <div className="lp-frow">
            <div className="lp-ftxt">
              <span className="lp-kicker">Réunions &amp; décisions</span>
              <h3>La réunion produit des tâches, pas des notes perdues.</h3>
              <p>Lancez une visioconférence depuis n'importe quel projet — tous les membres sont automatiquement invités. Le chat reste attaché au projet, et chaque message peut devenir une tâche assignée en un clic.</p>
              <FList items={[
                ['Visio intégrée', 'aucun logiciel à installer, aucun compte tiers.'],
                ['Chat persistant', 'la discussion reste dans le projet après la réunion.'],
                ['Message → tâche', 'avec titre, statut, responsable et priorité.'],
                ['Droits maîtrisés', 'le chef de projet choisit qui peut créer des tâches.'],
              ]} />
            </div>
            <Mock title="Discussion du meeting">
              <Msg who="Lucas K." av="ok" txt="Il faut relancer le fournisseur avant vendredi." />
              <Msg who="Sarah D." av="bl" txt="Je m'en charge — on cale la revue lundi ?" pill={<span className="lp-pill ok">✓ Tâche créée</span>} />
              <Msg who="Marc T." txt="Le budget est validé côté client." pill={<span className="lp-pill ac">＋ Créer tâche</span>} />
            </Mock>
          </div>
        </div>
      </section>

      {/* ============================ ASSISTANTS IA (MCP) ============================ */}
      <section className="lp-sec" id="assistants-ia" style={{ paddingTop: 0 }}>
        <div className="lp-w">
          <div className="lp-frow">
            <div className="lp-ftxt">
              <span className="lp-kicker">Assistants IA · connecteur MCP</span>
              <h3>Votre assistant IA travaille directement dans Planii.</h3>
              <p>Connectez Claude, ChatGPT, Gemini ou tout assistant compatible MCP à votre compte. Il consulte vos projets, crée et met à jour vos tâches, planifie vos rendez-vous — avec exactement vos droits, jamais plus. Idéal quand une équipe travaille avec ses agents : la tâche est terminée, l'assistant la coche et laisse un résumé que toute l'équipe voit.</p>
              <FList items={[
                ['Un seul connecteur', 'la même adresse pour tous les assistants, sans clé à copier.'],
                ['Vous gardez la main', 'lecture, écriture, suppression : vous cochez ce qui est autorisé.'],
                ['Révocable à tout moment', 'depuis le profil, sur le web comme sur mobile.'],
                ['Historique visible', 'chaque action de l’assistant est tracée.'],
              ]} />
              <p style={{ marginTop: 14 }}>
                <span className="lp-pill ac">Claude</span>{' '}<span className="lp-pill ac">ChatGPT</span>{' '}<span className="lp-pill ac">Gemini</span>{' '}<span className="lp-pill ac">+ tout client MCP</span>
              </p>
            </div>
            <Mock title="Dans votre assistant IA">
              <Msg who="Vous" txt="Quelles tâches dois-je terminer aujourd'hui ?" />
              <Msg who="Assistant IA" av="bl" txt="Trois tâches : « Relancer le fournisseur » (P1), « Rédiger les contenus » (P2) et « Valider le budget » (P3)." pill={<span className="lp-pill ac">Planii connecté</span>} />
              <Msg who="Vous" txt="Termine la première et note que c'est fait." />
              <Msg who="Assistant IA" av="bl" txt="C'est fait, et j'ai ajouté un commentaire pour l'équipe." pill={<span className="lp-pill ok">✓ Tâche terminée</span>} />
            </Mock>
          </div>
        </div>
      </section>

      {/* ============================ APP MOBILE ============================ */}
      <section className="lp-mob" id="mobile">
        <span className="halo" />
        <div className="lp-w lp-mgrid">
          <div>
            <span className="lp-kicker">Application mobile · iOS &amp; Android</span>
            <h2 style={{ fontSize: 39 }}>Planii tient dans votre poche.</h2>
            <p style={{ fontSize: 17, color: 'var(--lp-muted)', marginTop: 20, lineHeight: 1.68 }}>
              Une vraie application native, pas un site rétréci. Vos projets, vos tâches et vos rendez-vous vous
              suivent — et vous cochez une tâche entre deux rendez-vous, sans ouvrir l'ordinateur.
            </p>
            <FList items={[
              ['Dictée vocale native', 'créez une tâche en parlant, micro et reconnaissance système.'],
              ['Notifications push', 'échéance demain, tâche assignée, transfert reçu.'],
              ['Thème système', "l'app suit le réglage clair/sombre de l'appareil."],
              ['Pensée pour le pouce', 'navigation basse, bouton flottant, cibles tactiles de 44 pt minimum.'],
            ]} />
            <div className="lp-stores">
              <a className="lp-store" href="#"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--lp-text)' }}><path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.8-1.2 1.2-2.4 1.2-2.5-.1 0-2.3-.9-2.3-3.8zM14.2 5.9c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.6-1.3z" /></svg>
                <span style={{ textAlign: 'left' }}><span>Télécharger sur</span><b>App Store</b></span></a>
              <a className="lp-store" href="#"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 3.2v17.6c0 .5.5.8.9.6l9.3-5.4-2.6-2.6L4 3.2z" fill="#3ce0ab" /><path d="M4 3.2l7.6 10.2 2.6-2.6L4.9 2.6c-.4-.3-.9 0-.9.6z" fill="#5cb0ff" /><path d="M14.2 10.8l-2.6 2.6 2.6 2.6 3.6-2.1c.6-.3.6-1.1 0-1.4l-3.6-1.7z" fill="#ffc44d" /></svg>
                <span style={{ textAlign: 'left' }}><span>Disponible sur</span><b>Google Play</b></span></a>
            </div>
            <div className="lp-specs">
              <div><b>iOS 15+</b><span>iPhone &amp; iPad</span></div>
              <div><b>Android 8+</b><span>Téléphone &amp; tablette</span></div>
              <div><b>PWA</b><span>Installable depuis le web</span></div>
            </div>
          </div>
          <Phones />
        </div>
      </section>

      {/* ============================ GRILLE 6 ============================ */}
      <section className="lp-sec">
        <div className="lp-w">
          <div className="lp-sh">
            <span className="lp-kicker">Et tout ce qui fait gagner du temps</span>
            <h2>Les détails qui font qu'on reste</h2>
          </div>
          <div className="lp-g6">
            <Cell tone="acc" title="Dictée vocale" desc="Créez une tâche en parlant : intitulé, priorité, responsable. Planii vous guide question par question."
              icon={<><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></>} />
            <Cell tone="ok" title="Import Excel & Google Sheets" desc="Trois modes d'import — par cellule, par colonnes ou en vrac. Jusqu'à 500 tâches d'un coup."
              icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 15h6M9 11h3" /></>} />
            <Cell tone="bl" title="Notifications maîtrisées" desc="Seize types d'e-mails, activables un par un. La cloche in-app reste à jour, en temps réel."
              icon={<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></>} />
            <Cell tone="wn" title="Clair, sombre, automatique" desc="Le thème suit vos préférences ou l'heure de la journée. Chaque paire de couleurs est mesurée, jamais estimée."
              icon={<><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></>} />
            <Cell tone="acc" title="Hors ligne" desc="L'interface reste consultable sans réseau ; les données se resynchronisent dès que la connexion revient."
              icon={<><rect x="5" y="2" width="14" height="20" rx="3" /><path d="M11 18h2" /></>} />
            <Cell tone="dg" title="Administration & audit" desc="Tableau de bord, gestion des membres, journal d'audit horodaté et anonymisation des données client."
              icon={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>} />
          </div>
        </div>
      </section>

      {/* ============================ CLASSEMENT ============================ */}
      <section className="lp-sec" id="classement" style={{ paddingTop: 0 }}>
        <div className="lp-w lp-rank">
          <div>
            <span className="lp-kicker">Classement &amp; points</span>
            <h2 style={{ fontSize: 38 }}>Livrer en avance, ça se voit.</h2>
            <p style={{ fontSize: 17, color: 'var(--lp-muted)', marginTop: 20, lineHeight: 1.68 }}>
              Chaque tâche cochée rapporte des points selon le moment où elle est terminée. Les projets grimpent
              dans le classement, les équipes se tirent vers le haut — et vous voyez enfin qui tient ses délais.
            </p>
            <div className="lp-scale">
              <div className="lp-sc"><b style={{ color: 'var(--lp-ok-fg)' }}>20</b><span>terminée en avance</span></div>
              <div className="lp-sc"><b style={{ color: 'var(--lp-acc-fg)' }}>15</b><span>le jour même</span></div>
              <div className="lp-sc"><b style={{ color: 'var(--lp-wn-fg)' }}>5</b><span>en retard</span></div>
            </div>
          </div>
          <div>
            <Lb rank="1" av="RS" tone="gd" name="Refonte site vitrine" sub="Équipe · 6 membres" pts="1 240" top />
            <Lb rank="2" av="CM" name="Campagne marketing Q2" sub="Équipe · 4 membres" pts="985" />
            <Lb rank="3" av="AB" tone="ok" name="Application mobile" sub="Équipe · 5 membres" pts="870" />
            <Lb rank="4" av="CL" tone="bl" name="Client — Dupont & Fils" sub="1-à-1" pts="615" />
            <div style={{ fontSize: 12.5, color: 'var(--lp-hint)', marginTop: 16, textAlign: 'center' }}>
              Mise à jour en temps réel à chaque tâche terminée.
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <div className="lp-w">
        <div className="lp-ctablock">
          <h2>Prêt à voir clair dans vos projets ?</h2>
          <p>Créez votre premier projet en moins de deux minutes. Invitez votre client ou votre équipe avec un lien. C'est tout.</p>
          <div className="lp-ctarow">
            <button className="lp-btn wht" onClick={onStart}>Commencer gratuitement →</button>
            <button className="lp-btn out" onClick={onLogin}>Se connecter</button>
          </div>
          <small>Aucune carte bancaire requise · Forfait gratuit à durée illimitée</small>
        </div>
      </div>

      {/* ============================ FOOTER ============================ */}
      <footer className="lp-foot">
        <div className="lp-w">
          <div className="lp-fg">
            <div className="lp-fc">
              <span className="lp-brand"><Logo id="foot" /><span>Planii</span></span>
              <p>Projets partagés pour clients, prestataires et équipes. Tâches, agenda, réunions et classement — au même endroit.</p>
            </div>
            <div className="lp-fc"><h5>Produit</h5><a href="#plateforme">Projets</a><a href="#fonctions">Tâches</a><a href="#fonctions">Agenda</a><a href="#fonctions">Réunions</a><a href="#classement">Classement</a></div>
            <div className="lp-fc"><h5>Mobile</h5><a href="#mobile">iOS — App Store</a><a href="#mobile">Android — Google Play</a><a href="#mobile">Installer la PWA</a></div>
            <div className="lp-fc"><h5>Compte</h5>
              <a href="#" onClick={(e) => { e.preventDefault(); onLogin() }}>Se connecter</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onStart() }}>Créer un compte</a>
              <a href="mailto:support@planii.app">Support</a>
            </div>
            <div className="lp-fc"><h5>Légal</h5><a href="#">Confidentialité</a><a href="#">Conditions</a><a href="mailto:contact@planii.app">Contact</a></div>
          </div>
          <div className="lp-fbot">
            <span>© {new Date().getFullYear()} Planii. Tous droits réservés.</span>
            <span>Français · Hébergé en Europe</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ========================================================================== */
/* Briques réutilisées                                                        */
/* ========================================================================== */

function Logo({ id }: { id: string }) {
  const g = 'lp-logo-' + id
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--lp-logo-a)" /><stop offset="1" stopColor="var(--lp-logo-b)" />
        </linearGradient>
      </defs>
      <rect x="12" y="10" width="58" height="21" rx="10.5" fill={`url(#${g})`} />
      <rect x="15.5" y="43" width="69" height="14" rx="7" fill="none" stroke={`url(#${g})`} strokeWidth="7" />
      <rect x="12" y="69" width="40" height="21" rx="10.5" fill={`url(#${g})`} />
    </svg>
  )
}

function Mock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lp-mock">
      <div className="lp-mbar"><i /><i /><i /><span>{title}</span></div>
      <div className="lp-mbody">{children}</div>
    </div>
  )
}

function Row({ title, p, av, tone, done }: { title: string; p?: string; av?: string; tone?: string; done?: boolean }) {
  return (
    <div className="lp-r">
      <span className={'lp-ck' + (done ? ' on' : '')} />
      <span className={'lp-t' + (done ? ' done' : '')}>{title}</span>
      {p && <span className={'lp-p ' + p}>{p.toUpperCase()}</span>}
      {av && <span className={'lp-a' + (tone ? ' ' + tone : '')}>{av}</span>}
    </div>
  )
}

function TaskLine({ title, sub, p, due, late }: { title: string; sub: string; p: string; due: string; late?: boolean }) {
  return (
    <div className="lp-trow">
      <span className="lp-ck" />
      <span className="lp-ttl"><b>{title}</b><em>{sub}</em></span>
      <span className={'lp-p ' + p}>{p.toUpperCase()}</span>
      <span className={'lp-due' + (late ? ' late' : '')}>{due}</span>
    </div>
  )
}

function Msg({ who, txt, av, pill }: { who: string; txt: string; av?: string; pill?: React.ReactNode }) {
  return (
    <div className="lp-r" style={{ alignItems: 'flex-start' }}>
      <span className={'lp-a' + (av ? ' ' + av : '')}>{who.split(' ').map((w) => w[0]).join('')}</span>
      <span style={{ flex: 1 }}>
        <b style={{ fontSize: 12.5, letterSpacing: '-.015em' }}>{who}</b>
        <div style={{ fontSize: 13.5, color: 'var(--lp-muted)', marginTop: 4 }}>{txt}</div>
        {pill && <span style={{ display: 'inline-block', marginTop: 9 }}>{pill}</span>}
      </span>
    </div>
  )
}

function FList({ items }: { items: [string, string][] }) {
  return (
    <ul className="lp-flist">
      {items.map(([b, rest]) => (
        <li key={b}><span className="lp-tick">✓</span><span><b>{b}</b> — {rest}</span></li>
      ))}
    </ul>
  )
}

const TONE: Record<string, [string, string]> = {
  acc: ['var(--lp-acc-bg)', 'var(--lp-acc-fg)'],
  ok: ['var(--lp-ok-bg)', 'var(--lp-ok-fg)'],
  bl: ['var(--lp-bl-bg)', 'var(--lp-bl-fg)'],
  wn: ['var(--lp-wn-bg)', 'var(--lp-wn-fg)'],
  dg: ['var(--lp-dg-bg)', 'var(--lp-dg-fg)'],
}

function Type({ tone, title, desc, items, icon }: { tone: string; title: string; desc: string; items: string[]; icon: React.ReactNode }) {
  const [bg, fg] = TONE[tone]
  return (
    <div className="lp-type">
      <div className="lp-ico" style={{ background: bg }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <ul>{items.map((it) => <li key={it}><i>✓</i>{it}</li>)}</ul>
    </div>
  )
}

function Cell({ tone, title, desc, icon }: { tone: string; title: string; desc: string; icon: React.ReactNode }) {
  const [bg, fg] = TONE[tone]
  return (
    <div className="lp-cellbox">
      <div className="lp-ico" style={{ background: bg }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
  )
}

function Lb({ rank, av, tone, name, sub, pts, top }: { rank: string; av: string; tone?: string; name: string; sub: string; pts: string; top?: boolean }) {
  return (
    <div className={'lp-lb' + (top ? ' top' : '')}>
      <span className="lp-rk">{rank}</span>
      <span className={'lp-a' + (tone ? ' ' + tone : '')}>{av}</span>
      <span className="lp-lbn"><b>{name}</b><span>{sub}</span></span>
      <span className="lp-lbp">{pts}</span>
    </div>
  )
}

/* --- calendriers --- */
function MonthGrid() {
  const cells: number[] = []
  for (let i = 3; i <= 30; i++) cells.push(i)
  const marks: Record<number, [string, string]> = {
    11: ['var(--lp-acc-bg)', 'var(--accent-2)'],
    14: ['var(--lp-bl-bg)', 'var(--blue)'],
    19: ['var(--lp-dg-bg)', 'var(--danger)'],
    27: ['var(--lp-ok-bg)', 'var(--ok)'],
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 8 }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} style={{ fontSize: 9, fontWeight: 800, color: 'var(--lp-hint)', textAlign: 'center' }}>{d}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {cells.map((d) => {
          const m = marks[d]
          return (
            <span key={d} className="lp-n" style={{
              height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: m ? 800 : 600,
              background: m ? m[0] : 'var(--lp-cal)', color: m ? m[1] : 'var(--lp-muted)',
              boxShadow: m ? `inset 0 0 0 1px ${m[1]}` : undefined,
            }}>{d}</span>
          )
        })}
      </div>
    </div>
  )
}

function WeekGrid() {
  const ev: [number, number, number, string, string, string][] = [
    // colonne, top %, hauteur %, fond, bord, libellé
    [0, 12, 15, 'var(--lp-acc-bg)', 'var(--accent-2)', 'Point client'],
    [1, 30, 22, 'var(--lp-bl-bg)', 'var(--blue)', 'Atelier UX'],
    [2, 12, 14, 'var(--lp-ok-bg)', 'var(--ok)', 'Livraison v1'],
    [2, 48, 17, 'var(--lp-wn-bg)', 'var(--warn)', 'Revue devis'],
    [3, 66, 15, 'var(--lp-acc-bg)', 'var(--accent-2)', 'Rétro sprint'],
    [4, 30, 20, 'var(--lp-dg-bg)', 'var(--danger)', 'Échéance'],
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 8 }}>
        {['Lun 3', 'Mar 4', 'Mer 5', 'Jeu 6', 'Ven 7'].map((d) => (
          <span key={d} style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--lp-hint)' }}>{d}</span>
        ))}
      </div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, height: 190 }}>
        {[0, 1, 2, 3, 4].map((c) => (
          <div key={c} style={{ position: 'relative', borderTop: '1px solid var(--lp-line)', borderBottom: '1px solid var(--lp-line)' }}>
            {ev.filter((e) => e[0] === c).map((e, i) => (
              <span key={i} style={{
                position: 'absolute', left: 0, right: 0, top: e[1] + '%', height: e[2] + '%',
                background: e[3], border: `1px solid ${e[4]}`, borderRadius: 8,
                fontSize: 8.5, fontWeight: 700, color: 'var(--lp-text)', padding: '5px 6px', overflow: 'hidden',
              }}>{e[5]}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* --- visuel « page projet » (fidèle à l'écran actuel de l'app) --- */
type PRow = { title: string; sub: string; who?: string; av?: string; tone?: string; st: string; p: string; due: string; late?: boolean }

function ProjectBoard() {
  const nav: [string, React.ReactNode][] = [
    ['Accueil', <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>],
    ['Projets', <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M8 9h8M8 14h5" /></>],
    ['Agenda', <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" /></>],
    ['Classement', <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>],
    ['Profil', <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>],
  ]
  const projects: [string, string][] = [['Refonte du site', '#6d5cff'], ['Acheter une maison', '#3b82f6'], ['Evoyamwana', '#10b981']]
  const todo: PRow[] = [
    { title: 'Relire le contrat', sub: 'Travail · 0/1', who: 'Chloé Dubois', av: 'CD', tone: 'bl', st: 'À faire', p: 'p3', due: '26 nov.' },
    { title: 'Réserver la salle', sub: 'Travail', st: 'À faire', p: 'p4', due: '29 nov.' },
  ]
  const doing: PRow[] = [
    { title: 'Envoyer le devis au client', sub: 'Travail · 2 commentaires', who: 'Alice Martin', av: 'AM', st: 'En cours', p: 'p1', due: 'en retard de 2 j', late: true },
    { title: "Préparer la maquette de la page d'accueil", sub: 'Bug', who: 'Bruno Leroy', av: 'BL', tone: 'ok', st: 'En cours', p: 'p2', due: 'dans 3 j' },
  ]
  const group = (label: string, dot: string, n: number, rows: PRow[]) => (
    <div className="lp-grp">
      <div className="lp-grph"><i style={{ background: dot }} /><b>{label}</b><span>{n} tâches</span></div>
      <div className="lp-tbl">
        {rows.map((r) => (
          <div className="lp-tr" key={r.title}>
            <div className="lp-td"><span className="lp-ck" /><span className="lp-ttl"><b>{r.title}</b><em>{r.sub}</em></span></div>
            <div className="lp-td">
              {r.who
                ? <><span className={'lp-a' + (r.tone ? ' ' + r.tone : '')}>{r.av}</span><span className="lp-nm">{r.who}</span></>
                : <span className="lp-txt lp-mute">✋ À prendre</span>}
            </div>
            <div className="lp-td"><span className="lp-st"><i />{r.st}</span></div>
            <div className="lp-td"><span className={'lp-p ' + r.p}>{r.p.toUpperCase()}</span></div>
            <div className="lp-td"><span className={'lp-txt' + (r.late ? ' late' : '')}>{r.late ? '⚠ ' : ''}{r.due}</span></div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="lp-screen">
      <nav className="lp-side">
        <div className="lp-brand"><Logo id="rail" /><b>Planii</b></div>
        {nav.map(([label, d]) => (
          <span key={label} className={'lp-ni' + (label === 'Projets' ? ' on' : '')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
            {label}
          </span>
        ))}
        <div className="lp-sidelbl">Projets</div>
        {projects.map(([n, c]) => (
          <span key={n} className="lp-np"><i style={{ background: c }} />{n}</span>
        ))}
      </nav>

      <main className="lp-bd">
        <div className="lp-pj-h">
          <span className="lp-pj-ic">RD</span>
          <div className="lp-pj-m">
            <h4>Refonte du site</h4>
            <div className="lp-pj-c">
              <span className="lp-chip">Équipe · leader + prestataires</span>
              <span className="lp-chip lp-n">120 pts</span>
              <span className="lp-chip dg">⚠ Livraison hier</span>
            </div>
          </div>
          <div className="lp-pj-r">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--lp-line2)" strokeWidth="4" />
              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray="100.5" strokeDashoffset="86" transform="rotate(-90 20 20)" />
            </svg>
            <span className="lp-pj-k"><b>1 tâche terminée</b><em>6 restantes</em></span>
            <span className="lp-btn-s pri">Meeting</span>
          </div>
        </div>

        <div className="lp-btabs">
          <a className="on" href="#fonctions">Tâches<i>7</i></a>
          <a href="#fonctions">Rendez-vous</a>
          <a href="#fonctions">Équipe</a>
          <a href="#fonctions">Membres<i>3</i></a>
          <a href="#fonctions">Sondages</a>
          <a href="#fonctions">Activité</a>
        </div>

        <div className="lp-tools">
          <span className="lp-btn-s pri">＋ Nouvelle tâche</span>
          <span className="lp-pill-f on">Tout le monde</span>
          <span className="lp-pill-f"><b style={{ background: 'var(--accent)' }}>AM</b>Alice</span>
          <span className="lp-pill-f"><b style={{ background: 'var(--accent)' }}>BL</b>Bruno</span>
          <span className="lp-pill-f">À prendre</span>
        </div>

        <div className="lp-colh"><span>Tâches</span><span>Responsable</span><span>Statut</span><span>Priorité</span><span>Échéance</span></div>
        {group('À faire', 'var(--hint)', 2, todo)}
        {group('En cours', 'var(--blue)', 2, doing)}
      </main>

      {/* panneau : dictée guidée */}
      <aside className="lp-panel">
        <div className="lp-ph">
          <span className="pic">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></svg>
          </span>
          <div><h5>Dictée guidée, <span>nouvelle tâche</span></h5><p>4 champs reconnus</p></div>
        </div>

        <div className="lp-pb">
          <div className="lp-bub">
            <span className="tx">« Relancer le fournisseur avant vendredi, priorité 2, pour Lucas »</span>
            <span className="me">AM</span>
          </div>
          <div className="lp-steps">
            <span className="pic">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sh">Analyse de la dictée</div>
              <ol>
                <Step tone="acc" label="Intitulé" val="Relancer le fournisseur" done d={<path d="M4 7h16M4 12h11M4 17h7" />} />
                <Step tone="wn" label="Priorité" val="P2" done d={<path d="M5 21V4h11l-1.5 3L16 10H5" />} />
                <Step tone="ok" label="Responsable" val="Lucas K." done d={<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />
                <Step tone="bl" label="Échéance" val="vendredi 7" done d={<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" /></>} />
                <Step tone="acc" label="Créer la tâche" d={<path d="M5 12h14M12 5v14" />} />
              </ol>
            </div>
          </div>
        </div>

        <div className="lp-pf">
          <div className="lp-comp">
            <div className="ph">Parlez ou écrivez votre tâche…</div>
            <div className="cb">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M15.5 12a3.5 3.5 0 1 0-3.5 3.5H16" /></svg>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M5 12h14M12 5v14" /></svg>
              <span className="sp" />
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></svg>
              <span className="snd"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg></span>
            </div>
          </div>
        </div>
      </aside>

      {/* annotations flottantes */}
      <div className="lp-fl f1">
        <span className="fa" style={{ background: 'linear-gradient(150deg,#4ae9b8,#0f8f6a)' }}>XL
          <i><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--lp-ok-fg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></i>
        </span>
        <b>42 tâches importées</b><span className="st ok">Terminé</span>
      </div>
      <div className="lp-fl f2">
        <span className="fa" style={{ background: 'linear-gradient(150deg,#ffd27a,#c98a12)' }}>✉
          <i><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--lp-wn-fg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></i>
        </span>
        <b>6 relances envoyées</b><span className="st wn">En cours</span>
      </div>
      <div className="lp-fl f3">
        <span className="fa" style={{ background: 'linear-gradient(150deg,#a08fff,#6d5cff)' }}>CR
          <i><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--lp-acc-fg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" /></svg></i>
        </span>
        <b>Rendez-vous du 12 mars</b><span className="st ac">Confirmé</span>
      </div>
      <div className="lp-tag">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
        Transférée à Lucas
      </div>
      {['c1', 'c2', 'c3'].map((c) => (
        <svg key={c} className={'lp-cur ' + c} viewBox="0 0 24 24">
          <path d="M5 2l14 9-6.2 1.6L9.4 19 5 2z" fill={c === 'c3' ? '#8b7bff' : '#ff7bc8'} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  )
}

function Step({ tone, label, val, done, d }: { tone: string; label: string; val?: string; done?: boolean; d: React.ReactNode }) {
  const [bg, fg] = TONE[tone]
  return (
    <li>
      <i style={{ background: bg, color: fg }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
      </i>
      {label}{val && <em> — {val}</em>}
      {done && <b>✓</b>}
    </li>
  )
}

/* --- téléphones (clair + sombre) : écrans Projets et Accueil de l'app mobile --- */
function Phones() {
  const cards: [string, string, string, string, string, number, string, boolean][] = [
    // initiales, titre, type, étiquette, couleur étiquette, progression %, compteur, en retard
    ['RD', 'Refonte du site', 'Équipe · Propriétaire', 'Travail', '#3b82f6', 72, '34/47 tâches', true],
    ['AM', 'Acheter une maison', 'Groupe · Membre', 'Privé', '#ef4444', 0, '0/1 tâche', false],
    ['EV', 'Evoyamwana', 'Groupe · Propriétaire', 'Travail Congo', '#10b981', 40, '2/5 tâches', false],
  ]
  return (
    <div className="lp-phones">
      <div className="lp-phone back lt">
        <div className="lp-scr">
          <div className="lp-island" />
          <div className="lp-sbar"><span>9:41</span><em>▮▮▮ ⌁ ▰</em></div>
          <div className="lp-pbody">
            <div className="lp-phd"><h6>Projets</h6><span className="lp-bell"><BellIcon /><i>2</i></span></div>
            {cards.map(([ini, n, t, lab, col, pct, cnt, late]) => (
              <div className="lp-pcard" key={n}>
                <div className="lp-pc-h">
                  <span className="lp-pc-ic" style={{ background: col + '22', color: col }}>{ini}</span>
                  <span className="lp-pc-t"><b>{n}</b><small>{t}</small></span>
                </div>
                <div className="lp-pc-c">
                  <span className="lp-pfl" style={{ background: col + '1f', color: col }}>● {lab}</span>
                  {late && <span className="lp-pfl" style={{ background: 'rgba(214,69,80,.12)', color: '#c23442' }}>⚠ en retard</span>}
                </div>
                <div className="lp-pc-p"><span>{cnt}</span><b>{pct}%</b></div>
                <div className="lp-pc-b"><i style={{ width: pct + '%' }} /></div>
              </div>
            ))}
          </div>
          <div className="lp-fab">＋</div>
          <BottomNav on="Projets" />
        </div>
      </div>

      <div className="lp-phone front dk">
        <div className="lp-scr">
          <div className="lp-island" />
          <div className="lp-sbar"><span>9:41</span><em>▮▮▮ ⌁ ▰</em></div>
          <div className="lp-pbody">
            <div className="lp-phd"><h6>Accueil</h6><span className="lp-bell"><BellIcon /><i>3</i></span></div>
            <div className="lp-phello">Bonjour, Alice</div>
            <div className="lp-pday">
              <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
                <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
                <circle cx="27" cy="27" r="22" fill="none" stroke="#8b7bff" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray="138" strokeDashoffset="92" transform="rotate(-90 27 27)" />
                <text x="27" y="31" textAnchor="middle" fontSize="11" fontWeight="800" fill="#f3f1fb">1/3</text>
              </svg>
              <div>
                <small>Ta journée</small>
                <b>Envoyer le devis au client</b>
                <i className="lp-minibtn">✓ Terminer</i>
              </div>
            </div>
            <div className="lp-ptiles">
              {[['#ff8189', '1', 'En retard'], ['#ffc44d', '1', "Aujourd'hui"]].map(([c, n, l]) => (
                <div className="lp-ptile" key={l}><b style={{ color: c }}>{n}</b><span>{l}</span></div>
              ))}
            </div>
            <div className="lp-plbl">En retard</div>
            <div className="lp-prow">
              <span className="lp-pck" /><span className="pt">Envoyer le devis au client</span>
              <span className="lp-pfl" style={{ background: 'rgba(255,129,137,.15)', color: '#ff8189' }}>P1</span>
            </div>
            <div className="lp-plbl">Mes projets</div>
            <div className="lp-prow">
              <span className="pt">Refonte du site</span>
              <span className="lp-pfl" style={{ background: 'var(--ps)', color: 'var(--pm)' }}>72%</span>
            </div>
          </div>
          <div className="lp-fab">＋</div>
          <BottomNav on="Accueil" />
        </div>
      </div>
    </div>
  )
}

function BellIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
}

function BottomNav({ on }: { on: string }) {
  const items: [string, React.ReactNode][] = [
    ['Accueil', <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>],
    ['Projets', <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M8 9h8M8 14h5" /></>],
    ['Agenda', <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" /></>],
    ['Classement', <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /></>],
    ['Profil', <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>],
  ]
  return (
    <div className="lp-bnav">
      {items.map(([label, d]) => (
        <a key={label} className={label === on ? 'on' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
          {label}
        </a>
      ))}
    </div>
  )
}
