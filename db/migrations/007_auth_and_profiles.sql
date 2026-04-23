-- Migration 007: Auth profiles, approval workflow, RLS helpers
-- Adds user profile table synced with auth.users, role/status for admin
-- approval flow, and RLS helper functions. Safe to re-run (idempotent).

-- ─────────────────────────────────────────────────────────────
-- 1. user_profile table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pmis.user_profile (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL UNIQUE,
  full_name         TEXT NOT NULL DEFAULT '',
  employee_number   TEXT,
  corporation_id    INTEGER REFERENCES pmis.corporation(id),
  phone             TEXT,
  role              TEXT NOT NULL DEFAULT 'user'
                      CHECK (role IN ('user', 'admin')),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reject_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_status ON pmis.user_profile(status);
CREATE INDEX IF NOT EXISTS idx_user_profile_corp   ON pmis.user_profile(corporation_id);

-- updated_at auto-refresh
CREATE OR REPLACE FUNCTION pmis.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profile_updated_at ON pmis.user_profile;
CREATE TRIGGER trg_user_profile_updated_at
  BEFORE UPDATE ON pmis.user_profile
  FOR EACH ROW EXECUTE FUNCTION pmis.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. Auto-create profile on new auth.users row
-- Reads raw_user_meta_data (set from frontend signUp options.data)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pmis.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pmis, public
AS $$
DECLARE
  meta    JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  corp_id INTEGER;
BEGIN
  IF (meta->>'corporation_id') ~ '^\d+$' THEN
    corp_id := (meta->>'corporation_id')::INTEGER;
  END IF;

  INSERT INTO pmis.user_profile (
    id, email, full_name, employee_number, corporation_id, phone
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'full_name', ''),
    meta->>'employee_number',
    corp_id,
    meta->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION pmis.handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────
-- 3. RLS helper functions
-- SECURITY DEFINER so policies don't trigger infinite recursion
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pmis.current_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pmis, public
AS $$
  SELECT role FROM pmis.user_profile
  WHERE id = auth.uid() AND status = 'approved'
$$;

CREATE OR REPLACE FUNCTION pmis.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(pmis.current_role() = 'admin', FALSE)
$$;

CREATE OR REPLACE FUNCTION pmis.is_approved()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pmis, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pmis.user_profile
    WHERE id = auth.uid() AND status = 'approved'
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. RLS on user_profile
-- Users read their own row; admins read/update/delete all.
-- INSERT only happens via the trigger (SECURITY DEFINER bypasses RLS)
-- or via service_role (backend admin user creation).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE pmis.user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profile_select_self_or_admin" ON pmis.user_profile;
CREATE POLICY "user_profile_select_self_or_admin"
  ON pmis.user_profile FOR SELECT
  USING (id = auth.uid() OR pmis.is_admin());

DROP POLICY IF EXISTS "user_profile_update_admin" ON pmis.user_profile;
CREATE POLICY "user_profile_update_admin"
  ON pmis.user_profile FOR UPDATE
  USING (pmis.is_admin())
  WITH CHECK (pmis.is_admin());

DROP POLICY IF EXISTS "user_profile_delete_admin" ON pmis.user_profile;
CREATE POLICY "user_profile_delete_admin"
  ON pmis.user_profile FOR DELETE
  USING (pmis.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 5. Grant schema usage so the anon/authenticated roles can query
-- user_profile directly from the frontend (subject to RLS above)
-- ─────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA pmis TO anon, authenticated;
GRANT SELECT ON pmis.user_profile TO authenticated;
GRANT UPDATE, DELETE ON pmis.user_profile TO authenticated;  -- RLS filters
GRANT EXECUTE ON FUNCTION pmis.is_admin()    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pmis.is_approved() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pmis.current_role() TO anon, authenticated;
