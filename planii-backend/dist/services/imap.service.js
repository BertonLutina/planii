"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imapList = imapList;
exports.imapRead = imapRead;
const imapflow_1 = require("imapflow");
const mailparser_1 = require("mailparser");
const env_1 = require("../config/env");
const imapClient = () => new imapflow_1.ImapFlow({
    host: env_1.env.IMAP_HOST,
    port: env_1.env.IMAP_PORT,
    secure: true,
    auth: { user: env_1.env.SMTP_USER, pass: env_1.env.SMTP_PASS },
    logger: false,
});
async function imapList(limit = 30) {
    const client = imapClient();
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const out = [];
    try {
        const total = client.mailbox && typeof client.mailbox !== 'boolean' ? client.mailbox.exists || 0 : 0;
        if (total > 0) {
            const start = Math.max(1, total - limit + 1);
            for await (const m of client.fetch(`${start}:*`, { envelope: true, flags: true })) {
                const f = (m.envelope?.from && m.envelope.from[0]) || {};
                out.push({
                    uid: m.uid,
                    from: f.address || '',
                    fromName: f.name || f.address || '',
                    subject: m.envelope?.subject || '(sans objet)',
                    date: m.envelope?.date,
                    seen: m.flags ? m.flags.has('\\Seen') : true,
                });
            }
        }
    }
    finally {
        lock.release();
        await client.logout();
    }
    return out.reverse();
}
async function imapRead(uid) {
    const client = imapClient();
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    let out = null;
    try {
        const m = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (m && m.source) {
            const p = await (0, mailparser_1.simpleParser)(m.source);
            out = {
                uid,
                from: (p.from && p.from.text) || '',
                to: (p.to && p.to.text) || '',
                subject: p.subject || '(sans objet)',
                date: p.date,
                text: p.text || '',
                html: p.html || '',
                messageId: p.messageId || '',
                replyTo: (p.from && p.from.value && p.from.value[0] && p.from.value[0].address) || '',
            };
        }
        try {
            await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        }
        catch { /* noop */ }
    }
    finally {
        lock.release();
        await client.logout();
    }
    return out;
}
//# sourceMappingURL=imap.service.js.map