-- 001_schema.sql — schéma initial Planii (idempotent)

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  pass_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS task_types jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_library jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS project_label_colors jsonb;

CREATE TABLE IF NOT EXISTS admin_audit (
  id text PRIMARY KEY,
  actor_id text,
  actor_name text,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  owner_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  deadline text,
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz
);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS label_id text;

CREATE TABLE IF NOT EXISTS project_labels (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  label text NOT NULL,
  color text NOT NULL,
  position int NOT NULL DEFAULT 0,
  fixed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  user_id text NOT NULL,
  role text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS position int;

CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  title text NOT NULL,
  assignee_id text,
  created_by text NOT NULL,
  due text,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS est_hours numeric;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spent_hours numeric;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 6;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position int;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_key text NOT NULL DEFAULT 'todo';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transferred_from text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transferred_to text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transferable boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS task_transfers (
  id text PRIMARY KEY,
  task_id text NOT NULL,
  project_id text NOT NULL,
  from_user_id text,
  to_user_id text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_statuses (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#9a988f',
  position int NOT NULL DEFAULT 0,
  fixed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, key)
);

CREATE TABLE IF NOT EXISTS project_roles (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_roles (
  project_id text NOT NULL,
  user_id text NOT NULL,
  role_id text NOT NULL,
  PRIMARY KEY(project_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS project_meeting_task_delegates (
  project_id text NOT NULL,
  user_id text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_reminders (
  task_id text NOT NULL,
  for_date date NOT NULL,
  PRIMARY KEY(task_id, for_date)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id text PRIMARY KEY,
  task_id text NOT NULL,
  project_id text NOT NULL,
  user_id text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments (task_id, created_at ASC);

CREATE TABLE IF NOT EXISTS task_events (
  id text PRIMARY KEY,
  task_id text NOT NULL,
  project_id text NOT NULL,
  actor_id text,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_events_task_idx ON task_events (task_id, created_at ASC);

CREATE TABLE IF NOT EXISTS invites (
  token text PRIMARY KEY,
  project_id text NOT NULL,
  role text NOT NULL,
  email text,
  created_by text NOT NULL,
  expires_at timestamptz NOT NULL,
  multi boolean NOT NULL DEFAULT false,
  uses int NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS polls (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  question text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS poll_options (
  id text PRIMARY KEY,
  poll_id text NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id text NOT NULL,
  option_id text NOT NULL,
  user_id text NOT NULL,
  PRIMARY KEY(poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS activity (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  user_id text,
  type text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  detail text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS meeting_messages (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  user_id text NOT NULL,
  body text NOT NULL,
  created_task_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meeting_messages_project_idx ON meeting_messages (project_id, created_at ASC);
