/**
 * Supabase Client Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Copy your project URL and anon key from Settings > API
 * 3. Create a .env.local file with:
 *    NEXT_PUBLIC_SUPABASE_URL=your-project-url
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * 4. Set USE_MOCK_DATA=false in .env.local to enable Supabase
 *
 * DATABASE SCHEMA:
 * Run the migration in /supabase/migrations/ to create tables
 */

// Placeholder for Supabase client
// Uncomment and install @supabase/supabase-js when ready to use

/*
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
*/

// Temporary placeholder export
export const supabase = null as any

// Helper function to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Type definitions for database tables (generate with supabase gen types)
export interface DatabaseTables {
  markets: {
    id: string
    name: string
    region: string
    created_at: string
  }
  branches: {
    id: string
    name: string
    market_id: string
    address: string
    created_at: string
  }
  users: {
    id: string
    name: string
    email: string
    role: 'exec' | 'vp_director' | 'manager' | 'rep'
    title: string
    assigned_markets: string[]
    assigned_branches: string[]
    assigned_teams: string[]
    created_at: string
  }
  accounts: {
    id: string
    name: string
    vertical: 'Commercial' | 'Residential' | 'Government' | 'Healthcare' | 'Food Service'
    contract_value: number
    retention_risk: 'low' | 'medium' | 'high'
    last_service_date: string
    open_issues: number
    market_id: string
    branch_id: string
    owner_id: string
    created_at: string
    ar_balance: number
    service_frequency: 'monthly' | 'quarterly' | 'annual'
    complaints: number
  }
  opportunities: {
    id: string
    account_id: string
    name: string
    stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
    amount: number
    probability: number
    created_date: string
    close_date: string
    next_step_date: string | null
    stage_last_changed: string
    owner_id: string
    days_in_stage: number
    is_stalled: boolean
    next_step: string
    lost_reason: string | null
  }
  invoices: {
    id: string
    account_id: string
    amount: number
    invoice_date: string
    due_date: string
    status: 'paid' | 'open' | 'overdue' | 'disputed' | 'void'
    paid_date: string | null
    aging_bucket: '0-30' | '31-60' | '61-90' | '90+'
  }
  service_events: {
    id: string
    account_id: string
    technician_id: string
    route_id: string
    scheduled_date: string
    completed_date: string | null
    status: 'scheduled' | 'completed' | 'missed' | 'callback'
    time_on_site: number
    service_type: string
    notes: string | null
  }
  new_starts: {
    id: string
    sold_date: string
    account_name: string
    service_address: string
    sales_reps_involved: string
    initial_job_price: number
    maintenance_price: number
    service_type: 'Contract' | 'Job 1x'
    frequency: '1' | '6' | '12'
    log_book_needed: 'Y' | 'N'
    tap_lead_or_specialist: string
    pest_pac_loc_number: string
    customer_requested_start_month: string
    operations_manager: string
    assigned_specialist: string
    materials_ordered: string
    installation_started: string
    poc_name_phone: string
    confirmed_start_date: string
    special_notes: string
    status: 'pending_ops' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'on_hold'
    branch_id: string
    created_at: string
    updated_at: string
  }
  daily_sales_entries: {
    id: string
    branch_code: string
    date: string
    pcc_in_field: number
    tap_leads: number | null
    insp_prp: number
    lobs_prp: number
    lobs_sold: number
    dollars_sold: number
    next_day_conf: number
    pc_no_tc_conversions: boolean
    created_at: string
    updated_at: string
    submitted_by: string
  }
}
