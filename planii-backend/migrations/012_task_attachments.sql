-- 012_task_attachments.sql — fichiers joints aux tâches (PDF, Word, Excel, images…)
-- Le contenu vit sur disque (voir attachment.service.ts) ; ici seulement les métadonnées.

CREATE TABLE IF NOT EXISTS task_attachments (
  id text PRIMARY KEY,
  task_id text NOT NULL,
  project_id text NOT NULL,
  uploader_id text,
  name text NOT NULL,
  mime text NOT NULL,
  size bigint NOT NULL,
  storage_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_attachments_task_idx ON task_attachments (task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS task_attachments_project_idx ON task_attachments (project_id);

DO $$ BEGIN
  ALTER TABLE task_attachments ADD CONSTRAINT fk_task_attachments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE task_attachments ADD CONSTRAINT fk_task_attachments_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Si le compte de l'auteur est supprimé, le fichier reste attaché à la tâche.
DO $$ BEGIN
  ALTER TABLE task_attachments ADD CONSTRAINT fk_task_attachments_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
