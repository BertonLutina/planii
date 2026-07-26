-- Préférences d'e-mails transactionnels (clé → booléen ; absente = activé)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifs jsonb NOT NULL DEFAULT '{}'::jsonb;
