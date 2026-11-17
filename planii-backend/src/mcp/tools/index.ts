import { overviewTools } from './overview'
import { projectTools } from './projects'
import { taskTools } from './tasks'
import { appointmentTools } from './appointments'

/** Catalogue des outils MCP de Planii. Pour en ajouter un : l'écrire dans le fichier de son domaine (ou en créer un) et l'ajouter ici. */
export const allTools = [...overviewTools, ...projectTools, ...taskTools, ...appointmentTools]
