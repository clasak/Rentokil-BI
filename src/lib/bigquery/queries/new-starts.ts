/**
 * BigQuery Queries for New Starts Module
 *
 * Data Source (PRIMARY): BCG_RTD_DB.DR_ContractSales (3.2M rows, includes 2026 data)
 * Data Source (FALLBACK): W3_Contract_Checker.T0_unf_Contract_All (7.8M rows, 2025 data only)
 *
 * New Starts are contracts that have been sold but not yet started (serviced).
 * This tracks the handoff between Sales (AE) and Operations.
 *
 * Key Fields:
 * - sell_date/SellDate: When contract was sold
 * - started_ind/StartedInd: Y/N indicating if service has started
 * - customer_name: Customer and sales rep info
 * - contract_value/ContractValue: Contract dollar amount
 * - product_group/ProductGroup: Service type category
 * - assigned_branch_code/AssignedBranchCode: Branch responsible for service
 *
 * Pages: /ae/new-starts, /ops/new-starts
 *
 * IMPORTANT: DATA JOIN PATTERN (DO NOT BREAK)
 * =============================================
 * DR_ContractSales has TWO ID fields:
 * - bill_to_id: Links to pestpac_BillTos (billing address)
 * - location_id: Links to pestpac_Locations (service address)
 *
 * MUST keep both IDs in aggregation (MIN(bill_to_id), MIN(location_id))
 * MUST join to both tables separately
 * MUST prefer service location over billing location in COALESCE
 *
 * When adding technician data:
 * 1. Add techid field to AggregatedContracts: MIN(techid1) as techId
 * 2. Create PestPacEmployees CTE: join pestpac_Employees on employee_id
 * 3. LEFT JOIN in main query: ON agg.techId = emp.employee_id
 * 4. Use COALESCE for fallbacks: COALESCE(emp.name, tmx.name, 'Unassigned')
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { mapProductGroupToPestTypes } from '@/lib/utils/pest-types'

// =============================================================================
// Types
// =============================================================================

export interface NewStartRecord {
  id: string
  pestPacId: string  // PestPac customer ID
  soldDate: string
  accountName: string
  serviceAddress: string
  salesPerson: string
  initialJobPrice: number
  contractValue: number
  serviceType: string
  serviceTypeName: string
  productGroup: string
  branchCode: string
  regionCode: string
  marketCode: string
  status: 'pending_ops' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'on_hold'
  startDate: string | null
  daysToStart: number | null
  daysSinceSold: number
  pestTypes: string[]  // NEW: Derived from productGroup
  // Operations fields (from DR_WorkOrders)
  opsManager: string | null  // Manager job title from work order
  assignedSpecialist: string | null  // Technician assigned to initial service
  materialsOrdered: string | null  // Placeholder for manual entry
  confirmedStartDate: string | null  // Customer confirmed start date
  installStarted: string | null  // When initial service was completed (EndDate)
  // Equipment details from Salesforce (e.g., "8 RBS, 4 MRT")
  equipmentDetails: string | null
  // Special notes combining setup comments, directions, and equipment info
  specialNotes: string | null
}

export interface NewStartsSummary {
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

// =============================================================================
// Query Options
// =============================================================================

export interface NewStartsQueryOptions {
  daysBack?: number
  salesPerson?: string
  branchCode?: string
  regionCode?: string
  marketCode?: string
  status?: string
  limit?: number
}

// =============================================================================
// Table Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const CONTRACT_DATASET = 'BCG_RTD_DB'
const CONTRACT_TABLE = 'DR_ContractSales'
// Legacy fallback (2025 data only)
const LEGACY_DATASET = 'W3_Contract_Checker'
const LEGACY_TABLE = 'T0_unf_Contract_All'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build parameterized WHERE clause for organization filters
 * Uses DR_ContractSales column names (market_cd, region_cd, etc.)
 * @param options - Query options with filter criteria
 * @param tableAlias - Optional table alias (e.g., 'c' for c.market_cd)
 * @returns Object with SQL clause string and params object
 */
function buildOrgFilterClause(
  options: NewStartsQueryOptions,
  tableAlias: string = ''
): { clause: string; params: Record<string, string> } {
  const clauses: string[] = []
  const params: Record<string, string> = {}
  const prefix = tableAlias ? `${tableAlias}.` : ''

  if (options.marketCode) {
    clauses.push(`${prefix}market_cd = @marketCode`)
    params.marketCode = options.marketCode
  }
  if (options.regionCode) {
    clauses.push(`${prefix}region_cd = @regionCode`)
    params.regionCode = options.regionCode
  }
  if (options.branchCode) {
    clauses.push(`${prefix}assigned_branch_code = @branchCode`)
    params.branchCode = options.branchCode
  }
  if (options.salesPerson) {
    // Try exact match first, then flexible matching as fallback
    const exactMatch = `${prefix}sales_person_nm = @salesPerson`

    // Also try flexible matching for different name formats
    const nameParts = options.salesPerson.split(/[\s,]+/).filter(p => p.length > 0)
    if (nameParts.length >= 2) {
      const flexMatch = `(LOWER(${prefix}sales_person_nm) LIKE CONCAT('%', LOWER(@salesPersonPart1), '%') AND LOWER(${prefix}sales_person_nm) LIKE CONCAT('%', LOWER(@salesPersonPart2), '%'))`
      clauses.push(`(${exactMatch} OR ${flexMatch})`)
      params.salesPerson = options.salesPerson
      params.salesPersonPart1 = nameParts[0]
      params.salesPersonPart2 = nameParts[1]
    } else {
      clauses.push(`LOWER(${prefix}sales_person_nm) LIKE CONCAT('%', LOWER(@salesPerson), '%')`)
      params.salesPerson = options.salesPerson
    }
  }

  return {
    clause: clauses.length > 0 ? clauses.join(' AND ') : '',
    params,
  }
}

/**
 * Derive status from BigQuery fields (DR_ContractSales column names)
 * Returns SQL CASE statement (no table alias, caller adds prefix if needed)
 */
function deriveStatusSQL(tableAlias: string = ''): string {
  const prefix = tableAlias ? `${tableAlias}.` : ''
  return `
    CASE
      WHEN ${prefix}started_ind = 'Y' THEN 'completed'
      ELSE 'pending_ops'
    END
  `
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get new starts (contracts sold but not yet started)
 *
 * Returns recent contracts with their status derived from StartedInd, StartDate, etc.
 */
export async function getNewStarts(
  options: NewStartsQueryOptions = {}
): Promise<NewStartRecord[]> {
  const { daysBack = 90, limit = 200 } = options
  const orgFilter = buildOrgFilterClause(options, 'c')

  // Build params object
  const params: Record<string, string | number> = {
    daysBack,
    limit,
    ...orgFilter.params,
  }

  // Add status param if specified
  if (options.status) {
    params.status = options.status
  }

  // Base WHERE clause with parameterized values
  let whereClause = 'c.sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)'

  // Add status filter if specified
  if (options.status) {
    whereClause += ` AND (${deriveStatusSQL('c')}) = @status`
  }

  // Add org filters
  if (orgFilter.clause) {
    whereClause += ` AND ${orgFilter.clause}`
  }

  // Query with PestPac Locations for full addresses
  const sql = `
    WITH AggregatedContracts AS (
      -- CRITICAL: DR_ContractSales has multiple rows per sale (one per product type: I, P, PC, etc.)
      -- Must GROUP BY customer/date/sales_person/branch to consolidate duplicates
      -- Must keep BOTH bill_to_id and location_id separate for joining to different tables
      SELECT
        customer_name,
        sell_date,
        sales_person_nm,
        assigned_branch_code,
        region_cd,
        market_cd,
        -- Aggregate identifiers (KEEP SEPARATE - DO NOT COALESCE HERE)
        MIN(sales_id) as salesID,
        MIN(COALESCE(location_id, bill_to_id)) as pestPacId,  -- Display ID (prefer location_id for service operations)
        MIN(bill_to_id) as billToId,      -- For joining to pestpac_BillTos (billing address)
        MIN(location_id) as locationId,   -- For joining to pestpac_Locations (service address)
        -- Technician info (already has name in DR_ContractSales, no need to join)
        MIN(tech_onsite_employee_nm) as techName,
        MIN(tech_onsite_employee_num) as techEmployeeNum,
        -- Sum all contract values
        SUM(COALESCE(contract_value, 0)) as totalContractValue,
        -- Sum initial + non-initial (equipment, correctives, etc.)
        SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as totalInitialValue,
        -- Consolidate product info
        STRING_AGG(DISTINCT COALESCE(product_group, 'Unknown'), ', ') as productGroups,
        STRING_AGG(DISTINCT COALESCE(service_type_desc, 'Unknown'), ', ') as serviceTypes,
        -- Status flags
        MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as hasStarted,
        -- Dates - use MAX to handle multiple rows
        MAX(start_date) as start_date,
        MAX(DATE_DIFF(CURRENT_DATE(), sell_date, DAY)) as daysSinceSold,
        MAX(CASE
          WHEN start_date IS NOT NULL
          THEN DATE_DIFF(start_date, sell_date, DAY)
          ELSE NULL
        END) as daysToInstall,
        MAX(location_zip) as location_zip
      FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\` c
      WHERE ${whereClause}
      GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
    ),
    -- SERVICE ADDRESS CTE: Links via location_id (PRIMARY source for addresses)
    PestPacServiceLocations AS (
      SELECT
        CAST(pl.locationid AS STRING) as location_id,
        TRIM(COALESCE(pl.city, '')) as city,
        TRIM(COALESCE(pl.state, '')) as state,
        TRIM(COALESCE(pl.zip, '')) as zip,
        TRIM(COALESCE(pl.address, '')) as address,
        TRIM(COALESCE(pl.address2, '')) as address2
      FROM \`${PROJECT}.S0.pestpac_Locations\` pl
      WHERE pl.locationid IS NOT NULL
    ),
    -- BILLING ADDRESS CTE: Links via bill_to_id (FALLBACK for addresses)
    PestPacBillTos AS (
      SELECT
        CAST(bt.billtoid AS STRING) as billto_id,
        TRIM(COALESCE(bt.city, '')) as city,
        TRIM(COALESCE(bt.state, '')) as state,
        TRIM(COALESCE(bt.zip, '')) as zip,
        TRIM(COALESCE(bt.address, '')) as address
      FROM \`${PROJECT}.S0.pestpac_BillTos\` bt
      WHERE bt.billtoid IS NOT NULL
    ),
    -- SERVICE SETUP CTE: Links via location_id (service instructions/notes)
    PestPacServiceSetups AS (
      SELECT
        CAST(ss.locationid AS STRING) as location_id,
        ss.comment as setup_comment,
        ss.excessmessage as setup_excessmessage
      FROM \`${PROJECT}.S0.pestpac_ServiceSetups\` ss
      WHERE ss.locationid IS NOT NULL
    ),
    Branches AS (
      SELECT
        b.Current_State_Branch_Code as branch_code,
        b.City,
        b.State
      FROM \`${PROJECT}.S2.VwUnf_Branch\` b
    ),
    -- EMPLOYEE/SUPERVISOR CTE: Links via employee number to get ops manager
    TMXEmployees AS (
      SELECT
        CAST(e.Employee_Number AS STRING) as employee_number,
        COALESCE(e.Supervisor_Name, '') as supervisor_name,
        COALESCE(CAST(e.Supervisor_ID AS STRING), '') as supervisor_id
      FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
      WHERE e.Employee_Number IS NOT NULL
    )
    SELECT
      CAST(agg.salesID AS STRING) as id,
      CAST(agg.pestPacId AS STRING) as pestPacId,
      FORMAT_DATE('%Y-%m-%d', agg.sell_date) as soldDate,
      COALESCE(agg.customer_name, 'Customer') as accountName,

      -- Service address: Service location → Billing location → Branch fallback
      COALESCE(
        -- 1. Service location full address (street, city, state, zip)
        CASE
          WHEN sl.address != '' AND sl.city != ''
          THEN CONCAT(
            sl.address,
            CASE WHEN sl.address2 != '' THEN CONCAT(' ', sl.address2) ELSE '' END,
            ', ', sl.city,
            ', ', COALESCE(sl.state, ''),
            ' ', COALESCE(sl.zip, '')
          )
          ELSE NULL
        END,
        -- 2. Billing location full address (if service location unavailable)
        CASE
          WHEN bt.address != '' AND bt.city != ''
          THEN CONCAT(
            bt.address,
            ', ', bt.city,
            ', ', COALESCE(bt.state, ''),
            ' ', COALESCE(bt.zip, '')
          )
          ELSE NULL
        END,
        -- 3. Service location city + zip
        CASE
          WHEN sl.city != '' AND sl.zip != ''
          THEN CONCAT(sl.city, ', ', COALESCE(sl.state, ''), ' ', sl.zip)
          ELSE NULL
        END,
        -- 4. Billing location city + zip
        CASE
          WHEN bt.city != '' AND bt.zip != ''
          THEN CONCAT(bt.city, ', ', COALESCE(bt.state, ''), ' ', bt.zip)
          ELSE NULL
        END,
        -- 5. Branch city + state
        CASE WHEN b.City IS NOT NULL AND b.State IS NOT NULL THEN CONCAT(b.City, ', ', b.State) ELSE NULL END,
        -- 6. Branch code (final fallback)
        CONCAT(COALESCE(agg.assigned_branch_code, 'Unknown'), ' Branch')
      ) as serviceAddress,

      COALESCE(agg.sales_person_nm, 'Unknown') as salesPerson,
      agg.totalInitialValue as initialJobPrice,
      agg.totalContractValue as contractValue,
      agg.serviceTypes as serviceType,
      agg.serviceTypes as serviceTypeName,
      COALESCE(agg.productGroups, '') as productGroup,
      COALESCE(agg.assigned_branch_code, '') as branchCode,
      COALESCE(agg.region_cd, '') as regionCode,
      COALESCE(agg.market_cd, '') as marketCode,

      -- Status
      CASE
        WHEN agg.hasStarted = 1 THEN 'completed'
        ELSE 'pending_ops'
      END as status,

      -- Dates
      CASE
        WHEN agg.start_date IS NOT NULL
        THEN FORMAT_DATE('%Y-%m-%d', agg.start_date)
        ELSE NULL
      END as startDate,
      agg.daysToInstall as daysToStart,
      agg.daysSinceSold,

      -- Operations fields (with manual overrides for incorrect Workday data)
      -- Convert name format from "LAST, FIRST" to "First Last"
      CASE
        -- Manual overrides for technicians with incorrect supervisor data in Workday
        WHEN UPPER(TRIM(agg.techName)) = 'CORRAL, JESUS' THEN 'Joaquin Barrera'
        WHEN UPPER(TRIM(agg.techName)) = 'FOLEY, WILL' THEN 'Bruce Hockless'
        -- Add more overrides as needed:
        -- WHEN UPPER(TRIM(agg.techName)) = 'LASTNAME, FIRSTNAME' THEN 'First Last'

        -- Replace all instances of Christopher Knudsen with Joaquin Barrera (regardless of technician)
        WHEN UPPER(TRIM(emp.supervisor_name)) = 'KNUDSEN, CHRISTOPHER' THEN 'Joaquin Barrera'
        WHEN UPPER(TRIM(emp.supervisor_name)) LIKE 'KNUDSEN%CHRISTOPHER%' THEN 'Joaquin Barrera'
        WHEN UPPER(TRIM(emp.supervisor_name)) LIKE 'CHRISTOPHER%KNUDSEN%' THEN 'Joaquin Barrera'

        -- Default: Use supervisor from employee table and convert format
        WHEN emp.supervisor_name LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(emp.supervisor_name, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(emp.supervisor_name, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(emp.supervisor_name, '')
      END as opsManager,
      -- Convert technician name from "LAST, FIRST" to "First Last"
      CASE
        WHEN agg.techName LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(agg.techName, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(agg.techName, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(agg.techName, 'Unassigned')
      END as assignedSpecialist,
      CAST(NULL AS STRING) as materialsOrdered,
      CAST(NULL AS STRING) as confirmedStartDate,
      CASE
        WHEN agg.hasStarted = 1 AND agg.start_date IS NOT NULL
        THEN FORMAT_DATE('%Y-%m-%d', agg.start_date)
        ELSE NULL
      END as installStarted,
      -- Clean up service instructions: remove metadata prefixes and equipment details
      TRIM(
        -- Split on "Merchandise Equipments:" and take first part (the actual instructions)
        SPLIT(
          -- Remove the "N/A; Service Instructions:" prefix
          REGEXP_REPLACE(
            COALESCE(psetup.setup_comment, psetup.setup_excessmessage, ''),
            r'^N/A; Service Instructions:\s*',
            ''
          ),
          'Merchandise Equipments:'
        )[SAFE_OFFSET(0)]
      ) as equipmentDetails,
      COALESCE(psetup.setup_excessmessage, '') as specialNotes

    FROM AggregatedContracts agg
    -- JOIN PATTERN: Use separate IDs for different tables (DO NOT use pestPacId here)
    LEFT JOIN PestPacServiceLocations sl
      ON agg.locationId = sl.location_id          -- Service address (prefer this)
    LEFT JOIN PestPacBillTos bt
      ON agg.billToId = bt.billto_id              -- Billing address (fallback)
    LEFT JOIN PestPacServiceSetups psetup
      ON agg.locationId = psetup.location_id      -- Service instructions (same as service address)
    LEFT JOIN Branches b
      ON agg.assigned_branch_code = b.branch_code -- Branch location (final fallback)
    -- Employee/Supervisor JOIN: Get ops manager from technician's supervisor
    LEFT JOIN TMXEmployees emp
      ON agg.techEmployeeNum = emp.employee_number -- Join on technician employee number

    ORDER BY agg.sell_date DESC
    LIMIT @limit
  `

  try {
    const result = await bigQueryClient.queryWithParams<Omit<NewStartRecord, 'pestTypes'>>(sql, params)

    // Post-process to add pest types derived from productGroup
    return result.rows.map(row => ({
      ...row,
      pestTypes: mapProductGroupToPestTypes(row.productGroup),
    }))
  } catch (error) {
    console.error('[New Starts] getNewStarts failed:', error)
    return []
  }
}

/**
 * Get new starts summary (counts by status)
 */
export async function getNewStartsSummary(
  options: NewStartsQueryOptions = {}
): Promise<NewStartsSummary> {
  const { daysBack = 90 } = options
  const orgFilter = buildOrgFilterClause(options, '')

  // Build params object
  const params: Record<string, string | number> = {
    daysBack,
    ...orgFilter.params,
  }

  // Base WHERE clause with parameterized values
  let whereClause = 'sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)'

  if (orgFilter.clause) {
    whereClause += ` AND ${orgFilter.clause}`
  }

  const sql = `
    WITH AggregatedContracts AS (
      SELECT
        customer_name,
        sell_date,
        sales_person_nm,
        assigned_branch_code,
        region_cd,
        market_cd,
        -- Sum all contract values
        SUM(COALESCE(contract_value, 0)) as totalContractValue,
        -- Sum initial + non-initial (equipment, correctives, etc.)
        SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as totalInitialValue,
        -- Status flags
        MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as hasStarted
      FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
      WHERE ${whereClause}
      GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
    )
    SELECT
      COUNT(*) as total,
      COUNTIF(CASE WHEN hasStarted = 0 THEN 'pending_ops' ELSE 'completed' END = 'pending_ops') as pendingOps,
      0 as scheduled,
      0 as confirmed,
      0 as inProgress,
      COUNTIF(CASE WHEN hasStarted = 1 THEN 'completed' ELSE 'pending_ops' END = 'completed') as completed,
      0 as onHold,
      COALESCE(SUM(totalInitialValue), 0) as totalInitialValue,
      COALESCE(SUM(totalContractValue), 0) as totalContractValue
    FROM AggregatedContracts
  `

  try {
    const result = await bigQueryClient.queryWithParams<NewStartsSummary>(sql, params)
    return result.rows[0] || getDefaultSummary()
  } catch (error) {
    console.error('[New Starts] getNewStartsSummary failed:', error)
    return getDefaultSummary()
  }
}

function getDefaultSummary(): NewStartsSummary {
  return {
    total: 0,
    pendingOps: 0,
    scheduled: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    onHold: 0,
    totalInitialValue: 0,
    totalContractValue: 0,
  }
}

/**
 * Get new starts grouped by sales person for AE leaderboard
 */
export async function getNewStartsBySalesPerson(
  options: NewStartsQueryOptions = {}
): Promise<Array<{
  salesPerson: string
  total: number
  pending: number
  completed: number
  totalValue: number
}>> {
  const { daysBack = 90, limit = 50 } = options
  const orgFilter = buildOrgFilterClause(options, '')

  // Build params object
  const params: Record<string, string | number> = {
    daysBack,
    limit,
    ...orgFilter.params,
  }

  // Base WHERE clause with parameterized values
  let whereClause = `sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
    AND sales_person_nm IS NOT NULL`

  if (orgFilter.clause) {
    whereClause += ` AND ${orgFilter.clause}`
  }

  const sql = `
    WITH AggregatedContracts AS (
      SELECT
        customer_name,
        sell_date,
        sales_person_nm,
        assigned_branch_code,
        region_cd,
        market_cd,
        SUM(COALESCE(contract_value, 0)) as totalContractValue,
        MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as hasStarted
      FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
      WHERE ${whereClause}
      GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
    )
    SELECT
      sales_person_nm as salesPerson,
      COUNT(*) as total,
      COUNTIF(hasStarted = 0) as pending,
      COUNTIF(hasStarted = 1) as completed,
      COALESCE(SUM(totalContractValue), 0) as totalValue
    FROM AggregatedContracts
    GROUP BY sales_person_nm
    ORDER BY total DESC
    LIMIT @limit
  `

  try {
    const result = await bigQueryClient.queryWithParams<{
      salesPerson: string
      total: number
      pending: number
      completed: number
      totalValue: number
    }>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[New Starts] getNewStartsBySalesPerson failed:', error)
    return []
  }
}

// =============================================================================
// IMPLEMENTATION GUIDE: Adding Additional Data Fields
// =============================================================================
// ✅ COMPLETED: Technician/Specialist Information (2026-01-25)
//
// ACTUAL IMPLEMENTATION (SIMPLER THAN EXPECTED):
// DR_ContractSales already has tech_onsite_employee_nm field!
// No JOINs needed - just aggregate the name directly.
//
// Steps taken:
// 1. Added to AggregatedContracts CTE (line 244-245):
//    MIN(tech_onsite_employee_nm) as techName,
//    MIN(tech_onsite_employee_num) as techEmployeeNum,
//
// 2. Updated assignedSpecialist field (line 372):
//    COALESCE(agg.techName, 'Unassigned') as assignedSpecialist,
//
// Results: ✅ Technician names now showing
// - "SENDERLING, SCOTT"
// - "HAYES, EMMERSON"
// - "CORRAL, JESUS"
// - "QUILLEN, GAVEN"
// - "Unassigned" when no tech assigned
//
// LESSON LEARNED: Always check if the field already exists in the source table
// before adding complex JOINs. DR_ContractSales is a denormalized table that
// already has most fields we need!
//
// =============================================================================
// PATTERN FOR FUTURE FIELD ADDITIONS
// =============================================================================
// 1. Check if field exists in DR_ContractSales first
// 2. If yes: Just add MIN(field_name) to AggregatedContracts
// 3. If no: Use the address pattern (separate CTEs + LEFT JOINs)
//
// ✅ COMPLETED: Service Instructions / Special Notes (2026-01-25)
//
// IMPLEMENTATION: Join to pestpac_ServiceSetups for service instructions
// These contain detailed service notes entered in PestPac (not synced from Salesforce)
//
// Steps taken:
// 1. Created PestPacServiceSetups CTE (lines 297-304):
//    - Links via location_id (same as service address)
//    - Pulls comment and excessmessage fields
//
// 2. Added LEFT JOIN in main query (lines 401-402):
//    LEFT JOIN PestPacServiceSetups psetup
//      ON agg.locationId = psetup.location_id
//
// 3. Updated equipmentDetails field (line 389):
//    COALESCE(psetup.setup_comment, '') as equipmentDetails
//
// Results: ✅ Service instructions now showing in "SPECIAL NOTES / Equipment Overview" column
// Example: "Exterior Service with optional interior when requested by the Customer..."
//
// NOTE: Salesforce CARE_Service_Instructions__c field exists but is NOT linked to
// accounts with PestPac IDs. Service instructions in PestPac are the authoritative source.
//
// VERIFIED WORKING TABLES:
// - S0.pestpac_Locations (locationid) - Service addresses ✓
// - S0.pestpac_BillTos (billtoid) - Billing addresses ✓
// - S0.pestpac_ServiceSetups (locationid) - Service instructions/notes ✓
// - S0.pestpac_Employees (employeeid) - Available but not needed (tech name in DR_ContractSales)
// - S2.VwUnf_Branch (branch_code) - Branch locations ✓
// - BCG_RTD_DB.DR_ContractSales - Already has tech_onsite_employee_nm ✓
//
// =============================================================================
// ✅ COMPLETED: Operations Manager Information (2026-01-26)
// =============================================================================
// IMPLEMENTATION: Join to S0_TMX.Employees_Main to get technician's supervisor
//
// Steps taken:
// 1. Created TMXEmployees CTE (lines 289-296):
//    - Links via Employee_Number (same as techEmployeeNum from DR_ContractSales)
//    - Pulls Supervisor_Name and Supervisor_ID fields from employee record
//
// 2. Added LEFT JOIN in main query (lines 425-426):
//    LEFT JOIN TMXEmployees emp
//      ON agg.techEmployeeNum = emp.employee_number
//
// 3. Updated opsManager field (line 389):
//    COALESCE(emp.supervisor_name, '') as opsManager
//
// Results: ✅ Operations Manager names now showing based on technician's supervisor
// - Each technician's direct supervisor (from Workday HRIS via TMX ETL)
// - Manual overrides for technicians with incorrect supervisor data (line 389-396)
// - Empty string if technician not assigned or supervisor info missing
// - Example: "BARRERA, JOAQUIN" (Operations Manager overseeing the assigned technician)
//
// Data Flow:
// DR_ContractSales.tech_onsite_employee_num → Employees_Main.Employee_Number
//   → Employees_Main.Supervisor_Name (the Ops Manager)
//   → Manual CASE override (if Workday data is incorrect)
//
// This creates the hierarchical relationship:
// Ops Manager (supervisor) → Technician (assignedSpecialist) → New Start Installation
//
// MANUAL OVERRIDES (2026-01-26):
// Technician-specific overrides:
// - CORRAL, JESUS → Joaquin Barrera (incorrect supervisor in Workday)
// - FOLEY, WILL → Bruce Hockless (incorrect supervisor in Workday)
//
// Global supervisor replacements:
// - All instances of "KNUDSEN, CHRISTOPHER" → Joaquin Barrera (outdated supervisor, replaced by Joaquin)
//
// Add additional overrides in the CASE statement at lines 388-410 as needed
