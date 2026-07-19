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
  'home.todo': 'À FAIRE', 'home.doneGrp': 'TERMINÉES', 'home.priority': 'Priorité :', 'home.allDone': 'Rien à faire — tout est à jour, bravo !', 'home.noTasks': 'Aucune tâche à afficher.', 'home.colTodo': 'à faire', 'home.finish': 'Terminer', 'home.reopen': 'Rouvrir', 'home.check': 'Cocher', 'home.early': ' — en avance !', 'home.late': ' — en retard', 'home.onTime': ' — dans les temps',
  'today.title': 'Aujourd’hui', 'today.calm': 'Tout est calme pour le moment.', 'today.watch': '{n} point(s) à surveiller maintenant.', 'today.loading': 'Chargement de tes priorités…', 'today.overdue': 'En retard', 'today.dueToday': 'À faire aujourd’hui', 'today.highPrio': 'Priorités fortes', 'today.transferred': 'Transférées', 'today.review': 'À valider', 'today.discussions': 'Discussions actives', 'today.noOverdue': 'Aucun retard.', 'today.noDueToday': 'Rien à rendre aujourd’hui.', 'today.noHighPrio': 'Aucune priorité P1/P2.', 'today.noTransferred': 'Aucune tâche transférée.', 'today.noReview': 'Rien en revue.', 'today.noMeeting': 'Aucun meeting récent.', 'today.messages': 'message(s)',
  'proj.dragHint': 'Glissez les projets pour changer l’ordre.', 'proj.noneDone': 'Aucun projet terminé.', 'proj.thProject': 'Projet', 'proj.thType': 'Type', 'proj.thRole': 'Rôle', 'proj.thMembers': 'Membres', 'proj.thTasks': 'Tâches', 'proj.thProgress': 'Progression', 'proj.thLabel': 'Libellé', 'proj.typeSolo': '1-à-1', 'proj.typeTeam': 'Équipe', 'proj.typeGroup': 'Groupe', 'proj.closed': 'clôturé', 'proj.name': 'Nom du projet', 'proj.type': 'Type de projet', 'proj.optSolo': '1-à-1 — un client', 'proj.optTeam': 'Équipe — client + plusieurs prestataires (vous = leader)', 'proj.optGroup': 'Groupe — communauté, famille, amis', 'proj.labelList': 'Liste de libellés', 'proj.deadline': 'Date de livraison (optionnel)', 'proj.created': 'Projet créé ✓', 'proj.joined': 'Projet rejoint ✓', 'proj.joinTitle': 'Rejoindre un projet', 'proj.inviteLink': 'Lien ou code d’invitation', 'proj.check': 'Vérifier', 'proj.joinAs': 'Vous rejoindrez en tant que', 'proj.invitedBy': 'invité par', 'proj.joinBtn': 'Rejoindre le projet',
  'lb.empty': 'Aucune équipe pour l’instant. Créez ou rejoignez un projet !', 'lb.banner': 'La meilleure équipe / le meilleur groupe reçoit un supplément de', 'lb.scale': 'Barème : en avance 20 · le jour même 15 · en retard 5. Cochez vos tâches pour grimper !', 'lb.level': 'Niveau', 'lb.bonus': 'bonus',
  'notif.title': 'Notifications', 'notif.empty': 'Aucune notification.', 'notif.clear': 'Effacer',
  'cmd.home': 'Aller à l’Accueil', 'cmd.projects': 'Aller aux Projets', 'cmd.agenda': 'Ouvrir l’Agenda', 'cmd.leaderboard': 'Voir le Classement', 'cmd.profile': 'Mon profil', 'cmd.newProject': 'Créer un projet', 'cmd.light': 'Thème clair', 'cmd.dark': 'Thème sombre', 'cmd.auto': 'Thème auto (système)', 'cmd.open': 'Ouvrir : ', 'cmd.placeholder': 'Rechercher une action, un projet…', 'cmd.noResult': 'Aucun résultat', 'cmd.toOpen': 'pour ouvrir', 'cmd.toClose': 'pour fermer',
  'qt.title': 'Nouvelle tâche', 'qt.label': 'Intitulé', 'qt.project': 'Projet', 'qt.pickProject': 'Choisis un projet', 'qt.needProject': 'Crée d’abord un projet pour pouvoir y ajouter des tâches.', 'qt.created': 'Tâche créée ✓', 'qt.due': 'Échéance (optionnel)', 'qt.type': 'Type', 'qt.priority': 'Priorité',
  'cal.today': 'Aujourd’hui', 'cal.month': 'Mois', 'cal.week': 'Semaine', 'cal.day': 'Jour', 'cal.agendaView': 'Agenda', 'cal.year': 'Heatmap (année)', 'cal.yearTitle': 'Heatmap — activité de l’année', 'cal.nothing': 'Rien de prévu', 'cal.nothingDay': 'Rien de prévu ce jour.', 'cal.noUpcoming': 'Aucune échéance à venir.',
  'qa.title': 'Nouveau rendez-vous', 'qa.optTitle': 'Titre (optionnel)', 'qa.date': 'Date', 'qa.start': 'Début', 'qa.end': 'Fin', 'qa.needProject': 'Crée d’abord un projet pour pouvoir y ajouter un rendez-vous.', 'qa.needFields': 'Date et horaires requis', 'qa.created': 'Rendez-vous créé ✓', 'qa.pick': 'Créer dans l’agenda', 'qa.appt': 'Rendez-vous', 'qa.task': 'Tâche',
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
  'home.todo': 'TO DO', 'home.doneGrp': 'DONE', 'home.priority': 'Priority:', 'home.allDone': 'Nothing to do — all caught up, well done!', 'home.noTasks': 'No tasks to show.', 'home.colTodo': 'to do', 'home.finish': 'Complete', 'home.reopen': 'Reopen', 'home.check': 'Check', 'home.early': ' — ahead of schedule!', 'home.late': ' — late', 'home.onTime': ' — on time',
  'today.title': 'Today', 'today.calm': 'All calm for now.', 'today.watch': '{n} item(s) to watch right now.', 'today.loading': 'Loading your priorities…', 'today.overdue': 'Overdue', 'today.dueToday': 'Due today', 'today.highPrio': 'High priorities', 'today.transferred': 'Transferred', 'today.review': 'To review', 'today.discussions': 'Active discussions', 'today.noOverdue': 'Nothing overdue.', 'today.noDueToday': 'Nothing due today.', 'today.noHighPrio': 'No P1/P2 priority.', 'today.noTransferred': 'No transferred task.', 'today.noReview': 'Nothing in review.', 'today.noMeeting': 'No recent meeting.', 'today.messages': 'message(s)',
  'proj.dragHint': 'Drag projects to change their order.', 'proj.noneDone': 'No completed project.', 'proj.thProject': 'Project', 'proj.thType': 'Type', 'proj.thRole': 'Role', 'proj.thMembers': 'Members', 'proj.thTasks': 'Tasks', 'proj.thProgress': 'Progress', 'proj.thLabel': 'Label', 'proj.typeSolo': '1-to-1', 'proj.typeTeam': 'Team', 'proj.typeGroup': 'Group', 'proj.closed': 'closed', 'proj.name': 'Project name', 'proj.type': 'Project type', 'proj.optSolo': '1-to-1 — one client', 'proj.optTeam': 'Team — client + several providers (you = leader)', 'proj.optGroup': 'Group — community, family, friends', 'proj.labelList': 'Label list', 'proj.deadline': 'Delivery date (optional)', 'proj.created': 'Project created ✓', 'proj.joined': 'Project joined ✓', 'proj.joinTitle': 'Join a project', 'proj.inviteLink': 'Invitation link or code', 'proj.check': 'Check', 'proj.joinAs': 'You will join as', 'proj.invitedBy': 'invited by', 'proj.joinBtn': 'Join the project',
  'lb.empty': 'No team yet. Create or join a project!', 'lb.banner': 'The best team / group receives a bonus of', 'lb.scale': 'Scale: early 20 · same day 15 · late 5. Check off your tasks to climb!', 'lb.level': 'Level', 'lb.bonus': 'bonus',
  'notif.title': 'Notifications', 'notif.empty': 'No notifications.', 'notif.clear': 'Clear',
  'cmd.home': 'Go to Home', 'cmd.projects': 'Go to Projects', 'cmd.agenda': 'Open Calendar', 'cmd.leaderboard': 'View Leaderboard', 'cmd.profile': 'My profile', 'cmd.newProject': 'Create a project', 'cmd.light': 'Light theme', 'cmd.dark': 'Dark theme', 'cmd.auto': 'Auto theme (system)', 'cmd.open': 'Open: ', 'cmd.placeholder': 'Search an action, a project…', 'cmd.noResult': 'No result', 'cmd.toOpen': 'to open', 'cmd.toClose': 'to close',
  'qt.title': 'New task', 'qt.label': 'Title', 'qt.project': 'Project', 'qt.pickProject': 'Pick a project', 'qt.needProject': 'Create a project first to add tasks to it.', 'qt.created': 'Task created ✓', 'qt.due': 'Due date (optional)', 'qt.type': 'Type', 'qt.priority': 'Priority',
  'cal.today': 'Today', 'cal.month': 'Month', 'cal.week': 'Week', 'cal.day': 'Day', 'cal.agendaView': 'Agenda', 'cal.year': 'Heatmap (year)', 'cal.yearTitle': 'Heatmap — year activity', 'cal.nothing': 'Nothing planned', 'cal.nothingDay': 'Nothing planned this day.', 'cal.noUpcoming': 'No upcoming deadline.',
  'qa.title': 'New appointment', 'qa.optTitle': 'Title (optional)', 'qa.date': 'Date', 'qa.start': 'Start', 'qa.end': 'End', 'qa.needProject': 'Create a project first to add an appointment.', 'qa.needFields': 'Date and times required', 'qa.created': 'Appointment created ✓', 'qa.pick': 'Create in the calendar', 'qa.appt': 'Appointment', 'qa.task': 'Task',
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
  'home.todo': 'TE DOEN', 'home.doneGrp': 'AFGEROND', 'home.priority': 'Prioriteit:', 'home.allDone': 'Niets te doen — alles is bij, goed zo!', 'home.noTasks': 'Geen taken om te tonen.', 'home.colTodo': 'te doen', 'home.finish': 'Afronden', 'home.reopen': 'Heropenen', 'home.check': 'Aanvinken', 'home.early': ' — voor op schema!', 'home.late': ' — te laat', 'home.onTime': ' — op tijd',
  'today.title': 'Vandaag', 'today.calm': 'Alles rustig voorlopig.', 'today.watch': '{n} punt(en) om nu in de gaten te houden.', 'today.loading': 'Je prioriteiten laden…', 'today.overdue': 'Te laat', 'today.dueToday': 'Vandaag af te ronden', 'today.highPrio': 'Hoge prioriteiten', 'today.transferred': 'Overgedragen', 'today.review': 'Te valideren', 'today.discussions': 'Actieve discussies', 'today.noOverdue': 'Niets te laat.', 'today.noDueToday': 'Niets voor vandaag.', 'today.noHighPrio': 'Geen P1/P2-prioriteit.', 'today.noTransferred': 'Geen overgedragen taak.', 'today.noReview': 'Niets in review.', 'today.noMeeting': 'Geen recente meeting.', 'today.messages': 'bericht(en)',
  'proj.dragHint': 'Sleep projecten om de volgorde te wijzigen.', 'proj.noneDone': 'Geen afgerond project.', 'proj.thProject': 'Project', 'proj.thType': 'Type', 'proj.thRole': 'Rol', 'proj.thMembers': 'Leden', 'proj.thTasks': 'Taken', 'proj.thProgress': 'Voortgang', 'proj.thLabel': 'Label', 'proj.typeSolo': '1-op-1', 'proj.typeTeam': 'Team', 'proj.typeGroup': 'Groep', 'proj.closed': 'afgesloten', 'proj.name': 'Projectnaam', 'proj.type': 'Projecttype', 'proj.optSolo': '1-op-1 — één klant', 'proj.optTeam': 'Team — klant + meerdere dienstverleners (jij = leider)', 'proj.optGroup': 'Groep — gemeenschap, familie, vrienden', 'proj.labelList': 'Labellijst', 'proj.deadline': 'Leverdatum (optioneel)', 'proj.created': 'Project aangemaakt ✓', 'proj.joined': 'Project toegetreden ✓', 'proj.joinTitle': 'Deelnemen aan een project', 'proj.inviteLink': 'Uitnodigingslink of -code', 'proj.check': 'Controleren', 'proj.joinAs': 'Je treedt toe als', 'proj.invitedBy': 'uitgenodigd door', 'proj.joinBtn': 'Deelnemen aan project',
  'lb.empty': 'Nog geen team. Maak of join een project!', 'lb.banner': 'Het beste team / de beste groep krijgt een bonus van', 'lb.scale': 'Schaal: vroeg 20 · zelfde dag 15 · laat 5. Vink je taken af om te klimmen!', 'lb.level': 'Niveau', 'lb.bonus': 'bonus',
  'notif.title': 'Meldingen', 'notif.empty': 'Geen meldingen.', 'notif.clear': 'Wissen',
  'cmd.home': 'Ga naar Start', 'cmd.projects': 'Ga naar Projecten', 'cmd.agenda': 'Open Agenda', 'cmd.leaderboard': 'Bekijk Klassement', 'cmd.profile': 'Mijn profiel', 'cmd.newProject': 'Project aanmaken', 'cmd.light': 'Licht thema', 'cmd.dark': 'Donker thema', 'cmd.auto': 'Auto thema (systeem)', 'cmd.open': 'Openen: ', 'cmd.placeholder': 'Zoek een actie, een project…', 'cmd.noResult': 'Geen resultaat', 'cmd.toOpen': 'om te openen', 'cmd.toClose': 'om te sluiten',
  'qt.title': 'Nieuwe taak', 'qt.label': 'Titel', 'qt.project': 'Project', 'qt.pickProject': 'Kies een project', 'qt.needProject': 'Maak eerst een project om er taken aan toe te voegen.', 'qt.created': 'Taak aangemaakt ✓', 'qt.due': 'Deadline (optioneel)', 'qt.type': 'Type', 'qt.priority': 'Prioriteit',
  'cal.today': 'Vandaag', 'cal.month': 'Maand', 'cal.week': 'Week', 'cal.day': 'Dag', 'cal.agendaView': 'Agenda', 'cal.year': 'Heatmap (jaar)', 'cal.yearTitle': 'Heatmap — jaaractiviteit', 'cal.nothing': 'Niets gepland', 'cal.nothingDay': 'Niets gepland deze dag.', 'cal.noUpcoming': 'Geen komende deadline.',
  'qa.title': 'Nieuwe afspraak', 'qa.optTitle': 'Titel (optioneel)', 'qa.date': 'Datum', 'qa.start': 'Begin', 'qa.end': 'Einde', 'qa.needProject': 'Maak eerst een project om een afspraak toe te voegen.', 'qa.needFields': 'Datum en tijden vereist', 'qa.created': 'Afspraak aangemaakt ✓', 'qa.pick': 'Aanmaken in agenda', 'qa.appt': 'Afspraak', 'qa.task': 'Taak',
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
  'home.todo': 'POR HACER', 'home.doneGrp': 'TERMINADAS', 'home.priority': 'Prioridad:', 'home.allDone': '¡Nada que hacer — todo al día, bravo!', 'home.noTasks': 'Ninguna tarea que mostrar.', 'home.colTodo': 'por hacer', 'home.finish': 'Completar', 'home.reopen': 'Reabrir', 'home.check': 'Marcar', 'home.early': ' — ¡por adelantado!', 'home.late': ' — con retraso', 'home.onTime': ' — a tiempo',
  'today.title': 'Hoy', 'today.calm': 'Todo tranquilo por ahora.', 'today.watch': '{n} punto(s) a vigilar ahora.', 'today.loading': 'Cargando tus prioridades…', 'today.overdue': 'Con retraso', 'today.dueToday': 'Para hoy', 'today.highPrio': 'Prioridades altas', 'today.transferred': 'Transferidas', 'today.review': 'Por validar', 'today.discussions': 'Discusiones activas', 'today.noOverdue': 'Ningún retraso.', 'today.noDueToday': 'Nada para hoy.', 'today.noHighPrio': 'Ninguna prioridad P1/P2.', 'today.noTransferred': 'Ninguna tarea transferida.', 'today.noReview': 'Nada en revisión.', 'today.noMeeting': 'Ninguna reunión reciente.', 'today.messages': 'mensaje(s)',
  'proj.dragHint': 'Arrastra los proyectos para cambiar el orden.', 'proj.noneDone': 'Ningún proyecto terminado.', 'proj.thProject': 'Proyecto', 'proj.thType': 'Tipo', 'proj.thRole': 'Rol', 'proj.thMembers': 'Miembros', 'proj.thTasks': 'Tareas', 'proj.thProgress': 'Progreso', 'proj.thLabel': 'Etiqueta', 'proj.typeSolo': '1-a-1', 'proj.typeTeam': 'Equipo', 'proj.typeGroup': 'Grupo', 'proj.closed': 'cerrado', 'proj.name': 'Nombre del proyecto', 'proj.type': 'Tipo de proyecto', 'proj.optSolo': '1-a-1 — un cliente', 'proj.optTeam': 'Equipo — cliente + varios proveedores (tú = líder)', 'proj.optGroup': 'Grupo — comunidad, familia, amigos', 'proj.labelList': 'Lista de etiquetas', 'proj.deadline': 'Fecha de entrega (opcional)', 'proj.created': 'Proyecto creado ✓', 'proj.joined': 'Proyecto unido ✓', 'proj.joinTitle': 'Unirse a un proyecto', 'proj.inviteLink': 'Enlace o código de invitación', 'proj.check': 'Verificar', 'proj.joinAs': 'Te unirás como', 'proj.invitedBy': 'invitado por', 'proj.joinBtn': 'Unirse al proyecto',
  'lb.empty': '¡Aún sin equipo. Crea o únete a un proyecto!', 'lb.banner': 'El mejor equipo / grupo recibe un extra de', 'lb.scale': 'Baremo: adelantado 20 · mismo día 15 · con retraso 5. ¡Marca tus tareas para subir!', 'lb.level': 'Nivel', 'lb.bonus': 'bono',
  'notif.title': 'Notificaciones', 'notif.empty': 'Ninguna notificación.', 'notif.clear': 'Borrar',
  'cmd.home': 'Ir al Inicio', 'cmd.projects': 'Ir a Proyectos', 'cmd.agenda': 'Abrir la Agenda', 'cmd.leaderboard': 'Ver la Clasificación', 'cmd.profile': 'Mi perfil', 'cmd.newProject': 'Crear un proyecto', 'cmd.light': 'Tema claro', 'cmd.dark': 'Tema oscuro', 'cmd.auto': 'Tema auto (sistema)', 'cmd.open': 'Abrir: ', 'cmd.placeholder': 'Buscar una acción, un proyecto…', 'cmd.noResult': 'Sin resultados', 'cmd.toOpen': 'para abrir', 'cmd.toClose': 'para cerrar',
  'qt.title': 'Nueva tarea', 'qt.label': 'Título', 'qt.project': 'Proyecto', 'qt.pickProject': 'Elige un proyecto', 'qt.needProject': 'Crea primero un proyecto para añadirle tareas.', 'qt.created': 'Tarea creada ✓', 'qt.due': 'Fecha límite (opcional)', 'qt.type': 'Tipo', 'qt.priority': 'Prioridad',
  'cal.today': 'Hoy', 'cal.month': 'Mes', 'cal.week': 'Semana', 'cal.day': 'Día', 'cal.agendaView': 'Agenda', 'cal.year': 'Heatmap (año)', 'cal.yearTitle': 'Heatmap — actividad del año', 'cal.nothing': 'Nada previsto', 'cal.nothingDay': 'Nada previsto este día.', 'cal.noUpcoming': 'Ninguna fecha límite próxima.',
  'qa.title': 'Nueva cita', 'qa.optTitle': 'Título (opcional)', 'qa.date': 'Fecha', 'qa.start': 'Inicio', 'qa.end': 'Fin', 'qa.needProject': 'Crea primero un proyecto para añadir una cita.', 'qa.needFields': 'Fecha y horarios requeridos', 'qa.created': 'Cita creada ✓', 'qa.pick': 'Crear en la agenda', 'qa.appt': 'Cita', 'qa.task': 'Tarea',
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
  'home.todo': 'A FAZER', 'home.doneGrp': 'CONCLUÍDAS', 'home.priority': 'Prioridade:', 'home.allDone': 'Nada a fazer — tudo em dia, parabéns!', 'home.noTasks': 'Nenhuma tarefa a mostrar.', 'home.colTodo': 'a fazer', 'home.finish': 'Concluir', 'home.reopen': 'Reabrir', 'home.check': 'Marcar', 'home.early': ' — adiantado!', 'home.late': ' — atrasado', 'home.onTime': ' — a tempo',
  'today.title': 'Hoje', 'today.calm': 'Tudo calmo por agora.', 'today.watch': '{n} ponto(s) a vigiar agora.', 'today.loading': 'A carregar as tuas prioridades…', 'today.overdue': 'Atrasadas', 'today.dueToday': 'Para hoje', 'today.highPrio': 'Prioridades altas', 'today.transferred': 'Transferidas', 'today.review': 'Por validar', 'today.discussions': 'Discussões ativas', 'today.noOverdue': 'Nenhum atraso.', 'today.noDueToday': 'Nada para hoje.', 'today.noHighPrio': 'Nenhuma prioridade P1/P2.', 'today.noTransferred': 'Nenhuma tarefa transferida.', 'today.noReview': 'Nada em revisão.', 'today.noMeeting': 'Nenhuma reunião recente.', 'today.messages': 'mensagem(ns)',
  'proj.dragHint': 'Arrasta os projetos para mudar a ordem.', 'proj.noneDone': 'Nenhum projeto concluído.', 'proj.thProject': 'Projeto', 'proj.thType': 'Tipo', 'proj.thRole': 'Papel', 'proj.thMembers': 'Membros', 'proj.thTasks': 'Tarefas', 'proj.thProgress': 'Progresso', 'proj.thLabel': 'Etiqueta', 'proj.typeSolo': '1-a-1', 'proj.typeTeam': 'Equipa', 'proj.typeGroup': 'Grupo', 'proj.closed': 'fechado', 'proj.name': 'Nome do projeto', 'proj.type': 'Tipo de projeto', 'proj.optSolo': '1-a-1 — um cliente', 'proj.optTeam': 'Equipa — cliente + vários prestadores (tu = líder)', 'proj.optGroup': 'Grupo — comunidade, família, amigos', 'proj.labelList': 'Lista de etiquetas', 'proj.deadline': 'Data de entrega (opcional)', 'proj.created': 'Projeto criado ✓', 'proj.joined': 'Projeto associado ✓', 'proj.joinTitle': 'Juntar-se a um projeto', 'proj.inviteLink': 'Link ou código de convite', 'proj.check': 'Verificar', 'proj.joinAs': 'Vais juntar-te como', 'proj.invitedBy': 'convidado por', 'proj.joinBtn': 'Juntar-se ao projeto',
  'lb.empty': 'Ainda sem equipa. Cria ou junta-te a um projeto!', 'lb.banner': 'A melhor equipa / grupo recebe um extra de', 'lb.scale': 'Escala: adiantado 20 · no dia 15 · atrasado 5. Marca as tuas tarefas para subir!', 'lb.level': 'Nível', 'lb.bonus': 'bónus',
  'notif.title': 'Notificações', 'notif.empty': 'Nenhuma notificação.', 'notif.clear': 'Limpar',
  'cmd.home': 'Ir para o Início', 'cmd.projects': 'Ir para Projetos', 'cmd.agenda': 'Abrir a Agenda', 'cmd.leaderboard': 'Ver a Classificação', 'cmd.profile': 'O meu perfil', 'cmd.newProject': 'Criar um projeto', 'cmd.light': 'Tema claro', 'cmd.dark': 'Tema escuro', 'cmd.auto': 'Tema auto (sistema)', 'cmd.open': 'Abrir: ', 'cmd.placeholder': 'Pesquisar uma ação, um projeto…', 'cmd.noResult': 'Sem resultados', 'cmd.toOpen': 'para abrir', 'cmd.toClose': 'para fechar',
  'qt.title': 'Nova tarefa', 'qt.label': 'Título', 'qt.project': 'Projeto', 'qt.pickProject': 'Escolhe um projeto', 'qt.needProject': 'Cria primeiro um projeto para lhe adicionar tarefas.', 'qt.created': 'Tarefa criada ✓', 'qt.due': 'Prazo (opcional)', 'qt.type': 'Tipo', 'qt.priority': 'Prioridade',
  'cal.today': 'Hoje', 'cal.month': 'Mês', 'cal.week': 'Semana', 'cal.day': 'Dia', 'cal.agendaView': 'Agenda', 'cal.year': 'Heatmap (ano)', 'cal.yearTitle': 'Heatmap — atividade do ano', 'cal.nothing': 'Nada previsto', 'cal.nothingDay': 'Nada previsto neste dia.', 'cal.noUpcoming': 'Nenhum prazo próximo.',
  'qa.title': 'Nova reunião', 'qa.optTitle': 'Título (opcional)', 'qa.date': 'Data', 'qa.start': 'Início', 'qa.end': 'Fim', 'qa.needProject': 'Cria primeiro um projeto para adicionar uma reunião.', 'qa.needFields': 'Data e horários necessários', 'qa.created': 'Reunião criada ✓', 'qa.pick': 'Criar na agenda', 'qa.appt': 'Reunião', 'qa.task': 'Tarefa',
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

/** Traduit une clé dans la langue active (repli : français, puis la clé elle-même).
 *  Variables : t('x', { n: 3 }) remplace {n} dans la chaîne. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? fr[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v))
  return s
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
