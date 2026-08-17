/* Écran « Détail d'un projet » — point d'entrée unique.
   `app/project/[id].tsx` importe d'ici, jamais d'un fichier interne. */

export { ProjectHeader } from './ProjectHeader'
export { ProjectSkeleton } from './ProjectSkeleton'

export { useProjectData, type ProjectData } from './lib/useProjectData'
export { taskPerms, type TaskPerms } from './lib/perms'
export { findStatus, statusOf, statusesOf } from './lib/statuses'
export { SHEET_EXIT, afterSheet, errMsg, toastAfterSheet, toastErrAfterSheet } from './lib/flow'

export { CheckRow, type CheckRowProps } from './controls/CheckRow'
export { ChipSelect, type ChipOption, type ChipSelectProps } from './controls/ChipSelect'
export { DateField, type DateFieldProps } from './controls/DateField'
export { TimeField, type TimeFieldProps } from './controls/TimeField'
export { useSheetBody } from './controls/useSheetBody'

export { Tag, type TagProps } from './tasks/Tag'
export { TaskRow, type TaskRowProps } from './tasks/TaskRow'
export { TaskComments } from './tasks/TaskComments'
export { TaskHistory } from './tasks/TaskHistory'
export { TasksTab, type TasksTabProps } from './tasks/TasksTab'
export { TaskSheet, type TaskSheetProps } from './tasks/TaskSheet'
export { NewTaskSheet, type NewTaskSheetProps } from './tasks/TaskFormSheet'
export { TransferSheet, type TransferSheetProps } from './tasks/TransferSheet'
export { StatusAdminSheet, type StatusAdminSheetProps } from './tasks/StatusAdminSheet'
export { ImportWizard, type ImportWizardProps } from './tasks/ImportWizard'

export { MeetingTab, type MeetingTabProps, type MeetingMessage } from './meeting/MeetingTab'
export { MeetingTaskSheet, type MeetingTaskSheetProps } from './meeting/MeetingTaskSheet'
export { DelegatesSheet, type DelegatesSheetProps } from './meeting/DelegatesSheet'

export { TeamTab, type TeamTabProps } from './team/TeamTab'
export { RolesSheet, type RolesSheetProps } from './team/RolesSheet'

export { AppointmentsTab, type AppointmentsTabProps } from './appointments/AppointmentsTab'
export { AppointmentSheet, type AppointmentSheetProps } from './appointments/AppointmentSheet'

export { PollsTab, type PollsTabProps } from './polls/PollsTab'
export { ActivityTab } from './activity/ActivityTab'
