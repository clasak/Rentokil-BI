/**
 * RTX Data Hub API Types
 *
 * These types represent the raw response schemas from RTX Data Hub.
 * They are transformed to our internal types before being used in the app.
 */

// RTX API response wrapper
export interface RTXApiResponse<T> {
  success: boolean
  data: T
  meta: {
    totalCount: number
    pageSize: number
    pageNumber: number
    totalPages: number
  }
  errors?: RTXApiError[]
}

export interface RTXApiError {
  code: string
  message: string
  field?: string
}

// RTX Account schema (from RTX Data Hub)
export interface RTXAccount {
  CUST_ACCT_ID: string
  CUST_NAME: string
  CUST_INDUSTRY_CD: string
  CONTRACT_ACV: number
  CONTRACT_START_DT: string
  CONTRACT_END_DT: string
  SVC_BRANCH_ID: string
  SVC_REGION_ID: string
  SVC_MARKET_ID: string
  ACCT_OWNER_ID: string
  RETENTION_RISK_SCORE: number
  RETENTION_RISK_LEVEL: 'L' | 'M' | 'H'
  LAST_SVC_DT: string | null
  OPEN_ISSUE_CNT: number
  AR_BALANCE: number
  SVC_FREQ_CD: string
  COMPLAINT_CNT_90D: number
  CREATED_DT: string
  UPDATED_DT: string
}

// RTX Opportunity schema
export interface RTXOpportunity {
  OPP_ID: string
  CUST_ACCT_ID: string
  OPP_NAME: string
  OPP_STAGE_CD: string
  OPP_AMOUNT: number
  WIN_PROBABILITY: number
  CREATED_DT: string
  EXPECTED_CLOSE_DT: string | null
  ACTUAL_CLOSE_DT: string | null
  LAST_STAGE_CHANGE_DT: string
  DAYS_IN_STAGE: number
  IS_STALLED: boolean
  OPP_OWNER_ID: string
  NEXT_STEP: string | null
  LOST_REASON_CD: string | null
}

// RTX Service Event schema
export interface RTXServiceEvent {
  SVC_ORDER_ID: string
  CUST_ACCT_ID: string
  TECH_EMP_ID: string
  ROUTE_ID: string
  SCHEDULED_DT: string
  COMPLETED_DT: string | null
  SVC_STATUS_CD: string
  SVC_DURATION_MIN: number | null
  SVC_TYPE_CD: string
  SVC_NOTES: string | null
  CALLBACK_FLAG: boolean
  CALLBACK_REASON: string | null
}

// RTX Invoice schema
export interface RTXInvoice {
  INVOICE_NUM: string
  CUST_ACCT_ID: string
  INV_TOTAL_AMT: number
  INVOICE_DT: string
  DUE_DT: string
  PAID_DT: string | null
  INV_STATUS_CD: string
  DAYS_PAST_DUE: number
  AGING_BUCKET_CD: string
}

// RTX User/Employee schema
export interface RTXUser {
  EMPLOYEE_ID: string
  EMPLOYEE_NAME: string
  EMAIL: string
  JOB_FAMILY_CD: string
  JOB_LEVEL: string
  BRANCH_ID: string
  REGION_ID: string
  MARKET_ID: string
  MANAGER_ID: string | null
  HIRE_DT: string
  STATUS: 'A' | 'I' | 'T'
}

// RTX Branch schema
export interface RTXBranch {
  BRANCH_ID: string
  BRANCH_NAME: string
  REGION_ID: string
  MARKET_ID: string
  ADDRESS: string
  CITY: string
  STATE: string
  ZIP: string
  STATUS: 'A' | 'I'
}

// RTX Region schema
export interface RTXRegion {
  REGION_ID: string
  REGION_NAME: string
  REGION_CD: string
  MARKET_ID: string
}

// RTX Market schema
export interface RTXMarket {
  MARKET_ID: string
  MARKET_NAME: string
  MARKET_CD: string
}

// API Query Parameters
export interface RTXQueryParams {
  pageSize?: number
  pageNumber?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, string | number | boolean>
}

export interface RTXAccountFilters {
  branchId?: string
  regionId?: string
  marketId?: string
  ownerId?: string
  retentionRisk?: 'L' | 'M' | 'H'
  vertical?: string
  minContractValue?: number
  maxContractValue?: number
}

export interface RTXOpportunityFilters {
  accountId?: string
  ownerId?: string
  stage?: string
  minAmount?: number
  maxAmount?: number
  isStalled?: boolean
  createdAfter?: string
  expectedCloseBefore?: string
}

export interface RTXServiceEventFilters {
  accountId?: string
  technicianId?: string
  routeId?: string
  status?: string
  serviceType?: string
  scheduledAfter?: string
  scheduledBefore?: string
}

export interface RTXInvoiceFilters {
  accountId?: string
  status?: string
  agingBucket?: string
  minAmount?: number
  maxAmount?: number
  invoicedAfter?: string
  invoicedBefore?: string
}

// Connection configuration
export interface RTXConnectionConfig {
  endpoint: string
  apiKey: string
  timeout: number
  retries: number
  retryDelay: number
}

// Connection status
export interface RTXConnectionStatus {
  connected: boolean
  lastChecked: string
  responseTime?: number
  error?: string
  version?: string
}
