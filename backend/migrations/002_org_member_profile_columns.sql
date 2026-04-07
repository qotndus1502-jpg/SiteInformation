-- Add profile columns to site_org_member (matching public.Employee structure)
-- Run this against your Supabase database

ALTER TABLE pmis.site_org_member
  ADD COLUMN IF NOT EXISTS birth_date TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone_work TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS job_category TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT,
  ADD COLUMN IF NOT EXISTS hobby TEXT,
  ADD COLUMN IF NOT EXISTS entry_type TEXT,
  ADD COLUMN IF NOT EXISTS task_detail TEXT,
  ADD COLUMN IF NOT EXISTS resume_data JSONB DEFAULT '{}';

-- Update the view to include new columns
DROP VIEW IF EXISTS pmis.v_site_org_chart;

CREATE VIEW pmis.v_site_org_chart AS
SELECT
  m.id,
  m.site_id,
  m.name,
  m.rank,
  m.phone,
  m.email,
  m.org_type,
  m.company_name,
  m.employee_type,
  m.role_id,
  r.code   AS role_code,
  r.name   AS role_name,
  r.sort_order AS role_sort_order,
  m.department_id,
  d.name   AS department_name,
  d.sort_order AS department_sort_order,
  m.specialty,
  m.parent_id,
  m.sort_order,
  m.is_active,
  m.assigned_from,
  m.assigned_to,
  m.note,
  -- new profile columns
  m.birth_date,
  m.address,
  m.phone_work,
  m.photo_url,
  m.job_category,
  m.skills,
  m.hobby,
  m.entry_type,
  m.task_detail,
  m.resume_data
FROM pmis.site_org_member m
LEFT JOIN pmis.org_role r ON r.id = m.role_id
LEFT JOIN pmis.site_department d ON d.id = m.department_id
WHERE m.is_active = TRUE;
