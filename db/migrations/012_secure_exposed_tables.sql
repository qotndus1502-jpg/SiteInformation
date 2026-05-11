-- 012: Tighten anon-readable RLS on the pmis schema.
--
-- Background: a black-box RLS audit (curl with the anon publishable key,
-- no Authorization header) found these tables/views returning real rows
-- to anonymous callers:
--
--   v_site_dashboard   — view; underlying RLS bypassed because the view
--                        defaults to security_definer (creator's perms)
--   site_org_member    — direct SELECT allowed (FOR ALL USING (true))
--   site_department    — same
--   managing_entity    — same
--   org_role           — same
--
-- Other pmis tables (corporation, region_code, facility_type, client_org,
-- partner_company, project_site, jv_participation, user_profile) returned
-- 0 rows to anon, but on closer look that's because they have NO SELECT
-- policy at all — anon and authenticated alike get nothing through
-- PostgREST. The backend only sees data because it uses the service-role
-- key, which bypasses RLS entirely.
--
-- Note: pmis.site_headcount_summary is referenced in migration 004 but
-- the relation no longer exists in the live database (probably dropped
-- when migration 010 reorganised the org-chart tables). Skipped here.
--
-- This migration:
--   1) Drops the unsafe `FOR ALL USING (true)` policies.
--   2) Sets v_site_dashboard to security_invoker so the underlying RLS
--      applies when users query it.
--   3) Enables RLS (idempotently) on every pmis read-target table.
--   4) Adds a "approved authenticated user can SELECT" policy to each.
--      Mutations are NOT exposed via PostgREST — the backend continues
--      to handle writes with the service-role key.
--
-- After this, both /rest/v1/<table> with the anon key (no JWT) AND
-- /rest/v1/<table> with an unapproved user's JWT will return 0 rows.
-- Approved users — and the service-role key (backend) — see everything.

BEGIN;

-- ── Helper: "is the calling user an approved member?" ──────────────
-- Repeating the same EXISTS subquery in every policy is fragile. Wrap
-- it in a SECURITY DEFINER function once so each policy is one line.
CREATE OR REPLACE FUNCTION pmis.is_approved_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pmis
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM pmis.user_profile
     WHERE id = auth.uid()
       AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION pmis.is_approved_user() TO authenticated, anon;


-- ── 1) v_site_dashboard: enforce caller's RLS ─────────────────────
-- Default security_definer means the view runs with the creator's role
-- (postgres / superuser) and bypasses underlying RLS. security_invoker
-- flips it: the view runs as the caller, so project_site / corporation
-- / region_code RLS are checked.
ALTER VIEW pmis.v_site_dashboard SET (security_invoker = true);


-- ── 2) Drop the wide-open "Allow full access" policies ────────────
-- These were `FOR ALL USING (true)` — anon + authenticated alike got
-- full SELECT/INSERT/UPDATE/DELETE through PostgREST. We replace them
-- with read-only policies for approved users below; writes stay with
-- the service-role-keyed backend.
DROP POLICY IF EXISTS "Allow full access" ON pmis.org_role;
DROP POLICY IF EXISTS "Allow full access" ON pmis.site_department;
DROP POLICY IF EXISTS "Allow full access" ON pmis.site_org_member;
DROP POLICY IF EXISTS "Allow full access" ON pmis.managing_entity;


-- ── 3) Enable RLS on every pmis table (idempotent) ────────────────
-- Tables already had it on; lookup tables (corporation, etc.) may not
-- — in which case nothing was protecting them except the absence of a
-- SELECT policy. Belt-and-suspenders.
ALTER TABLE pmis.corporation             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.region_code             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.facility_type           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.client_org              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.partner_company         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.project_site            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.jv_participation        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.managing_entity         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.org_role                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.site_department         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmis.site_org_member         ENABLE ROW LEVEL SECURITY;


-- ── 4) Approved-user SELECT policies ──────────────────────────────
-- Policy name `approved_select` is reused per table so future audits
-- can grep one string. `FOR SELECT TO authenticated` means: anon never
-- matches; authenticated users match only if `is_approved_user()` is
-- true (their own user_profile row says approved).

-- Lookup tables (reference data — corporation, region, facility, etc.)
DROP POLICY IF EXISTS approved_select ON pmis.corporation;
CREATE POLICY approved_select ON pmis.corporation
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.region_code;
CREATE POLICY approved_select ON pmis.region_code
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.facility_type;
CREATE POLICY approved_select ON pmis.facility_type
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.client_org;
CREATE POLICY approved_select ON pmis.client_org
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.partner_company;
CREATE POLICY approved_select ON pmis.partner_company
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.org_role;
CREATE POLICY approved_select ON pmis.org_role
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.managing_entity;
CREATE POLICY approved_select ON pmis.managing_entity
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

-- Project / org / department data
DROP POLICY IF EXISTS approved_select ON pmis.project_site;
CREATE POLICY approved_select ON pmis.project_site
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.jv_participation;
CREATE POLICY approved_select ON pmis.jv_participation
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.site_department;
CREATE POLICY approved_select ON pmis.site_department
  FOR SELECT TO authenticated USING (pmis.is_approved_user());

DROP POLICY IF EXISTS approved_select ON pmis.site_org_member;
CREATE POLICY approved_select ON pmis.site_org_member
  FOR SELECT TO authenticated USING (pmis.is_approved_user());


COMMIT;
