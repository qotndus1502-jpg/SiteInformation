-- 현장별 사원 유형 소요 인원 (일반직/전문직/현장계약/공동사)
-- JSONB로 저장: { "general": 11, "specialist": 2, "contract": 5, "jv": 0 }

ALTER TABLE pmis.site
  ADD COLUMN IF NOT EXISTS required_headcount JSONB NOT NULL DEFAULT '{}'::jsonb;
