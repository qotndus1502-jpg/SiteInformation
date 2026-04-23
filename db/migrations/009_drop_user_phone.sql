-- Migration 009: Drop phone column from user_profile
-- Phone collection was removed from the signup form; the column is
-- dangling. Recreate the new-user trigger without it first, then drop
-- the column.

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
    id, email, full_name, employee_number, corporation_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'full_name', ''),
    meta->>'employee_number',
    corp_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER TABLE pmis.user_profile DROP COLUMN IF EXISTS phone;
