import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../logger'

const mailEsc = (s: unknown) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export type MailLayoutOpts = {
  title?: string
  intro?: string
  rows?: ([string, string] | null)[]
  ctaText?: string
  ctaUrl?: string
  footer?: string
}

export function mailLayout({ title, intro, rows = [], ctaText, ctaUrl, footer }: MailLayoutOpts) {
  const rowsHtml = rows.filter(Boolean).map((r) =>
    `<tr><td style="padding:6px 0;color:#6b6a63;font-size:13px;width:130px;vertical-align:top">${mailEsc(r![0])}</td><td style="padding:6px 0;color:#26251f;font-size:14px;font-weight:600">${mailEsc(r![1])}</td></tr>`).join('')
  const cta = ctaText && ctaUrl
    ? `<a href="${mailEsc(ctaUrl)}" style="display:inline-block;margin-top:18px;background:#534AB7;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px">${mailEsc(ctaText)}</a>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#faf9f5;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6e3da;border-radius:14px;overflow:hidden"><tr><td style="background:#534AB7;padding:16px 22px;color:#fff;font-size:18px;font-weight:700">Planii</td></tr><tr><td style="padding:22px"><div style="font-size:17px;font-weight:700;color:#26251f;margin-bottom:8px">${mailEsc(title)}</div>${intro ? `<div style="font-size:14px;color:#3f3e39;line-height:1.55;margin-bottom:14px">${mailEsc(intro)}</div>` : ''}${rowsHtml ? `<table role="presentation" style="width:100%;border-top:1px solid #f0eee7;border-bottom:1px solid #f0eee7;margin:4px 0">${rowsHtml}</table>` : ''}${cta}</td></tr><tr><td style="padding:14px 22px;color:#93918a;font-size:12px;border-top:1px solid #f0eee7">${mailEsc(footer || 'Vous recevez cet e-mail car vous utilisez Planii.')}</td></tr></table></body></html>`
}

const mailer = env.mailOn
  ? nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.smtpSecure,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
  : null

if (env.mailOn) {
  logger.info(`Mailer activé (${env.SMTP_HOST}:${env.SMTP_PORT}, exp. ${env.SMTP_USER})`)
} else {
  logger.info('Mailer désactivé (SMTP_PASS absent).')
}

export async function sendMail(to: string, subject: string, layoutOpts: MailLayoutOpts) {
  if (!env.mailOn || !to || !mailer) return
  try {
    await mailer.sendMail({
      from: env.mailFrom,
      to,
      subject,
      html: mailLayout({ title: subject, ...layoutOpts }),
      text: layoutOpts.intro || subject,
    })
  } catch (e) {
    logger.error({ err: e }, 'Échec envoi mail')
  }
}

export async function sendRaw({ to, subject, text, inReplyTo }: { to: string; subject: string; text: string; inReplyTo?: string }) {
  if (!env.mailOn || !mailer) throw new Error('Mail non configuré')
  const opts: nodemailer.SendMailOptions = { from: env.mailFrom, to, subject, text }
  if (inReplyTo) {
    opts.inReplyTo = inReplyTo
    opts.references = inReplyTo
  }
  await mailer.sendMail(opts)
}
