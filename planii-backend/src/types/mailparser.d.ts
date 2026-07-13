declare module 'mailparser' {
  export function simpleParser(source: Buffer | string): Promise<{
    from?: { text?: string; value?: { address?: string }[] }
    to?: { text?: string }
    subject?: string
    date?: Date
    text?: string
    html?: string
    messageId?: string
  }>
}
