-- Migration: 현장별 인원현황 요약 테이블
CREATE TABLE IF NOT EXISTS pmis.site_headcount_summary (
  id          SERIAL PRIMARY KEY,
  site_id     INTEGER NOT NULL,
  category    TEXT NOT NULL,          -- '일반직', '전문직', '현채직', '공동사'
  required    INTEGER NOT NULL DEFAULT 0,  -- 소요인원
  current     INTEGER NOT NULL DEFAULT 0,  -- 현재인원
  future      INTEGER NOT NULL DEFAULT 0,  -- 향후투입
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pmis.site_headcount_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access" ON pmis.site_headcount_summary FOR ALL USING (true) WITH CHECK (true);

-- 구리갈매역세권 (site_id=78) 시드
INSERT INTO pmis.site_headcount_summary (site_id, category, required, current, future, sort_order) VALUES
  (78, '일반직', 27, 26, 1, 10),
  (78, '전문직',  2,  1, 1, 20),
  (78, '현채직',  2,  2, 0, 30),
  (78, '공동사',  3,  3, 0, 40);
