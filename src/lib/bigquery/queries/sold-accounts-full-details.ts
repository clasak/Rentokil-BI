/**
 * BigQuery Query: Sold Accounts with Full Service Address + Install Date + Technician
 *
 * This query combines data from multiple sources to track sold accounts through install:
 * - Service Address: PestPac Locations (PRIMARY) + Salesforce Account (FALLBACK)
 * - Install Date: Contract tables (when service started)
 * - Technician: PestPac Employees (PRIMARY) + Inspections + TMX Employees (FALLBACK)
 * - Equipment/Notes: PestPac ServiceSetups + ServiceOrders
 *
 * Tables used:
 * - BCG_RTD_DB.DR_ContractSales (primary contract data, 2026)
 * - S0.pestpac_Locations (PestPac - 109 columns, full operational addresses)
 * - S0.pestpac_ServiceSetups (service agreements, technician assignments, notes)
 * - S0.pestpac_Employees (PestPac technician master)
 * - S0.Raw_RTXSF_Account_Daily (Salesforce - fallback for new accounts)
 * - S0_TMX.Inspections (field service completion data)
 * - S0_TMX.Employees_Main (technician names - fallback)
 * - S2.VwUnf_Branch (branch info)
 *
 * Priority Chain:
 * - Address: PestPac → Salesforce → Branch City/State
 * - Technician: PestPac → Inspections → TMX
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'

// =============================================================================
// Types
// =============================================================================

export interface SoldAccountFullDetails {
  // Account/Contract Info
  salesId: string
  pestPacLocationId: string | null
  customerName: string
  accountNumber: string | null

  // Full Service Address (PestPac primary, Salesforce fallback)
  serviceStreet: string | null
  serviceAddress2: string | null  // Additional address line
  serviceCity: string | null
  serviceState: string | null
  serviceZip: string | null
  serviceCountry: string | null
  fullServiceAddress: string  // Formatted full address
  addressSource: string  // 'pestpac', 'salesforce', or 'branch'

  // Alternate Shipping Address (from Salesforce only)
  shippingStreet: string | null
  shippingCity: string | null
  shippingState: string | null
  shippingZip: string | null

  // Contact Information (from PestPac)
  locationPhone: string | null
  locationEmail: string | null
  locationMobile: string | null

  // Geocoding (for maps)
  latitude: number | null
  longitude: number | null

  // Sales/Install Dates
  soldDate: string
  installDate: string | null
  daysToInstall: number | null
  daysSinceSold: number

  // Technician Info (PestPac primary, TMX fallback)
  technicianId: string | null
  technicianName: string | null
  technicianJobTitle: string | null
  technicianPhone: string | null
  technicianEmail: string | null
  technicianSource: string  // 'pestpac', 'inspections', or 'tmx'

  // Preferred Technician (from PestPac ServiceSetup)
  preferredTechId: string | null
  preferredTechName: string | null

  // Sales/Service Info
  salesPerson: string
  contractValue: number
  initialJobPrice: number
  serviceType: string
  productGroup: string

  // Service Setup Details (from PestPac)
  serviceSetupComment: string | null  // Service instructions/notes
  serviceDirections: string | null    // Site-specific directions
  measurementValue: number | null     // Service area/quantity
  measurementUnit: string | null      // Unit of measure

  // Equipment Details (from Salesforce Quote)
  equipmentSummary: string | null     // Formatted equipment list (e.g., "8 RBS, 4 MRT, 2 ILT")
  equipmentLineItems: number | null   // Count of equipment line items
  totalEquipmentQty: number | null    // Total equipment quantity

  // Status
  startedInd: string  // Y/N
  status: string  // completed, pending_ops, etc.

  // Organization
  branchCode: string
  branchName: string | null
  regionCode: string
  marketCode: string
}

export interface SoldAccountQueryOptions {
  daysBack?: number
  startedInd?: 'Y' | 'N' | 'ALL'  // Filter by started status
  salesPerson?: string
  branchCode?: string
  regionCode?: string
  marketCode?: string
  limit?: number
}

// =============================================================================
// Table Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

// =============================================================================
// Main Query
// =============================================================================

/**
 * Get sold accounts with full service address, install date, and technician info
 *
 * @param options - Query filters
 * @returns Array of sold account records with complete details
 */
export async function getSoldAccountsFullDetails(
  options: SoldAccountQueryOptions = {}
): Promise<SoldAccountFullDetails[]> {
  const {
    daysBack = 90,
    startedInd = 'ALL',
    limit = 500,
  } = options

  // Build filter parameters
  const params: Record<string, string | number> = {
    daysBack,
    limit,
  }

  // Build WHERE clause
  const whereClauses: string[] = [
    'c.sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)',
  ]

  if (startedInd !== 'ALL') {
    whereClauses.push('c.started_ind = @startedInd')
    params.startedInd = startedInd
  }

  if (options.marketCode) {
    whereClauses.push('c.market_cd = @marketCode')
    params.marketCode = options.marketCode
  }

  if (options.regionCode) {
    whereClauses.push('c.region_cd = @regionCode')
    params.regionCode = options.regionCode
  }

  if (options.branchCode) {
    whereClauses.push('c.assigned_branch_code = @branchCode')
    params.branchCode = options.branchCode
  }

  if (options.salesPerson) {
    whereClauses.push('LOWER(c.sales_person_nm) LIKE CONCAT(\'%\', LOWER(@salesPerson), \'%\')')
    params.salesPerson = options.salesPerson
  }

  const whereClause = whereClauses.join(' AND ')

  const sql = `
    WITH Contracts AS (
      SELECT
        c.sales_id,
        c.bill_to_id,
        c.location_id,
        c.customer_name,
        c.sell_date,
        c.start_date,
        c.started_ind,
        c.contract_value,
        c.job_ini_value,
        c.sales_person_nm,
        c.service_type_desc,
        c.product_group,
        c.assigned_branch_code,
        c.region_cd,
        c.market_cd,
        -- Calculate days to install
        CASE
          WHEN c.start_date IS NOT NULL AND c.started_ind = 'Y'
          THEN DATE_DIFF(c.start_date, c.sell_date, DAY)
          ELSE NULL
        END as days_to_install,
        DATE_DIFF(CURRENT_DATE(), c.sell_date, DAY) as days_since_sold,
        -- Use location_id or bill_to_id as PestPac ID
        CAST(COALESCE(c.location_id, c.bill_to_id) AS STRING) as pestpac_location_id
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\` c
      WHERE ${whereClause}
    ),
    -- Get full service address from PestPac Locations (PRIMARY SOURCE)
    PestPacLocations AS (
      SELECT
        CAST(pl.locationid AS STRING) as location_id,
        CAST(pl.locationcode AS STRING) as location_code,
        CAST(pl.billtoid AS STRING) as bill_to_id,
        -- Full address fields
        pl.street,
        pl.address as address_line1,
        pl.address2,
        pl.city,
        pl.state,
        pl.zip,
        pl.country,
        -- Contact info
        pl.phone,
        pl.email,
        pl.mobile,
        -- Geocoding
        pl.latitude,
        pl.longitude,
        -- Format full address
        CONCAT(
          COALESCE(pl.street, COALESCE(pl.address, '')),
          CASE WHEN COALESCE(pl.street, pl.address) IS NOT NULL AND pl.address2 IS NOT NULL THEN ', ' ELSE '' END,
          COALESCE(pl.address2, ''),
          CASE WHEN COALESCE(pl.street, pl.address, pl.address2) IS NOT NULL AND pl.city IS NOT NULL THEN ', ' ELSE '' END,
          COALESCE(pl.city, ''),
          CASE WHEN pl.city IS NOT NULL AND pl.state IS NOT NULL THEN ', ' ELSE '' END,
          COALESCE(pl.state, ''),
          CASE WHEN pl.state IS NOT NULL AND pl.zip IS NOT NULL THEN ' ' ELSE '' END,
          COALESCE(pl.zip, '')
        ) as full_address_pestpac
      FROM \`${PROJECT}.S0.pestpac_Locations\` pl
    ),
    -- Get service address from Salesforce Account table (FALLBACK SOURCE)
    SalesforceAddresses AS (
      SELECT
        CAST(a.PestPac_Location_Id__c AS STRING) as pestpac_location_id,
        a.AccountNumber,
        -- Billing address
        a.BillingStreet,
        a.BillingCity,
        a.BillingState,
        a.BillingPostalCode,
        a.BillingCountry,
        a.BillingLatitude,
        a.BillingLongitude,
        -- Shipping address (alternate)
        a.ShippingStreet,
        a.ShippingCity,
        a.ShippingState,
        a.ShippingPostalCode,
        -- Format full address
        CONCAT(
          COALESCE(a.BillingStreet, ''),
          CASE WHEN a.BillingStreet IS NOT NULL THEN ', ' ELSE '' END,
          COALESCE(a.BillingCity, ''),
          CASE WHEN a.BillingCity IS NOT NULL THEN ', ' ELSE '' END,
          COALESCE(a.BillingState, ''),
          CASE WHEN a.BillingState IS NOT NULL THEN ' ' ELSE '' END,
          COALESCE(a.BillingPostalCode, '')
        ) as full_address_salesforce
      FROM \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a
      WHERE a.PestPac_Location_Id__c IS NOT NULL
    ),
    -- Get Salesforce Equipment Details from Quotes
    SalesforceEquipment AS (
      SELECT
        CAST(a.PestPac_Location_Id__c AS STRING) as pestpac_location_id,
        -- Aggregate equipment details from quote line items
        STRING_AGG(
          CONCAT(
            CAST(CAST(e.Quantity__c AS INT64) AS STRING),
            ' ',
            COALESCE(e.Equipment_Code__c, e.Description__c, 'Unknown')
          ),
          ', '
          ORDER BY e.Equipment_Code__c
        ) as equipment_summary,
        COUNT(DISTINCT e.Id) as equipment_line_count,
        SUM(CAST(e.Quantity__c AS INT64)) as total_equipment_qty
      FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Line_Equipments__c_Daily\` e
      INNER JOIN \`${PROJECT}.S0.Raw_RTXSF_QuoteLineItem_Daily\` qli
        ON e.Quote_Line_Item__c = qli.Id
      INNER JOIN \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
        ON qli.QuoteId = q.Id
      INNER JOIN \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o
        ON q.OpportunityId = o.Id
      INNER JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a
        ON o.AccountId = a.Id
      WHERE a.PestPac_Location_Id__c IS NOT NULL
        AND e.Quantity__c > 0
      GROUP BY a.PestPac_Location_Id__c
    ),
    -- Get PestPac Service Setups (equipment, technician assignments, notes)
    PestPacServiceSetups AS (
      SELECT
        CAST(ss.locationid AS STRING) as location_id,
        -- Technician assignments (up to 5 techs)
        ss.preferredtechid,
        ss.techid1,
        ss.techid2,
        -- Service notes and instructions
        ss.comment as setup_comment,
        ss.excessmessage,
        -- Measurement/equipment
        ss.measurement,
        ss.measurementunit,
        -- Get most recent setup per location
        ROW_NUMBER() OVER (
          PARTITION BY ss.locationid
          ORDER BY ss.setupdate DESC
        ) as rn
      FROM \`${PROJECT}.S0.pestpac_ServiceSetups\` ss
      WHERE ss.inactive = FALSE
        OR ss.inactive IS NULL
    ),
    -- Get PestPac Employees (PRIMARY technician source)
    PestPacEmployees AS (
      SELECT
        CAST(emp.employeeid AS STRING) as employee_id,
        TRIM(CONCAT(COALESCE(emp.firstname, ''), ' ', COALESCE(emp.lastname, ''))) as employee_name,
        emp.position as job_title,
        emp.phone,
        emp.email,
        emp.mobile
      FROM \`${PROJECT}.S0.pestpac_Employees\` emp
      WHERE emp.employeeid IS NOT NULL
    ),
    -- Get most recent inspection/service for each contract (FALLBACK technician source)
    RecentInspections AS (
      SELECT
        CAST(COALESCE(i.BillToId, i.LocationCode) AS STRING) as pestpac_location_id,
        i.EmployeeNumber as technician_id,
        i.DateInspected as inspection_date,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(i.BillToId, i.LocationCode)
          ORDER BY i.DateInspected DESC
        ) as rn
      FROM \`${PROJECT}.S0_TMX.Inspections\` i
      WHERE i.Status IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED')
        AND i.EmployeeNumber IS NOT NULL
        AND i.DateInspected >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
    ),
    -- Get TMX technician details (FALLBACK)
    TMXTechnicians AS (
      SELECT
        CAST(e.Employee_Number AS STRING) as technician_id,
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as technician_name,
        e.Job_Title as job_title
      FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
      WHERE e.Employee_Number IS NOT NULL
    ),
    -- Get branch details
    Branches AS (
      SELECT
        b.Current_State_Branch_Code as branch_code,
        b.Branch_Name as branch_name,
        b.City,
        b.State
      FROM \`${PROJECT}.S2.VwUnf_Branch\` b
    )
    -- Final join and select
    SELECT
      CAST(c.sales_id AS STRING) as salesId,
      c.pestpac_location_id as pestPacLocationId,
      COALESCE(c.customer_name, 'Unknown Customer') as customerName,
      sf.AccountNumber as accountNumber,

      -- Full Service Address (PestPac PRIMARY, Salesforce FALLBACK, Branch FINAL FALLBACK)
      COALESCE(pp.street, pp.address_line1, sf.BillingStreet) as serviceStreet,
      pp.address2 as serviceAddress2,
      COALESCE(pp.city, sf.BillingCity, b.City) as serviceCity,
      COALESCE(pp.state, sf.BillingState, b.State) as serviceState,
      COALESCE(pp.zip, sf.BillingPostalCode) as serviceZip,
      COALESCE(pp.country, sf.BillingCountry, 'USA') as serviceCountry,

      -- Full formatted address with source priority
      COALESCE(
        pp.full_address_pestpac,
        sf.full_address_salesforce,
        CONCAT(b.City, ', ', b.State)
      ) as fullServiceAddress,

      -- Track which source provided the address
      CASE
        WHEN pp.full_address_pestpac IS NOT NULL AND pp.full_address_pestpac != '' THEN 'pestpac'
        WHEN sf.full_address_salesforce IS NOT NULL AND sf.full_address_salesforce != '' THEN 'salesforce'
        ELSE 'branch'
      END as addressSource,

      -- Shipping Address (Salesforce only)
      sf.ShippingStreet as shippingStreet,
      sf.ShippingCity as shippingCity,
      sf.ShippingState as shippingState,
      sf.ShippingPostalCode as shippingZip,

      -- Contact Information (PestPac)
      pp.phone as locationPhone,
      pp.email as locationEmail,
      pp.mobile as locationMobile,

      -- Geocoding (prefer PestPac, fallback to Salesforce)
      COALESCE(pp.latitude, sf.BillingLatitude) as latitude,
      COALESCE(pp.longitude, sf.BillingLongitude) as longitude,

      -- Dates
      FORMAT_DATE('%Y-%m-%d', c.sell_date) as soldDate,
      CASE
        WHEN c.start_date IS NOT NULL
        THEN FORMAT_DATE('%Y-%m-%d', c.start_date)
        ELSE NULL
      END as installDate,
      c.days_to_install as daysToInstall,
      c.days_since_sold as daysSinceSold,

      -- Technician (Priority: PestPac assigned tech → Inspection tech → TMX)
      COALESCE(
        CAST(psetup.techid1 AS STRING),
        ri.technician_id
      ) as technicianId,
      COALESCE(
        pptech1.employee_name,
        tmxtech.technician_name
      ) as technicianName,
      COALESCE(
        pptech1.job_title,
        tmxtech.job_title
      ) as technicianJobTitle,
      pptech1.phone as technicianPhone,
      pptech1.email as technicianEmail,

      -- Track technician data source
      CASE
        WHEN pptech1.employee_name IS NOT NULL THEN 'pestpac'
        WHEN tmxtech.technician_name IS NOT NULL THEN 'inspections'
        ELSE NULL
      END as technicianSource,

      -- Preferred Technician (from PestPac ServiceSetup)
      CAST(psetup.preferredtechid AS STRING) as preferredTechId,
      pppref.employee_name as preferredTechName,

      -- Sales/Service
      -- Convert sales person name from "LAST, FIRST" to "First Last"
      CASE
        WHEN c.sales_person_nm LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(c.sales_person_nm, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(c.sales_person_nm, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(c.sales_person_nm, 'Unknown')
      END as salesPerson,
      COALESCE(c.contract_value, 0) as contractValue,
      COALESCE(c.job_ini_value, 0) as initialJobPrice,
      COALESCE(c.service_type_desc, 'Unknown') as serviceType,
      COALESCE(c.product_group, 'Unknown') as productGroup,

      -- Service Setup Details (from PestPac)
      psetup.setup_comment as serviceSetupComment,
      COALESCE(pp.directions, psetup.excessmessage) as serviceDirections,
      psetup.measurement as measurementValue,
      psetup.measurementunit as measurementUnit,

      -- Equipment Details (from Salesforce Quote)
      sfeq.equipment_summary as equipmentSummary,
      sfeq.equipment_line_count as equipmentLineItems,
      sfeq.total_equipment_qty as totalEquipmentQty,

      -- Status
      c.started_ind as startedInd,
      CASE
        WHEN c.started_ind = 'Y' THEN 'completed'
        ELSE 'pending_ops'
      END as status,

      -- Organization
      COALESCE(c.assigned_branch_code, '') as branchCode,
      b.branch_name as branchName,
      COALESCE(c.region_cd, '') as regionCode,
      COALESCE(c.market_cd, '') as marketCode

    FROM Contracts c
    -- Join to PestPac Locations (PRIMARY address source)
    LEFT JOIN PestPacLocations pp
      ON c.pestpac_location_id = pp.location_id
      OR c.pestpac_location_id = pp.bill_to_id
    -- Join to PestPac Service Setups (technician assignment, notes, equipment)
    LEFT JOIN PestPacServiceSetups psetup
      ON c.pestpac_location_id = psetup.location_id
      AND psetup.rn = 1  -- Most recent setup only
    -- Join to PestPac Employees (PRIMARY technician source)
    LEFT JOIN PestPacEmployees pptech1
      ON CAST(psetup.techid1 AS STRING) = pptech1.employee_id
    LEFT JOIN PestPacEmployees pppref
      ON CAST(psetup.preferredtechid AS STRING) = pppref.employee_id
    -- Join to Salesforce (FALLBACK address source)
    LEFT JOIN SalesforceAddresses sf
      ON c.pestpac_location_id = sf.pestpac_location_id
    -- Join to Salesforce Equipment (Quote line items)
    LEFT JOIN SalesforceEquipment sfeq
      ON c.pestpac_location_id = sfeq.pestpac_location_id
    -- Join to Inspections (FALLBACK technician source)
    LEFT JOIN RecentInspections ri
      ON c.pestpac_location_id = ri.pestpac_location_id
      AND ri.rn = 1  -- Most recent inspection only
    LEFT JOIN TMXTechnicians tmxtech
      ON ri.technician_id = tmxtech.technician_id
    -- Join to Branches (FINAL FALLBACK for address)
    LEFT JOIN Branches b
      ON c.assigned_branch_code = b.branch_code
    ORDER BY c.sell_date DESC
    LIMIT @limit
  `

  try {
    const result = await bigQueryClient.queryWithParams<SoldAccountFullDetails>(sql, params)
    console.log(`[Sold Accounts] Found ${result.rows.length} records with full details`)
    return result.rows
  } catch (error) {
    console.error('[Sold Accounts] getSoldAccountsFullDetails failed:', error)
    throw handleBigQueryError(error, 'getSoldAccountsFullDetails')
  }
}

/**
 * Get summary statistics for sold accounts
 */
export async function getSoldAccountsSummary(
  options: SoldAccountQueryOptions = {}
): Promise<{
  totalSold: number
  totalStarted: number
  totalPending: number
  avgDaysToInstall: number
  totalContractValue: number
  withFullAddress: number
  withTechnician: number
}> {
  const { daysBack = 90 } = options

  const params: Record<string, number> = { daysBack }

  const sql = `
    WITH Contracts AS (
      SELECT
        c.sales_id,
        c.started_ind,
        c.contract_value,
        c.start_date,
        c.sell_date,
        CAST(COALESCE(c.location_id, c.bill_to_id) AS STRING) as pestpac_location_id
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\` c
      WHERE c.sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
    )
    SELECT
      COUNT(*) as totalSold,
      COUNTIF(c.started_ind = 'Y') as totalStarted,
      COUNTIF(c.started_ind = 'N') as totalPending,
      AVG(CASE
        WHEN c.started_ind = 'Y' AND c.start_date IS NOT NULL
        THEN DATE_DIFF(c.start_date, c.sell_date, DAY)
        ELSE NULL
      END) as avgDaysToInstall,
      COALESCE(SUM(c.contract_value), 0) as totalContractValue,
      COUNT(DISTINCT sa.pestpac_location_id) as withFullAddress,
      COUNT(DISTINCT ri.technician_id) as withTechnician
    FROM Contracts c
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` sa
      ON c.pestpac_location_id = CAST(sa.PestPac_Location_Id__c AS STRING)
      AND sa.BillingStreet IS NOT NULL
    LEFT JOIN (
      SELECT DISTINCT
        CAST(COALESCE(BillToId, LocationCode) AS STRING) as pestpac_location_id,
        EmployeeNumber as technician_id
      FROM \`${PROJECT}.S0_TMX.Inspections\`
      WHERE Status IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED')
        AND EmployeeNumber IS NOT NULL
    ) ri
      ON c.pestpac_location_id = ri.pestpac_location_id
  `

  try {
    const result = await bigQueryClient.queryWithParams<{
      totalSold: number
      totalStarted: number
      totalPending: number
      avgDaysToInstall: number
      totalContractValue: number
      withFullAddress: number
      withTechnician: number
    }>(sql, params)
    return result.rows[0] || {
      totalSold: 0,
      totalStarted: 0,
      totalPending: 0,
      avgDaysToInstall: 0,
      totalContractValue: 0,
      withFullAddress: 0,
      withTechnician: 0,
    }
  } catch (error) {
    console.error('[Sold Accounts] getSoldAccountsSummary failed:', error)
    throw handleBigQueryError(error, 'getSoldAccountsSummary')
  }
}
