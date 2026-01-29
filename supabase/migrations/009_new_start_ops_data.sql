-- New Starts Operations Data Table
-- Stores operations manager inputs (YELLOW fields) for new start tracking
-- Replaces browser localStorage with proper database persistence for multi-user collaboration

CREATE TABLE IF NOT EXISTS new_start_ops_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to BigQuery contract (composite key for uniqueness)
  sales_id TEXT NOT NULL,
  bigquery_source TEXT NOT NULL DEFAULT 'W3_Contract_Checker',

  -- Existing Ops fields (previously in localStorage)
  operations_manager TEXT,
  assigned_specialist TEXT,
  materials_ordered TEXT CHECK (materials_ordered IN ('Y', 'N', '')),
  confirmed_start_date DATE,
  poc_name_phone TEXT,
  special_notes TEXT,

  -- NEW FIELDS
  installation_started_date DATE,  -- When service actually began
  customer_requested_start_date DATE,  -- Initial customer expectation

  -- Equipment tracking (structured JSON)
  -- Default: all equipment types with zero quantities/false booleans
  equipment JSONB DEFAULT '{
    "generalPest": {
      "rbsQty": 0,
      "mrtQty": 0,
      "iltQty": 0,
      "doorSweepsQty": 0,
      "glueBoardsQty": 0,
      "flyLightsQty": 0,
      "perimeterSpray": false,
      "interiorTreatment": false
    },
    "termite": {
      "baitStationsQty": 0,
      "liquidTreatment": false,
      "monitoringStationsQty": 0,
      "drillingRequired": false
    },
    "notes": ""
  }'::jsonb,

  -- Pest types (array of selected types)
  pest_types TEXT[],

  -- Sales rep commission splits (JSON array)
  -- Example: [{"name": "Cody Lytle", "split": 50}, {"name": "Jane Doe", "split": 50}]
  sales_reps_splits JSONB,

  -- PestPac entry link/reference
  pestpac_entry_url TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_ops' CHECK (
    status IN ('pending_ops', 'scheduled', 'confirmed', 'in_progress', 'completed', 'on_hold')
  ),

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure one ops record per BigQuery sale
  UNIQUE(sales_id, bigquery_source)
);

-- Indexes for query performance
CREATE INDEX idx_new_start_ops_sales_id ON new_start_ops_data(sales_id);
CREATE INDEX idx_new_start_ops_status ON new_start_ops_data(status);
CREATE INDEX idx_new_start_ops_manager ON new_start_ops_data(operations_manager);
CREATE INDEX idx_new_start_ops_dates ON new_start_ops_data(confirmed_start_date, installation_started_date);
CREATE INDEX idx_new_start_ops_created_at ON new_start_ops_data(created_at DESC);

-- Enable Row Level Security
ALTER TABLE new_start_ops_data ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all records (filtered by role in app logic)
-- This is more flexible than strict RLS for dashboard views
CREATE POLICY "Authenticated users can read ops data"
  ON new_start_ops_data
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert ops data
-- Creation happens when AE submits new start or when Ops first edits
CREATE POLICY "Authenticated users can create ops data"
  ON new_start_ops_data
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update ops data
-- Updates happen when Ops managers edit YELLOW fields
CREATE POLICY "Authenticated users can update ops data"
  ON new_start_ops_data
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Note: More granular RLS policies can be added later based on user_profiles role
-- For now, we use permissive policies and enforce role-based access in app logic
