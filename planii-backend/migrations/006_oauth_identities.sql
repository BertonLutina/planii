-- OAuth social login: nullable password + linked identities
ALTER TABLE users ALTER COLUMN pass_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS user_identities (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  subject text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, subject)
);

CREATE INDEX IF NOT EXISTS user_identities_user_idx ON user_identities (user_id);
