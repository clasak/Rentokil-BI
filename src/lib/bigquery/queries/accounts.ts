/**
 * Account Details Queries
 *
 * Provides comprehensive account information including opportunities, service history,
 * complaints, invoices, and owner details for account detail pages.
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'

// Use environment-aware project ID
const PROJECT = BIGQUERY_CONFIG.projectId

export interface AccountQueryOptions {
  filters?: {
    accountId?: string
    market?: string
    region?: string
    branch?: string
    [key: string]: unknown
  }
  role?: string
  userId?: string
}

export interface AccountDetails {
  id: string
  name: string
  vertical: string
  contractValue: number
  serviceFrequency: string
  retentionRisk: 'low' | 'medium' | 'high'
  arBalance: number
  lastServiceDate: Date
  createdAt: Date
  openIssues: number
  ownerId: string
  city?: string
  state?: string
  branchCode?: string
  marketCode?: string
}

export interface AccountOpportunity {
  id: string
  name: string
  amount: number
  stage: string
  closeDate: Date
  probability: number
}

export interface ServiceEvent {
  id: string
  scheduledDate: Date
  serviceType: string
  status: 'completed' | 'callback' | 'missed' | 'scheduled'
  timeOnSite: number
  technicianId?: string
  notes?: string
}

export interface AccountComplaint {
  id: string
  createdAt: Date
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved'
  description: string
  resolutionDate?: Date
}

export interface AccountInvoice {
  id: string
  amount: number
  dueDate: Date
  status: 'pending' | 'paid' | 'overdue'
  invoiceDate: Date
}

export interface AccountOwner {
  id: string
  name: string
  email: string
  title: string
  branch?: string
}

/**
 * Get account details by contract ID
 * Note: Demo account IDs (acc_001) won't exist - this queries real contract data
 */
export async function getAccountDetails(options: AccountQueryOptions): Promise<AccountDetails | null> {
  const accountId = options.filters?.accountId as string

  if (!accountId) {
    throw new Error('accountId filter is required')
  }

  const sql = `
    SELECT
      c.ContractNo as id,
      c.CustomerName as name,
      COALESCE(c.Vertical, 'Commercial') as vertical,
      CAST(c.ContractValue AS FLOAT64) as contract_value,
      CASE
        WHEN c.ServiceFrequency IS NOT NULL THEN c.ServiceFrequency
        ELSE 'Monthly'
      END as service_frequency,
      CAST(COALESCE(c.ARBalance, 0) AS FLOAT64) as ar_balance,
      c.StartDate as last_service_date,
      c.SellDate as created_at,
      c.OwnerID as owner_id,
      b.city,
      b.state_code as state,
      b.branch_code,
      b.market_code
    FROM
      \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\` c
    LEFT JOIN
      \`${PROJECT}.S4.Dim_Branch_BranchID_NA_T1_Vw\` b
      ON c.BranchCode = b.branch_code
    WHERE
      c.ContractNo = @accountId
      OR c.CustomerID = @accountId
    LIMIT 1
  `

  try {
    const result = await bigQueryClient.query<{
      id: string
      name: string
      vertical: string
      contract_value: number
      service_frequency: string
      ar_balance: number
      last_service_date: { value: string }
      created_at: { value: string }
      owner_id: string
      city: string
      state: string
      branch_code: string
      market_code: string
    }>(sql.replace(/@accountId/g, `'${accountId}'`))

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]

    // Calculate retention risk based on AR balance and contract value
    let retentionRisk: 'low' | 'medium' | 'high' = 'low'
    if (row.ar_balance > row.contract_value * 0.5) {
      retentionRisk = 'high'
    } else if (row.ar_balance > row.contract_value * 0.25) {
      retentionRisk = 'medium'
    }

    return {
      id: row.id,
      name: row.name,
      vertical: row.vertical,
      contractValue: row.contract_value,
      serviceFrequency: row.service_frequency.toLowerCase(),
      retentionRisk,
      arBalance: row.ar_balance,
      lastServiceDate: new Date(row.last_service_date.value),
      createdAt: new Date(row.created_at.value),
      openIssues: 0, // Would need complaints query to calculate
      ownerId: row.owner_id,
      city: row.city,
      state: row.state,
      branchCode: row.branch_code,
      marketCode: row.market_code,
    }
  } catch (error) {
    throw handleBigQueryError(error, 'getAccountDetails')
  }
}

/**
 * Get opportunities for an account
 */
export async function getAccountOpportunities(options: AccountQueryOptions): Promise<AccountOpportunity[]> {
  const accountId = options.filters?.accountId as string

  if (!accountId) {
    return []
  }

  const sql = `
    SELECT
      lead_ID as id,
      CONCAT('Opportunity - ', LeadSource) as name,
      CAST(EstimatedValue AS FLOAT64) as amount,
      Stage as stage,
      ExpectedCloseDate as close_date,
      CAST(COALESCE(Probability, 50) AS FLOAT64) as probability
    FROM
      \`${PROJECT}.S4.Fact_Leads_Acc_Daily_Dtls_Snp\`
    WHERE
      account_ID = @accountId
      AND Stage NOT IN ('Closed Won', 'Closed Lost', 'Dead')
    ORDER BY
      ExpectedCloseDate ASC
    LIMIT 20
  `

  try {
    const result = await bigQueryClient.query<{
      id: string
      name: string
      amount: number
      stage: string
      close_date: { value: string }
      probability: number
    }>(sql.replace(/@accountId/g, `'${accountId}'`))

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      stage: row.stage,
      closeDate: new Date(row.close_date.value),
      probability: row.probability,
    }))
  } catch (error) {
    console.error('[getAccountOpportunities] Error:', error)
    return []
  }
}

/**
 * Get service history for an account
 */
export async function getAccountServiceHistory(options: AccountQueryOptions): Promise<ServiceEvent[]> {
  const accountId = options.filters?.accountId as string

  if (!accountId) {
    return []
  }

  const sql = `
    SELECT
      InspectionID as id,
      InspectionDate as scheduled_date,
      COALESCE(InspectionType, 'Service') as service_type,
      CASE
        WHEN CompletionStatus = 'Completed' THEN 'completed'
        WHEN CompletionStatus = 'Callback' THEN 'callback'
        WHEN CompletionStatus = 'Missed' THEN 'missed'
        ELSE 'scheduled'
      END as status,
      CAST(COALESCE(TimeOnSite, 0) AS INT64) as time_on_site,
      TechnicianID as technician_id
    FROM
      \`${PROJECT}.S0_TMX.Inspections\`
    WHERE
      account_ID = @accountId
    ORDER BY
      InspectionDate DESC
    LIMIT 50
  `

  try {
    const result = await bigQueryClient.query<{
      id: string
      scheduled_date: { value: string }
      service_type: string
      status: 'completed' | 'callback' | 'missed' | 'scheduled'
      time_on_site: number
      technician_id: string
    }>(sql.replace(/@accountId/g, `'${accountId}'`))

    return result.rows.map(row => ({
      id: row.id,
      scheduledDate: new Date(row.scheduled_date.value),
      serviceType: row.service_type,
      status: row.status,
      timeOnSite: row.time_on_site,
      technicianId: row.technician_id,
    }))
  } catch (error) {
    console.error('[getAccountServiceHistory] Error:', error)
    return []
  }
}

/**
 * Get complaints for an account
 * Note: This is a placeholder - actual complaint table needs to be identified
 */
export async function getAccountComplaints(options: AccountQueryOptions): Promise<AccountComplaint[]> {
  const accountId = options.filters?.accountId as string

  if (!accountId) {
    return []
  }

  // TODO: Replace with actual complaints table when identified
  // For now, return empty array
  return []
}

/**
 * Get invoices for an account
 */
export async function getAccountInvoices(options: AccountQueryOptions): Promise<AccountInvoice[]> {
  const accountId = options.filters?.accountId as string

  if (!accountId) {
    return []
  }

  const sql = `
    SELECT
      InvoiceNo as id,
      CAST(InvoiceAmount AS FLOAT64) as amount,
      DueDate as due_date,
      InvoiceDate as invoice_date,
      CASE
        WHEN PaymentStatus = 'Paid' THEN 'paid'
        WHEN DueDate < CURRENT_DATE() THEN 'overdue'
        ELSE 'pending'
      END as status
    FROM
      \`${PROJECT}.Reports.VwUnf_dim_ar_detail\`
    WHERE
      account_ID = @accountId
    ORDER BY
      invoice_date DESC
    LIMIT 50
  `

  try {
    const result = await bigQueryClient.query<{
      id: string
      amount: number
      due_date: { value: string }
      invoice_date: { value: string }
      status: 'pending' | 'paid' | 'overdue'
    }>(sql.replace(/@accountId/g, `'${accountId}'`))

    return result.rows.map(row => ({
      id: row.id,
      amount: row.amount,
      dueDate: new Date(row.due_date.value),
      status: row.status,
      invoiceDate: new Date(row.invoice_date.value),
    }))
  } catch (error) {
    console.error('[getAccountInvoices] Error:', error)
    return []
  }
}

/**
 * Get account owner/rep details
 */
export async function getAccountOwner(options: AccountQueryOptions): Promise<AccountOwner | null> {
  const ownerId = options.filters?.ownerId as string

  if (!ownerId) {
    return null
  }

  const sql = `
    SELECT
      EmployeeID as id,
      CONCAT(FirstName, ' ', LastName) as name,
      Email as email,
      JobTitle as title,
      BranchCode as branch
    FROM
      \`${PROJECT}.S0_TMX.tmx_employee\`
    WHERE
      EmployeeID = @ownerId
    LIMIT 1
  `

  try {
    const result = await bigQueryClient.query<{
      id: string
      name: string
      email: string
      title: string
      branch: string
    }>(sql.replace(/@ownerId/g, `'${ownerId}'`))

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error('[getAccountOwner] Error:', error)
    return null
  }
}
