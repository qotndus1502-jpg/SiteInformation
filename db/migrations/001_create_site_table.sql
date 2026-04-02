-- Migration: Create Site table
-- Description: Main table for construction site information across companies

CREATE TABLE IF NOT EXISTS "Site" (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  company       TEXT NOT NULL,
  "locationId"  INTEGER REFERENCES "Location"(id),
  region        TEXT NOT NULL,
  address       TEXT,
  "siteType"    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT '정상',
  "progressRate" DECIMAL(5,2) DEFAULT 0,
  "targetRate"  DECIMAL(5,2) DEFAULT 0,
  "startDate"   DATE,
  "endDate"     DATE,
  "workerCount" INTEGER DEFAULT 0,
  issues        TEXT,
  photos        TEXT[],
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_site_company ON "Site"(company);
CREATE INDEX IF NOT EXISTS idx_site_region ON "Site"(region);
CREATE INDEX IF NOT EXISTS idx_site_type ON "Site"("siteType");
CREATE INDEX IF NOT EXISTS idx_site_status ON "Site"(status);

-- Enable Row Level Security (recommended for Supabase)
ALTER TABLE "Site" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and service_role full access
CREATE POLICY "Allow full access for authenticated users"
  ON "Site"
  FOR ALL
  USING (true)
  WITH CHECK (true);
