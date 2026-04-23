-- Migration 008: Manual status override flag
-- Track whether the admin has explicitly pinned a site's status. When true,
-- the backend's date-based auto_status logic skips the row and the admin's
-- chosen value is preserved.

ALTER TABLE pmis.project_site
  ADD COLUMN IF NOT EXISTS status_manual BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_project_site_status_manual
  ON pmis.project_site(status_manual) WHERE status_manual = TRUE;
