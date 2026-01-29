// New Start Log Types - matches Houston New Start Log CSV structure
// RED columns = Account Executive fills in
// YELLOW columns = Operations Manager fills in

export type ServiceType = 'Contract' | 'Job 1x'
export type FrequencyType = '1' | '2' | '4' | '6' | '12' | '24' | ''
export type YesNo = 'Y' | 'N' | ''
export type MonthName = 'January' | 'February' | 'March' | 'April' | 'May' | 'June' |
                        'July' | 'August' | 'September' | 'October' | 'November' | 'December' | ''

// NEW TYPES for enhanced fields
export type PestType =
  | 'General Pest'
  | 'Termite'
  | 'Rodent'
  | 'Wildlife'
  | 'Bed Bug'
  | 'Mosquito'
  | 'Lawn Care'
  | 'Insulation'

export interface SalesRepSplit {
  name: string
  split: number  // Percentage (0-100)
}

export interface EquipmentDetails {
  generalPest: {
    rbsQty: number
    mrtQty: number
    iltQty: number
    doorSweepsQty: number
    glueBoardsQty: number
    flyLightsQty: number
    perimeterSpray: boolean
    interiorTreatment: boolean
  }
  termite: {
    baitStationsQty: number
    liquidTreatment: boolean
    monitoringStationsQty: number
    drillingRequired: boolean
  }
  notes: string
}

// Fields filled by Account Executive (RED columns)
export interface NewStartAEFields {
  soldDate: string                    // "Sold Date"
  accountName: string                 // "ACCOUNT NAME"
  serviceAddress: string              // "SERVICE ADDRESS"
  salesRepsInvolved: string           // "Sales Rep(S) Involved" (DEPRECATED - use salesRepsWithSplits)
  salesRepsWithSplits?: SalesRepSplit[]  // NEW: Sales reps with commission splits
  initialJobPrice: number             // "Initial / JOB 1X Price Including Merchandise"
  maintenancePrice: number            // "Maintenance (CONTRACT) Price"
  serviceType: ServiceType            // "Type - Contract (Or) Job 1x"
  frequency: FrequencyType            // "Frequency (# Of Annual Visits)"
  logBookNeeded: YesNo                // "Log Book Needed"
  tapLeadOrSpecialist: string         // "TAP LEAD -NO (OR) SPECIALIST NAME"
  pestPacLocNumber: string            // "Confirmed PestPac Entry w/ Loc #"
  customerRequestedStartMonth: MonthName  // "Customer Requested Start Month" (DEPRECATED)
  customerRequestedStartDate?: string | null  // NEW: Full date instead of just month
  pestTypes?: PestType[]              // NEW: Multi-select pest types
  pestPacEntryUrl?: string            // NEW: Direct link to PestPac record
}

// Fields filled by Operations Manager (YELLOW columns)
export interface NewStartOpsFields {
  operationsManager: string           // "Operations Manager"
  assignedSpecialist: string          // "Assigned Specialist"
  materialsOrdered: YesNo             // "Have Materials Been Ordered"
  installationStarted: string         // "Initial / Installation Service Started" (DEPRECATED - date string)
  installationStartedDate?: string | null  // NEW: Installation started date (YYYY-MM-DD)
  pocNamePhone: string                // "POC Name/Phone#"
  confirmedStartDate: string          // "Confirmed Start Date with POC"
  specialNotes: string                // "SPECIAL NOTES / Equipment Overview" (free text notes)
  equipment?: EquipmentDetails        // NEW: Structured equipment tracking
}

// Complete New Start entry
export interface NewStartEntry extends NewStartAEFields, NewStartOpsFields {
  id: string
  createdAt: string
  updatedAt: string
  status: NewStartStatus
  branchId: string
}

export type NewStartStatus =
  | 'pending_ops'      // AE submitted, waiting for Ops to assign
  | 'scheduled'        // Ops has assigned specialist, date pending
  | 'confirmed'        // Start date confirmed with POC
  | 'in_progress'      // Installation/service started
  | 'completed'        // Service completed
  | 'on_hold'          // Issue blocking progress

// For dashboard views
export interface NewStartSummary {
  total: number
  pendingOps: number
  scheduled: number
  confirmed: number
  inProgress: number
  completed: number
  onHold: number
  totalInitialValue: number
  totalContractValue: number
}

// Form input for AE creating new start
export interface NewStartAEInput {
  soldDate: string
  accountName: string
  serviceAddress: string
  salesRepsInvolved: string
  initialJobPrice: string
  maintenancePrice: string
  serviceType: ServiceType | ''
  frequency: FrequencyType
  logBookNeeded: YesNo
  tapLeadOrSpecialist: string
  pestPacLocNumber: string
  customerRequestedStartMonth: MonthName
  customerRequestedStartDate?: string | null
}

// Form input for Ops Manager updating
export interface NewStartOpsInput {
  operationsManager: string
  assignedSpecialist: string
  materialsOrdered: YesNo
  installationStarted: string
  pocNamePhone: string
  confirmedStartDate: string
  specialNotes: string
  installationStartedDate?: string
  equipment?: EquipmentDetails
}

// Supabase new_start_ops_data table structure
export interface NewStartOpsData {
  id: string
  sales_id: string
  bigquery_source: string
  operations_manager: string | null
  assigned_specialist: string | null
  materials_ordered: string | null
  confirmed_start_date: string | null
  installation_started_date: string | null
  customer_requested_start_date: string | null
  poc_name_phone: string | null
  special_notes: string | null
  equipment: EquipmentDetails
  pest_types: string[] | null
  sales_reps_splits: SalesRepSplit[] | null
  pestpac_entry_url: string | null
  status: NewStartStatus
  created_at: string
  created_by: string | null
  updated_at: string
  updated_by: string | null
}
