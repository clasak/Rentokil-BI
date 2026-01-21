-- Migration: 003_governance
-- Description: Create governance tables for Tina agent
-- Purpose: Track KPI definition changes and maintain version history
-- Date: 2026-01-11

-- Drop existing tables if exist (for clean re-runs)
DROP TABLE IF EXISTS governance_changes CASCADE;
DROP TABLE IF EXISTS governance_snapshots CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;

-- ============================================
-- Table: governance_snapshots
-- Stores point-in-time snapshots of KPI definitions
-- Used to detect changes between runs
-- ============================================
CREATE TABLE governance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Snapshot identification
  snapshot_hash TEXT NOT NULL,      -- Hash of the definitions for quick comparison
  kpi_count INTEGER NOT NULL,       -- Number of KPIs in snapshot

  -- Full snapshot data
  snapshot_data JSONB NOT NULL,     -- Complete KPI dictionary at this point

  -- Metadata
  source TEXT NOT NULL DEFAULT 'tina' CHECK (source IN ('tina', 'manual', 'api')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT governance_snapshots_data_valid CHECK (
    jsonb_typeof(snapshot_data) = 'array' OR jsonb_typeof(snapshot_data) = 'object'
  )
);

-- Indexes
CREATE INDEX idx_governance_snapshots_created_at ON governance_snapshots (created_at DESC);
CREATE INDEX idx_governance_snapshots_hash ON governance_snapshots (snapshot_hash);

-- ============================================
-- Table: governance_changes
-- Tracks individual KPI definition changes
-- ============================================
CREATE TABLE governance_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Change identification
  kpi_slug TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'definition',    -- Formula or calculation change
    'threshold',     -- Warning/critical threshold change
    'cosmetic',      -- Name, description, or formatting change
    'new',           -- New KPI added
    'deprecated',    -- KPI marked as deprecated
    'ownership',     -- Owner changed
    'source'         -- Data source changed
  )),

  -- Change details
  old_value JSONB,        -- Previous value (null for new KPIs)
  new_value JSONB,        -- New value (null for deprecated KPIs)
  field_changed TEXT,     -- Specific field that changed (e.g., 'warningThreshold')
  change_summary TEXT,    -- Human-readable summary

  -- Approval tracking
  changed_by TEXT,        -- Who made the change (user email or 'system')
  approved_by TEXT,       -- Who approved (null if pending)
  approved_at TIMESTAMPTZ,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
    'pending',
    'approved',
    'rejected',
    'auto_approved'
  )),

  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT governance_changes_values_valid CHECK (
    (old_value IS NULL AND change_type = 'new') OR
    (new_value IS NULL AND change_type = 'deprecated') OR
    (old_value IS NOT NULL AND new_value IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_governance_changes_created_at ON governance_changes (created_at DESC);
CREATE INDEX idx_governance_changes_kpi_slug ON governance_changes (kpi_slug);
CREATE INDEX idx_governance_changes_type ON governance_changes (change_type);
CREATE INDEX idx_governance_changes_approval ON governance_changes (approval_status)
  WHERE approval_status = 'pending';

-- ============================================
-- Table: incidents
-- Tracks operational incidents for resolution
-- ============================================
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Incident identification
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),

  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open',          -- New incident
    'investigating', -- Being investigated
    'identified',    -- Root cause identified
    'fixing',        -- Fix in progress
    'resolved',      -- Incident resolved
    'closed'         -- Incident closed
  )),

  -- Timing
  detected_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Resolution details
  root_cause TEXT,
  resolution TEXT,
  lessons_learned TEXT,

  -- Impact tracking
  affected_routes TEXT[],
  affected_kpis TEXT[],
  user_impact TEXT,

  -- Related events
  ops_event_ids UUID[],
  related_incidents UUID[],

  -- Assignment
  assigned_to TEXT,
  escalated_to TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_incidents_created_at ON incidents (created_at DESC);
CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_incidents_severity ON incidents (severity);
CREATE INDEX idx_incidents_open ON incidents (status, severity)
  WHERE status NOT IN ('resolved', 'closed');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_updated_at();

-- ============================================
-- Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE governance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policies for governance_snapshots (read + insert only for immutability)
CREATE POLICY "Allow authenticated read snapshots"
  ON governance_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert snapshots"
  ON governance_snapshots FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow service role full access snapshots"
  ON governance_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies for governance_changes (read + insert only, updates via service role)
CREATE POLICY "Allow authenticated read changes"
  ON governance_changes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert changes"
  ON governance_changes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow service role full access changes"
  ON governance_changes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies for incidents (full access needed for status updates)
CREATE POLICY "Allow authenticated read incidents"
  ON incidents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert incidents"
  ON incidents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update incidents"
  ON incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access incidents"
  ON incidents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE governance_snapshots IS 'Point-in-time snapshots of KPI definitions for change detection';
COMMENT ON TABLE governance_changes IS 'Individual KPI definition changes tracked by Tina agent';
COMMENT ON TABLE incidents IS 'Operational incidents for tracking and resolution';

COMMENT ON COLUMN governance_changes.change_type IS 'Type: definition, threshold, cosmetic, new, deprecated, ownership, source';
COMMENT ON COLUMN governance_changes.approval_status IS 'Status: pending, approved, rejected, auto_approved';
COMMENT ON COLUMN incidents.status IS 'Status: open, investigating, identified, fixing, resolved, closed';

-- ============================================
-- Permissions
-- ============================================

GRANT SELECT, INSERT ON governance_snapshots TO authenticated;
GRANT SELECT, INSERT ON governance_changes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON incidents TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON governance_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON governance_changes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON incidents TO service_role;

-- ============================================
-- Helper Functions
-- ============================================

-- Get latest governance snapshot
CREATE OR REPLACE FUNCTION get_latest_governance_snapshot()
RETURNS governance_snapshots
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM governance_snapshots
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Get pending governance changes
CREATE OR REPLACE FUNCTION get_pending_governance_changes()
RETURNS SETOF governance_changes
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM governance_changes
  WHERE approval_status = 'pending'
  ORDER BY created_at DESC;
$$;

-- Get open incidents by severity
CREATE OR REPLACE FUNCTION get_open_incidents(p_severity TEXT DEFAULT NULL)
RETURNS SETOF incidents
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM incidents
  WHERE status NOT IN ('resolved', 'closed')
    AND (p_severity IS NULL OR severity = p_severity)
  ORDER BY
    CASE severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    created_at DESC;
$$;
