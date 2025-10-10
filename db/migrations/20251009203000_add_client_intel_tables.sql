-- Migration: Add Client Intelligence Tables
-- Date: 2025-10-09
-- Description: Creates client profiles and documents tables for Client Intel feature
-- Tables: 2 (client_intel_profiles, client_documents)
-- Risk: Low (additive only)
-- Estimated time: <5 seconds

BEGIN;

-- ============================================================================
-- Client Intel Profiles - Client intelligence data for AI snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_intel_profiles (
  id SERIAL PRIMARY KEY,
  contact_email TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  industry TEXT,
  revenue TEXT,
  employees INTEGER,
  hubspot_contact_id TEXT,
  qbo_company_id TEXT,
  pain_points TEXT[], -- Array of pain points
  services TEXT[], -- Current services array
  risk_score INTEGER DEFAULT 0, -- 0-100 risk assessment
  upsell_opportunities TEXT[], -- AI-generated opportunities
  last_analyzed TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_intel_profiles_email_idx ON client_intel_profiles(contact_email);
CREATE INDEX IF NOT EXISTS client_intel_profiles_hubspot_idx ON client_intel_profiles(hubspot_contact_id);

-- ============================================================================
-- Client Documents - Uploaded files and documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_documents (
  id SERIAL PRIMARY KEY,
  client_profile_id INTEGER NOT NULL REFERENCES client_intel_profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- pdf, xlsx, docx, etc.
  file_size INTEGER NOT NULL, -- bytes
  uploaded_by INTEGER NOT NULL, -- references users.id
  file_url TEXT, -- Storage URL
  extracted_text TEXT, -- OCR/extracted content for AI analysis
  summary TEXT, -- AI-generated summary
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_documents_profile_idx ON client_documents(client_profile_id);
CREATE INDEX IF NOT EXISTS client_documents_uploaded_by_idx ON client_documents(uploaded_by);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Run these to verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'client_%' ORDER BY table_name;
-- SELECT COUNT(*) FROM client_intel_profiles; -- Should return 0

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- Uncomment and run if you need to rollback:
-- BEGIN;
-- DROP TABLE IF EXISTS client_documents CASCADE;
-- DROP TABLE IF EXISTS client_intel_profiles CASCADE;
-- COMMIT;
