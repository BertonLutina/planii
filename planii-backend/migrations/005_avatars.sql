-- User and project profile pictures (URLs to files on disk)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_url text;
