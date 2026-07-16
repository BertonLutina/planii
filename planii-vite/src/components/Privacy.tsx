import { Ic } from './Icon'

const LAST_UPDATED = '16 juillet 2026'

/** Page publique de politique de confidentialité (RGPD). Accessible sans compte
 *  via /confidentialite. Les champs entre crochets sont à compléter par l'éditeur. */
export function Privacy() {
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
