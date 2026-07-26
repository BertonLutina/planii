-- S’assure que les comptes existants (email_notifs vide) ont tout activé par défaut
UPDATE users
SET email_notifs = '{
  "tAssign":true,"tAssignMgr":true,"tNew":true,"remind":true,"late":true,"lateMgr":true,"relance":true,
  "apptNew":true,"apptUpd":true,
  "invNew":true,"invNewAdmin":true,"welcome":true,"joined":true
}'::jsonb
WHERE email_notifs IS NULL
   OR email_notifs = '{}'::jsonb
   OR email_notifs = 'null'::jsonb;
