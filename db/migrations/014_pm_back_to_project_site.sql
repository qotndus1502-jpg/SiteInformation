-- 014: Move PM (Project Manager) back to project_site as a direct text column,
--      out of the org chart.
--
-- Migration 010 made site_org_member the single source for SITE_MANAGER, PM,
-- and headcount. That was right for SITE_MANAGER (the person has a real
-- profile, phone, photo, etc. — belongs in the org chart) but wrong for PM,
-- which the user manages as a simple "본부 측 담당자" label per site. Putting
-- the PM in the org chart forced users to create a full org member just to
-- name the PM, and the PM card cluttered the chart.
--
-- This migration:
--   1) Adds pm_name (text) back to project_site.
--   2) Backfills it from any active org member with role_code='PM'.
--   3) Soft-deletes those PM org members (is_active=false) so they stop
--      appearing in chart / headcount. Kept in the table (not DELETE) so the
--      migration is reversible.
--   4) Re-defines v_site_dashboard to read pm_name from project_site directly,
--      dropping the subquery that joined site_org_member. pm_position is kept
--      as NULL in the view since we no longer store position for PM (the UI
--      shows only the name).
--
-- After this:
--   - PM is a single text field on /api/sites POST/PUT.
--   - Org chart no longer renders PM members; the role itself stays in
--     org_role for safety but the frontend filters it from the role picker.

BEGIN;

-- 1) Add column
ALTER TABLE pmis.project_site
  ADD COLUMN IF NOT EXISTS pm_name TEXT;

-- 2) Backfill from active PM org members (pick lowest sort_order if multiple)
WITH active_pm AS (
  SELECT DISTINCT ON (m.site_id)
         m.site_id, m.name
    FROM pmis.site_org_member m
    JOIN pmis.org_role r ON r.id = m.role_id
   WHERE r.code = 'PM' AND m.is_active = TRUE
   ORDER BY m.site_id, m.sort_order, m.id
)
UPDATE pmis.project_site ps
   SET pm_name = ap.name
  FROM active_pm ap
 WHERE ps.id = ap.site_id
   AND (ps.pm_name IS NULL OR ps.pm_name = '');

-- 3) Soft-delete PM org members (data preserved, just hidden)
UPDATE pmis.site_org_member m
   SET is_active = FALSE
  FROM pmis.org_role r
 WHERE m.role_id = r.id
   AND r.code = 'PM'
   AND m.is_active = TRUE;

-- 4) Re-define v_site_dashboard — pm_name comes from project_site now,
--    pm_position is NULL (no longer stored).
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
  -- 현장소장: 조직도에서 SITE_MANAGER role active 멤버
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
  -- PM: project_site의 텍스트 컬럼에서 직접 (조직도 join 없음)
  ps.pm_name,
  NULL::text AS pm_position,
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

-- Keep migration 012's invoker setting (view was just re-created so it defaults to definer)
ALTER VIEW pmis.v_site_dashboard SET (security_invoker = true);

COMMIT;
