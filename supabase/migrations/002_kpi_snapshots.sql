-- Migration: 002_kpi_snapshots
-- Description: Create kpi_snapshots table for Tommy agent KPI tracking
-- Purpose: Store historical KPI values for trend analysis and anomaly detection
-- Date: 2026-01-11

-- Drop existing table if exists (for clean re-runs)
DROP TABLE IF EXISTS kpi_snapshots CASCADE;

-- Create kpi_snapshots table
CREATE TABLE kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- KPI identification
  kpi_slug TEXT NOT NULL,
  kpi_name TEXT,           -- Denormalized for easier queries

  -- Value and status
  value NUMERIC NOT NULL,
  target NUMERIC,
  variance NUMERIC,        -- Absolute variance from target
  variance_pct NUMERIC,    -- Percentage variance from target

  -- Status classification
  status TEXT NOT NULL CHECK (status IN (
    'good',      -- Within acceptable range
    'warning',   -- Approaching threshold
    'critical',  -- Threshold breached
    'neutral'    -- No threshold defined
  )),

  -- Source tracking
  source TEXT NOT NULL CHECK (source IN (
    'tommy',      -- Tommy agent
    'scheduled',  -- Scheduled job
    'manual',     -- Manual snapshot
    'api'         -- API-triggered
  )),

  -- Additional context
  role_scope TEXT,         -- Role used for calculation (exec, manager, etc.)
  metadata JSONB,          -- Additional data (trend, reconciliation, etc.)

  -- Timestamps
  snapshot_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT kpi_snapshots_variance_pct_valid CHECK (
    variance_pct IS NULL OR (variance_pct >= -1000 AND variance_pct <= 1000)
  ),
  CONSTRAINT kpi_snapshots_metadata_valid CHECK (
    metadata IS NULL OR jsonb_typeof(metadata) = 'object'
  )
);

-- Create indexes for common query patterns
CREATE INDEX idx_kpi_snapshots_snapshot_at ON kpi_snapshots (snapshot_at DESC);
CREATE INDEX idx_kpi_snapshots_kpi_slug ON kpi_snapshots (kpi_slug);
CREATE INDEX idx_kpi_snapshots_status ON kpi_snapshots (status);
CREATE INDEX idx_kpi_snapshots_source ON kpi_snapshots (source);

-- Composite index for time-series queries by KPI
CREATE INDEX idx_kpi_snapshots_slug_time
  ON kpi_snapshots (kpi_slug, snapshot_at DESC);

-- Composite index for finding anomalies
CREATE INDEX idx_kpi_snapshots_status_time
  ON kpi_snapshots (status, snapshot_at DESC)
  WHERE status IN ('warning', 'critical');

-- Enable Row Level Security
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read and insert (not update/delete)
-- Snapshots should be immutable for audit integrity
CREATE POLICY "Allow authenticated read"
  ON kpi_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON kpi_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow service role full access (for n8n agents)
CREATE POLICY "Allow service role full access"
  ON kpi_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE kpi_snapshots IS 'Historical KPI snapshots captured by Tommy agent for trend analysis';
COMMENT ON COLUMN kpi_snapshots.kpi_slug IS 'Unique identifier for the KPI (e.g., revenue_mtd)';
COMMENT ON COLUMN kpi_snapshots.status IS 'Status classification: good, warning, critical, neutral';
COMMENT ON COLUMN kpi_snapshots.variance_pct IS 'Percentage variance from target (can be negative)';
COMMENT ON COLUMN kpi_snapshots.source IS 'Source of snapshot: tommy, scheduled, manual, api';

-- Grant permissions
GRANT SELECT, INSERT ON kpi_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpi_snapshots TO service_role;

-- Create function to get KPI statistics for anomaly detection
CREATE OR REPLACE FUNCTION get_kpi_stats(
  p_kpi_slug TEXT,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  avg_value NUMERIC,
  std_dev NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    AVG(value) as avg_value,
    STDDEV(value) as std_dev,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as count
  FROM kpi_snapshots
  WHERE kpi_slug = p_kpi_slug
    AND snapshot_at >= NOW() - (p_days || ' days')::INTERVAL;
$$;

-- Create function to detect anomalies (values outside 2 std deviations)
CREATE OR REPLACE FUNCTION detect_kpi_anomaly(
  p_kpi_slug TEXT,
  p_current_value NUMERIC,
  p_std_dev_threshold NUMERIC DEFAULT 2.0
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT
    CASE
      WHEN stats.count < 10 THEN FALSE  -- Not enough data
      WHEN stats.std_dev IS NULL OR stats.std_dev = 0 THEN FALSE
      ELSE ABS(p_current_value - stats.avg_value) > (stats.std_dev * p_std_dev_threshold)
    END
  FROM get_kpi_stats(p_kpi_slug, 7) stats;
$$;
