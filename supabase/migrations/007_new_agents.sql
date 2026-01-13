-- Migration: 007_new_agents
-- Description: Add tables and constraints for 5 new AI workforce agents
-- Agents: Bailey (business alerts), Sam (security), Pete (performance), Derek (deployments), Emma (engagement)
-- Date: 2026-01-13

-- ============================================================================
-- PART 1: Update existing constraints to support new agents
-- ============================================================================

-- Update ops_events source constraint to include new agents
ALTER TABLE ops_events DROP CONSTRAINT IF EXISTS ops_events_source_check;
ALTER TABLE ops_events ADD CONSTRAINT ops_events_source_check
  CHECK (source IN (
    'timmy',     -- Reliability agent
    'tommy',     -- Data quality agent
    'tina',      -- Governance agent
    'sophia',    -- Feedback triage agent
    'bailey',    -- Business alerts agent
    'sam',       -- Security monitoring agent
    'pete',      -- Performance monitoring agent
    'derek',     -- Deployment monitoring agent
    'emma',      -- User engagement agent
    'manual',    -- Manual entry
    'system',    -- System-generated
    'n8n-test',  -- Test workflow
    'api'        -- API-generated
  ));

-- Update ops_events event_type constraint to include new event types
ALTER TABLE ops_events DROP CONSTRAINT IF EXISTS ops_events_event_type_check;
ALTER TABLE ops_events ADD CONSTRAINT ops_events_event_type_check
  CHECK (event_type IN (
    -- Existing event types
    'health_check',       -- Regular health check result
    'alert',              -- Threshold breach or anomaly
    'incident',           -- Confirmed incident
    'recovery',           -- Incident resolved
    'kpi_snapshot',       -- KPI value capture
    'reconciliation',     -- Reconciliation check
    'governance',         -- KPI definition change (legacy)
    'governance_change',  -- KPI definition change detected
    'governance_init',    -- Initial governance snapshot
    'governance_check',   -- Governance check completed
    'feedback_check',     -- Feedback check (no new items)
    'feedback_triaged',   -- Individual feedback triaged
    'feedback_batch',     -- Batch feedback summary
    'manual',             -- Manually created event
    'test',               -- Test events
    -- New event types for new agents
    'business_alert',     -- Bailey: business threshold breach
    'security_event',     -- Sam: security-related event
    'security_threat',    -- Sam: detected security threat
    'performance_check',  -- Pete: performance metrics captured
    'sla_breach',         -- Pete: SLA threshold breached
    'deployment',         -- Derek: deployment detected
    'deployment_verified',-- Derek: deployment health verified
    'engagement_summary', -- Emma: daily engagement summary
    'engagement_alert'    -- Emma: engagement below target
  ));

-- Update kpi_snapshots source constraint to include bailey
ALTER TABLE kpi_snapshots DROP CONSTRAINT IF EXISTS kpi_snapshots_source_check;
ALTER TABLE kpi_snapshots ADD CONSTRAINT kpi_snapshots_source_check
  CHECK (source IN ('tommy', 'bailey', 'scheduled', 'manual', 'api'));

-- Update comments
COMMENT ON COLUMN ops_events.source IS 'Source agent: timmy, tommy, tina, sophia, bailey, sam, pete, derek, emma, manual, system, n8n-test, api';

-- ============================================================================
-- PART 2: Security Events Table (for Sam)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success',       -- Successful login
    'login_failure',       -- Failed login attempt
    'logout',              -- User logged out
    'password_reset',      -- Password reset requested/completed
    'role_change',         -- User role was changed
    'session_anomaly',     -- Unusual session behavior
    'brute_force',         -- Brute force attack detected
    'privilege_escalation' -- Unauthorized privilege escalation attempt
  )),

  -- User context
  user_email TEXT,
  user_id UUID,

  -- Request context
  ip_address TEXT,
  user_agent TEXT,

  -- Severity
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),

  -- Additional data
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for security_events
CREATE INDEX IF NOT EXISTS idx_security_events_email ON security_events(user_email);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Composite index for threat detection queries
CREATE INDEX IF NOT EXISTS idx_security_events_threat_detection
  ON security_events(user_email, event_type, created_at DESC);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Policies for security_events (read-only for authenticated, full for service role)
CREATE POLICY "Allow authenticated read security_events"
  ON security_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access security_events"
  ON security_events FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE security_events IS 'Security events tracked by Sam agent for threat detection';

-- ============================================================================
-- PART 3: Performance Metrics Table (for Pete)
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Endpoint info
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'GET',

  -- Performance data
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER,
  is_error BOOLEAN DEFAULT FALSE,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance_metrics
CREATE INDEX IF NOT EXISTS idx_perf_endpoint ON performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_perf_captured ON performance_metrics(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_response_time ON performance_metrics(response_time_ms);

-- Composite index for SLA queries
CREATE INDEX IF NOT EXISTS idx_perf_endpoint_time
  ON performance_metrics(endpoint, captured_at DESC);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read performance_metrics"
  ON performance_metrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access performance_metrics"
  ON performance_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE performance_metrics IS 'API performance metrics tracked by Pete agent for SLA monitoring';

-- Helper function to calculate percentiles
CREATE OR REPLACE FUNCTION get_performance_percentiles(
  p_endpoint TEXT DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  endpoint TEXT,
  sample_count BIGINT,
  p50_ms NUMERIC,
  p95_ms NUMERIC,
  p99_ms NUMERIC,
  error_rate NUMERIC,
  avg_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.endpoint,
    COUNT(*)::BIGINT as sample_count,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY pm.response_time_ms)::NUMERIC as p50_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pm.response_time_ms)::NUMERIC as p95_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY pm.response_time_ms)::NUMERIC as p99_ms,
    (COUNT(*) FILTER (WHERE pm.is_error) * 100.0 / NULLIF(COUNT(*), 0))::NUMERIC as error_rate,
    AVG(pm.response_time_ms)::NUMERIC as avg_ms
  FROM performance_metrics pm
  WHERE pm.captured_at > NOW() - (p_hours || ' hours')::INTERVAL
    AND (p_endpoint IS NULL OR pm.endpoint = p_endpoint)
  GROUP BY pm.endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: Deployments Table (for Derek)
-- ============================================================================

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deployment identifiers
  deployment_id TEXT UNIQUE NOT NULL,
  git_commit TEXT,
  git_branch TEXT,
  git_message TEXT,

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('building', 'ready', 'error', 'canceled')),
  duration_ms INTEGER,

  -- Health verification
  health_status TEXT CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'pending', 'skipped')),
  health_checks JSONB DEFAULT '{}',

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  deployed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for deployments
CREATE INDEX IF NOT EXISTS idx_deploy_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deploy_created ON deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deploy_branch ON deployments(git_branch);
CREATE INDEX IF NOT EXISTS idx_deploy_health ON deployments(health_status);

-- Enable RLS
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read deployments"
  ON deployments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access deployments"
  ON deployments FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE deployments IS 'Deployment tracking by Derek agent for release verification';

-- Helper function to get latest deployment
CREATE OR REPLACE FUNCTION get_latest_deployment()
RETURNS TABLE (
  deployment_id TEXT,
  git_commit TEXT,
  git_branch TEXT,
  status TEXT,
  health_status TEXT,
  deployed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.deployment_id,
    d.git_commit,
    d.git_branch,
    d.status,
    d.health_status,
    d.deployed_at,
    d.verified_at
  FROM deployments d
  ORDER BY d.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: User Activity Table (for Emma)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User context
  user_id UUID,
  user_email TEXT,
  user_role TEXT,

  -- Activity data
  page_url TEXT NOT NULL,
  route TEXT,
  action TEXT DEFAULT 'view' CHECK (action IN ('view', 'click', 'submit', 'export', 'search', 'filter')),

  -- Session tracking
  session_id TEXT,
  duration_seconds INTEGER,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_activity
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_email ON user_activity(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_route ON user_activity(route);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity(action);
CREATE INDEX IF NOT EXISTS idx_activity_session ON user_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity(created_at DESC);

-- Composite index for daily rollups
CREATE INDEX IF NOT EXISTS idx_activity_daily
  ON user_activity(DATE(created_at), user_id);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policies (users can only see their own activity, service role sees all)
CREATE POLICY "Allow users to read own activity"
  ON user_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow service role full access user_activity"
  ON user_activity FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE user_activity IS 'User activity tracking for Emma engagement agent';

-- ============================================================================
-- PART 6: Engagement Summary Table (for Emma daily rollups)
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Date for this summary
  summary_date DATE NOT NULL,

  -- User metrics
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  returning_users INTEGER DEFAULT 0,

  -- Session metrics
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER DEFAULT 0,

  -- Engagement data (JSON arrays/objects for flexibility)
  top_pages JSONB DEFAULT '[]',
  top_features JSONB DEFAULT '[]',
  engagement_by_role JSONB DEFAULT '{}',

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One summary per day
  UNIQUE(summary_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_engagement_date ON engagement_summary(summary_date DESC);

-- Enable RLS
ALTER TABLE engagement_summary ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read engagement_summary"
  ON engagement_summary FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access engagement_summary"
  ON engagement_summary FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE engagement_summary IS 'Daily engagement summaries generated by Emma agent';

-- Helper function to calculate daily engagement
CREATE OR REPLACE FUNCTION calculate_daily_engagement(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS TABLE (
  summary_date DATE,
  active_users BIGINT,
  total_sessions BIGINT,
  avg_duration NUMERIC,
  top_pages JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT
      COUNT(DISTINCT ua.user_id) as active_users,
      COUNT(DISTINCT ua.session_id) as total_sessions,
      AVG(ua.duration_seconds) as avg_duration
    FROM user_activity ua
    WHERE DATE(ua.created_at) = p_date
  ),
  page_stats AS (
    SELECT
      jsonb_agg(
        jsonb_build_object('route', route, 'views', view_count)
        ORDER BY view_count DESC
      ) as top_pages
    FROM (
      SELECT route, COUNT(*) as view_count
      FROM user_activity
      WHERE DATE(created_at) = p_date
        AND action = 'view'
      GROUP BY route
      ORDER BY view_count DESC
      LIMIT 10
    ) ps
  )
  SELECT
    p_date as summary_date,
    ds.active_users,
    ds.total_sessions,
    ds.avg_duration,
    COALESCE(ps.top_pages, '[]'::jsonb) as top_pages
  FROM daily_stats ds, page_stats ps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: Business Alert Rules Table (for Bailey)
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  rule_name TEXT NOT NULL,
  description TEXT,

  -- KPI to monitor
  kpi_slug TEXT NOT NULL,

  -- Alert condition
  condition TEXT NOT NULL CHECK (condition IN (
    'below_target',       -- Value is below target by X%
    'above_target',       -- Value is above target by X%
    'below_threshold',    -- Value is below absolute threshold
    'above_threshold',    -- Value is above absolute threshold
    'variance_exceeds',   -- Variance exceeds X%
    'trend_declining',    -- Week-over-week decline
    'trend_improving'     -- Week-over-week improvement
  )),

  -- Threshold configuration
  threshold_value NUMERIC,     -- Absolute threshold
  threshold_percent NUMERIC,   -- Percentage threshold

  -- Alert severity
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),

  -- Notification settings
  notify_roles TEXT[] DEFAULT ARRAY['exec'],
  notify_slack BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT FALSE,

  -- Rule status
  is_active BOOLEAN DEFAULT TRUE,

  -- Cooldown to prevent alert fatigue
  cooldown_minutes INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_kpi ON business_alert_rules(kpi_slug);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON business_alert_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON business_alert_rules(severity);

-- Enable RLS
ALTER TABLE business_alert_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read business_alert_rules"
  ON business_alert_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access business_alert_rules"
  ON business_alert_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE business_alert_rules IS 'Business alert rules configuration for Bailey agent';

-- Insert default business alert rules
INSERT INTO business_alert_rules (rule_name, description, kpi_slug, condition, threshold_percent, severity, notify_roles) VALUES
  ('Revenue MTD Critical', 'Revenue is 10%+ below target', 'revenue_mtd', 'below_target', -10, 'critical', ARRAY['exec', 'sales_manager']),
  ('Revenue MTD Warning', 'Revenue is 5%+ below target', 'revenue_mtd', 'below_target', -5, 'high', ARRAY['exec', 'sales_manager']),
  ('Variance Critical', 'Variance to target exceeds -10%', 'variance_to_target_mtd', 'below_threshold', -10, 'critical', ARRAY['exec']),
  ('Win Rate Declining', 'Win rate below 28%', 'win_rate', 'below_threshold', 28, 'high', ARRAY['exec', 'sales_manager']),
  ('Service Risk Critical', 'Service risk index below 70', 'service_risk_index', 'below_threshold', 70, 'critical', ARRAY['exec', 'ops_manager']),
  ('Callback Rate High', 'Callback rate exceeds 10%', 'callback_rate', 'above_threshold', 10, 'high', ARRAY['ops_manager']),
  ('DSO High', 'Days sales outstanding exceeds 50', 'dso', 'above_threshold', 50, 'high', ARRAY['exec']),
  ('Capacity Low', 'Capacity utilization below 65%', 'capacity_utilization', 'below_threshold', 65, 'high', ARRAY['ops_manager']),
  ('CRM Hygiene Low', 'CRM hygiene score below 70', 'crm_hygiene_score', 'below_threshold', 70, 'medium', ARRAY['sales_manager']),
  ('NRR Warning', 'Net revenue retention below 98%', 'nrr', 'below_threshold', 98, 'high', ARRAY['exec'])
ON CONFLICT DO NOTHING;

-- Helper function to get active alert rules
CREATE OR REPLACE FUNCTION get_active_alert_rules()
RETURNS TABLE (
  id UUID,
  rule_name TEXT,
  kpi_slug TEXT,
  condition TEXT,
  threshold_value NUMERIC,
  threshold_percent NUMERIC,
  severity TEXT,
  notify_roles TEXT[],
  cooldown_minutes INTEGER,
  last_triggered_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.rule_name,
    r.kpi_slug,
    r.condition,
    r.threshold_value,
    r.threshold_percent,
    r.severity,
    r.notify_roles,
    r.cooldown_minutes,
    r.last_triggered_at
  FROM business_alert_rules r
  WHERE r.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update rule trigger time (for cooldown tracking)
CREATE OR REPLACE FUNCTION update_rule_triggered(p_rule_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE business_alert_rules
  SET last_triggered_at = NOW(), updated_at = NOW()
  WHERE id = p_rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 8: Grant permissions
-- ============================================================================

-- Grant permissions on all new tables
GRANT SELECT ON security_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON security_events TO service_role;

GRANT SELECT ON performance_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON performance_metrics TO service_role;

GRANT SELECT ON deployments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON deployments TO service_role;

GRANT SELECT ON user_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_activity TO service_role;

GRANT SELECT ON engagement_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON engagement_summary TO service_role;

GRANT SELECT ON business_alert_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_alert_rules TO service_role;

-- ============================================================================
-- PART 9: Summary comment
-- ============================================================================

COMMENT ON SCHEMA public IS 'Schema includes tables for 9 AI workforce agents:
- Timmy: Health monitoring (ops_events)
- Tommy: Data quality (kpi_snapshots, ops_events)
- Tina: Governance (governance_snapshots, governance_changes, ops_events)
- Sophia: Feedback triage (feedback_submissions, ops_events)
- Bailey: Business alerts (business_alert_rules, ops_events)
- Sam: Security monitoring (security_events, ops_events)
- Pete: Performance monitoring (performance_metrics, ops_events)
- Derek: Deployment monitoring (deployments, ops_events)
- Emma: User engagement (user_activity, engagement_summary, ops_events)';
