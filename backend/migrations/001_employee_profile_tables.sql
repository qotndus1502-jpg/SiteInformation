-- Employee profile tables
-- Run this migration against your Supabase database (pmis schema)

-- 인사 상세정보 (개인정보)
CREATE TABLE IF NOT EXISTS pmis.employee_detail (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES pmis.site_org_member(id) ON DELETE CASCADE,
  birth_date DATE,
  address TEXT,
  office_phone TEXT,
  division TEXT,  -- 부문 (건축, 토목 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id)
);

-- 경력 (자사/타사)
CREATE TABLE IF NOT EXISTS pmis.employee_career (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES pmis.site_org_member(id) ON DELETE CASCADE,
  is_internal BOOLEAN NOT NULL DEFAULT TRUE,
  company_name TEXT,
  department TEXT,
  position TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  descriptions TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학력
CREATE TABLE IF NOT EXISTS pmis.employee_education (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES pmis.site_org_member(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  major TEXT,
  degree TEXT,  -- 학사, 석사, 박사
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자격증 및 면허
CREATE TABLE IF NOT EXISTS pmis.employee_certification (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES pmis.site_org_member(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT,
  issuer TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 스킬
CREATE TABLE IF NOT EXISTS pmis.employee_skill (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES pmis.site_org_member(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies (allow all for service role)
ALTER TABLE pmis.employee_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.employee_career ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.employee_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.employee_certification ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.employee_skill ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON pmis.employee_detail FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON pmis.employee_career FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON pmis.employee_education FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON pmis.employee_certification FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON pmis.employee_skill FOR ALL USING (true);
