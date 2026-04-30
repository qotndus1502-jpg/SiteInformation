-- 관리주체(법인 산하 팀/부서) 룩업 테이블 + 현장 연결.
-- 한 현장 → 한 관리주체, 한 관리주체 → 여러 현장.
-- 현장 법인과 관리주체 법인은 트리거로 일치 강제.

BEGIN;

-- 1) 관리주체 룩업
CREATE TABLE IF NOT EXISTS pmis.managing_entity (
  id              SERIAL PRIMARY KEY,
  corporation_id  INTEGER NOT NULL REFERENCES pmis.corporation(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (corporation_id, name)
);

CREATE INDEX IF NOT EXISTS idx_managing_entity_corp ON pmis.managing_entity(corporation_id);

ALTER TABLE pmis.managing_entity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access" ON pmis.managing_entity FOR ALL USING (true) WITH CHECK (true);

-- 2) 현장 → 관리주체 FK
ALTER TABLE pmis.project_site
  ADD COLUMN IF NOT EXISTS managing_entity_id INTEGER
  REFERENCES pmis.managing_entity(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_site_managing_entity
  ON pmis.project_site(managing_entity_id);

-- 3) 법인 일치 강제 트리거 — 현장 법인과 관리주체 법인이 다르면 거부
CREATE OR REPLACE FUNCTION pmis.check_managing_entity_corp() RETURNS TRIGGER AS $$
DECLARE
  entity_corp_id INTEGER;
BEGIN
  IF NEW.managing_entity_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT corporation_id INTO entity_corp_id
    FROM pmis.managing_entity
   WHERE id = NEW.managing_entity_id;
  IF entity_corp_id IS NULL THEN
    RAISE EXCEPTION '관리주체(id=%)를 찾을 수 없습니다', NEW.managing_entity_id;
  END IF;
  IF entity_corp_id <> NEW.corporation_id THEN
    RAISE EXCEPTION '관리주체의 법인이 현장 법인과 일치해야 합니다 (현장=%, 주체=%)',
      NEW.corporation_id, entity_corp_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_managing_entity_corp ON pmis.project_site;
CREATE TRIGGER trg_check_managing_entity_corp
  BEFORE INSERT OR UPDATE OF managing_entity_id, corporation_id ON pmis.project_site
  FOR EACH ROW EXECUTE FUNCTION pmis.check_managing_entity_corp();

-- 4) v_site_dashboard 재정의 — managing_entity_id, managing_entity_name 추가
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
  (SELECT COUNT(*)::int
     FROM pmis.site_org_member m
    WHERE m.site_id = ps.id AND m.is_active = TRUE
  ) AS headcount,
  ps.office_address,
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
  ) AS latest_memo,
  ps.managing_entity_id,
  me.name AS managing_entity_name
FROM pmis.project_site ps
LEFT JOIN pmis.corporation c ON c.id = ps.corporation_id
LEFT JOIN pmis.region_code rc ON rc.code = ps.region_code
LEFT JOIN pmis.facility_type ft ON ft.code = ps.facility_type_code
LEFT JOIN pmis.client_org co ON co.id = ps.client_org_id
LEFT JOIN pmis.managing_entity me ON me.id = ps.managing_entity_id;

COMMIT;
