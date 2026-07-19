import { useEffect, useState } from 'react'

/** i18n Planii — mécanisme léger sans dépendance.
 *  - 5 langues : fr (défaut), en, nl, es, pt.
 *  - t('clé') retourne la chaîne dans la langue active ; repli sur le français.
 *  - useI18n() re-rend le composant quand la langue change.
 *  - La langue est mémorisée (localStorage) et détectée depuis le navigateur au 1er passage.
 *  Pour couvrir un nouvel écran : ajouter les clés ici puis remplacer les textes par t('…'). */

export type Lang = 'fr' | 'en' | 'nl' | 'es' | 'pt'
export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
]

type Dict = Record<string, string>
const fr: Dict = {
  'nav.home': 'Accueil', 'nav.projects': 'Projets', 'nav.agenda': 'Agenda', 'nav.leaderboard': 'Classement', 'nav.profile': 'Profil', 'nav.admin': 'Admin',
  'title.home': 'Accueil — mes tâches', 'title.projects': 'Projets', 'title.agenda': 'Agenda', 'title.leaderboard': 'Classement', 'title.profile': 'Profil', 'title.admin': 'Espace admin',
  'action.new': 'Nouveau', 'action.save': 'Enregistrer', 'action.saving': 'Enregistrement…', 'action.cancel': 'Annuler', 'action.edit': 'Modifier', 'action.add': 'Ajouter', 'action.delete': 'Supprimer', 'action.close': 'Fermer', 'action.confirm': 'Confirmer', 'action.done': 'Terminé', 'action.create': 'Créer', 'action.search': 'Rechercher', 'action.expand': 'Agrandir', 'action.collapse': 'Réduire',
  'view.list': 'Liste', 'view.board': 'Tableau', 'view.agenda': 'Agenda', 'view.cards': 'Cartes', 'view.table': 'Tableau',
  'theme.title': 'Apparence', 'theme.light': 'Clair', 'theme.dark': 'Sombre', 'theme.auto': 'Auto',
  'lang.title': 'Langue',
  'auth.email': 'Email', 'auth.password': 'Mot de passe', 'auth.login': 'Se connecter', 'auth.signup': 'Créer mon compte', 'auth.noAccount': 'Pas encore de compte ?', 'auth.hasAccount': 'Déjà inscrit ?', 'auth.register': 'S’inscrire', 'auth.name': 'Nom complet', 'auth.job': 'Métier', 'auth.support': 'Un problème ? Contactez le support :', 'auth.privacy': 'Politique de confidentialité',
  'profile.info': 'Mes informations', 'profile.firstName': 'Prénom', 'profile.lastName': 'Nom', 'profile.job': 'Métier', 'profile.email': 'E-mail', 'profile.roles': 'Mes rôles', 'profile.taskTypes': 'Mes types de tâches', 'profile.labels': 'Mes libellés de projets', 'profile.logout': 'Se déconnecter', 'profile.adminSpace': 'Espace admin', 'profile.editInfo': 'Modifier mes informations',
  'projects.active': 'Actifs', 'projects.done': 'Terminés', 'projects.join': 'Rejoindre un projet…', 'projects.sort': 'Trier', 'projects.sortTitle': 'Titre', 'projects.sortManual': 'Manuel', 'projects.newProject': 'Nouveau projet', 'projects.members': 'membres', 'projects.member': 'membre', 'projects.tasks': 'tâches',
  'common.loading': 'Chargement…', 'common.help': 'Aide sur cette page',
}
const en: Dict = {
  'nav.home': 'Home', 'nav.projects': 'Projects', 'nav.agenda': 'Calendar', 'nav.leaderboard': 'Leaderboard', 'nav.profile': 'Profile', 'nav.admin': 'Admin',
  'title.home': 'Home — my tasks', 'title.projects': 'Projects', 'title.agenda': 'Calendar', 'title.leaderboard': 'Leaderboard', 'title.profile': 'Profile', 'title.admin': 'Admin space',
  'action.new': 'New', 'action.save': 'Save', 'action.saving': 'Saving…', 'action.cancel': 'Cancel', 'action.edit': 'Edit', 'action.add': 'Add', 'action.delete': 'Delete', 'action.close': 'Close', 'action.confirm': 'Confirm', 'action.done': 'Done', 'action.create': 'Create', 'action.search': 'Search', 'action.expand': 'Expand', 'action.collapse': 'Collapse',
  'view.list': 'List', 'view.board': 'Board', 'view.agenda': 'Calendar', 'view.cards': 'Cards', 'view.table': 'Table',
  'theme.title': 'Appearance', 'theme.light': 'Light', 'theme.dark': 'Dark', 'theme.auto': 'Auto',
  'lang.title': 'Language',
  'auth.email': 'Email', 'auth.password': 'Password', 'auth.login': 'Sign in', 'auth.signup': 'Create my account', 'auth.noAccount': 'No account yet?', 'auth.hasAccount': 'Already registered?', 'auth.register': 'Sign up', 'auth.name': 'Full name', 'auth.job': 'Job title', 'auth.support': 'Need help? Contact support:', 'auth.privacy': 'Privacy policy',
  'profile.info': 'My information', 'profile.firstName': 'First name', 'profile.lastName': 'Last name', 'profile.job': 'Job', 'profile.email': 'Email', 'profile.roles': 'My roles', 'profile.taskTypes': 'My task types', 'profile.labels': 'My project labels', 'profile.logout': 'Sign out', 'profile.adminSpace': 'Admin space', 'profile.editInfo': 'Edit my information',
  'projects.active': 'Active', 'projects.done': 'Done', 'projects.join': 'Join a project…', 'projects.sort': 'Sort', 'projects.sortTitle': 'Title', 'projects.sortManual': 'Manual', 'projects.newProject': 'New project', 'projects.members': 'members', 'projects.member': 'member', 'projects.tasks': 'tasks',
  'common.loading': 'Loading…', 'common.help': 'Help for this page',
}
const nl: Dict = {
  'nav.home': 'Start', 'nav.projects': 'Projecten', 'nav.agenda': 'Agenda', 'nav.leaderboard': 'Klassement', 'nav.profile': 'Profiel', 'nav.admin': 'Beheer',
  'title.home': 'Start — mijn taken', 'title.projects': 'Projecten', 'title.agenda': 'Agenda', 'title.leaderboard': 'Klassement', 'title.profile': 'Profiel', 'title.admin': 'Beheerruimte',
  'action.new': 'Nieuw', 'action.save': 'Opslaan', 'action.saving': 'Opslaan…', 'action.cancel': 'Annuleren', 'action.edit': 'Bewerken', 'action.add': 'Toevoegen', 'action.delete': 'Verwijderen', 'action.close': 'Sluiten', 'action.confirm': 'Bevestigen', 'action.done': 'Klaar', 'action.create': 'Aanmaken', 'action.search': 'Zoeken', 'action.expand': 'Vergroten', 'action.collapse': 'Verkleinen',
  'view.list': 'Lijst', 'view.board': 'Bord', 'view.agenda': 'Agenda', 'view.cards': 'Kaarten', 'view.table': 'Tabel',
  'theme.title': 'Weergave', 'theme.light': 'Licht', 'theme.dark': 'Donker', 'theme.auto': 'Auto',
  'lang.title': 'Taal',
  'auth.email': 'E-mail', 'auth.password': 'Wachtwoord', 'auth.login': 'Inloggen', 'auth.signup': 'Account aanmaken', 'auth.noAccount': 'Nog geen account?', 'auth.hasAccount': 'Al geregistreerd?', 'auth.register': 'Registreren', 'auth.name': 'Volledige naam', 'auth.job': 'Beroep', 'auth.support': 'Een probleem? Contacteer support:', 'auth.privacy': 'Privacybeleid',
  'profile.info': 'Mijn gegevens', 'profile.firstName': 'Voornaam', 'profile.lastName': 'Achternaam', 'profile.job': 'Beroep', 'profile.email': 'E-mail', 'profile.roles': 'Mijn rollen', 'profile.taskTypes': 'Mijn taaktypes', 'profile.labels': 'Mijn projectlabels', 'profile.logout': 'Uitloggen', 'profile.adminSpace': 'Beheerruimte', 'profile.editInfo': 'Mijn gegevens bewerken',
  'projects.active': 'Actief', 'projects.done': 'Afgerond', 'projects.join': 'Deelnemen aan een project…', 'projects.sort': 'Sorteren', 'projects.sortTitle': 'Titel', 'projects.sortManual': 'Handmatig', 'projects.newProject': 'Nieuw project', 'projects.members': 'leden', 'projects.member': 'lid', 'projects.tasks': 'taken',
  'common.loading': 'Laden…', 'common.help': 'Hulp voor deze pagina',
}
const es: Dict = {
  'nav.home': 'Inicio', 'nav.projects': 'Proyectos', 'nav.agenda': 'Agenda', 'nav.leaderboard': 'Clasificación', 'nav.profile': 'Perfil', 'nav.admin': 'Admin',
  'title.home': 'Inicio — mis tareas', 'title.projects': 'Proyectos', 'title.agenda': 'Agenda', 'title.leaderboard': 'Clasificación', 'title.profile': 'Perfil', 'title.admin': 'Espacio admin',
  'action.new': 'Nuevo', 'action.save': 'Guardar', 'action.saving': 'Guardando…', 'action.cancel': 'Cancelar', 'action.edit': 'Editar', 'action.add': 'Añadir', 'action.delete': 'Eliminar', 'action.close': 'Cerrar', 'action.confirm': 'Confirmar', 'action.done': 'Hecho', 'action.create': 'Crear', 'action.search': 'Buscar', 'action.expand': 'Ampliar', 'action.collapse': 'Reducir',
  'view.list': 'Lista', 'view.board': 'Tablero', 'view.agenda': 'Agenda', 'view.cards': 'Tarjetas', 'view.table': 'Tabla',
  'theme.title': 'Apariencia', 'theme.light': 'Claro', 'theme.dark': 'Oscuro', 'theme.auto': 'Auto',
  'lang.title': 'Idioma',
  'auth.email': 'Correo', 'auth.password': 'Contraseña', 'auth.login': 'Iniciar sesión', 'auth.signup': 'Crear mi cuenta', 'auth.noAccount': '¿Aún sin cuenta?', 'auth.hasAccount': '¿Ya registrado?', 'auth.register': 'Registrarse', 'auth.name': 'Nombre completo', 'auth.job': 'Profesión', 'auth.support': '¿Algún problema? Contacta con soporte:', 'auth.privacy': 'Política de privacidad',
  'profile.info': 'Mi información', 'profile.firstName': 'Nombre', 'profile.lastName': 'Apellido', 'profile.job': 'Profesión', 'profile.email': 'Correo', 'profile.roles': 'Mis roles', 'profile.taskTypes': 'Mis tipos de tareas', 'profile.labels': 'Mis etiquetas de proyectos', 'profile.logout': 'Cerrar sesión', 'profile.adminSpace': 'Espacio admin', 'profile.editInfo': 'Editar mi información',
  'projects.active': 'Activos', 'projects.done': 'Terminados', 'projects.join': 'Unirse a un proyecto…', 'projects.sort': 'Ordenar', 'projects.sortTitle': 'Título', 'projects.sortManual': 'Manual', 'projects.newProject': 'Nuevo proyecto', 'projects.members': 'miembros', 'projects.member': 'miembro', 'projects.tasks': 'tareas',
  'common.loading': 'Cargando…', 'common.help': 'Ayuda de esta página',
}
const pt: Dict = {
  'nav.home': 'Início', 'nav.projects': 'Projetos', 'nav.agenda': 'Agenda', 'nav.leaderboard': 'Classificação', 'nav.profile': 'Perfil', 'nav.admin': 'Admin',
  'title.home': 'Início — minhas tarefas', 'title.projects': 'Projetos', 'title.agenda': 'Agenda', 'title.leaderboard': 'Classificação', 'title.profile': 'Perfil', 'title.admin': 'Espaço admin',
  'action.new': 'Novo', 'action.save': 'Guardar', 'action.saving': 'A guardar…', 'action.cancel': 'Cancelar', 'action.edit': 'Editar', 'action.add': 'Adicionar', 'action.delete': 'Eliminar', 'action.close': 'Fechar', 'action.confirm': 'Confirmar', 'action.done': 'Concluído', 'action.create': 'Criar', 'action.search': 'Pesquisar', 'action.expand': 'Ampliar', 'action.collapse': 'Reduzir',
  'view.list': 'Lista', 'view.board': 'Quadro', 'view.agenda': 'Agenda', 'view.cards': 'Cartões', 'view.table': 'Tabela',
  'theme.title': 'Aparência', 'theme.light': 'Claro', 'theme.dark': 'Escuro', 'theme.auto': 'Auto',
  'lang.title': 'Idioma',
  'auth.email': 'E-mail', 'auth.password': 'Palavra-passe', 'auth.login': 'Entrar', 'auth.signup': 'Criar a minha conta', 'auth.noAccount': 'Ainda sem conta?', 'auth.hasAccount': 'Já registado?', 'auth.register': 'Registar', 'auth.name': 'Nome completo', 'auth.job': 'Profissão', 'auth.support': 'Algum problema? Contacte o suporte:', 'auth.privacy': 'Política de privacidade',
  'profile.info': 'As minhas informações', 'profile.firstName': 'Nome', 'profile.lastName': 'Apelido', 'profile.job': 'Profissão', 'profile.email': 'E-mail', 'profile.roles': 'Os meus papéis', 'profile.taskTypes': 'Os meus tipos de tarefas', 'profile.labels': 'As minhas etiquetas', 'profile.logout': 'Terminar sessão', 'profile.adminSpace': 'Espaço admin', 'profile.editInfo': 'Editar as minhas informações',
  'projects.active': 'Ativos', 'projects.done': 'Concluídos', 'projects.join': 'Juntar-se a um projeto…', 'projects.sort': 'Ordenar', 'projects.sortTitle': 'Título', 'projects.sortManual': 'Manual', 'projects.newProject': 'Novo projeto', 'projects.members': 'membros', 'projects.member': 'membro', 'projects.tasks': 'tarefas',
  'common.loading': 'A carregar…', 'common.help': 'Ajuda desta página',
}

const DICTS: Record<Lang, Dict> = { fr, en, nl, es, pt }
const KEY = 'planii.lang'

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved && DICTS[saved]) return saved
  } catch { /* ignore */ }
  const nav = (navigator.language || 'fr').slice(0, 2).toLowerCase()
  return (['fr', 'en', 'nl', 'es', 'pt'].includes(nav) ? nav : 'fr') as Lang
}

let current: Lang = detect()
const listeners = new Set<() => void>()

export function getLang(): Lang { return current }
export function setLang(l: Lang) {
  current = l
  try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  document.documentElement.lang = l
  listeners.forEach((fn) => fn())
}

/** Traduit une clé dans la langue active (repli : français, puis la clé elle-même). */
export function t(key: string): string {
  return DICTS[current][key] ?? fr[key] ?? key
}

/** Hook : abonne le composant aux changements de langue. Retourne { t, lang, setLang }. */
export function useI18n() {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  return { t, lang: current, setLang }
}

/** Sélecteur de langue (utilisé dans le Profil et l'écran de connexion). */
export function LangPicker({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useI18n()
  if (compact) {
    return (
      <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t('lang.title')}>
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
      </select>
    )
  }
  return (
    <div className="seg lang-seg">
      {LANGS.map((l) => (
        <button key={l.code} className={lang === l.code ? 'on' : ''} onClick={() => setLang(l.code)}>
          <span aria-hidden>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  )
}

document.documentElement.lang = current
