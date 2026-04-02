-- Migration: Create site_coordinates table for map markers
-- Stores geocoded lat/lng per site so we don't re-geocode on every page load

CREATE TABLE IF NOT EXISTS public.site_coordinates (
  site_id    INTEGER PRIMARY KEY,
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_coordinates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access"
  ON public.site_coordinates
  FOR ALL
  USING (true)
  WITH CHECK (true);
