import { StyleSheet, Text, View } from 'react-native'
import { Button, Pill, ProgressBar, Sheet } from '@/components/ui'
import { formatDue } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { health } from '@/lib/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { Kv } from './AdminParts'
import { fmtDate } from './format'
import type { AProject } from './types'

/** Libellé du type de projet (`solo` → « 1-à-1 »). */
export const typeLabel = (type: string) =>
  t('proj.type' + type.charAt(0).toUpperCase() + type.slice(1)) || type

/* Fiche d'un projet. La ligne du web porte nom, type, statut, propriétaire,
   e-mail masqué et trois compteurs ; la carte mobile n'en garde que le nom,
   l'état et l'avancement — ce qu'on compare d'un projet à l'autre. Le reste,
   dont `deadline` et `createdAt` que le web n'affiche même pas, est ici. */

export interface ProjectSheetProps {
  open: boolean
  project: AProject | null
  onClose: () => void
  onDelete: () => void
}

export function ProjectSheet({ open, project, onClose, onDelete }: ProjectSheetProps) {
  const { c } = useTheme()
  const h = project ? health(Number(project.taskCount), Number(project.doneCount), project.status) : null

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={project?.name ?? t('ad.projects')}
      actions={<Button label={t('action.close')} variant="ghost" block onPress={onClose} style={s.grow} />}
    >
      {!!project && !!h && (
        <>
          <View style={s.head}>
            <Pill label={typeLabel(project.type)} tone="blue" />
            <Pill
              label={project.status === 'done' ? t('proj.closed') : t('projects.active')}
              tone={project.status === 'done' ? 'ok' : 'accent'}
            />
          </View>

          <View style={s.prog}>
            <ProgressBar
              value={h.done}
              total={h.total}
              color={c[h.color]}
              accessibilityLabel={`${h.done}/${h.total} ${t('projects.tasks')} — ${h.pct} %`}
              style={s.bar}
            />
            <Text style={[s.pct, { color: c[h.color] }]}>{h.pct} %</Text>
          </View>

          <Kv label={t('td.assignee')} value={project.ownerName} />
          <Kv label={t('profile.email')} value={project.ownerEmail} />
          <Kv label={t('projects.members')} value={String(project.memberCount)} />
          <Kv label={t('ad.tasks')} value={`${project.doneCount}/${project.taskCount}`} />
          <Kv
            label={t('pd.deadline')}
            value={project.deadline ? `${fmtDate(project.deadline)} · ${formatDue(project.deadline)}` : '—'}
          />
          <Kv label={t('ad.registered')} value={fmtDate(project.createdAt)} last />

          <View style={s.acts}>
            <Button label={t('action.delete')} icon="trash" variant="danger" block onPress={onDelete} />
          </View>
        </>
      )}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  prog: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  bar: { flex: 1 },
  pct: { fontSize: 12.5, fontWeight: '800', minWidth: 44, textAlign: 'right' },
  acts: { marginTop: 18 },
})
