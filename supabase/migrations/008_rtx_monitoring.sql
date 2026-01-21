-- Migration: 008_rtx_monitoring
-- Description: RTX Data Hub monitoring tables for consolidated workflow architecture
-- Purpose: Support OPS-UNIFIED-001 (monitoring) and OPS-RTX-INTAKE-001 (data intake) workflows
-- Date: 2026-01-14

-- ============================================================================
-- PART 1: RTX Health Log
-- Tracks connection health, latency, and availability for RTX Data Hub
-- ============================================================================

CREATE TABLE IF NOT EXISTS rtx_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Connection status
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unreachable')),
  is_reachable BOOLEAN NOT NULL,
  latency_ms INTEGER,

  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  consecutive_failures INTEGER DEFAULT 0,

  -- Entity availability snapshot (JSONB for flexibility with unknown schema)
  entities JSONB DEFAULT '{}',
  -- Example: { "accounts": { "available": true, "row_count": 1500 }, "opportunities": { "available": true, "row_count": 2500 } }

  -- Last successful connection details
  last_successful_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rtx_health_log
CREATE INDEX IF NOT EXISTS idx_rtx_health_status ON rtx_health_log(status);
CREATE INDEX IF NOT EXISTS idx_rtx_health_captured ON rtx_health_log(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_rtx_health_reachable ON rtx_health_log(is_reachable) WHERE is_reachable = FALSE;

-- Composite index for health trend queries
CREATE INDEX IF NOT EXISTS idx_rtx_health_trend ON rtx_health_log(status, captured_at DESC);

-- Enable RLS
ALTER TABLE rtx_health_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read rtx_health_log"
  ON rtx_health_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access rtx_health_log"
  ON rtx_health_log FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE rtx_health_log IS 'RTX Data Hub connection health history for reliability monitoring by unified workflow';

-- ============================================================================
-- PART 2: RTX Schema Registry
-- Auto-discovered entities and fields from RTX Data Hub
-- Enables dynamic validation when actual RTX schema is unknown
-- ============================================================================

CREATE TABLE IF NOT EXISTS rtx_schema_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity and field identification
  entity_name TEXT NOT NULL,
  field_name TEXT NOT NULL,

  -- Field characteristics (discovered from sample data)
  field_type TEXT CHECK (field_type IN ('string', 'number', 'boolean', 'date', 'datetime', 'object', 'array', 'null', 'unknown')),
  is_required BOOLEAN DEFAULT FALSE,
  is_nullable BOOLEAN DEFAULT TRUE,

  -- Statistics from sample analysis
  null_rate NUMERIC,                   -- Percentage of nulls (0-100)
  sample_values JSONB DEFAULT '[]',    -- Up to 5 example values
  min_value NUMERIC,                   -- For numeric fields
  max_value NUMERIC,                   -- For numeric fields
  distinct_count INTEGER,              -- Number of distinct values seen

  -- Schema change tracking
  previous_type TEXT,                  -- Previous field_type if changed
  change_detected_at TIMESTAMPTZ,      -- When a schema change was detected

  -- Timestamps
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(entity_name, field_name)
);

-- Indexes for rtx_schema_registry
CREATE INDEX IF NOT EXISTS idx_rtx_schema_entity ON rtx_schema_registry(entity_name);
CREATE INDEX IF NOT EXISTS idx_rtx_schema_field ON rtx_schema_registry(field_name);
CREATE INDEX IF NOT EXISTS idx_rtx_schema_required ON rtx_schema_registry(entity_name, is_required) WHERE is_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_rtx_schema_discovered ON rtx_schema_registry(discovered_at DESC);

-- Enable RLS
ALTER TABLE rtx_schema_registry ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read rtx_schema_registry"
  ON rtx_schema_registry FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access rtx_schema_registry"
  ON rtx_schema_registry FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE rtx_schema_registry IS 'Auto-discovered RTX Data Hub schema for dynamic validation and transformation';

-- Helper function to get entity schema
CREATE OR REPLACE FUNCTION get_rtx_entity_schema(p_entity_name TEXT)
RETURNS TABLE (
  field_name TEXT,
  field_type TEXT,
  is_required BOOLEAN,
  is_nullable BOOLEAN,
  null_rate NUMERIC,
  sample_values JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.field_name,
    r.field_type,
    r.is_required,
    r.is_nullable,
    r.null_rate,
    r.sample_values
  FROM rtx_schema_registry r
  WHERE r.entity_name = p_entity_name
  ORDER BY r.field_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to detect schema changes
CREATE OR REPLACE FUNCTION detect_rtx_schema_changes(p_days INTEGER DEFAULT 1)
RETURNS TABLE (
  entity_name TEXT,
  field_name TEXT,
  change_type TEXT,
  previous_type TEXT,
  current_type TEXT,
  change_detected_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.entity_name,
    r.field_name,
    CASE
      WHEN r.previous_type IS NOT NULL THEN 'type_changed'
      WHEN r.discovered_at > NOW() - (p_days || ' days')::INTERVAL THEN 'added'
      ELSE 'unknown'
    END as change_type,
    r.previous_type,
    r.field_type as current_type,
    r.change_detected_at
  FROM rtx_schema_registry r
  WHERE r.change_detected_at > NOW() - (p_days || ' days')::INTERVAL
     OR r.discovered_at > NOW() - (p_days || ' days')::INTERVAL
  ORDER BY COALESCE(r.change_detected_at, r.discovered_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: RTX Sync Log
-- Tracks data sync history from RTX intake workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS rtx_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sync type and scope
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'schema_only', 'manual')),
  entity_name TEXT,                    -- NULL for full sync across all entities

  -- Status
  status TEXT NOT NULL CHECK (status IN ('started', 'running', 'success', 'partial', 'failed', 'cancelled')),

  -- Record counts
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Performance
  duration_ms INTEGER,
  bytes_transferred INTEGER,

  -- Error details
  error_code TEXT,
  error_message TEXT,
  failed_records JSONB DEFAULT '[]',   -- Array of failed record IDs with reasons

  -- Sync parameters
  sync_from TIMESTAMPTZ,               -- Start of incremental sync window
  sync_to TIMESTAMPTZ,                 -- End of sync window
  batch_size INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rtx_sync_log
CREATE INDEX IF NOT EXISTS idx_rtx_sync_type ON rtx_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_rtx_sync_entity ON rtx_sync_log(entity_name);
CREATE INDEX IF NOT EXISTS idx_rtx_sync_status ON rtx_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_rtx_sync_completed ON rtx_sync_log(completed_at DESC);

-- Composite index for finding latest successful sync per entity
CREATE INDEX IF NOT EXISTS idx_rtx_sync_latest_success
  ON rtx_sync_log(entity_name, completed_at DESC)
  WHERE status = 'success';

-- Enable RLS
ALTER TABLE rtx_sync_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read rtx_sync_log"
  ON rtx_sync_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access rtx_sync_log"
  ON rtx_sync_log FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE rtx_sync_log IS 'Data sync history from RTX intake workflow (OPS-RTX-INTAKE-001)';

-- Helper function to get last successful sync
CREATE OR REPLACE FUNCTION get_last_rtx_sync(p_entity_name TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  sync_type TEXT,
  entity_name TEXT,
  records_fetched INTEGER,
  duration_ms INTEGER,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.sync_type,
    s.entity_name,
    s.records_fetched,
    s.duration_ms,
    s.completed_at
  FROM rtx_sync_log s
  WHERE s.status = 'success'
    AND (p_entity_name IS NULL OR s.entity_name = p_entity_name)
  ORDER BY s.completed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: RTX Integrity Checks
-- Tracks data quality validation results
-- ============================================================================

CREATE TABLE IF NOT EXISTS rtx_integrity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Check type and entity
  check_type TEXT NOT NULL CHECK (check_type IN (
    'null_check',            -- Required fields have null values
    'duplicate_check',       -- Duplicate records detected
    'orphan_check',          -- Records without valid parent references
    'schema_validation',     -- Schema doesn't match expected structure
    'value_range',           -- Values outside expected range
    'freshness_check',       -- Data is stale
    'referential_integrity', -- Foreign key references are invalid
    'format_validation'      -- Data format is incorrect (e.g., dates, emails)
  )),
  entity_name TEXT NOT NULL,

  -- Results
  status TEXT NOT NULL CHECK (status IN ('pass', 'warning', 'fail')),
  issues_found INTEGER DEFAULT 0,
  total_records_checked INTEGER DEFAULT 0,
  pass_rate NUMERIC,                   -- Percentage of records passing (0-100)

  -- Issue details
  sample_issues JSONB DEFAULT '[]',    -- Array of example issues with record IDs
  affected_fields TEXT[],              -- Fields involved in the check

  -- Thresholds used
  threshold_used NUMERIC,
  tolerance_used NUMERIC,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rtx_integrity_checks
CREATE INDEX IF NOT EXISTS idx_rtx_integrity_type ON rtx_integrity_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_rtx_integrity_entity ON rtx_integrity_checks(entity_name);
CREATE INDEX IF NOT EXISTS idx_rtx_integrity_status ON rtx_integrity_checks(status);
CREATE INDEX IF NOT EXISTS idx_rtx_integrity_checked ON rtx_integrity_checks(checked_at DESC);

-- Composite index for finding recent failures
CREATE INDEX IF NOT EXISTS idx_rtx_integrity_recent_failures
  ON rtx_integrity_checks(entity_name, check_type, checked_at DESC)
  WHERE status = 'fail';

-- Enable RLS
ALTER TABLE rtx_integrity_checks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read rtx_integrity_checks"
  ON rtx_integrity_checks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access rtx_integrity_checks"
  ON rtx_integrity_checks FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE rtx_integrity_checks IS 'Data integrity validation results for RTX Data Hub monitoring';

-- Helper function to get latest integrity status
CREATE OR REPLACE FUNCTION get_rtx_integrity_status(p_entity_name TEXT DEFAULT NULL)
RETURNS TABLE (
  entity_name TEXT,
  check_type TEXT,
  status TEXT,
  issues_found INTEGER,
  checked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_checks AS (
    SELECT DISTINCT ON (ic.entity_name, ic.check_type)
      ic.entity_name,
      ic.check_type,
      ic.status,
      ic.issues_found,
      ic.checked_at
    FROM rtx_integrity_checks ic
    WHERE p_entity_name IS NULL OR ic.entity_name = p_entity_name
    ORDER BY ic.entity_name, ic.check_type, ic.checked_at DESC
  )
  SELECT * FROM latest_checks
  ORDER BY entity_name, check_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: Data Source Status
-- Tracks current primary/fallback data source with failover events
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_source_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Current source state
  primary_source TEXT NOT NULL CHECK (primary_source IN ('rtx', 'mock')),
  fallback_source TEXT CHECK (fallback_source IN ('rtx', 'mock')),
  is_using_fallback BOOLEAN DEFAULT FALSE,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'startup',           -- Initial state on app start
    'failover',          -- Switched to fallback source
    'recovery',          -- Recovered to primary source
    'manual_switch',     -- Manual source change
    'health_check'       -- Periodic health status update
  )),

  -- Failover details
  failover_reason TEXT,              -- Why failover occurred
  consecutive_failures INTEGER DEFAULT 0,

  -- Health at time of status change
  rtx_health TEXT CHECK (rtx_health IN ('healthy', 'degraded', 'unhealthy', 'unreachable')),
  rtx_latency_ms INTEGER,

  -- Alert tracking
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_channel TEXT,                -- 'slack', 'email', etc.

  -- Timestamps
  failover_at TIMESTAMPTZ,
  recovery_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data_source_status
CREATE INDEX IF NOT EXISTS idx_ds_status_primary ON data_source_status(primary_source);
CREATE INDEX IF NOT EXISTS idx_ds_status_event ON data_source_status(event_type);
CREATE INDEX IF NOT EXISTS idx_ds_status_fallback ON data_source_status(is_using_fallback) WHERE is_using_fallback = TRUE;
CREATE INDEX IF NOT EXISTS idx_ds_status_created ON data_source_status(created_at DESC);

-- Enable RLS
ALTER TABLE data_source_status ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read data_source_status"
  ON data_source_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access data_source_status"
  ON data_source_status FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE data_source_status IS 'Current data source status and failover event tracking';

-- Helper function to get current data source
CREATE OR REPLACE FUNCTION get_current_data_source()
RETURNS TABLE (
  primary_source TEXT,
  is_using_fallback BOOLEAN,
  fallback_source TEXT,
  event_type TEXT,
  failover_reason TEXT,
  failover_at TIMESTAMPTZ,
  rtx_health TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.primary_source,
    ds.is_using_fallback,
    ds.fallback_source,
    ds.event_type,
    ds.failover_reason,
    ds.failover_at,
    ds.rtx_health,
    ds.created_at
  FROM data_source_status ds
  ORDER BY ds.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5.5: RTX Reconciliation Results
-- Tracks KPI reconciliation between RTX Data Hub and app calculations
-- ============================================================================

CREATE TABLE IF NOT EXISTS rtx_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reconciliation details
  reconciliation_type TEXT NOT NULL,
  kpi_slug TEXT NOT NULL,

  -- Values
  rtx_value NUMERIC,
  app_value NUMERIC NOT NULL,
  variance_pct NUMERIC,
  tolerance_used NUMERIC,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pass', 'warning', 'fail')),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  reconciled_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rtx_reconciliation
CREATE INDEX IF NOT EXISTS idx_rtx_reconciliation_kpi ON rtx_reconciliation(kpi_slug);
CREATE INDEX IF NOT EXISTS idx_rtx_reconciliation_status ON rtx_reconciliation(status);
CREATE INDEX IF NOT EXISTS idx_rtx_reconciliation_at ON rtx_reconciliation(reconciled_at DESC);

-- Composite index for finding latest reconciliation per KPI
CREATE INDEX IF NOT EXISTS idx_rtx_reconciliation_latest
  ON rtx_reconciliation(kpi_slug, reconciled_at DESC);

-- Enable RLS
ALTER TABLE rtx_reconciliation ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read rtx_reconciliation"
  ON rtx_reconciliation FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access rtx_reconciliation"
  ON rtx_reconciliation FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE rtx_reconciliation IS 'KPI reconciliation results comparing RTX Data Hub with app calculations';

-- ============================================================================
-- PART 6: Update ops_events constraints for RTX monitoring
-- ============================================================================

-- Update source constraint to include rtx and failover
ALTER TABLE ops_events DROP CONSTRAINT IF EXISTS ops_events_source_check;
ALTER TABLE ops_events ADD CONSTRAINT ops_events_source_check
  CHECK (source IN (
    'timmy',     -- Health monitoring agent
    'tommy',     -- Data quality agent
    'tina',      -- Governance agent
    'sophia',    -- Feedback triage agent
    'bailey',    -- Business alerts agent
    'sam',       -- Security monitoring agent
    'pete',      -- Performance monitoring agent
    'derek',     -- Deployment monitoring agent
    'emma',      -- User engagement agent
    'rtx',       -- RTX Data Hub monitoring (new)
    'failover',  -- Failover events (new)
    'intake',    -- RTX intake workflow (new)
    'manual',    -- Manual entry
    'system',    -- System-generated
    'n8n-test',  -- Test workflow
    'api'        -- API-generated
  ));

-- Update event_type constraint to include RTX-specific events
ALTER TABLE ops_events DROP CONSTRAINT IF EXISTS ops_events_event_type_check;
ALTER TABLE ops_events ADD CONSTRAINT ops_events_event_type_check
  CHECK (event_type IN (
    -- Existing event types
    'health_check',
    'alert',
    'incident',
    'recovery',
    'kpi_snapshot',
    'reconciliation',
    'governance',
    'governance_change',
    'governance_init',
    'governance_check',
    'feedback_check',
    'feedback_triaged',
    'feedback_batch',
    'business_alert',
    'security_event',
    'security_threat',
    'performance_check',
    'sla_breach',
    'deployment',
    'deployment_verified',
    'engagement_summary',
    'engagement_alert',
    'manual',
    'test',
    -- NEW RTX-specific event types
    'rtx_health',           -- RTX connection health check
    'rtx_integrity',        -- RTX data integrity check
    'rtx_reconcile',        -- RTX reconciliation result
    'rtx_schema_change',    -- RTX schema change detected
    'rtx_sync_started',     -- RTX sync started
    'rtx_sync_completed',   -- RTX sync completed
    'rtx_sync_failed',      -- RTX sync failed
    'rtx_failover',         -- Failover to fallback source
    'rtx_recovery'          -- Recovery to primary source
  ));

-- Update comment
COMMENT ON COLUMN ops_events.source IS 'Source agent: timmy, tommy, tina, sophia, bailey, sam, pete, derek, emma, rtx, failover, intake, manual, system, n8n-test, api';

-- ============================================================================
-- PART 7: Grant permissions
-- ============================================================================

GRANT SELECT ON rtx_health_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rtx_health_log TO service_role;

GRANT SELECT ON rtx_schema_registry TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rtx_schema_registry TO service_role;

GRANT SELECT ON rtx_sync_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rtx_sync_log TO service_role;

GRANT SELECT ON rtx_integrity_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rtx_integrity_checks TO service_role;

GRANT SELECT ON data_source_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_source_status TO service_role;

GRANT SELECT ON rtx_reconciliation TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rtx_reconciliation TO service_role;

-- ============================================================================
-- PART 8: Initialize default data source status
-- ============================================================================

INSERT INTO data_source_status (
  primary_source,
  fallback_source,
  is_using_fallback,
  event_type,
  rtx_health,
  metadata
) VALUES (
  'rtx',
  'mock',
  TRUE,  -- Start with mock until RTX is configured
  'startup',
  'unreachable',
  '{"reason": "Initial startup - RTX not yet configured"}'::jsonb
);

-- ============================================================================
-- PART 9: Summary comment
-- ============================================================================

COMMENT ON SCHEMA public IS 'Schema includes tables for AI workforce monitoring:
Agents (9 total):
- Timmy: Health monitoring (ops_events)
- Tommy: Data quality (kpi_snapshots, ops_events)
- Tina: Governance (governance_snapshots, governance_changes, ops_events)
- Sophia: Feedback triage (feedback_submissions, ops_events)
- Bailey: Business alerts (business_alert_rules, ops_events)
- Sam: Security monitoring (security_events, ops_events)
- Pete: Performance monitoring (performance_metrics, ops_events)
- Derek: Deployment monitoring (deployments, ops_events)
- Emma: User engagement (user_activity, engagement_summary, ops_events)

RTX Data Hub Monitoring (Migration 008):
- rtx_health_log: Connection health history
- rtx_schema_registry: Auto-discovered schema from RTX
- rtx_sync_log: Data sync history
- rtx_integrity_checks: Data quality validation
- data_source_status: Failover tracking

Workflows:
- OPS-UNIFIED-001: Consolidated monitoring (all agents)
- OPS-RTX-INTAKE-001: Data intake from RTX';
