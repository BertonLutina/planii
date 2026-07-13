-- 003_appointments.sql — rendez-vous de projet

CREATE TABLE IF NOT EXISTS appointments (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  appointment_date text NOT NULL,
  time_start text NOT NULL,
  time_end text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_participants (
  appointment_id text NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  PRIMARY KEY (appointment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_appointments_project ON appointments(project_id, appointment_date);
