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
              <Mock title="Accueil — mes tâches">
                <div style={{ display: 'flex', gap: 9, marginBottom: 15, flexWrap: 'wrap' }}>
                  <span className="lp-pill dg">3 en retard</span>
                  <span className="lp-pill wn">5 aujourd'hui</span>
                  <span className="lp-pill ok">12 terminées</span>
                </div>
                <Row title="Livrer la maquette du site vitrine" p="p1" av="AM" />
                <Row title="Valider le devis fournisseur" p="p2" av="LK" tone="ok" />
                <Row title="Préparer la réunion de lancement" p="p3" av="SD" tone="bl" done />
                <Row title="Relire le contrat de prestation" p="p4" av="MT" />
                <Row title="Envoyer le rapport hebdomadaire" p="p5" av="AM" />
              </Mock>

              <Mock title="Refonte site — tableau">
                <div className="lp-kb">
                  <div>
                    <div className="lp-kbh"><i style={{ background: 'var(--hint)' }} />À faire</div>
                    <div className="lp-c">Rédiger les contenus<div><span className="lp-p p2">P2</span><span className="lp-a ok">LK</span></div></div>
                    <div className="lp-c">Choisir les photos<div><span className="lp-p p4">P4</span><span className="lp-a bl">SD</span></div></div>
                  </div>
                  <div>
                    <div className="lp-kbh"><i style={{ background: 'var(--blue)' }} />En cours</div>
                    <div className="lp-c">Intégration desktop<div><span className="lp-p p1">P1</span><span className="lp-a">MT</span></div></div>
                  </div>
                  <div>
                    <div className="lp-kbh"><i style={{ background: 'var(--ok)' }} />Terminé</div>
                    <div className="lp-c">Charte graphique<div><span className="lp-p p3">P3</span><span className="lp-a">AM</span></div></div>
                    <div className="lp-c">Arborescence<div><span className="lp-p p5">P5</span><span className="lp-a ok">LK</span></div></div>
                  </div>
                </div>
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

/* --- visuel « tableau de projet » --- */
function ProjectBoard() {
  const rail = [
    <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
    <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M8 9h8M8 14h5" /></>,
    <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" /></>,
    <><path d="M6 21v-7M12 21V5M18 21v-10" /></>,
  ]
  const tasks: [string, string, string, string, string][] = [
    ['56%', 'AM', '', 'b', 'Demain'],
    ['44%', 'LK', 'ok', 'b2', 'Jeu. 6 mars'],
    ['62%', 'SD', 'bl', 'b', 'Ven. 7 mars'],
    ['38%', 'MT', '', 'b2', 'Lun. 10 mars'],
    ['52%', 'AM', '', 'b', 'Mer. 12 mars'],
  ]
  const people: [string, string, string, string][] = [
    ['Céline Thomas', 'Cheffe de projet', 'g', '12'],
    ['Édouard Collins', 'Développeur', 'g2', '8'],
    ['Laura Müller', 'Rédactrice', 'g', '6'],
    ['Carmen Rodríguez', 'Cliente', 'g2', '3'],
    ['Jamal Benali', 'Designer', 'g', '9'],
  ]
  const prios = ['p1', 'p2', 'p3', 'p2', 'p4']

  return (
    <div className="lp-screen">
      <nav className="lp-rail">
        <Logo id="rail" />
        {rail.map((d, i) => (
          <span key={i} className={'lp-ri' + (i === 1 ? ' on' : '')}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
          </span>
        ))}
        <hr />
      </nav>

      <aside className="lp-pcol">
        <span className="lp-pt" style={{ background: 'linear-gradient(150deg,#5cb0ff,#2f7fd6)' }}>CQ</span>
        <span className="lp-pt sel" style={{ background: 'linear-gradient(150deg,#a08fff,#6d5cff)' }}>RS</span>
        <span className="lp-pt" style={{ background: 'linear-gradient(150deg,#4ae9b8,#0f8f6a)' }}>AM</span>
        <span className="lp-pt" style={{ background: 'linear-gradient(150deg,#ffd27a,#c98a12)' }}>AV</span>
        <hr />
        <em>···</em>
      </aside>

      <main className="lp-bd">
        <h4>Refonte site vitrine</h4>
        <div className="lp-btabs">
          <a className="on" href="#fonctions">Tableau principal</a>
          <a href="#fonctions">Kanban</a>
          <a href="#fonctions">Agenda</a>
          <span className="sp" />
          <span className="tl">Équipe
            <span className="lp-stack">
              <i style={{ background: 'linear-gradient(150deg,#a08fff,#6d5cff)' }}>AM</i>
              <i style={{ background: 'linear-gradient(150deg,#4ae9b8,#0f8f6a)' }}>LK</i>
              <i style={{ background: 'linear-gradient(150deg,#5cb0ff,#2f7fd6)' }}>SD</i>
              <i style={{ background: 'var(--surface-2)', color: 'var(--lp-muted)' }}>+3</i>
            </span>
          </span>
        </div>

        <div className="lp-grp">
          <div className="lp-grph">
            <b style={{ color: 'var(--lp-bl-fg)' }}>Tâches en cours</b>
            <span>Responsable</span><span>Statut</span><span>Échéance</span>
          </div>
          <div className="lp-tbl">
            {tasks.map(([w, av, tone, cell, due], i) => (
              <div className="lp-tr" key={i}>
                <div className="lp-td"><span className="lp-edge" style={{ background: 'var(--blue)' }} /><span className="lp-sk" style={{ width: w }} /></div>
                <div className="lp-td mid"><span className={'lp-a' + (tone ? ' ' + tone : '')}>{av}</span><span className={'lp-p ' + prios[i]}>{prios[i].toUpperCase()}</span></div>
                <div className={'lp-cell ' + cell}>En cours</div>
                <div className="lp-td mid"><span className="lp-txt">{due}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-grp">
          <div className="lp-grph">
            <b style={{ color: 'var(--lp-acc-fg)' }}>Membres du projet</b>
            <span>Rôle</span><span>Invitation</span><span>Tâches</span>
          </div>
          <div className="lp-tbl">
            {people.map(([n, role, cell, cnt]) => (
              <div className="lp-tr" key={n}>
                <div className="lp-td"><span className="lp-edge" style={{ background: 'var(--accent)' }} /><span className="lp-nm">{n}</span></div>
                <div className="lp-td mid"><span className="lp-txt">{role}</span></div>
                <div className={'lp-cell ' + cell}>Acceptée</div>
                <div className="lp-td mid"><span className="lp-txt lp-n">{cnt}</span></div>
              </div>
            ))}
          </div>
        </div>
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

/* --- téléphones (clair + sombre) --- */
function Phones() {
  return (
    <div className="lp-phones">
      <div className="lp-phone back lt">
        <div className="lp-scr">
          <div className="lp-island" />
          <div className="lp-sbar"><span>9:41</span><em>▮▮▮ ⌁ ▰</em></div>
          <div className="lp-pbody">
            <div className="lp-phd"><h6>Projets</h6><span className="lp-bell"><BellIcon /><i>2</i></span></div>
            {[['#6d5cff', 'Refonte site vitrine', '6'], ['#1f6fc9', 'Campagne Q2', '4'], ['#0f8f6a', 'Dupont & Fils', '1'], ['#a5680a', 'Association Vélo', '9']].map(([c, n, k]) => (
              <div className="lp-prow" key={n}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: c, flex: 'none' }} />
                <span className="pt">{n}</span>
                <span className="lp-pfl" style={{ background: 'var(--ps)', color: 'var(--pm)' }}>{k}</span>
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
            <div className="lp-ptiles">
              {[['#ff8189', '3', 'En retard'], ['#ffc44d', '5', "Aujourd'hui"], ['#8b7bff', '8', 'Priorités'], ['#3ce0ab', '12', 'Terminées']].map(([c, n, l]) => (
                <div className="lp-ptile" key={l}><b style={{ color: c }}>{n}</b><span>{l}</span></div>
              ))}
            </div>
            <div className="lp-plbl">À faire</div>
            {[['Livrer la maquette', 'P1', 'rgba(255,129,137,.15)', '#ff8189'],
              ['Valider le devis', 'P2', 'rgba(255,196,77,.14)', '#ffc44d'],
              ['Relire le contrat', 'P3', 'rgba(139,123,255,.17)', '#b3a5ff']].map(([n, p, bg, fg]) => (
              <div className="lp-prow" key={n}>
                <span className="lp-pck" /><span className="pt">{n}</span>
                <span className="lp-pfl" style={{ background: bg, color: fg }}>{p}</span>
              </div>
            ))}
            <div className="lp-prow">
              <span className="lp-pck on" />
              <span className="pt" style={{ opacity: .5, textDecoration: 'line-through' }}>Réunion de lancement</span>
              <span className="lp-pfl" style={{ background: 'rgba(60,224,171,.13)', color: '#3ce0ab' }}>+20</span>
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
    ['Score', <><path d="M6 21v-7M12 21V5M18 21v-10" /></>],
  ]
  return (
    <div className="lp-bnav">
      {items.map(([label, d]) => (
        <a key={label} className={label === on ? 'on' : ''}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
          {label}
        </a>
      ))}
    </div>
  )
}
