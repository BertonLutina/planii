import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Banner, Button, SectionHeader, Sheet, Skeleton } from '@/components/ui'
import { MicField, MicTextArea } from '@/components/Mic'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '@/screens/project/lib/flow'
import { useTheme } from '@/theme/ThemeProvider'
import { Kv } from './AdminParts'
import { fmtDateTime, htmlToText } from './format'
import type { MailMsg } from './types'

/* Lecture et réponse — portage du bloc `open` de `Mailbox`
   (planii-vite/src/components/Admin.tsx).

   Le web remplace la liste par une page de lecture, puis pose la réponse dans
   une carte en dessous. Sur mobile c'est une seule feuille : entête, corps qui
   défile, et le champ de réponse au bout. Deux feuilles empilées (lecture puis
   réponse) sont interdites, et de toute façon on veut relire ce à quoi on
   répond.

   Le clavier est déjà géré : `Sheet` enveloppe son contenu dans un
   `KeyboardAvoidingView` (voir components/ui/Sheet.tsx). En imbriquer un second
   doublerait le décalage. */

export interface MailSheetProps {
  open: boolean
  /** `null` tant que `GET /admin/mail/:uid` n'a pas répondu. */
  msg: MailMsg | null
  error: string | null
  onClose: () => void
  onRetry: () => void
  /** Rechargement de la liste après un envoi. */
  onReplied: () => void
}

export function MailSheet({ open, msg, error, onClose, onRetry, onReplied }: MailSheetProps) {
  const { c } = useTheme()
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => { if (!open) { setReply(''); setSending(false) } }, [open])

  async function send() {
    if (!msg || !reply.trim()) return
    setSending(true)
    try {
      await api('POST', `/admin/mail/${msg.uid}/reply`, { body: reply })
      setSending(false)
      onClose()
      toastAfterSheet(t('ad.replySent'))
      onReplied()
    } catch (e) {
      setSending(false)
      onClose()
      toastErrAfterSheet(errMsg(e))
    }
  }

  const body = msg?.text || htmlToText(msg?.html) || t('ad.emptyMsg')

  return (
    <Sheet
      open={open}
      onClose={sending ? () => { /* envoi en cours */ } : onClose}
      title={msg?.subject ?? t('ad.opening')}
      actions={
        msg
          ? (
            <>
              <Button
                label={sending ? t('ad.sending') : t('ad.sendReply')}
                variant="primary"
                icon="send"
                loading={sending}
                disabled={!reply.trim()}
                onPress={send}
                style={s.grow}
              />
              <Button label={t('action.close')} variant="ghost" disabled={sending} onPress={onClose} style={s.grow} />
            </>
          )
          : <Button label={t('action.close')} variant="ghost" block onPress={onClose} style={s.grow} />
      }
    >
      {!!error && (
        <>
          <Banner tone="danger" icon="alert" text={error} />
          <Button label={t('ad.refresh')} icon="refresh" onPress={onRetry} style={s.retry} />
        </>
      )}

      {!error && !msg && (
        <View accessibilityRole="progressbar" accessibilityLabel={t('ad.opening')} style={s.load}>
          <Skeleton width="64%" height={13} />
          <Skeleton width="46%" height={13} />
          <Skeleton width="100%" height={96} />
        </View>
      )}

      {!!msg && (
        <>
          <Kv label={t('ad.from')} value={msg.from} />
          <Kv label={t('ad.on')} value={fmtDateTime(msg.date)} last />
          <Text selectable style={[s.body, { color: c.text }]}>{body}</Text>

          <SectionHeader title={t('ad.reply')} />
          <MicTextArea
            label={`${t('ad.replyTo')} ${msg.replyTo || msg.from}`}
            value={reply}
            onChangeText={setReply}
            placeholder={t('ad.message')}
            editable={!sending}
          />
        </>
      )}
    </Sheet>
  )
}

export interface ComposeSheetProps {
  open: boolean
  onClose: () => void
  onSent: () => void
}

/** Nouveau message — portage de `Compose`. Destinataire et objet obligatoires,
 *  signalés dans le champ fautif plutôt que par un toast (le web en émet un
 *  sous sa modale, invisible ici). */
export function ComposeSheet({ open, onClose, onSent }: ComposeSheetProps) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [err, setErr] = useState<{ to?: string; subject?: string }>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) return
    setTo(''); setSubject(''); setBody(''); setErr({}); setBusy(false)
  }, [open])

  async function send() {
    if (!to.trim()) { setErr({ to: t('ad.needToSubject') }); return }
    if (!subject.trim()) { setErr({ subject: t('ad.needToSubject') }); return }
    setErr({})
    setBusy(true)
    try {
      await api('POST', '/admin/mail/send', { to: to.trim(), subject: subject.trim(), body })
      setBusy(false)
      onClose()
      toastAfterSheet(t('ad.sent'))
      onSent()
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet(errMsg(e))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={busy ? () => { /* envoi en cours */ } : onClose}
      title={t('ad.compose')}
      actions={
        <>
          <Button label={t('ad.send')} variant="primary" icon="send" loading={busy} onPress={send} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" disabled={busy} onPress={onClose} style={s.grow} />
        </>
      }
    >
      <MicField
        label={t('ad.to')}
        value={to}
        onChangeText={setTo}
        placeholder="destinataire@exemple.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={err.to}
        editable={!busy}
      />
      <MicField
        label={t('ad.subject')}
        value={subject}
        onChangeText={setSubject}
        error={err.subject}
        editable={!busy}
      />
      <MicTextArea
        label={t('ad.message')}
        value={body}
        onChangeText={setBody}
        editable={!busy}
        inputStyle={s.compose}
      />
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  retry: { alignSelf: 'flex-start', marginBottom: 6 },
  load: { gap: 10, paddingVertical: 4 },
  body: { fontSize: 14.5, lineHeight: 21, marginTop: 14 },
  compose: { minHeight: 132 },
})
