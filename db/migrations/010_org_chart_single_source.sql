-- 조직도(site_org_member)를 현장소장/PM/현장인원의 단일 진실 소스로 전환.
-- 기존 project_site의 legacy 컬럼은 일회성 이관 후 DROP.

BEGIN;

-- 1) PM 역할 추가 (현장소장 직후, 팀장 앞)
INSERT INTO pmis.org_role (code, name, sort_order)
VALUES ('PM', 'PM', 25)
ON CONFLICT (code) DO NOTHING;

-- 2) 기존 site_manager → site_org_member 이관
--    이미 SITE_MANAGER active 멤버가 있으면 스킵
INSERT INTO pmis.site_org_member
  (site_id, name, rank, phone, org_type, employee_type, role_id, sort_order, is_active)
SELECT
  ps.id,
  ps.site_manager,
  NULLIF(ps.manager_position, ''),
  NULLIF(ps.manager_phone, ''),
  'OWN',
  '일반직',
  (SELECT id FROM pmis.org_role WHERE code = 'SITE_MANAGER'),
  10,
  TRUE
FROM pmis.project_site ps
WHERE ps.site_manager IS NOT NULL
  AND ps.site_manager <> ''
  AND NOT EXISTS (
    SELECT 1 FROM pmis.site_org_member m
    JOIN pmis.org_role r ON r.id = m.role_id
    WHERE m.site_id = ps.id AND r.code = 'SITE_MANAGER' AND m.is_active = TRUE
  );

-- 3) 기존 pm_name → site_org_member 이관
INSERT INTO pmis.site_org_member
  (site_id, name, rank, org_type, employee_type, role_id, sort_order, is_active)
SELECT
  ps.id,
  ps.pm_name,
  NULLIF(ps.pm_position, ''),
  'OWN',
  '일반직',
  (SELECT id FROM pmis.org_role WHERE code = 'PM'),
  20,
  TRUE
FROM pmis.project_site ps
WHERE ps.pm_name IS NOT NULL
  AND ps.pm_name <> ''
  AND NOT EXISTS (
    SELECT 1 FROM pmis.site_org_member m
    JOIN pmis.org_role r ON r.id = m.role_id
    WHERE m.site_id = ps.id AND r.code = 'PM' AND m.is_active = TRUE
  );

-- 4) v_site_dashboard 재정의 — site_manager/manager_*/pm_*/headcount를 조직도 집계로 교체
--    DROP 후 CREATE: headcount 타입이 int로 명시되어야 하고, 기존 컬럼 의존성 제거를 위해.
DROP VIEW IF EXISTS pmis.v_site_dashboard;

CREATE VIEW pmis.v_site_dashboard AS
SELECT
  ps.id,
  ps.name AS site_name,
  c.name AS corporation_name,
  c.code AS corporation_code,
  ps.division,
  ps.category,
  rc.name AS region_name,
  rc.region_group,
  ft.name AS facility_type_name,
  ps.order_type,
  co.name AS client_name,
  ps.contract_amount,
  ps.our_share_amount,
  ps.execution_rate,
  ps.execution_status,
  ps.execution_note,
  ps.progress_rate,
  ps.progress_note,
  ps.start_date,
  ps.end_date,
  -- 현장인원: 활성 조직원 수
  (SELECT COUNT(*)::int
     FROM pmis.site_org_member m
    WHERE m.site_id = ps.id AND m.is_active = TRUE
  ) AS headcount,
  ps.office_address,
  -- 현장소장
  (SELECT m.name
     FROM pmis.site_org_member m
     JOIN pmis.org_role r ON r.id = m.role_id
    WHERE m.site_id = ps.id AND m.is_active = TRUE AND r.code = 'SITE_MANAGER'
    ORDER BY m.sort_order, m.id LIMIT 1
  ) AS site_manager,
  (SELECT m.rank
     FROM pmis.site_org_member m
     JOIN pmis.org_role r ON r.id = m.role_id
    WHERE m.site_id = ps.id AND m.is_active = TRUE AND r.code = 'SITE_MANAGER'
    ORDER BY m.sort_order, m.id LIMIT 1
  ) AS manager_position,
  (SELECT m.phone
     FROM pmis.site_org_member m
     JOIN pmis.org_role r ON r.id = m.role_id
    WHERE m.site_id = ps.id AND m.is_active = TRUE AND r.code = 'SITE_MANAGER'
    ORDER BY m.sort_order, m.id LIMIT 1
  ) AS manager_phone,
  -- PM
  (SELECT m.name
     FROM pmis.site_org_member m
     JOIN pmis.org_role r ON r.id = m.role_id
    WHERE m.site_id = ps.id AND m.is_active = TRUE AND r.code = 'PM'
    ORDER BY m.sort_order, m.id LIMIT 1
  ) AS pm_name,
  (SELECT m.rank
     FROM pmis.site_org_member m
     JOIN pmis.org_role r ON r.id = m.role_id
    WHERE m.site_id = ps.id AND m.is_active = TRUE AND r.code = 'PM'
    ORDER BY m.sort_order, m.id LIMIT 1
  ) AS pm_position,
  ps.status,
  ps.risk_grade,
  ps.delay_days,
  (SELECT string_agg(((pc.name || ' '::text) || jp.share_pct) || '%'::text, ', '::text ORDER BY jp.display_order)
     FROM pmis.jv_participation jp
     JOIN pmis.partner_company pc ON pc.id = jp.partner_id
    WHERE jp.site_id = ps.id
  ) AS jv_summary,
  (SELECT sm.content
     FROM pmis.site_memo sm
    WHERE sm.site_id = ps.id AND sm.is_active = TRUE
    ORDER BY sm.memo_date DESC LIMIT 1
  ) AS latest_memo
FROM pmis.project_site ps
LEFT JOIN pmis.corporation c ON c.id = ps.corporation_id
LEFT JOIN pmis.region_code rc ON rc.code = ps.region_code
LEFT JOIN pmis.facility_type ft ON ft.code = ps.facility_type_code
LEFT JOIN pmis.client_org co ON co.id = ps.client_org_id;

-- 5) project_site의 legacy 컬럼 DROP (조직도가 단일 소스가 됐으므로)
ALTER TABLE pmis.project_site
  DROP COLUMN IF EXISTS site_manager,
  DROP COLUMN IF EXISTS manager_position,
  DROP COLUMN IF EXISTS manager_phone,
  DROP COLUMN IF EXISTS pm_name,
  DROP COLUMN IF EXISTS pm_position,
  DROP COLUMN IF EXISTS headcount;

COMMIT;
