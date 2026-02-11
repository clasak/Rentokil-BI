/**
 * BigQuery Queries for Salesforce Data (Phase 2A - Tier 1)
 *
 * TIER 1 TABLES (Essential for AE Interface):
 * 1. Raw_RTXSF_Account_Daily - Account search and management (109K accounts)
 * 2. Raw_RTXSF_Contact_Daily - Contact management (112K contacts)
 * 3. Raw_RTXSF_OpportunityHistory_Daily - Stage progression (458K records)
 * 4. Raw_RTXSF_Employee__c_Daily - Sales rep directory (1.8K employees)
 *
 * Pages: /ae/accounts, /ae/accounts/[id], /ae/pipeline/[opportunityId]
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import {
  validateOrgCode,
  validateNumeric,
  validateString,
  ValidationError,
} from '../validation'

const PROJECT = BIGQUERY_CONFIG.projectId

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate Salesforce query options to prevent SQL injection
 */
function validateSalesforceOptions(
  options: SalesforceQueryOptions,
  functionName: string
): void {
  try {
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateString(options.accountId, 'accountId', 100)
    validateString(options.opportunityId, 'opportunityId', 100)
    validateString(options.quoteId, 'quoteId', 100)
    validateString(options.contactId, 'contactId', 100)
    validateString(options.employeeId, 'employeeId', 100)
    validateString(options.searchTerm, 'searchTerm', 200)
    validateOrgCode(options.branch, 'branch')
    validateOrgCode(options.region, 'region')
    validateOrgCode(options.market, 'market')
    validateString(options.industry, 'industry', 100)
    validateString(options.city, 'city', 100)
    validateString(options.state, 'state', 50)
    validateString(options.family, 'family', 100)
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(
        `[Salesforce] ${functionName} validation failed:`,
        error.message
      )
      throw error
    }
    throw error
  }
}

// =============================================================================
// Types
// =============================================================================

export interface SalesforceQueryOptions {
  daysBack?: number
  accountId?: string
  opportunityId?: string
  quoteId?: string
  contactId?: string
  employeeId?: string
  salesPerson?: string
  searchTerm?: string
  branch?: string
  region?: string
  market?: string
  industry?: string
  city?: string
  state?: string
  family?: string
  limit?: number
}

export interface SalesforceAccount {
  account_id: string
  account_name: string
  account_type: string
  industry: string
  billing_street: string
  billing_city: string
  billing_state: string
  billing_postal_code: string
  phone: string
  website: string
  annual_revenue: number
  number_of_employees: number
  owner_id: string
  created_date: string
  last_activity_date: string
  last_modified_date: string
  // Rentokil-specific
  brand: string
  pestpac_id: string
  pestpac_account_number: string
  pestpac_account_url: string
  national_account: boolean
  strategic_account: boolean
  iris_number: string
  opportunity_count: number
  opportunity_won_count: number
  opportunity_won_sum: number
  number_of_locations: number
}

export interface SalesforceAccountDetail extends SalesforceAccount {
  description: string
  account_source: string
  lead_source: string
  lead_type: string
  sub_industry: string
  rating: string
  // Relationships (populated separately)
  contact_count?: number
  open_opportunity_count?: number
  case_count?: number
}

export interface SalesforceContact {
  contact_id: string
  account_id: string
  account_name: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  mobile_phone: string
  title: string
  department: string
  owner_id: string
  created_date: string
  last_modified_date: string
  last_activity_date: string
  is_primary: boolean
}

export interface SalesforceOpportunityHistory {
  opportunity_id: string
  opportunity_name: string
  stage_name: string
  created_date: string
  created_by_name: string
  field_name: string
  old_value: string
  new_value: string
  days_in_previous_stage: number
}

export interface SalesforceEmployee {
  employee_id: string
  name: string
  email: string
  title: string
  department: string
  manager_id: string
  manager_name: string
  territory: string
  is_active: boolean
  created_date: string
}

// =============================================================================
// Account Queries
// =============================================================================

/**
 * Search for Salesforce accounts by name, industry, city, state
 *
 * @param options - Search filters and pagination
 * @returns Array of matching accounts
 */
export async function getSalesforceAccounts(
  options: SalesforceQueryOptions = {}
): Promise<SalesforceAccount[]> {
  validateSalesforceOptions(options, 'getSalesforceAccounts')

  const limit = options.limit || 50

  try {
    let whereConditions = ['IsDeleted = FALSE']
    const params: Record<string, unknown> = { limit }

    // Search term (name or account number)
    if (options.searchTerm) {
      whereConditions.push(`(
        LOWER(Name) LIKE LOWER(CONCAT('%', @searchTerm, '%'))
        OR LOWER(COALESCE(AccountNumber, '')) LIKE LOWER(CONCAT('%', @searchTerm, '%'))
      )`)
      params.searchTerm = options.searchTerm
    }

    // Industry filter
    if (options.industry) {
      whereConditions.push(`LOWER(Industry) = LOWER(@industry)`)
      params.industry = options.industry
    }

    // City filter
    if (options.city) {
      whereConditions.push(`LOWER(BillingCity) = LOWER(@city)`)
      params.city = options.city
    }

    // State filter
    if (options.state) {
      whereConditions.push(`LOWER(BillingState) = LOWER(@state)`)
      params.state = options.state
    }

    // Only apply date filter if explicitly provided (not for general search)
    if (options.daysBack) {
      whereConditions.push(`CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @daysBack DAY)`)
      params.daysBack = options.daysBack
    }

    const whereClause = whereConditions.join(' AND ')

    const sql = `
      SELECT
        Id as account_id,
        Name as account_name,
        COALESCE(Type, '') as account_type,
        COALESCE(Industry, '') as industry,
        COALESCE(BillingStreet, '') as billing_street,
        COALESCE(BillingCity, '') as billing_city,
        COALESCE(BillingState, '') as billing_state,
        COALESCE(BillingPostalCode, '') as billing_postal_code,
        COALESCE(Phone, '') as phone,
        COALESCE(Website, '') as website,
        COALESCE(AnnualRevenue, 0) as annual_revenue,
        COALESCE(NumberOfEmployees, 0) as number_of_employees,
        OwnerId as owner_id,
        FORMAT_TIMESTAMP('%Y-%m-%d', CreatedDate) as created_date,
        FORMAT_TIMESTAMP('%Y-%m-%d', LastModifiedDate) as last_activity_date,
        FORMAT_TIMESTAMP('%Y-%m-%d', LastModifiedDate) as last_modified_date,
        '' as brand,
        '' as pestpac_id,
        '' as pestpac_account_number,
        '' as pestpac_account_url,
        FALSE as national_account,
        FALSE as strategic_account,
        '' as iris_number,
        0 as opportunity_count,
        0 as opportunity_won_count,
        0 as opportunity_won_sum,
        0 as number_of_locations
      FROM \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\`
      WHERE ${whereClause}
      ORDER BY LastModifiedDate DESC
      LIMIT @limit
    `

    console.log('[Salesforce] getSalesforceAccounts:', { params })

    const result = await bigQueryClient.queryWithParams<SalesforceAccount>(
      sql,
      params
    )

    console.log(`[Salesforce] Found ${result.rows.length} accounts`)

    return result.rows
  } catch (error) {
    console.error('[Salesforce] getSalesforceAccounts failed:', error)
    return []
  }
}

/**
 * Get detailed information for a single account including relationships
 *
 * @param accountId - Salesforce account ID
 * @returns Account detail with summary stats
 */
export async function getSalesforceAccountDetail(
  options: SalesforceQueryOptions
): Promise<SalesforceAccountDetail | null> {
  const accountId = options.accountId
  if (!accountId) {
    console.error('[Salesforce] No accountId in options')
    return null
  }
  validateSalesforceOptions({ accountId }, 'getSalesforceAccountDetail')

  try {
    const sql = `
      SELECT
        Id as account_id,
        Name as account_name,
        COALESCE(Type, '') as account_type,
        COALESCE(Industry, '') as industry,
        COALESCE(BillingStreet, '') as billing_street,
        COALESCE(BillingCity, '') as billing_city,
        COALESCE(BillingState, '') as billing_state,
        COALESCE(BillingPostalCode, '') as billing_postal_code,
        COALESCE(Phone, '') as phone,
        COALESCE(Website, '') as website,
        COALESCE(AnnualRevenue, 0) as annual_revenue,
        COALESCE(NumberOfEmployees, 0) as number_of_employees,
        OwnerId as owner_id,
        FORMAT_TIMESTAMP('%Y-%m-%d', CreatedDate) as created_date,
        FORMAT_TIMESTAMP('%Y-%m-%d', LastModifiedDate) as last_activity_date,
        FORMAT_TIMESTAMP('%Y-%m-%d', LastModifiedDate) as last_modified_date,
        COALESCE(Description, '') as description,
        COALESCE(AccountSource, '') as account_source,
        '' as lead_source,
        '' as lead_type,
        '' as sub_industry,
        COALESCE(Rating, '') as rating,
        '' as brand,
        '' as pestpac_id,
        '' as pestpac_account_number,
        '' as pestpac_account_url,
        FALSE as national_account,
        FALSE as strategic_account,
        '' as iris_number,
        0 as opportunity_count,
        0 as opportunity_won_count,
        0 as opportunity_won_sum,
        0 as number_of_locations,
        0 as open_opportunity_count
      FROM \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\`
      WHERE Id = @accountId
        AND IsDeleted = FALSE
    `

    console.log('[Salesforce] getSalesforceAccountDetail:', accountId)

    const result = await bigQueryClient.queryWithParams<SalesforceAccountDetail>(
      sql,
      { accountId }
    )

    if (result.rows.length === 0) {
      console.log('[Salesforce] Account not found:', accountId)
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error('[Salesforce] getSalesforceAccountDetail failed:', error)
    return null
  }
}

// =============================================================================
// Contact Queries
// =============================================================================

/**
 * Get contacts for a specific account
 *
 * @param options - Query options with accountId
 * @returns Array of contacts for the account
 */
export async function getSalesforceContacts(
  options: SalesforceQueryOptions
): Promise<SalesforceContact[]> {
  const accountId = options.accountId
  if (!accountId) {
    console.error('[Salesforce] No accountId in options for getSalesforceContacts')
    return []
  }
  validateSalesforceOptions({ accountId }, 'getSalesforceContacts')

  try {
    const sql = `
      SELECT
        Id as contact_id,
        AccountId as account_id,
        '' as account_name,
        COALESCE(FirstName, '') as first_name,
        COALESCE(LastName, '') as last_name,
        CONCAT(COALESCE(FirstName, ''), ' ', COALESCE(LastName, '')) as full_name,
        COALESCE(Email, '') as email,
        COALESCE(Phone, '') as phone,
        COALESCE(MobilePhone, '') as mobile_phone,
        COALESCE(Title, '') as title,
        COALESCE(Department, '') as department,
        OwnerId as owner_id,
        FORMAT_TIMESTAMP('%Y-%m-%d', CreatedDate) as created_date,
        FORMAT_TIMESTAMP('%Y-%m-%d', LastModifiedDate) as last_modified_date,
        FORMAT_TIMESTAMP('%Y-%m-%d', LastModifiedDate) as last_activity_date,
        FALSE as is_primary
      FROM \`${PROJECT}.S0.Raw_RTXSF_Contact_Daily\`
      WHERE AccountId = @accountId
        AND IsDeleted = FALSE
      ORDER BY LastModifiedDate DESC
    `

    console.log('[Salesforce] getSalesforceContacts:', accountId)

    const result = await bigQueryClient.queryWithParams<SalesforceContact>(
      sql,
      { accountId }
    )

    console.log(`[Salesforce] Found ${result.rows.length} contacts for account ${accountId}`)

    return result.rows
  } catch (error) {
    console.error('[Salesforce] getSalesforceContacts failed:', error)
    return []
  }
}

// =============================================================================
// Opportunity History Queries
// =============================================================================

/**
 * Get stage progression history for an opportunity
 *
 * @param options - Query options with opportunityId
 * @returns Array of stage changes with timing information
 */
export async function getSalesforceOpportunityHistory(
  options: SalesforceQueryOptions
): Promise<SalesforceOpportunityHistory[]> {
  const opportunityId = options.opportunityId
  if (!opportunityId) {
    console.error('[Salesforce] No opportunityId in options')
    return []
  }
  validateSalesforceOptions({ opportunityId }, 'getSalesforceOpportunityHistory')

  try {
    const sql = `
      WITH history_with_lag AS (
        SELECT
          OpportunityId,
          StageName,
          CreatedDate,
          CreatedById,
          '' as created_by_name,
          '' as opportunity_name,
          LAG(CreatedDate) OVER (PARTITION BY OpportunityId ORDER BY CreatedDate) as prev_stage_date
        FROM \`${PROJECT}.S0.Raw_RTXSF_OpportunityHistory_Daily\`
        WHERE OpportunityId = @opportunityId
          AND Field = 'StageName'
        ORDER BY CreatedDate
      )
      SELECT
        OpportunityId as opportunity_id,
        opportunity_name,
        StageName as stage_name,
        FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', CAST(CreatedDate AS TIMESTAMP)) as created_date,
        created_by_name,
        'StageName' as field_name,
        '' as old_value,
        StageName as new_value,
        COALESCE(
          TIMESTAMP_DIFF(CreatedDate, prev_stage_date, DAY),
          0
        ) as days_in_previous_stage
      FROM history_with_lag
      ORDER BY CreatedDate
    `

    console.log('[Salesforce] getSalesforceOpportunityHistory:', opportunityId)

    const result = await bigQueryClient.queryWithParams<SalesforceOpportunityHistory>(
      sql,
      { opportunityId }
    )

    console.log(
      `[Salesforce] Found ${result.rows.length} history records for opportunity ${opportunityId}`
    )

    return result.rows
  } catch (error) {
    console.error('[Salesforce] getSalesforceOpportunityHistory failed:', error)
    return []
  }
}

// =============================================================================
// Employee Queries
// =============================================================================

/**
 * Get Salesforce employee directory (sales reps)
 *
 * @param options - Filter options
 * @returns Array of employees
 */
export async function getSalesforceEmployees(
  options: SalesforceQueryOptions = {}
): Promise<SalesforceEmployee[]> {
  validateSalesforceOptions(options, 'getSalesforceEmployees')

  const limit = options.limit || 100

  try {
    const sql = `
      SELECT
        Id as employee_id,
        Name as name,
        '' as email,
        '' as title,
        '' as department,
        '' as manager_id,
        '' as manager_name,
        '' as territory,
        TRUE as is_active,
        FORMAT_DATE('%Y-%m-%d', CAST(CreatedDate AS DATE)) as created_date
      FROM \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\`
      WHERE IsDeleted = FALSE
      ORDER BY Name
      LIMIT @limit
    `

    console.log('[Salesforce] getSalesforceEmployees')

    const result = await bigQueryClient.queryWithParams<SalesforceEmployee>(
      sql,
      { limit }
    )

    console.log(`[Salesforce] Found ${result.rows.length} employees`)

    return result.rows
  } catch (error) {
    console.error('[Salesforce] getSalesforceEmployees failed:', error)
    return []
  }
}

// =============================================================================
// Quote Detail Queries
// =============================================================================

export interface SalesforceQuoteDetail {
  quote_id: string
  quote_name: string
  opportunity_id: string
  account_name: string
  owner_name: string
  servicing_branch: string
  status: string
  total_price: number
  date_of_sale: string | null
  proposal_delivered_date: string | null
  is_approved: boolean
  created_date: string
  last_modified_date: string
  // POC (Point of Contact) information
  contact_name: string
  contact_email: string
  contact_phone: string
  // Service address
  service_street: string
  service_city: string
  service_state: string
  service_postal_code: string
  service_country: string
  // Billing address
  billing_street: string
  billing_city: string
  billing_state: string
  billing_postal_code: string
  billing_country: string
  line_items: SalesforceQuoteLineItem[]
}

export interface SalesforceQuoteLineItem {
  line_item_id: string
  quote_id: string
  product_name: string
  product_code: string
  product_display_name: string
  product_description: string
  quantity: number
  unit_price: number
  list_price: number
  discount: number
  subtotal: number
  total_price: number
  description: string
  servicing_branch: string
  servicing_branch_name: string
  // Initial/Maintenance services
  initial_maint_gross: number
  initial_maint_net: number
  initial_service_code: string
  maintenance_gross: number
  maintenance_net: number
  maintenance_service_code: string
  maintenance_frequency: string
  total_annual_cost: number
  total_cost: number
  has_initial: boolean
  has_maintenance: boolean
  // Merchandise (equipment/physical products)
  merchandise_gross: number
  merchandise_net: number
  merchandise_service_code: string
  merchandise_quantity: number
  has_merchandise: boolean
  // Corrective services
  corrective_gross: number
  corrective_net: number
  corrective_service_code: string
  corrective_frequency: string
  has_corrective: boolean
}

/**
 * Get detailed quote information including line items
 *
 * @param options - Query options with quoteId
 * @returns Quote detail with line items
 */
export async function getSalesforceQuoteDetail(
  options: SalesforceQueryOptions
): Promise<SalesforceQuoteDetail | null> {
  const quoteId = options.quoteId
  if (!quoteId) {
    console.error('[Salesforce] No quoteId in options')
    return null
  }
  validateSalesforceOptions({ quoteId }, 'getSalesforceQuoteDetail')

  try {
    // Get quote header with POC and service address
    const quoteSql = `
      SELECT
        q.Id as quote_id,
        q.Name as quote_name,
        q.OpportunityId as opportunity_id,
        COALESCE(a.Name, '') as account_name,
        COALESCE(e.Name, '') as owner_name,
        '' as servicing_branch,
        COALESCE(q.Status, '') as status,
        COALESCE(q.TotalPrice, 0) as total_price,
        FORMAT_DATE('%Y-%m-%d', DATE(q.Date_of_Sale__c)) as date_of_sale,
        FORMAT_DATE('%Y-%m-%d', DATE(q.CreatedDate)) as proposal_delivered_date,
        CASE
          WHEN q.Status = 'Accepted' THEN true
          WHEN q.Status = 'Approved' THEN true
          ELSE false
        END as is_approved,
        FORMAT_TIMESTAMP('%Y-%m-%d', q.CreatedDate) as created_date,
        FORMAT_TIMESTAMP('%Y-%m-%d', q.LastModifiedDate) as last_modified_date,
        -- POC (Point of Contact) from quote's contact
        COALESCE(c.Name, '') as contact_name,
        COALESCE(c.Email, '') as contact_email,
        COALESCE(c.Phone, '') as contact_phone,
        -- Service address from quote's shipping address or opportunity account
        COALESCE(q.ShippingStreet, a.ShippingStreet, '') as service_street,
        COALESCE(q.ShippingCity, a.ShippingCity, '') as service_city,
        COALESCE(q.ShippingState, a.ShippingState, '') as service_state,
        COALESCE(q.ShippingPostalCode, a.ShippingPostalCode, '') as service_postal_code,
        COALESCE(q.ShippingCountry, a.ShippingCountry, '') as service_country,
        -- Billing address from quote's billing address or opportunity account
        COALESCE(q.BillingStreet, a.BillingStreet, '') as billing_street,
        COALESCE(q.BillingCity, a.BillingCity, '') as billing_city,
        COALESCE(q.BillingState, a.BillingState, '') as billing_state,
        COALESCE(q.BillingPostalCode, a.BillingPostalCode, '') as billing_postal_code,
        COALESCE(q.BillingCountry, a.BillingCountry, '') as billing_country
      FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o ON q.OpportunityId = o.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Contact_Daily\` c ON q.ContactId = c.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON q.OwnerId = e.User__c
      WHERE q.Id = @quoteId
    `

    const quoteResult = await bigQueryClient.queryWithParams<Omit<SalesforceQuoteDetail, 'line_items'>>(
      quoteSql,
      { quoteId }
    )

    if (quoteResult.rows.length === 0) {
      console.log('[Salesforce] Quote not found:', quoteId)
      return null
    }

    let quote = quoteResult.rows[0]

    // Get line items with detailed pricing
    const lineItemsSql = `
      SELECT
        qli.Id as line_item_id,
        qli.QuoteId as quote_id,
        COALESCE(qli.Product_Code__c, qli.Product2Id, '') as product_name,
        COALESCE(qli.Product_Code__c, '') as product_code,
        COALESCE(p.Name, '') as product_display_name,
        COALESCE(p.Description, '') as product_description,
        COALESCE(qli.Quantity, 0) as quantity,
        COALESCE(qli.UnitPrice, 0) as unit_price,
        COALESCE(qli.ListPrice, 0) as list_price,
        COALESCE(qli.Discount, 0) as discount,
        COALESCE(qli.Subtotal, 0) as subtotal,
        COALESCE(qli.TotalPrice, 0) as total_price,
        COALESCE(qli.Description, '') as description,
        COALESCE(qli.Servicing_Branch__c, '') as servicing_branch,
        COALESCE(qli.Servicing_Branch_Name__c, '') as servicing_branch_name,
        COALESCE(qli.InitialMaint_CPP_Gross_Price__c, 0) as initial_maint_gross,
        COALESCE(qli.InitialMaint_User_Edited_Net_Price__c, 0) as initial_maint_net,
        COALESCE(qli.InitialMaint_Service_Code__c, '') as initial_service_code,
        COALESCE(qli.Maintenance_CPP_Gross_Price__c, 0) as maintenance_gross,
        COALESCE(qli.Maintenance_User_Edited_Net_Price__c, 0) as maintenance_net,
        COALESCE(qli.Maintenance_Service_Code__c, '') as maintenance_service_code,
        COALESCE(qli.Maintenance_Billing_Frequency__c, '') as maintenance_frequency,
        COALESCE(qli.Total_Annual_Cost__c, 0) as total_annual_cost,
        COALESCE(qli.Total_Cost__c, 0) as total_cost,
        qli.Has_Initial_Maintenance__c as has_initial,
        qli.Has_Maintenance__c as has_maintenance,
        -- Merchandise (equipment/physical products)
        COALESCE(qli.Merchandise_CPP_Gross_Price__c, 0) as merchandise_gross,
        COALESCE(qli.Merchandise_User_Edited_Net_Price__c, 0) as merchandise_net,
        COALESCE(qli.Merchandise_Service_Code__c, '') as merchandise_service_code,
        COALESCE(qli.Merchandise_Quantity__c, 0) as merchandise_quantity,
        COALESCE(qli.Has_Merchandise__c, false) as has_merchandise,
        -- Corrective services
        COALESCE(qli.Corrective_CPP_Gross_Price__c, 0) as corrective_gross,
        COALESCE(qli.Corrective_User_Edited_Net_Price__c, 0) as corrective_net,
        COALESCE(qli.Corrective_Service_Code__c, '') as corrective_service_code,
        COALESCE(qli.Corrective_Billing_Frequency__c, '') as corrective_frequency,
        COALESCE(qli.Has_Corrective__c, false) as has_corrective
      FROM \`${PROJECT}.S0.Raw_RTXSF_QuoteLineItem_Daily\` qli
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Product2_Daily\` p ON qli.Product2Id = p.Id
      WHERE qli.QuoteId = @quoteId
      ORDER BY qli.LineNumber
    `

    const lineItemsResult = await bigQueryClient.queryWithParams<SalesforceQuoteLineItem>(
      lineItemsSql,
      { quoteId }
    )

    // Update servicing branch from first line item if available
    if (lineItemsResult.rows.length > 0 && lineItemsResult.rows[0].servicing_branch_name) {
      quote = {
        ...quote,
        servicing_branch: lineItemsResult.rows[0].servicing_branch_name,
      }
    }

    return {
      ...quote,
      line_items: lineItemsResult.rows,
    }
  } catch (error) {
    console.error('[Salesforce] getSalesforceQuoteDetail failed:', error)
    return null
  }
}

// =============================================================================
// Quote Builder Queries
// =============================================================================

export interface SalesforceProduct {
  product_id: string
  product_code: string
  product_name: string
  description: string
  family: string
  is_active: boolean
  // Pricing fields
  list_price: number
  // Service type flags
  has_initial: boolean
  has_maintenance: boolean
  has_merchandise: boolean
  has_corrective: boolean
  // Additional metadata
  created_date: string
  last_modified_date: string
}

export interface SalesforceOpportunity {
  opportunity_id: string
  opportunity_name: string
  account_id: string
  account_name: string
  stage_name: string
  amount: number
  probability: number
  close_date: string
  owner_id: string
  owner_name: string
  description: string
  next_step: string
  type: string
  created_date: string
}

/**
 * Get opportunities for a specific Salesforce account
 *
 * @param options - Query options with accountId
 * @returns Array of opportunities for the account
 */
export async function getSalesforceAccountOpportunities(
  options: SalesforceQueryOptions
): Promise<SalesforceOpportunity[]> {
  const accountId = options.accountId
  if (!accountId) {
    console.error('[Salesforce] No accountId in options for getSalesforceAccountOpportunities')
    return []
  }
  validateSalesforceOptions({ accountId }, 'getSalesforceAccountOpportunities')

  try {
    const sql = `
      WITH line_item_totals AS (
        SELECT
          q.OpportunityId,
          SUM(COALESCE(qli.Total_Cost__c, 0)) as total_cost
        FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
        JOIN \`${PROJECT}.S0.Raw_RTXSF_QuoteLineItem_Daily\` qli ON q.Id = qli.QuoteId
        WHERE q.OpportunityId IS NOT NULL
          AND q.IsDeleted = FALSE
          AND qli.IsDeleted = FALSE
        GROUP BY q.OpportunityId
      )
      SELECT
        o.Id as opportunity_id,
        COALESCE(o.Name, '') as opportunity_name,
        COALESCE(o.AccountId, '') as account_id,
        COALESCE(a.Name, '') as account_name,
        COALESCE(o.StageName, '') as stage_name,
        COALESCE(o.Amount, lit.total_cost, 0) as amount,
        COALESCE(o.Probability, 0) as probability,
        FORMAT_TIMESTAMP('%Y-%m-%d', o.CloseDate) as close_date,
        COALESCE(o.OwnerId, '') as owner_id,
        COALESCE(e.Name, '') as owner_name,
        COALESCE(o.Description, '') as description,
        COALESCE(o.NextStep, '') as next_step,
        COALESCE(o.Type, '') as type,
        FORMAT_TIMESTAMP('%Y-%m-%d', o.CreatedDate) as created_date
      FROM \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON o.OwnerId = e.User__c
      LEFT JOIN line_item_totals lit ON o.Id = lit.OpportunityId
      WHERE o.AccountId = @accountId
        AND o.IsDeleted = FALSE
      ORDER BY o.CloseDate DESC
      LIMIT 50
    `

    console.log('[Salesforce] getSalesforceAccountOpportunities:', accountId)

    const result = await bigQueryClient.queryWithParams<SalesforceOpportunity>(
      sql,
      { accountId }
    )

    console.log(`[Salesforce] Found ${result.rows.length} opportunities for account ${accountId}`)

    return result.rows
  } catch (error) {
    console.error('[Salesforce] getSalesforceAccountOpportunities failed:', error)
    return []
  }
}

/**
 * Get product catalog for quote builder
 * Retrieves active products with pricing from Raw_RTXSF_Product2_Daily
 *
 * @param options - Query filters (family, searchTerm, limit)
 * @returns Array of products sorted by family and name
 */
export async function getProductCatalog(
  options: SalesforceQueryOptions = {}
): Promise<SalesforceProduct[]> {
  const { searchTerm = '', family = '', limit = 100 } = options

  try {
    validateSalesforceOptions(options, 'getProductCatalog')

    console.log(`[Salesforce] getProductCatalog - Querying with limit ${limit}, searchTerm: "${searchTerm}", family: "${family}"`)
    console.log(`[Salesforce] Using project: ${PROJECT}`)

    const sql = `
      SELECT
        p.Id as product_id,
        COALESCE(p.ProductCode, '') as product_code,
        COALESCE(p.Name, '') as product_name,
        COALESCE(p.Description, '') as description,
        COALESCE(p.Family, '') as family,
        COALESCE(p.IsActive, false) as is_active,
        -- Default price to 0 (pricing tables not yet synced to BigQuery)
        0 as list_price,
        -- Service type flags (defaults - would need custom fields)
        false as has_initial,
        true as has_maintenance,
        false as has_merchandise,
        false as has_corrective,
        FORMAT_TIMESTAMP('%Y-%m-%d', p.CreatedDate) as created_date,
        FORMAT_TIMESTAMP('%Y-%m-%d', p.LastModifiedDate) as last_modified_date
      FROM \`${PROJECT}.S0.Raw_RTXSF_Product2_Daily\` p
      WHERE p.IsActive = true
        ${searchTerm ? `AND (LOWER(p.Name) LIKE LOWER(@searchTerm) OR LOWER(p.ProductCode) LIKE LOWER(@searchTerm))` : ''}
        ${family ? `AND p.Family = @family` : ''}
      ORDER BY p.Family, p.Name
      LIMIT @limit
    `

    const params: Record<string, string | number> = { limit }
    if (searchTerm) params.searchTerm = `%${searchTerm}%`
    if (family) params.family = family

    console.log(`[Salesforce] Executing query...`)
    const result = await bigQueryClient.queryWithParams<SalesforceProduct>(
      sql,
      params
    )

    console.log(`[Salesforce] Query completed. Found ${result.rows.length} products`)
    if (result.rows.length === 0) {
      console.warn('[Salesforce] WARNING: Product catalog is empty. Check if Raw_RTXSF_Product2_Daily table has data.')
    } else {
      console.log(`[Salesforce] Sample product:`, result.rows[0])
    }
    return result.rows
  } catch (error) {
    console.error('[Salesforce] getProductCatalog FAILED with error:', error)
    console.error('[Salesforce] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return []
  }
}

/**
 * Get opportunity details for quote builder
 * Used when starting quote from an existing opportunity
 *
 * @param opportunityId - Salesforce opportunity ID
 * @returns Opportunity details or null if not found
 */
export async function getOpportunityForQuote(
  opportunityId: string
): Promise<SalesforceOpportunity | null> {
  if (!opportunityId) return null

  try {
    validateSalesforceOptions({ opportunityId }, 'getOpportunityForQuote')

    const sql = `
      SELECT
        o.Id as opportunity_id,
        COALESCE(o.Name, '') as opportunity_name,
        COALESCE(o.AccountId, '') as account_id,
        COALESCE(a.Name, '') as account_name,
        COALESCE(o.StageName, '') as stage_name,
        COALESCE(o.Amount, 0) as amount,
        COALESCE(o.Probability, 0) as probability,
        FORMAT_TIMESTAMP('%Y-%m-%d', o.CloseDate) as close_date,
        COALESCE(o.OwnerId, '') as owner_id,
        COALESCE(e.Name, '') as owner_name,
        COALESCE(o.Description, '') as description,
        COALESCE(o.NextStep, '') as next_step,
        COALESCE(o.Type, '') as type,
        FORMAT_TIMESTAMP('%Y-%m-%d', o.CreatedDate) as created_date
      FROM \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON o.OwnerId = e.User__c
      WHERE o.Id = @opportunityId
      LIMIT 1
    `

    const result = await bigQueryClient.queryWithParams<SalesforceOpportunity>(
      sql,
      { opportunityId }
    )

    if (result.rows.length === 0) {
      console.log('[Salesforce] Opportunity not found:', opportunityId)
      return null
    }

    console.log('[Salesforce] Found opportunity:', result.rows[0].opportunity_name)
    return result.rows[0]
  } catch (error) {
    console.error('[Salesforce] getOpportunityForQuote failed:', error)
    return null
  }
}

/**
 * Lead interface for quote builder
 */
export interface SalesforceLead {
  lead_id: string
  lead_name: string
  company: string
  title: string
  email: string
  phone: string
  mobile_phone: string
  street: string
  city: string
  state: string
  postal_code: string
  country: string
  status: string
  rating: string
  industry: string
  number_of_employees: number
  annual_revenue: number
  lead_source: string
  owner_id: string
  owner_name: string
  description: string
  created_date: string
}

/**
 * Search for leads by name, company, email, or phone
 * Used in quote builder for lead selection
 *
 * @param options - Query options with searchTerm
 * @returns Array of leads matching search criteria
 */
export async function getLeads(
  options: SalesforceQueryOptions = {}
): Promise<SalesforceLead[]> {
  const { searchTerm = '', limit = 20 } = options

  try {
    validateSalesforceOptions(options, 'getLeads')

    const sql = `
      SELECT
        l.Id as lead_id,
        CONCAT(COALESCE(l.FirstName, ''), ' ', COALESCE(l.LastName, '')) as lead_name,
        COALESCE(l.Company, '') as company,
        COALESCE(l.Title, '') as title,
        COALESCE(l.Email, '') as email,
        COALESCE(l.Phone, '') as phone,
        COALESCE(l.MobilePhone, '') as mobile_phone,
        COALESCE(l.Street, '') as street,
        COALESCE(l.City, '') as city,
        COALESCE(l.State, '') as state,
        COALESCE(l.PostalCode, '') as postal_code,
        COALESCE(l.Country, '') as country,
        COALESCE(l.Status, '') as status,
        COALESCE(l.Rating, '') as rating,
        COALESCE(l.Industry, '') as industry,
        COALESCE(l.NumberOfEmployees, 0) as number_of_employees,
        COALESCE(l.AnnualRevenue, 0) as annual_revenue,
        COALESCE(l.LeadSource, '') as lead_source,
        COALESCE(l.OwnerId, '') as owner_id,
        COALESCE(e.Name, '') as owner_name,
        COALESCE(l.Description, '') as description,
        FORMAT_TIMESTAMP('%Y-%m-%d', l.CreatedDate) as created_date
      FROM \`${PROJECT}.S0.Raw_RTXSF_Lead_Daily\` l
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON l.OwnerId = e.User__c
      WHERE l.IsDeleted = false
        AND l.IsConverted = false
        ${
          searchTerm
            ? `AND (
          LOWER(l.FirstName) LIKE LOWER(@searchTerm)
          OR LOWER(l.LastName) LIKE LOWER(@searchTerm)
          OR LOWER(l.Company) LIKE LOWER(@searchTerm)
          OR LOWER(l.Email) LIKE LOWER(@searchTerm)
          OR LOWER(l.Phone) LIKE LOWER(@searchTerm)
        )`
            : ''
        }
      ORDER BY l.CreatedDate DESC
      LIMIT @limit
    `

    const params: Record<string, string | number> = { limit }
    if (searchTerm) params.searchTerm = `%${searchTerm}%`

    const result = await bigQueryClient.queryWithParams<SalesforceLead>(sql, params)

    console.log(`[Salesforce] Found ${result.rows.length} leads`)
    return result.rows
  } catch (error) {
    console.error('[Salesforce] getLeads failed:', error)
    return []
  }
}

/**
 * Get user's most-used services from historical quotes
 * Returns top N product codes ordered by usage count
 *
 * @param options.salesPerson - Sales person name (from role filters)
 * @param options.limit - Max number of products to return (default 8)
 * @returns Array of product codes ordered by usage frequency
 */
export async function getUserMostUsedServices(
  options: SalesforceQueryOptions = {}
): Promise<{ product_code: string; usage_count: number }[]> {
  const { salesPerson, limit = 8 } = options

  if (!salesPerson) {
    console.log('[Salesforce] No salesPerson provided, returning empty array')
    return []
  }

  try {
    validateSalesforceOptions({ limit }, 'getUserMostUsedServices')

    const sql = `
      SELECT
        qli.Product_Code__c as product_code,
        COUNT(*) as usage_count
      FROM \`${PROJECT}.S0.Raw_RTXSF_QuoteLineItem_Daily\` qli
      JOIN \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q ON qli.QuoteId = q.Id
      JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON q.CreatedById = e.User__c
      WHERE qli.Product_Code__c IS NOT NULL
        AND qli.Product_Code__c != ''
        AND LOWER(e.Name) = LOWER(@salesPerson)
        AND qli.IsDeleted = FALSE
        AND q.IsDeleted = FALSE
      GROUP BY qli.Product_Code__c
      ORDER BY usage_count DESC
      LIMIT @limit
    `

    console.log('[Salesforce] getUserMostUsedServices for:', salesPerson)

    const result = await bigQueryClient.queryWithParams<{ product_code: string; usage_count: number }>(
      sql,
      { salesPerson, limit }
    )

    console.log(`[Salesforce] Found ${result.rows.length} most-used services for ${salesPerson}`)
    return result.rows
  } catch (error) {
    console.error('[Salesforce] getUserMostUsedServices failed:', error)
    return []
  }
}
