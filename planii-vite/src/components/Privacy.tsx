import { Ic } from './Icon'
import { getLang } from '@/lib/i18n'

const LAST_UPDATED = '16 juillet 2026'


type PSec = { h: string; p?: string[]; ul?: string[]; p2?: string[] }
type PDoc = { title: string; updated: string; note: string; back: string; sections: PSec[]; contact: string }

const P_EN: PDoc = {
  title: 'Privacy policy', updated: 'Last updated: 16 July 2026',
  note: 'The French version of this policy is the authoritative one.',
  back: 'Back to the app', contact: 'For any question about this policy or your personal data: ',
  sections: [
    { h: '', p: ['This policy explains what personal data Planii ("the Service", "we") collects, why, how we protect it, and what your rights are. We comply with the GDPR (EU 2016/679) for all our users, in Europe and in Africa.'] },
    { h: '1. Data controller', p: ['The data controller is [Legal entity name], established at [full address], [country]. For any question about your personal data, contact us at info@planii.app.'] },
    { h: '2. Data we collect', p: ['We only collect the data needed to run the Service:'], ul: ['Account data: your name, email address, job (optional) and password (never stored in plain text).', 'Content you create: projects, tasks, comments, polls, appointments, roles and invitations.', 'Communication data: emails exchanged through the built-in messaging (notifications and support).', 'Technical data: IP address, login logs and security logs needed to keep the Service safe.'], p2: ['We collect no sensitive data (health, opinions, banking data) and use no advertising trackers.'] },
    { h: '3. Purposes and legal bases', ul: ['Provide the Service (account, projects, tasks, collaboration) — legal basis: contract (art. 6.1.b).', 'Send you notifications by email (task created, invitation, deadline reminder) — contract and legitimate interest (art. 6.1.b and 6.1.f).', 'Ensure security and prevent abuse (rate limiting, logs) — legitimate interest (art. 6.1.f).', 'Improve the Service and fix issues — legitimate interest (art. 6.1.f).'] },
    { h: '4. Cookies and local storage', p: ['Planii uses no advertising cookies or third-party trackers. The Service stores in your browser only what is strictly necessary: your session token and your display preferences (theme, view type, language). This data stays on your device.'] },
    { h: '5. Recipients and processors', p: ['Your data is never sold or rented. It is accessible only to you, the people you explicitly share a project with, and the Planii team strictly for support and maintenance.', 'We use one technical processor: Hostinger — server hosting (VPS) and email service (info@planii.app), under a GDPR art. 28 data-processing agreement.'] },
    { h: '6. International transfers', p: ['Planii operates in Europe and Africa. Where data is transferred outside the EEA, appropriate safeguards are in place (EU standard contractual clauses or equivalent).'] },
    { h: '7. Retention', p: ['We keep your account data and content while your account is active. When you delete your account, personal data is erased or anonymized within a reasonable period, unless legal retention applies. Security logs are kept for a limited period (indicatively [12] months).'] },
    { h: '8. Security', ul: ['Passwords stored hashed (never in plain text).', 'Encryption in transit (HTTPS/TLS).', 'Token authentication and per-project access control.', 'Request rate limiting against abuse.', 'Restricted, logged server access.'] },
    { h: '9. Your rights', p: ['Under the GDPR you have the rights of access, rectification, erasure, restriction, objection and portability (art. 15–21), and to withdraw consent at any time.', 'To exercise them, write to info@planii.app. You may also lodge a complaint with a supervisory authority — in France, the CNIL (cnil.fr) — or the authority of your country.'] },
    { h: '10. Minors', p: ['The Service is not intended for people under 16. We do not knowingly collect data about minors without parental consent.'] },
    { h: '11. Changes', p: ['We may update this policy. Any significant change will be announced in the Service and the date above updated.'] },
  ],
}

const P_NL: PDoc = {
  title: 'Privacybeleid', updated: 'Laatst bijgewerkt: 16 juli 2026',
  note: 'De Franse versie van dit beleid is de authentieke versie.',
  back: 'Terug naar de app', contact: 'Voor vragen over dit beleid of je persoonsgegevens: ',
  sections: [
    { h: '', p: ['Dit beleid legt uit welke persoonsgegevens Planii ("de Dienst", "wij") verzamelt, waarom, hoe we ze beschermen en wat je rechten zijn. Wij voldoen aan de AVG (EU 2016/679) voor al onze gebruikers, in Europa en in Afrika.'] },
    { h: '1. Verwerkingsverantwoordelijke', p: ['De verwerkingsverantwoordelijke is [Naam rechtspersoon], gevestigd te [volledig adres], [land]. Voor vragen over je persoonsgegevens: info@planii.app.'] },
    { h: '2. Gegevens die we verzamelen', p: ['We verzamelen alleen wat nodig is om de Dienst te laten werken:'], ul: ['Accountgegevens: je naam, e-mailadres, beroep (optioneel) en wachtwoord (nooit in leesbare vorm opgeslagen).', 'Inhoud die je aanmaakt: projecten, taken, opmerkingen, polls, afspraken, rollen en uitnodigingen.', 'Communicatiegegevens: e-mails via de ingebouwde berichten (meldingen en support).', 'Technische gegevens: IP-adres, aanmeldlogboeken en beveiligingslogboeken.'], p2: ['We verzamelen geen gevoelige gegevens (gezondheid, opinies, bankgegevens) en gebruiken geen advertentietrackers.'] },
    { h: '3. Doeleinden en rechtsgronden', ul: ['De Dienst leveren (account, projecten, taken, samenwerking) — rechtsgrond: overeenkomst (art. 6.1.b).', 'Meldingen per e-mail sturen (taak aangemaakt, uitnodiging, deadlineherinnering) — overeenkomst en gerechtvaardigd belang (art. 6.1.b en 6.1.f).', 'Beveiliging en misbruikpreventie (rate limiting, logboeken) — gerechtvaardigd belang (art. 6.1.f).', 'De Dienst verbeteren en fouten herstellen — gerechtvaardigd belang (art. 6.1.f).'] },
    { h: '4. Cookies en lokale opslag', p: ['Planii gebruikt geen advertentiecookies of trackers van derden. In je browser wordt alleen het strikt noodzakelijke bewaard: je sessietoken en je weergavevoorkeuren (thema, weergavetype, taal). Deze gegevens blijven op je apparaat.'] },
    { h: '5. Ontvangers en verwerkers', p: ['Je gegevens worden nooit verkocht of verhuurd. Ze zijn alleen toegankelijk voor jou, de mensen met wie je expliciet een project deelt, en het Planii-team strikt voor support en onderhoud.', 'We gebruiken één technische verwerker: Hostinger — hosting (VPS) en e-maildienst (info@planii.app), onder een verwerkersovereenkomst conform art. 28 AVG.'] },
    { h: '6. Internationale doorgiften', p: ['Planii is actief in Europa en Afrika. Bij doorgifte buiten de EER zijn passende waarborgen van kracht (EU-modelcontractbepalingen of gelijkwaardig).'] },
    { h: '7. Bewaartermijn', p: ['We bewaren je accountgegevens en inhoud zolang je account actief is. Bij verwijdering worden persoonsgegevens binnen een redelijke termijn gewist of geanonimiseerd, behoudens wettelijke bewaarplicht. Beveiligingslogboeken worden beperkt bewaard (indicatief [12] maanden).'] },
    { h: '8. Beveiliging', ul: ['Wachtwoorden gehasht opgeslagen (nooit leesbaar).', 'Versleuteling onderweg (HTTPS/TLS).', 'Tokenauthenticatie en toegangscontrole per project.', 'Rate limiting tegen misbruik.', 'Beperkte, gelogde servertoegang.'] },
    { h: '9. Je rechten', p: ['Onder de AVG heb je recht op inzage, rectificatie, wissing, beperking, bezwaar en overdraagbaarheid (art. 15–21), en om toestemming op elk moment in te trekken.', 'Schrijf naar info@planii.app om ze uit te oefenen. Je kunt ook een klacht indienen bij een toezichthouder — in Nederland de Autoriteit Persoonsgegevens, in België de GBA — of de autoriteit van je land.'] },
    { h: '10. Minderjarigen', p: ['De Dienst is niet bedoeld voor personen jonger dan 16 jaar. We verzamelen niet bewust gegevens van minderjarigen zonder ouderlijke toestemming.'] },
    { h: '11. Wijzigingen', p: ['We kunnen dit beleid bijwerken. Belangrijke wijzigingen worden in de Dienst aangekondigd en de datum hierboven wordt aangepast.'] },
  ],
}

function PrivacyGeneric({ d }: { d: PDoc }) {
  return (
    <div className="legal-page">
      <header className="legal-top">
        <a className="legal-brand" href="/"><span className="logo"><b /></span> Planii</a>
        <a className="btn sm" href="/"><Ic name="back" s={15} /> {d.back}</a>
      </header>
      <main className="legal">
        <h1>{d.title}</h1>
        <p className="legal-date">{d.updated} · {d.note}</p>
        {d.sections.map((sec, i) => (
          <section key={i}>
            {sec.h && <h2>{sec.h}</h2>}
            {(sec.p || []).map((x, j) => <p key={j}>{x}</p>)}
            {sec.ul && <ul>{sec.ul.map((x, j) => <li key={j}>{x}</li>)}</ul>}
            {(sec.p2 || []).map((x, j) => <p key={j}>{x}</p>)}
          </section>
        ))}
        <h2>12. Contact</h2>
        <p>{d.contact}<a href="mailto:info@planii.app">info@planii.app</a>.</p>
        <footer className="legal-foot">© {new Date().getFullYear()} Planii</footer>
      </main>
    </div>
  )
}

/** Page publique de politique de confidentialité (RGPD). Accessible sans compte
 *  via /confidentialite. Les champs entre crochets sont à compléter par l'éditeur. */
export function Privacy() {
  const l = getLang()
  if (l === 'nl') return <PrivacyGeneric d={P_NL} />
  if (l !== 'fr') return <PrivacyGeneric d={P_EN} />
  return (
    <div className="legal-page">
      <header className="legal-top">
        <a className="legal-brand" href="/">
          <span className="logo"><b /></span> Planii
        </a>
        <a className="btn sm" href="/"><Ic name="back" s={15} /> Retour à l’app</a>
      </header>

      <main className="legal">
        <h1>Politique de confidentialité</h1>
        <p className="legal-date">Dernière mise à jour : {LAST_UPDATED}</p>

        <p>
          La présente politique explique quelles données personnelles Planii (« le Service », « nous »)
          collecte, pourquoi, comment nous les protégeons, et quels sont vos droits. Nous nous conformons
          au Règlement général sur la protection des données (RGPD, UE 2016/679) pour l’ensemble de nos
          utilisateurs, en Europe comme en Afrique.
        </p>

        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données est <b>[Raison sociale de l’éditeur]</b>, [forme
          juridique], établie à [adresse complète], [pays]. Pour toute question relative à vos données
          personnelles, vous pouvez nous contacter à l’adresse <a href="mailto:info@planii.app">info@planii.app</a>.
        </p>

        <h2>2. Données que nous collectons</h2>
        <p>Nous ne collectons que les données nécessaires au fonctionnement du Service :</p>
        <ul>
          <li><b>Données de compte</b> : votre nom, votre adresse e-mail, votre métier (facultatif) et votre mot de passe (jamais stocké en clair — voir la section Sécurité).</li>
          <li><b>Contenu que vous créez</b> : projets, tâches, commentaires, sondages, rendez-vous, rôles et invitations que vous saisissez dans le Service.</li>
          <li><b>Données de communication</b> : les e-mails échangés via la messagerie intégrée du Service (par exemple les notifications et échanges avec le support).</li>
          <li><b>Données techniques</b> : adresse IP, journaux de connexion (dont la date de dernière connexion), et informations de journalisation nécessaires à la sécurité et au bon fonctionnement.</li>
        </ul>
        <p>Nous ne collectons aucune donnée sensible (santé, opinions, données bancaires) et n’utilisons aucun traceur publicitaire.</p>

        <h2>3. Finalités et bases légales</h2>
        <p>Nous traitons vos données pour les finalités suivantes, chacune reposant sur une base légale du RGPD :</p>
        <ul>
          <li><b>Fournir le Service</b> (création de compte, projets, tâches, collaboration) — base : exécution du contrat (art. 6.1.b).</li>
          <li><b>Vous envoyer des notifications</b> par e-mail (tâche créée, invitation, rappel d’échéance) — base : exécution du contrat et intérêt légitime (art. 6.1.b et 6.1.f).</li>
          <li><b>Assurer la sécurité</b> et prévenir les abus (limitation de débit, journaux) — base : intérêt légitime (art. 6.1.f).</li>
          <li><b>Améliorer le Service</b> et corriger les anomalies — base : intérêt légitime (art. 6.1.f).</li>
        </ul>

        <h2>4. Cookies et stockage local</h2>
        <p>
          Planii n’utilise pas de cookies publicitaires ni de traceurs tiers. Le Service enregistre dans le
          stockage local de votre navigateur uniquement les éléments strictement nécessaires : votre jeton
          de session (pour vous garder connecté·e) et vos préférences d’affichage (thème, type de vue).
          Ces données restent sur votre appareil et ne sont pas partagées.
        </p>

        <h2>5. Destinataires et sous-traitants</h2>
        <p>
          Vos données ne sont ni vendues ni louées. Elles sont accessibles uniquement à vous, aux personnes
          avec qui vous partagez explicitement un projet, et à l’équipe de Planii dans la stricte mesure
          nécessaire au support et à la maintenance.
        </p>
        <p>Nous faisons appel à un sous-traitant technique :</p>
        <ul>
          <li><b>Hostinger</b> — hébergement des serveurs (VPS) et service de messagerie électronique (info@planii.app). Hostinger héberge la base de données et achemine les e-mails du Service, dans le cadre d’un contrat de sous-traitance conforme à l’article 28 du RGPD.</li>
        </ul>

        <h2>6. Transferts internationaux</h2>
        <p>
          Planii opère en Europe et en Afrique. Lorsque des données sont transférées en dehors de l’Espace
          économique européen, nous veillons à ce que des garanties appropriées soient en place (clauses
          contractuelles types de la Commission européenne ou mécanisme équivalent) afin d’assurer un niveau
          de protection conforme au RGPD.
        </p>

        <h2>7. Durée de conservation</h2>
        <p>
          Nous conservons vos données de compte et votre contenu tant que votre compte est actif. À la
          suppression de votre compte, vos données personnelles sont effacées ou anonymisées dans un délai
          raisonnable, sauf obligation légale de conservation. Les journaux techniques de sécurité sont
          conservés pour une durée limitée (à titre indicatif, [12] mois) puis supprimés.
        </p>

        <h2>8. Sécurité</h2>
        <p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :</p>
        <ul>
          <li>Mots de passe stockés sous forme hachée (jamais en clair).</li>
          <li>Chiffrement des communications en transit (HTTPS/TLS).</li>
          <li>Authentification par jeton et contrôle d’accès par projet.</li>
          <li>Limitation du débit des requêtes pour prévenir les abus et attaques.</li>
          <li>Accès aux serveurs restreint et journalisé.</li>
        </ul>

        <h2>9. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants sur vos données :</p>
        <ul>
          <li><b>Accès</b> — obtenir une copie des données que nous détenons sur vous (art. 15).</li>
          <li><b>Rectification</b> — corriger des données inexactes (art. 16).</li>
          <li><b>Effacement</b> — demander la suppression de vos données (art. 17).</li>
          <li><b>Limitation</b> et <b>opposition</b> au traitement (art. 18 et 21).</li>
          <li><b>Portabilité</b> — recevoir vos données dans un format structuré et lisible (art. 20).</li>
          <li><b>Retrait du consentement</b> à tout moment, lorsque le traitement repose sur celui-ci.</li>
        </ul>
        <p>
          Pour exercer ces droits, écrivez-nous à <a href="mailto:info@planii.app">info@planii.app</a>.
          Vous avez également le droit d’introduire une réclamation auprès d’une autorité de contrôle —
          en France, la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>),
          ou l’autorité compétente de votre pays de résidence.
        </p>

        <h2>10. Mineurs</h2>
        <p>
          Le Service n’est pas destiné aux personnes de moins de 16 ans. Nous ne collectons pas sciemment
          de données concernant des mineurs sans le consentement des titulaires de l’autorité parentale.
        </p>

        <h2>11. Modifications de cette politique</h2>
        <p>
          Nous pouvons faire évoluer cette politique. Toute modification importante sera signalée dans le
          Service et la date de « dernière mise à jour » ci-dessus sera actualisée.
        </p>

        <h2>12. Contact</h2>
        <p>
          Pour toute question relative à cette politique ou à vos données personnelles :
          <a href="mailto:info@planii.app"> info@planii.app</a>.
        </p>

        <footer className="legal-foot">© {new Date().getFullYear()} Planii — Tous droits réservés.</footer>
      </main>
    </div>
  )
}
