"use strict";
/** i18n des mails transactionnels — la langue est celle du DESTINATAIRE (users.lang).
 *  mt(lang, clé, vars) remplace {var}. Repli : en → fr → clé. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.M_LANGS = void 0;
exports.mlang = mlang;
exports.mt = mt;
exports.M_LANGS = ['fr', 'en', 'nl', 'es', 'pt', 'it', 'el', 'ru', 'sw'];
const fr = {
    cta: 'Ouvrir Planii',
    'r.project': 'Projet', 'r.task': 'Tâche', 'r.assignee': 'Responsable', 'r.due': 'Échéance', 'r.priority': 'Priorité', 'r.type': 'Type', 'r.origin': 'Origine', 'r.meeting': 'Meeting', 'r.title': 'Intitulé', 'r.slot': 'Date et créneau', 'r.desc': 'Description', 'r.organizer': 'Organisateur',
    'tAssign.s': 'Tâche attribuée : {title}', 'tAssign.i': 'La tâche « {title} » vous a été attribuée dans le projet « {project} ».',
    'tAssignMgr.s': 'Tâche attribuée dans « {project} »', 'tAssignMgr.i': '{actor} a attribué la tâche « {title} » à {assignee}.',
    'tNew.s': 'Nouvelle tâche dans « {project} » : {title}', 'tNew.i': '{actor} a ajouté une tâche non assignée au projet « {project} ».',
    'remind.s': 'Rappel : « {title} » à rendre demain', 'remind.i': 'La tâche « {title} » du projet « {project} » arrive à échéance demain.',
    'late.s': 'En retard : « {title} »', 'late.i': 'Vous êtes en retard sur la tâche « {title} » du projet « {project} ».',
    'lateMgr.s': 'Retard dans « {project} »', 'lateMgr.i': '{assignee} est en retard sur la tâche « {title} ».',
    'relance.s': 'Relance : « {title} »', 'relance.i': '{actor} vous relance pour la tâche « {title} » dans le projet « {project} ».',
    'apptNew.s': 'Rendez-vous : {title}', 'apptNew.i': '{actor} vous a invité(e) à un rendez-vous dans le projet « {project} ».',
    'apptUpd.s': 'Rendez-vous modifié : {title}', 'apptUpd.i': '{actor} a modifié un rendez-vous du projet « {project} » auquel vous participez.',
    'invNew.s': 'Invitation créée — {project}', 'invNew.i': 'Un lien d’invitation ({role}) a été généré pour le projet « {project} ».',
    'invNewAdmin.i': '{actor} a généré un lien d’invitation ({role}) pour « {project} ».',
    'welcome.s': 'Bienvenue dans « {project} »', 'welcome.i': 'Vous avez rejoint le projet « {project} » en tant que {role}.',
    'joined.s': '{actor} a rejoint « {project} »', 'joined.i': '{actor} ({email}) a rejoint votre projet « {project} ».',
};
const en = {
    cta: 'Open Planii',
    'r.project': 'Project', 'r.task': 'Task', 'r.assignee': 'Assignee', 'r.due': 'Due date', 'r.priority': 'Priority', 'r.type': 'Type', 'r.origin': 'Origin', 'r.meeting': 'Meeting', 'r.title': 'Title', 'r.slot': 'Date and time', 'r.desc': 'Description', 'r.organizer': 'Organizer',
    'tAssign.s': 'Task assigned: {title}', 'tAssign.i': 'The task “{title}” was assigned to you in the project “{project}”.',
    'tAssignMgr.s': 'Task assigned in “{project}”', 'tAssignMgr.i': '{actor} assigned the task “{title}” to {assignee}.',
    'tNew.s': 'New task in “{project}”: {title}', 'tNew.i': '{actor} added an unassigned task to the project “{project}”.',
    'remind.s': 'Reminder: “{title}” due tomorrow', 'remind.i': 'The task “{title}” of project “{project}” is due tomorrow.',
    'late.s': 'Overdue: “{title}”', 'late.i': 'You are late on the task “{title}” of project “{project}”.',
    'lateMgr.s': 'Delay in “{project}”', 'lateMgr.i': '{assignee} is late on the task “{title}”.',
    'relance.s': 'Follow-up: “{title}”', 'relance.i': '{actor} is following up on the task “{title}” in the project “{project}”.',
    'apptNew.s': 'Appointment: {title}', 'apptNew.i': '{actor} invited you to an appointment in the project “{project}”.',
    'apptUpd.s': 'Appointment updated: {title}', 'apptUpd.i': '{actor} updated an appointment you attend in the project “{project}”.',
    'invNew.s': 'Invitation created — {project}', 'invNew.i': 'An invitation link ({role}) was generated for the project “{project}”.',
    'invNewAdmin.i': '{actor} generated an invitation link ({role}) for “{project}”.',
    'welcome.s': 'Welcome to “{project}”', 'welcome.i': 'You joined the project “{project}” as {role}.',
    'joined.s': '{actor} joined “{project}”', 'joined.i': '{actor} ({email}) joined your project “{project}”.',
};
const nl = {
    cta: 'Planii openen',
    'r.project': 'Project', 'r.task': 'Taak', 'r.assignee': 'Verantwoordelijke', 'r.due': 'Deadline', 'r.priority': 'Prioriteit', 'r.type': 'Type', 'r.origin': 'Oorsprong', 'r.meeting': 'Meeting', 'r.title': 'Titel', 'r.slot': 'Datum en tijdslot', 'r.desc': 'Beschrijving', 'r.organizer': 'Organisator',
    'tAssign.s': 'Taak toegewezen: {title}', 'tAssign.i': 'De taak “{title}” is aan jou toegewezen in het project “{project}”.',
    'tAssignMgr.s': 'Taak toegewezen in “{project}”', 'tAssignMgr.i': '{actor} heeft de taak “{title}” toegewezen aan {assignee}.',
    'tNew.s': 'Nieuwe taak in “{project}”: {title}', 'tNew.i': '{actor} heeft een niet-toegewezen taak toegevoegd aan het project “{project}”.',
    'remind.s': 'Herinnering: “{title}” morgen in te leveren', 'remind.i': 'De taak “{title}” van project “{project}” vervalt morgen.',
    'late.s': 'Te laat: “{title}”', 'late.i': 'Je bent te laat met de taak “{title}” van project “{project}”.',
    'lateMgr.s': 'Vertraging in “{project}”', 'lateMgr.i': '{assignee} is te laat met de taak “{title}”.',
    'relance.s': 'Herinnering: “{title}”', 'relance.i': '{actor} herinnert je aan de taak “{title}” in het project “{project}”.',
    'apptNew.s': 'Afspraak: {title}', 'apptNew.i': '{actor} heeft je uitgenodigd voor een afspraak in het project “{project}”.',
    'apptUpd.s': 'Afspraak gewijzigd: {title}', 'apptUpd.i': '{actor} heeft een afspraak gewijzigd in het project “{project}” waaraan je deelneemt.',
    'invNew.s': 'Uitnodiging aangemaakt — {project}', 'invNew.i': 'Een uitnodigingslink ({role}) is aangemaakt voor het project “{project}”.',
    'invNewAdmin.i': '{actor} heeft een uitnodigingslink ({role}) aangemaakt voor “{project}”.',
    'welcome.s': 'Welkom in “{project}”', 'welcome.i': 'Je bent toegetreden tot het project “{project}” als {role}.',
    'joined.s': '{actor} is toegetreden tot “{project}”', 'joined.i': '{actor} ({email}) is toegetreden tot jouw project “{project}”.',
};
const es = {
    cta: 'Abrir Planii',
    'r.project': 'Proyecto', 'r.task': 'Tarea', 'r.assignee': 'Responsable', 'r.due': 'Fecha límite', 'r.priority': 'Prioridad', 'r.type': 'Tipo', 'r.origin': 'Origen', 'r.meeting': 'Reunión', 'r.title': 'Título', 'r.slot': 'Fecha y franja', 'r.desc': 'Descripción', 'r.organizer': 'Organizador',
    'tAssign.s': 'Tarea asignada: {title}', 'tAssign.i': 'La tarea «{title}» te fue asignada en el proyecto «{project}».',
    'tAssignMgr.s': 'Tarea asignada en «{project}»', 'tAssignMgr.i': '{actor} asignó la tarea «{title}» a {assignee}.',
    'tNew.s': 'Nueva tarea en «{project}»: {title}', 'tNew.i': '{actor} añadió una tarea sin asignar al proyecto «{project}».',
    'remind.s': 'Recordatorio: «{title}» vence mañana', 'remind.i': 'La tarea «{title}» del proyecto «{project}» vence mañana.',
    'late.s': 'Con retraso: «{title}»', 'late.i': 'Estás con retraso en la tarea «{title}» del proyecto «{project}».',
    'lateMgr.s': 'Retraso en «{project}»', 'lateMgr.i': '{assignee} está con retraso en la tarea «{title}».',
    'relance.s': 'Recordatorio: «{title}»', 'relance.i': '{actor} te recuerda la tarea «{title}» en el proyecto «{project}».',
    'apptNew.s': 'Cita: {title}', 'apptNew.i': '{actor} te invitó a una cita en el proyecto «{project}».',
    'apptUpd.s': 'Cita modificada: {title}', 'apptUpd.i': '{actor} modificó una cita del proyecto «{project}» en la que participas.',
    'invNew.s': 'Invitación creada — {project}', 'invNew.i': 'Se generó un enlace de invitación ({role}) para el proyecto «{project}».',
    'invNewAdmin.i': '{actor} generó un enlace de invitación ({role}) para «{project}».',
    'welcome.s': 'Bienvenido a «{project}»', 'welcome.i': 'Te uniste al proyecto «{project}» como {role}.',
    'joined.s': '{actor} se unió a «{project}»', 'joined.i': '{actor} ({email}) se unió a tu proyecto «{project}».',
};
const pt = {
    cta: 'Abrir Planii',
    'r.project': 'Projeto', 'r.task': 'Tarefa', 'r.assignee': 'Responsável', 'r.due': 'Prazo', 'r.priority': 'Prioridade', 'r.type': 'Tipo', 'r.origin': 'Origem', 'r.meeting': 'Reunião', 'r.title': 'Título', 'r.slot': 'Data e horário', 'r.desc': 'Descrição', 'r.organizer': 'Organizador',
    'tAssign.s': 'Tarefa atribuída: {title}', 'tAssign.i': 'A tarefa «{title}» foi-te atribuída no projeto «{project}».',
    'tAssignMgr.s': 'Tarefa atribuída em «{project}»', 'tAssignMgr.i': '{actor} atribuiu a tarefa «{title}» a {assignee}.',
    'tNew.s': 'Nova tarefa em «{project}»: {title}', 'tNew.i': '{actor} adicionou uma tarefa sem responsável ao projeto «{project}».',
    'remind.s': 'Lembrete: «{title}» vence amanhã', 'remind.i': 'A tarefa «{title}» do projeto «{project}» vence amanhã.',
    'late.s': 'Atrasada: «{title}»', 'late.i': 'Estás atrasado na tarefa «{title}» do projeto «{project}».',
    'lateMgr.s': 'Atraso em «{project}»', 'lateMgr.i': '{assignee} está atrasado na tarefa «{title}».',
    'relance.s': 'Lembrete: «{title}»', 'relance.i': '{actor} relembra-te a tarefa «{title}» no projeto «{project}».',
    'apptNew.s': 'Reunião: {title}', 'apptNew.i': '{actor} convidou-te para uma reunião no projeto «{project}».',
    'apptUpd.s': 'Reunião alterada: {title}', 'apptUpd.i': '{actor} alterou uma reunião do projeto «{project}» em que participas.',
    'invNew.s': 'Convite criado — {project}', 'invNew.i': 'Foi gerado um link de convite ({role}) para o projeto «{project}».',
    'invNewAdmin.i': '{actor} gerou um link de convite ({role}) para «{project}».',
    'welcome.s': 'Bem-vindo a «{project}»', 'welcome.i': 'Juntaste-te ao projeto «{project}» como {role}.',
    'joined.s': '{actor} juntou-se a «{project}»', 'joined.i': '{actor} ({email}) juntou-se ao teu projeto «{project}».',
};
const it = {
    cta: 'Apri Planii',
    'r.project': 'Progetto', 'r.task': 'Attività', 'r.assignee': 'Responsabile', 'r.due': 'Scadenza', 'r.priority': 'Priorità', 'r.type': 'Tipo', 'r.origin': 'Origine', 'r.meeting': 'Riunione', 'r.title': 'Titolo', 'r.slot': 'Data e orario', 'r.desc': 'Descrizione', 'r.organizer': 'Organizzatore',
    'tAssign.s': 'Attività assegnata: {title}', 'tAssign.i': 'L’attività «{title}» ti è stata assegnata nel progetto «{project}».',
    'tAssignMgr.s': 'Attività assegnata in «{project}»', 'tAssignMgr.i': '{actor} ha assegnato l’attività «{title}» a {assignee}.',
    'tNew.s': 'Nuova attività in «{project}»: {title}', 'tNew.i': '{actor} ha aggiunto un’attività non assegnata al progetto «{project}».',
    'remind.s': 'Promemoria: «{title}» scade domani', 'remind.i': 'L’attività «{title}» del progetto «{project}» scade domani.',
    'late.s': 'In ritardo: «{title}»', 'late.i': 'Sei in ritardo sull’attività «{title}» del progetto «{project}».',
    'lateMgr.s': 'Ritardo in «{project}»', 'lateMgr.i': '{assignee} è in ritardo sull’attività «{title}».',
    'relance.s': 'Sollecito: «{title}»', 'relance.i': '{actor} ti sollecita per l’attività «{title}» nel progetto «{project}».',
    'apptNew.s': 'Appuntamento: {title}', 'apptNew.i': '{actor} ti ha invitato a un appuntamento nel progetto «{project}».',
    'apptUpd.s': 'Appuntamento modificato: {title}', 'apptUpd.i': '{actor} ha modificato un appuntamento del progetto «{project}» a cui partecipi.',
    'invNew.s': 'Invito creato — {project}', 'invNew.i': 'È stato generato un link di invito ({role}) per il progetto «{project}».',
    'invNewAdmin.i': '{actor} ha generato un link di invito ({role}) per «{project}».',
    'welcome.s': 'Benvenuto in «{project}»', 'welcome.i': 'Ti sei unito al progetto «{project}» come {role}.',
    'joined.s': '{actor} si è unito a «{project}»', 'joined.i': '{actor} ({email}) si è unito al tuo progetto «{project}».',
};
const el = {
    cta: 'Άνοιγμα Planii',
    'r.project': 'Έργο', 'r.task': 'Εργασία', 'r.assignee': 'Υπεύθυνος', 'r.due': 'Προθεσμία', 'r.priority': 'Προτεραιότητα', 'r.type': 'Τύπος', 'r.origin': 'Προέλευση', 'r.meeting': 'Συνάντηση', 'r.title': 'Τίτλος', 'r.slot': 'Ημερομηνία και ώρα', 'r.desc': 'Περιγραφή', 'r.organizer': 'Διοργανωτής',
    'tAssign.s': 'Ανάθεση εργασίας: {title}', 'tAssign.i': 'Η εργασία «{title}» σου ανατέθηκε στο έργο «{project}».',
    'tAssignMgr.s': 'Ανάθεση εργασίας στο «{project}»', 'tAssignMgr.i': 'Ο/Η {actor} ανέθεσε την εργασία «{title}» στον/στην {assignee}.',
    'tNew.s': 'Νέα εργασία στο «{project}»: {title}', 'tNew.i': 'Ο/Η {actor} πρόσθεσε μια μη ανατεθειμένη εργασία στο έργο «{project}».',
    'remind.s': 'Υπενθύμιση: «{title}» λήγει αύριο', 'remind.i': 'Η εργασία «{title}» του έργου «{project}» λήγει αύριο.',
    'late.s': 'Καθυστέρηση: «{title}»', 'late.i': 'Έχεις καθυστερήσει στην εργασία «{title}» του έργου «{project}».',
    'lateMgr.s': 'Καθυστέρηση στο «{project}»', 'lateMgr.i': 'Ο/Η {assignee} έχει καθυστερήσει στην εργασία «{title}».',
    'relance.s': 'Υπενθύμιση: «{title}»', 'relance.i': 'Ο/Η {actor} σου υπενθυμίζει την εργασία «{title}» στο έργο «{project}».',
    'apptNew.s': 'Ραντεβού: {title}', 'apptNew.i': 'Ο/Η {actor} σε προσκάλεσε σε ραντεβού στο έργο «{project}».',
    'apptUpd.s': 'Αλλαγή ραντεβού: {title}', 'apptUpd.i': 'Ο/Η {actor} άλλαξε ένα ραντεβού του έργου «{project}» στο οποίο συμμετέχεις.',
    'invNew.s': 'Δημιουργία πρόσκλησης — {project}', 'invNew.i': 'Δημιουργήθηκε σύνδεσμος πρόσκλησης ({role}) για το έργο «{project}».',
    'invNewAdmin.i': 'Ο/Η {actor} δημιούργησε σύνδεσμο πρόσκλησης ({role}) για το «{project}».',
    'welcome.s': 'Καλωσήρθες στο «{project}»', 'welcome.i': 'Μπήκες στο έργο «{project}» ως {role}.',
    'joined.s': 'Ο/Η {actor} μπήκε στο «{project}»', 'joined.i': 'Ο/Η {actor} ({email}) μπήκε στο έργο σου «{project}».',
};
const ru = {
    cta: 'Открыть Planii',
    'r.project': 'Проект', 'r.task': 'Задача', 'r.assignee': 'Ответственный', 'r.due': 'Срок', 'r.priority': 'Приоритет', 'r.type': 'Тип', 'r.origin': 'Источник', 'r.meeting': 'Встреча', 'r.title': 'Название', 'r.slot': 'Дата и время', 'r.desc': 'Описание', 'r.organizer': 'Организатор',
    'tAssign.s': 'Задача назначена: {title}', 'tAssign.i': 'Задача «{title}» назначена вам в проекте «{project}».',
    'tAssignMgr.s': 'Задача назначена в «{project}»', 'tAssignMgr.i': '{actor} назначил(а) задачу «{title}» — {assignee}.',
    'tNew.s': 'Новая задача в «{project}»: {title}', 'tNew.i': '{actor} добавил(а) неназначенную задачу в проект «{project}».',
    'remind.s': 'Напоминание: «{title}» — срок завтра', 'remind.i': 'Срок задачи «{title}» проекта «{project}» истекает завтра.',
    'late.s': 'Просрочено: «{title}»', 'late.i': 'Вы просрочили задачу «{title}» проекта «{project}».',
    'lateMgr.s': 'Задержка в «{project}»', 'lateMgr.i': '{assignee} просрочил(а) задачу «{title}».',
    'relance.s': 'Напоминание: «{title}»', 'relance.i': '{actor} напоминает вам о задаче «{title}» в проекте «{project}».',
    'apptNew.s': 'Встреча: {title}', 'apptNew.i': '{actor} пригласил(а) вас на встречу в проекте «{project}».',
    'apptUpd.s': 'Встреча изменена: {title}', 'apptUpd.i': '{actor} изменил(а) встречу проекта «{project}», в которой вы участвуете.',
    'invNew.s': 'Приглашение создано — {project}', 'invNew.i': 'Создана пригласительная ссылка ({role}) для проекта «{project}».',
    'invNewAdmin.i': '{actor} создал(а) пригласительную ссылку ({role}) для «{project}».',
    'welcome.s': 'Добро пожаловать в «{project}»', 'welcome.i': 'Вы присоединились к проекту «{project}» как {role}.',
    'joined.s': '{actor} присоединился(лась) к «{project}»', 'joined.i': '{actor} ({email}) присоединился(лась) к вашему проекту «{project}».',
};
const sw = {
    cta: 'Fungua Planii',
    'r.project': 'Mradi', 'r.task': 'Kazi', 'r.assignee': 'Mhusika', 'r.due': 'Tarehe ya mwisho', 'r.priority': 'Kipaumbele', 'r.type': 'Aina', 'r.origin': 'Chanzo', 'r.meeting': 'Mkutano', 'r.title': 'Kichwa', 'r.slot': 'Tarehe na muda', 'r.desc': 'Maelezo', 'r.organizer': 'Mratibu',
    'tAssign.s': 'Kazi imekabidhiwa: {title}', 'tAssign.i': 'Kazi «{title}» imekabidhiwa kwako katika mradi «{project}».',
    'tAssignMgr.s': 'Kazi imekabidhiwa katika «{project}»', 'tAssignMgr.i': '{actor} amemkabidhi {assignee} kazi «{title}».',
    'tNew.s': 'Kazi mpya katika «{project}»: {title}', 'tNew.i': '{actor} ameongeza kazi isiyo na mhusika kwenye mradi «{project}».',
    'remind.s': 'Kumbusho: «{title}» inatakiwa kesho', 'remind.i': 'Kazi «{title}» ya mradi «{project}» inafikia mwisho kesho.',
    'late.s': 'Imechelewa: «{title}»', 'late.i': 'Umechelewa kwenye kazi «{title}» ya mradi «{project}».',
    'lateMgr.s': 'Ucheleweshaji katika «{project}»', 'lateMgr.i': '{assignee} amechelewa kwenye kazi «{title}».',
    'relance.s': 'Kumbusho: «{title}»', 'relance.i': '{actor} anakukumbusha kazi «{title}» katika mradi «{project}».',
    'apptNew.s': 'Miadi: {title}', 'apptNew.i': '{actor} amekualika kwenye miadi katika mradi «{project}».',
    'apptUpd.s': 'Miadi imebadilishwa: {title}', 'apptUpd.i': '{actor} amebadilisha miadi ya mradi «{project}» unaoshiriki.',
    'invNew.s': 'Mwaliko umeundwa — {project}', 'invNew.i': 'Kiungo cha mwaliko ({role}) kimeundwa kwa mradi «{project}».',
    'invNewAdmin.i': '{actor} ameunda kiungo cha mwaliko ({role}) kwa «{project}».',
    'welcome.s': 'Karibu katika «{project}»', 'welcome.i': 'Umejiunga na mradi «{project}» kama {role}.',
    'joined.s': '{actor} amejiunga na «{project}»', 'joined.i': '{actor} ({email}) amejiunga na mradi wako «{project}».',
};
const DICTS = { fr, en, nl, es, pt, it, el, ru, sw };
/** Normalise une langue stockée (défaut fr). */
function mlang(l) {
    const v = (l || 'fr').slice(0, 2).toLowerCase();
    return (exports.M_LANGS.includes(v) ? v : 'fr');
}
/** Traduit une clé mail dans la langue donnée, avec variables {x}. */
function mt(lang, key, vars) {
    const L = DICTS[mlang(lang)];
    let s = L[key] ?? en[key] ?? fr[key] ?? key;
    if (vars)
        for (const [k, v] of Object.entries(vars))
            s = s.split('{' + k + '}').join(String(v));
    return s;
}
//# sourceMappingURL=mail-i18n.js.map