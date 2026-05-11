-- 013: Secure pmis.v_site_org_chart the same way 012 secured
-- v_site_dashboard.
--
-- Initial RLS audit only checked the tables it found in the backend
-- code; v_site_org_chart slipped through because it's only referenced
-- in routers/org.py via a single .from_("v_site_org_chart") call.
-- Re-audit found it returning PII (name / rank / phone / role) to anon
-- callers, since views default to security_definer and bypass the
-- underlying site_org_member RLS that 012 set up.
--
-- Flipping the view to security_invoker delegates row filtering to the
-- caller's privileges — i.e. site_org_member's `approved_select` policy
-- now applies whenever someone SELECTs from this view.

BEGIN;

ALTER VIEW pmis.v_site_org_chart SET (security_invoker = true);

COMMIT;
