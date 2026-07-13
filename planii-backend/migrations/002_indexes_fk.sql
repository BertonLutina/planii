-- 002_indexes_fk.sql — index de performance + contraintes FK (idempotent)

CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks (due);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (project_id, status_key);
CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships (user_id);
CREATE INDEX IF NOT EXISTS memberships_project_idx ON memberships (project_id);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects (owner_id);
CREATE INDEX IF NOT EXISTS activity_project_idx ON activity (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invites_project_idx ON invites (project_id);

DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE memberships ADD CONSTRAINT fk_memberships_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE memberships ADD CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
