-- Migration: Create organization chart tables
-- Tables: org_role, site_department, site_org_member
-- View: v_site_org_chart

-- 1. 직책 마스터
CREATE TABLE IF NOT EXISTS pmis.org_role (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pmis.org_role ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access" ON pmis.org_role FOR ALL USING (true) WITH CHECK (true);

INSERT INTO pmis.org_role (code, name, sort_order) VALUES
  ('SITE_REP',     '현장대리인',   10),
  ('SITE_MANAGER', '현장소장',     20),
  ('DEPT_HEAD',    '팀장',         30),
  ('QUALITY_MGR',  '품질관리자',   40),
  ('SAFETY_MGR',   '안전관리자',   50),
  ('MANAGER',      '매니저',       60),
  ('MEMBER',       '팀원',        100);

-- 2. 현장별 부서
CREATE TABLE IF NOT EXISTS pmis.site_department (
  id          SERIAL PRIMARY KEY,
  site_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pmis.site_department ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access" ON pmis.site_department FOR ALL USING (true) WITH CHECK (true);

-- 3. 현장 조직원
CREATE TABLE IF NOT EXISTS pmis.site_org_member (
  id              SERIAL PRIMARY KEY,
  site_id         INTEGER NOT NULL,
  name            TEXT NOT NULL,
  rank            TEXT,
  phone           TEXT,
  email           TEXT,
  org_type        TEXT NOT NULL DEFAULT 'OWN',
  company_name    TEXT,
  employee_type   TEXT DEFAULT '일반직',
  role_id         INTEGER NOT NULL REFERENCES pmis.org_role(id),
  department_id   INTEGER REFERENCES pmis.site_department(id),
  specialty       TEXT,
  parent_id       INTEGER REFERENCES pmis.site_org_member(id) ON DELETE SET NULL,
  sort_order      INTEGER NOT NULL DEFAULT 100,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_from   DATE,
  assigned_to     DATE,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_site_org_member_site ON pmis.site_org_member(site_id);
CREATE INDEX idx_site_org_member_parent ON pmis.site_org_member(parent_id);
CREATE INDEX idx_site_org_member_dept ON pmis.site_org_member(department_id);
CREATE INDEX idx_site_org_member_active ON pmis.site_org_member(site_id, is_active) WHERE is_active = TRUE;

ALTER TABLE pmis.site_org_member ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access" ON pmis.site_org_member FOR ALL USING (true) WITH CHECK (true);

-- 4. 조회용 뷰
CREATE OR REPLACE VIEW pmis.v_site_org_chart AS
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
  r.code AS role_code,
  r.name AS role_name,
  r.sort_order AS role_sort_order,
  m.department_id,
  d.name AS department_name,
  d.sort_order AS department_sort_order,
  m.specialty,
  m.parent_id,
  m.sort_order,
  m.is_active,
  m.assigned_from,
  m.assigned_to,
  m.note
FROM pmis.site_org_member m
JOIN pmis.org_role r ON r.id = m.role_id
LEFT JOIN pmis.site_department d ON d.id = m.department_id
WHERE m.is_active = TRUE;
