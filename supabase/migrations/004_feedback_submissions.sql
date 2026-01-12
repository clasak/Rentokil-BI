-- Migration: 004_feedback_submissions
-- Description: Enhanced feedback submissions table for Sophia agent
-- Purpose: Track alpha user feedback with triage, assignment, and resolution workflow
-- Date: 2026-01-12

-- ============================================
-- Table: feedback_submissions
-- Enhanced feedback system for alpha testing
-- ============================================
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submitter info (denormalized for queries)
  submitter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_name TEXT,
  submitter_email TEXT,
  submitter_role TEXT,
  submitter_department TEXT,

  -- Feedback classification
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'bug',           -- Something is broken
    'ui_ux',         -- Visual/usability issues
    'feature',       -- Feature request
    'performance',   -- Speed/loading issues
    'data',          -- Data accuracy/calculation issues
    'idea',          -- General improvement ideas
    'documentation'  -- Help/docs issues
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN (
    'critical',  -- Blocks work entirely
    'high',      -- Significant impact
    'medium',    -- Noticeable but workaround exists
    'low'        -- Minor inconvenience
  )),
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new',           -- Just submitted
    'acknowledged',  -- Sophia has seen it
    'investigating', -- Being looked into
    'triaged',       -- Prioritized and categorized
    'in_progress',   -- Work started
    'blocked',       -- Waiting on something
    'resolved',      -- Fix implemented
    'closed',        -- Verified and closed
    'wont_fix'       -- Declined with reason
  )),

  -- Feedback content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  page_url TEXT NOT NULL,
  component_path TEXT,
  screenshot_urls TEXT[],

  -- Resolution tracking
  assigned_to TEXT,
  resolution_notes TEXT,
  resolution_type TEXT CHECK (resolution_type IN (
    'fixed',             -- Issue was fixed
    'wont_fix',          -- Intentional decision not to fix
    'duplicate',         -- Already reported
    'cannot_reproduce',  -- Could not reproduce the issue
    'by_design'          -- Working as intended
  )),

  -- Linking to incidents for critical bugs
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,

  -- Browser/environment metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_feedback_status ON feedback_submissions(status);
CREATE INDEX idx_feedback_type ON feedback_submissions(feedback_type);
CREATE INDEX idx_feedback_severity ON feedback_submissions(severity);
CREATE INDEX idx_feedback_created ON feedback_submissions(created_at DESC);
CREATE INDEX idx_feedback_submitter ON feedback_submissions(submitter_id);
CREATE INDEX idx_feedback_new ON feedback_submissions(status, created_at)
  WHERE status = 'new';
CREATE INDEX idx_feedback_open ON feedback_submissions(status, severity)
  WHERE status NOT IN ('resolved', 'closed', 'wont_fix');

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert feedback (submitter_id must match)
CREATE POLICY "Users can submit feedback"
  ON feedback_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitter_id);

-- Users can read their own feedback; admins can read all
CREATE POLICY "Users can read own feedback or admins read all"
  ON feedback_submissions FOR SELECT
  TO authenticated
  USING (
    submitter_id = auth.uid() OR
    auth.jwt() ->> 'email' IN ('cody.lytle@rentokil.com', 'cody.lytle@prestox.com')
  );

-- Admins can update feedback (for triage/assignment)
CREATE POLICY "Admins can update feedback"
  ON feedback_submissions FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('cody.lytle@rentokil.com', 'cody.lytle@prestox.com')
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('cody.lytle@rentokil.com', 'cody.lytle@prestox.com')
  );

-- Service role has full access (for n8n Sophia agent)
CREATE POLICY "Service role full access"
  ON feedback_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feedback_updated_at
  BEFORE UPDATE ON feedback_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT ON feedback_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback_submissions TO service_role;

-- ============================================
-- Helper Functions
-- ============================================

-- Get new feedback for Sophia agent
CREATE OR REPLACE FUNCTION get_new_feedback()
RETURNS SETOF feedback_submissions
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM feedback_submissions
  WHERE status = 'new'
  ORDER BY
    CASE severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    created_at ASC;
$$;

-- Get feedback stats for dashboard
CREATE OR REPLACE FUNCTION get_feedback_stats()
RETURNS TABLE (
  total_count BIGINT,
  new_count BIGINT,
  in_progress_count BIGINT,
  resolved_count BIGINT,
  critical_count BIGINT,
  high_count BIGINT,
  avg_resolution_hours NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'new') as new_count,
    COUNT(*) FILTER (WHERE status IN ('acknowledged', 'investigating', 'triaged', 'in_progress')) as in_progress_count,
    COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_count,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high') as high_count,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
      ) FILTER (WHERE resolved_at IS NOT NULL),
      1
    ) as avg_resolution_hours
  FROM feedback_submissions;
$$;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE feedback_submissions IS 'Alpha user feedback tracked by Sophia agent';
COMMENT ON COLUMN feedback_submissions.feedback_type IS 'Type: bug, ui_ux, feature, performance, data, idea, documentation';
COMMENT ON COLUMN feedback_submissions.severity IS 'Severity: critical, high, medium, low';
COMMENT ON COLUMN feedback_submissions.status IS 'Status: new, acknowledged, investigating, triaged, in_progress, blocked, resolved, closed, wont_fix';
COMMENT ON COLUMN feedback_submissions.resolution_type IS 'Resolution: fixed, wont_fix, duplicate, cannot_reproduce, by_design';
