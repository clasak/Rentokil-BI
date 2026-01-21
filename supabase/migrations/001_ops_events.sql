-- Migration: 001_ops_events
-- Description: Create ops_events table for n8n agent monitoring
-- Agents: Timmy (reliability), Tommy (data quality), Tina (governance)
-- Date: 2026-01-11

-- Drop existing table if exists (for clean re-runs)
DROP TABLE IF EXISTS ops_events CASCADE;

-- Create ops_events table
CREATE TABLE ops_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'health_check',   -- Regular health check result
    'alert',          -- Threshold breach or anomaly
    'incident',       -- Confirmed incident
    'recovery',       -- Incident resolved
    'kpi_snapshot',   -- KPI value capture
    'reconciliation', -- Reconciliation check
    'governance',     -- KPI definition change
    'manual',         -- Manually created event
    'test'            -- Test events
  )),

  -- Severity level
  severity TEXT NOT NULL CHECK (severity IN (
    'critical',  -- Immediate action required
    'high',      -- Action required within 15 min
    'medium',    -- Action required within 1 hour
    'low',       -- Action required within 24 hours
    'info'       -- Informational only
  )),

  -- Source agent
  source TEXT NOT NULL CHECK (source IN (
    'timmy',     -- Reliability agent
    'tommy',     -- Data quality agent
    'tina',      -- Governance agent
    'manual',    -- Manual entry
    'system',    -- System-generated
    'n8n-test',  -- Test workflow
    'api'        -- API-generated
  )),

  -- Optional context
  route TEXT,              -- Route/endpoint affected
  status_code INTEGER,     -- HTTP status code if applicable
  kpi_slug TEXT,           -- KPI slug if applicable
  incident_id UUID,        -- Link to incidents table

  -- Event details
  message TEXT NOT NULL,   -- Human-readable message
  metadata JSONB,          -- Additional structured data

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Indexes for common queries
  CONSTRAINT ops_events_metadata_valid CHECK (
    metadata IS NULL OR jsonb_typeof(metadata) = 'object'
  )
);

-- Create indexes for common query patterns
CREATE INDEX idx_ops_events_created_at ON ops_events (created_at DESC);
CREATE INDEX idx_ops_events_event_type ON ops_events (event_type);
CREATE INDEX idx_ops_events_severity ON ops_events (severity);
CREATE INDEX idx_ops_events_source ON ops_events (source);
CREATE INDEX idx_ops_events_kpi_slug ON ops_events (kpi_slug) WHERE kpi_slug IS NOT NULL;
CREATE INDEX idx_ops_events_incident_id ON ops_events (incident_id) WHERE incident_id IS NOT NULL;

-- Composite index for common filtering
CREATE INDEX idx_ops_events_source_type_created
  ON ops_events (source, event_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE ops_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read and insert (not update/delete)
-- This prevents tampering with audit logs
CREATE POLICY "Allow authenticated read"
  ON ops_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON ops_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow service role full access (for n8n agents)
CREATE POLICY "Allow service role full access"
  ON ops_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE ops_events IS 'Operational events from n8n monitoring agents (Timmy, Tommy, Tina)';
COMMENT ON COLUMN ops_events.event_type IS 'Type of event: health_check, alert, incident, recovery, kpi_snapshot, reconciliation, governance, manual, test';
COMMENT ON COLUMN ops_events.severity IS 'Severity level: critical, high, medium, low, info';
COMMENT ON COLUMN ops_events.source IS 'Source agent: timmy, tommy, tina, manual, system, n8n-test, api';
COMMENT ON COLUMN ops_events.metadata IS 'Additional structured data in JSON format';

-- Grant permissions
GRANT SELECT, INSERT ON ops_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ops_events TO service_role;
