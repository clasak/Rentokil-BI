// New Start Log Types - matches Houston New Start Log CSV structure
// RED columns = Account Executive fills in
// YELLOW columns = Operations Manager fills in

export type ServiceType = 'Contract' | 'Job 1x'
export type FrequencyType = '1' | '2' | '4' | '6' | '12' | '24' | ''
export type YesNo = 'Y' | 'N' | ''
export type MonthName = 'January' | 'February' | 'March' | 'April' | 'May' | 'June' |
                        'July' | 'August' | 'September' | 'October' | 'November' | 'December' | ''

// Fields filled by Account Executive (RED columns)
export interface NewStartAEFields {
  soldDate: string                    // "Sold Date"
  accountName: string                 // "ACCOUNT NAME"
  serviceAddress: string              // "SERVICE ADDRESS"
  salesRepsInvolved: string           // "Sales Rep(S) Involved"
  initialJobPrice: number             // "Initial / JOB 1X Price Including Merchandise"
  maintenancePrice: number            // "Maintenance (CONTRACT) Price"
  serviceType: ServiceType            // "Type - Contract (Or) Job 1x"
  frequency: FrequencyType            // "Frequency (# Of Annual Visits)"
  logBookNeeded: YesNo                // "Log Book Needed"
  tapLeadOrSpecialist: string         // "TAP LEAD -NO (OR) SPECIALIST NAME"
  pestPacLocNumber: string            // "Confirmed PestPac Entry w/ Loc #"
  customerRequestedStartMonth: MonthName  // "Customer Requested Start Month"
}

// Fields filled by Operations Manager (YELLOW columns)
export interface NewStartOpsFields {
  operationsManager: string           // "Operations Manager"
  assignedSpecialist: string          // "Assigned Specialist"
  materialsOrdered: YesNo             // "Have Materials Been Ordered"
  installationStarted: string         // "Initial / Installation Service Started" (date)
  pocNamePhone: string                // "POC Name/Phone#"
  confirmedStartDate: string          // "Confirmed Start Date with POC"
  specialNotes: string                // "SPECIAL NOTES / Equipment Overview"
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
}
