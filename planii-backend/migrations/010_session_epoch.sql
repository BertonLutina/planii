-- Époque de session : un reset de mot de passe l'incrémente et invalide les JWT antérieurs.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_epoch integer NOT NULL DEFAULT 0;
