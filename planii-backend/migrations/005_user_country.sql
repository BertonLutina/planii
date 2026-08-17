-- Pays de l'utilisateur (inscription)

ALTER TABLE users ADD COLUMN IF NOT EXISTS country text;
