-- Langue préférée de l'utilisateur (mails transactionnels dans sa langue)
ALTER TABLE users ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'fr';
