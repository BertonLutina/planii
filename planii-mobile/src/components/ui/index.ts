/* Kit d'interface Planii — point d'entrée unique.
   Les écrans importent depuis '@/components/ui', jamais depuis un fichier interne. */

export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button'
export { Card, type CardProps } from './Card'
export { Pill, type PillProps, type PillTone } from './Pill'
export { Chip, type ChipProps } from './Chip'
export { PriorityFlag, type PriorityFlagProps } from './PriorityFlag'
export { Field, type FieldProps } from './Field'
export { SelectBox, type SelectBoxProps, type SelectOption } from './SelectBox'
export { Tabs, type TabItem, type TabsProps } from './Tabs'
export { Avatar, type AvatarProps } from './Avatar'
export { ProgressBar, type ProgressBarProps } from './ProgressBar'
export { Banner, type BannerProps, type BannerTone } from './Banner'
export { StatCard, type StatCardProps } from './StatCard'
export { EmptyState, type EmptyStateProps } from './EmptyState'
export { Skeleton, SkeletonList, type SkeletonListProps, type SkeletonProps } from './Skeleton'
export { Sheet, type SheetProps } from './Sheet'
export { ActionMenu, type ActionItem, type ActionMenuProps } from './ActionMenu'
export { Confirm, type ConfirmProps } from './Confirm'
export { GroupHeader, SectionHeader, type GroupHeaderProps, type SectionHeaderProps } from './Headers'
export { ToastProvider, toast, toastErr, type ToastProviderProps } from './Toast'
export { Switch, type SwitchProps } from './Switch'

/* Utilitaires partagés */
export { priorityColors, resolveTone, toneColors, type Tone, type ToneColors, type TypeTone } from './tone'
export { useReduceMotion } from './useReduceMotion'

/* Hors du kit mais du même registre visuel */
export { Fab, type FabProps } from '@/components/Fab'
export { Ic, ICON_NAMES, type IconName, type IcProps } from '@/components/Icon'
