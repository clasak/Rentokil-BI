-- Migration: 005_add_sophia_source
-- Description: Add 'sophia' to ops_events source constraint for feedback triage agent
-- Date: 2026-01-12

-- Drop existing constraint
ALTER TABLE ops_events DROP CONSTRAINT IF EXISTS ops_events_source_check;

-- Add updated constraint with sophia
ALTER TABLE ops_events ADD CONSTRAINT ops_events_source_check
  CHECK (source IN (
    'timmy',     -- Reliability agent
    'tommy',     -- Data quality agent
    'tina',      -- Governance agent
    'sophia',    -- Feedback triage agent
    'manual',    -- Manual entry
    'system',    -- System-generated
    'n8n-test',  -- Test workflow
    'api'        -- API-generated
  ));

-- Also add feedback event types to event_type constraint
ALTER TABLE ops_events DROP CONSTRAINT IF EXISTS ops_events_event_type_check;

ALTER TABLE ops_events ADD CONSTRAINT ops_events_event_type_check
  CHECK (event_type IN (
    'health_check',     -- Regular health check result
    'alert',            -- Threshold breach or anomaly
    'incident',         -- Confirmed incident
    'recovery',         -- Incident resolved
    'kpi_snapshot',     -- KPI value capture
    'reconciliation',   -- Reconciliation check
    'governance',       -- KPI definition change (legacy)
    'governance_change',-- KPI definition change detected
    'governance_init',  -- Initial governance snapshot
    'governance_check', -- Governance check completed
    'feedback_check',   -- Feedback check (no new items)
    'feedback_triaged', -- Individual feedback triaged
    'feedback_batch',   -- Batch feedback summary
    'manual',           -- Manually created event
    'test'              -- Test events
  ));

COMMENT ON COLUMN ops_events.source IS 'Source agent: timmy, tommy, tina, sophia, manual, system, n8n-test, api';
