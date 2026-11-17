-- 011_mcp_oauth.sql — connecteur MCP : OAuth 2.1 (clients, codes, jetons) + journal d'audit (idempotent)
-- Les jetons et codes ne sont JAMAIS stockés en clair : seul leur hash SHA-256 l'est.

-- Applications (assistants IA) enregistrées dynamiquement (RFC 7591). Clients publics + PKCE uniquement.
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id text PRIMARY KEY,
  client_name text NOT NULL,
  redirect_uris jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Une « connexion » = une autorisation accordée par un utilisateur à une application.
-- C'est ce que l'utilisateur voit dans Profil → Assistants IA et qu'il peut révoquer.
CREATE TABLE IF NOT EXISTS oauth_connections (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  client_id text NOT NULL,
  scope text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS oauth_connections_user_idx ON oauth_connections (user_id, created_at DESC);

-- Codes d'autorisation à usage unique (10 min max)
CREATE TABLE IF NOT EXISTS oauth_codes (
  code_hash text PRIMARY KEY,
  client_id text NOT NULL,
  user_id text NOT NULL,
  redirect_uri text NOT NULL,
  scope text NOT NULL,
  code_challenge text NOT NULL,
  resource text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- Jetons d'accès (courts) et de rafraîchissement (rotation à chaque usage)
CREATE TABLE IF NOT EXISTS oauth_tokens (
  token_hash text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('access', 'refresh')),
  connection_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oauth_tokens_conn_idx ON oauth_tokens (connection_id);

-- Historique des actions faites par un assistant (visible par l'utilisateur concerné)
CREATE TABLE IF NOT EXISTS mcp_audit (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  connection_id text,
  client_name text,
  tool text NOT NULL,
  write boolean NOT NULL DEFAULT false,
  ok boolean NOT NULL DEFAULT true,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mcp_audit_user_idx ON mcp_audit (user_id, created_at DESC);
