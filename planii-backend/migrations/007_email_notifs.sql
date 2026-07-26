-- Préférences d'e-mails transactionnels (clé → booléen ; absente = activé)
-- Défaut : toutes les notifications e-mail activées
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifs jsonb NOT NULL DEFAULT '{
  "tAssign":true,"tAssignMgr":true,"tNew":true,"remind":true,"late":true,"lateMgr":true,"relance":true,
  "apptNew":true,"apptUpd":true,
  "invNew":true,"invNewAdmin":true,"welcome":true,"joined":true
}'::jsonb;
