-- 팀별 소요 인원(required_count) 컬럼 추가
-- 사용처: 조직도 다이얼로그 인원 현황표의 "소요 인원" / "향후 투입"(=소요-현재) 계산

ALTER TABLE pmis.site_department
  ADD COLUMN IF NOT EXISTS required_count INTEGER NOT NULL DEFAULT 0;
