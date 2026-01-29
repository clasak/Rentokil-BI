-- Migration: Action Item 2 Tables
-- Description: Tables for AE import workflow and automation rules
-- Created: 2026-01-27

-- ============================================================================
-- Proposals Table (AE Import - Quote/Proposal tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  pricing NUMERIC(10, 2),
  pdf_url TEXT, -- Optional: Store path to uploaded PDF
  parsed_data JSONB, -- Store full parsed quote data
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION update_proposals_updated_at();

-- ============================================================================
-- Sales Table (AE Import - Sold contracts tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  sell_amount NUMERIC(10, 2) NOT NULL,
  sell_date DATE NOT NULL,
  contract_type TEXT, -- e.g., 'Residential', 'Commercial'
  service_category TEXT, -- e.g., 'Pest Control', 'Termite', 'Wildlife'
  branch_code TEXT,
  region_code TEXT,
  market_code TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending_ops' CHECK (status IN ('pending_ops', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_sell_date ON sales(sell_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_branch_code ON sales(branch_code);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION update_sales_updated_at();

-- ============================================================================
-- New Starts Table (AE Import - New customer start tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS new_starts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  service_category TEXT,
  branch_code TEXT,
  region_code TEXT,
  market_code TEXT,
  customer_contact JSONB, -- Store contact info: {phone, email, address}
  status TEXT DEFAULT 'pending_ops' CHECK (status IN ('pending_ops', 'scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_new_starts_created_by ON new_starts(created_by);
CREATE INDEX IF NOT EXISTS idx_new_starts_start_date ON new_starts(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_new_starts_status ON new_starts(status);
CREATE INDEX IF NOT EXISTS idx_new_starts_branch_code ON new_starts(branch_code);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_new_starts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_new_starts_updated_at
BEFORE UPDATE ON new_starts
FOR EACH ROW
EXECUTE FUNCTION update_new_starts_updated_at();

-- ============================================================================
-- Automation Rules Table (Lead Service Engine - Rule engine)
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('lead_received', 'lead_updated', 'stage_change', 'time_based', 'threshold')),
  conditions JSONB NOT NULL, -- Store rule conditions: {field: 'pest_type', operator: 'equals', value: 'termite'}
  actions JSONB NOT NULL, -- Store actions: [{type: 'assign', target: 'team_id', value: 'termite-specialists'}]
  priority INTEGER DEFAULT 100, -- Lower number = higher priority
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_is_active ON automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_type ON automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON automation_rules(priority ASC);
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by ON automation_rules(created_by);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_automation_rules_updated_at
BEFORE UPDATE ON automation_rules
FOR EACH ROW
EXECUTE FUNCTION update_automation_rules_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_starts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Proposals policies: Users can only see their own proposals
CREATE POLICY "Users can view own proposals"
  ON proposals FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create proposals"
  ON proposals FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own proposals"
  ON proposals FOR UPDATE
  USING (auth.uid() = created_by);

-- Sales policies: Users can only see their own sales
CREATE POLICY "Users can view own sales"
  ON sales FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create sales"
  ON sales FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own sales"
  ON sales FOR UPDATE
  USING (auth.uid() = created_by);

-- New Starts policies: Users can only see their own new starts
CREATE POLICY "Users can view own new starts"
  ON new_starts FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create new starts"
  ON new_starts FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own new starts"
  ON new_starts FOR UPDATE
  USING (auth.uid() = created_by);

-- Automation Rules policies: All authenticated users can view, only admins can modify
CREATE POLICY "Authenticated users can view automation rules"
  ON automation_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only rule creators can update automation rules"
  ON automation_rules FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create automation rules"
  ON automation_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only rule creators can delete automation rules"
  ON automation_rules FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT ALL ON proposals TO authenticated;
GRANT ALL ON sales TO authenticated;
GRANT ALL ON new_starts TO authenticated;
GRANT ALL ON automation_rules TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE proposals IS 'AE Import: Proposal/quote tracking before sale';
COMMENT ON TABLE sales IS 'AE Import: Sold contracts tracking';
COMMENT ON TABLE new_starts IS 'AE Import: New customer start tracking';
COMMENT ON TABLE automation_rules IS 'Lead Service Engine: Automation rule definitions';
