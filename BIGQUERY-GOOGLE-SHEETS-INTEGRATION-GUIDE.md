# BigQuery to Google Sheets Integration Guide

**Complete Technical Specification for Sales Tracker & New Start Log**

This document provides everything needed to build a standalone application that pulls data from BigQuery and populates Google Sheets for Sales Tracker and New Start Log.

---

## Table of Contents

1. [Overview](#overview)
2. [BigQuery Configuration](#bigquery-configuration)
3. [Google Cloud Authentication](#google-cloud-authentication)
4. [Sales Tracker Integration](#sales-tracker-integration)
5. [New Start Log Integration](#new-start-log-integration)
6. [Environment Variables](#environment-variables)
7. [Code Examples](#code-examples)
8. [Data Transformation Logic](#data-transformation-logic)
9. [Error Handling](#error-handling)

---

## Overview

### Architecture

```
BigQuery (GCP)
  ↓
  BCG_RTD_DB.DR_ContractSales (3.2M rows)
  W3_Contract_Checker.T0_unf_Contract_All (7.8M rows)
  S0.Raw_RTXSF_Quote_Daily (Salesforce quotes)
  ↓
  Node.js/Python Script
  ↓
  Google Sheets API
  ↓
  Target Sheets (Sales Tracker, New Start Log)
```

### GCP Projects

| Environment | Project ID | Use Case |
|-------------|-----------|----------|
| Production | `bidata-sharedus-production` | Live operational data |
| Staging | `bidata-sharedus-staging` | Testing/QA |
| Dev | `bidata-sharedus-dev` | Development |

---

## BigQuery Configuration

### Environment Detection

The application automatically detects which environment to use based on:

1. **Explicit Override** (highest priority): `BIGQUERY_ENVIRONMENT` env var
2. **Vercel Environment**: `VERCEL_ENV` (production → production, preview → staging)
3. **Node Environment**: `NODE_ENV` (production → production, test → staging)
4. **Default**: `production`

```javascript
// Environment detection logic
function getEnvironment() {
  if (process.env.BIGQUERY_ENVIRONMENT) {
    return process.env.BIGQUERY_ENVIRONMENT // 'production' | 'staging' | 'dev'
  }

  if (process.env.VERCEL_ENV === 'production') return 'production'
  if (process.env.VERCEL_ENV === 'preview') return 'staging'

  if (process.env.NODE_ENV === 'production') return 'production'
  if (process.env.NODE_ENV === 'test') return 'staging'

  return 'production' // Default (local dev should set BIGQUERY_ENVIRONMENT=dev)
}
```

### BigQuery Client Initialization

```javascript
const { BigQuery } = require('@google-cloud/bigquery')

const BIGQUERY_PROJECTS = {
  production: 'bidata-sharedus-production',
  staging: 'bidata-sharedus-staging',
  dev: 'bidata-sharedus-dev',
}

const environment = getEnvironment()
const projectId = BIGQUERY_PROJECTS[environment]

const bigquery = new BigQuery({
  projectId: projectId,
  location: 'US', // Dataset location
  // keyFilename: '/path/to/service-account.json', // Optional: use service account
})
```

---

## Google Cloud Authentication

### Option 1: Application Default Credentials (ADC) - Recommended for Local Dev

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth application-default login

# Set project
gcloud config set project bidata-sharedus-production
```

### Option 2: Service Account (Recommended for Production)

**Step 1: Create Service Account**

```bash
# Create service account
gcloud iam service-accounts create bigquery-sheets-sync \
  --display-name="BigQuery to Sheets Sync" \
  --project=bidata-sharedus-production

# Grant BigQuery Data Viewer role
gcloud projects add-iam-policy-binding bidata-sharedus-production \
  --member="serviceAccount:bigquery-sheets-sync@bidata-sharedus-production.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

# Grant BigQuery Job User role (to run queries)
gcloud projects add-iam-policy-binding bidata-sharedus-production \
  --member="serviceAccount:bigquery-sheets-sync@bidata-sharedus-production.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# Generate key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=bigquery-sheets-sync@bidata-sharedus-production.iam.gserviceaccount.com
```

**Step 2: Use Service Account in Code**

```javascript
const bigquery = new BigQuery({
  projectId: 'bidata-sharedus-production',
  keyFilename: './service-account-key.json',
})
```

### Required Permissions

Your service account needs:
- **`bigquery.dataViewer`**: Read data from tables
- **`bigquery.jobUser`**: Create and run query jobs
- **`bigquery.tables.get`**: Get table metadata

---

## Sales Tracker Integration

### Overview

Sales Tracker tracks monthly sales performance for Account Executives, including:
- **Proposals**: Salesforce quotes/proposals delivered
- **Sales**: PestPac contracts sold (BCG_RTD_DB.DR_ContractSales)
- **Started Sales**: Contracts that have begun service (for Xactly compensation)

### Data Sources

1. **Proposals**: `S0.Raw_RTXSF_Quote_Daily` (Salesforce)
2. **Sales**: `BCG_RTD_DB.DR_ContractSales` (PestPac → Xactly compensation)
3. **Monthly Totals**: Aggregated from DR_ContractSales

---

### Query 1: Monthly Totals Detail

**Purpose**: Get aggregated proposal/sales totals by category (Termite, Contract, Job Work) for a specific month.

**SQL Query**:

```sql
WITH monthly_sales AS (
  SELECT
    product_group,
    service_type_desc,
    contract_value,
    job_ini_value,
    job_non_ini_value,
    started_ind,
    sell_date
  FROM `bidata-sharedus-production.BCG_RTD_DB.DR_ContractSales`
  WHERE EXTRACT(YEAR FROM sell_date) = @year
    AND EXTRACT(MONTH FROM sell_date) = @month
    -- SALES PERSON FILTER (flexible name matching)
    AND (
      (
        LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(0)]), '%')
        AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(1)]), '%')
      )
      OR (
        LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ', ')[SAFE_OFFSET(0)]), '%')
        AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ', ')[SAFE_OFFSET(1)]), '%')
      )
      OR LOWER(sales_person_nm) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
    )
),
business_days AS (
  SELECT COUNT(*) as days
  FROM UNNEST(GENERATE_DATE_ARRAY(
    DATE(@year, @month, 1),
    LAST_DAY(DATE(@year, @month, 1))
  )) as d
  WHERE EXTRACT(DAYOFWEEK FROM d) NOT IN (1, 7) -- Exclude Sunday (1) and Saturday (7)
)
SELECT
  @month as month,
  @year as year,
  -- Proposals (all records are proposals)
  COALESCE(SUM(CASE
    WHEN product_group IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value
  END), 0) as proposalTermite,
  COALESCE(SUM(CASE
    WHEN service_type_desc LIKE '%Contract%' AND product_group NOT IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value
  END), 0) as proposalContract,
  COALESCE(SUM(CASE
    WHEN service_type_desc LIKE '%Job%' OR service_type_desc LIKE '%Initial%' THEN (COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0))
  END), 0) as proposalJobWork,
  COALESCE(SUM(COALESCE(contract_value, 0) + COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0)), 0) as proposalGrandTotal,
  COUNT(*) as totalProposalsCount,
  SAFE_DIVIDE(COUNT(*), (SELECT days FROM business_days)) as proposalsPerDay,
  -- Sales (only started contracts)
  COALESCE(SUM(CASE
    WHEN started_ind = 'Y' AND product_group IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value
  END), 0) as salesTermite,
  COALESCE(SUM(CASE
    WHEN started_ind = 'Y' AND service_type_desc LIKE '%Contract%' AND product_group NOT IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value
  END), 0) as salesContract,
  COALESCE(SUM(CASE
    WHEN started_ind = 'Y' AND (service_type_desc LIKE '%Job%' OR service_type_desc LIKE '%Initial%') THEN (COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0))
  END), 0) as salesJobWork,
  COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN (COALESCE(contract_value, 0) + COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0)) END), 0) as salesGrandTotal,
  COUNT(CASE WHEN started_ind = 'Y' THEN 1 END) as totalSalesCount,
  COUNT(CASE WHEN started_ind = 'Y' THEN 1 END) as totalStartedSalesCount,
  -- ISQ and Personal Goal (defaults - to be overridden in localStorage/UI)
  COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN (COALESCE(contract_value, 0) + COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0)) END), 0) as isq,
  0 as personalGoal
FROM monthly_sales
```

**Parameters**:
```javascript
{
  year: 2026,
  month: 1, // 1-12
  salesPerson: 'Cody Lytle' // "First Last" or "LAST, FIRST"
}
```

**Output Schema**:
```typescript
{
  month: number // 1-12
  year: number
  // Proposals
  proposalTermite: number
  proposalContract: number
  proposalJobWork: number
  proposalGrandTotal: number
  totalProposalsCount: number
  proposalsPerDay: number
  // Sales
  salesTermite: number
  salesContract: number
  salesJobWork: number
  salesGrandTotal: number
  totalSalesCount: number
  totalStartedSalesCount: number
  // Manual fields (defaults)
  isq: number
  personalGoal: number
}
```

---

### Query 2: Salesforce Quotes (Proposals)

**Purpose**: Get individual Salesforce quote/proposal records for a specific sales person.

**SQL Query**:

```sql
SELECT
  q.Id as quoteId,
  q.Name as quoteName,
  q.OpportunityId as opportunityId,
  COALESCE(o.Name, '') as accountName,
  COALESCE(q.Status, '') as status,
  -- Calculate total from line items if quote total is 0
  CASE
    WHEN COALESCE(q.TotalPrice, 0) > 0 THEN q.TotalPrice
    ELSE COALESCE((
      SELECT SUM(COALESCE(qli.Total_Cost__c, qli.Subtotal, 0))
      FROM `bidata-sharedus-production.S0.Raw_RTXSF_QuoteLineItem_Daily` qli
      WHERE qli.QuoteId = q.Id
    ), 0)
  END as totalAmount,
  FORMAT_DATE('%Y-%m-%d', DATE(q.Date_of_Sale__c)) as dateOfSale,
  FORMAT_DATE('%Y-%m-%d', DATE(q.CreatedDate)) as proposalDeliveredDate,
  '' as servicingBranch,
  COALESCE(e.Name, '') as ownerName,
  CASE
    WHEN q.Status = 'Accepted' THEN true
    WHEN q.Status = 'Approved' THEN true
    ELSE false
  END as isApproved
FROM `bidata-sharedus-production.S0.Raw_RTXSF_Quote_Daily` q
LEFT JOIN `bidata-sharedus-production.S0.Raw_RTXSF_Opportunity_Daily` o ON q.OpportunityId = o.Id
LEFT JOIN `bidata-sharedus-production.S0.Raw_RTXSF_Employee__c_Daily` e ON q.OwnerId = e.User__c
WHERE q.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @daysBack DAY)
  AND (
    LOWER(e.Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
  )
ORDER BY q.CreatedDate DESC
LIMIT @limit
```

**Parameters**:
```javascript
{
  salesPerson: 'Cody Lytle',
  daysBack: 365,
  limit: 500
}
```

---

### Query 3: Sales Details (from PestPac/Xactly)

**Purpose**: Get individual sold contract records (with started indicator for compensation tracking).

**SQL Query**:

```sql
WITH AggregatedSales AS (
  SELECT
    customer_name,
    sell_date,
    sales_person_nm,
    assigned_branch_code,
    region_cd,
    market_cd,
    -- Aggregate identifiers
    MIN(sales_id) as salesId,
    MIN(COALESCE(bill_to_id, location_id)) as pestPacId,
    -- Sum all values (Job Work = ini + non_ini which includes product/equipment)
    SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as initialValue,
    SUM(COALESCE(contract_value, 0)) as contractValue,
    SUM(COALESCE(total_value, contract_value, 0)) as totalValue,
    -- Consolidate product info
    STRING_AGG(DISTINCT COALESCE(product_group, 'Other'), ', ') as productGroup,
    STRING_AGG(DISTINCT COALESCE(service_type_desc, 'Sale'), ', ') as serviceType,
    -- Status flags
    MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as hasStarted,
    MAX(start_date) as startDate
  FROM `bidata-sharedus-production.BCG_RTD_DB.DR_ContractSales`
  WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
    AND (
      (
        LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(0)]), '%')
        AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(1)]), '%')
      )
      OR (
        LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ', ')[SAFE_OFFSET(0)]), '%')
        AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ', ')[SAFE_OFFSET(1)]), '%')
      )
      OR LOWER(sales_person_nm) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
    )
  GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
)
SELECT
  CAST(salesId AS STRING) as salesId,
  COALESCE(customer_name, 'Customer') as customerName,
  productGroup,
  serviceType,
  serviceType as serviceTypeName,
  FORMAT_DATE('%Y-%m-%d', sell_date) as sellDate,
  CASE WHEN hasStarted = 1 THEN FORMAT_DATE('%Y-%m-%d', startDate) ELSE NULL END as startDate,
  initialValue,
  contractValue,
  totalValue,
  CASE WHEN hasStarted = 1 THEN 'Y' ELSE 'N' END as startedInd,
  COALESCE(assigned_branch_code, '') as branch,
  COALESCE(region_cd, '') as region,
  COALESCE(market_cd, '') as market
FROM AggregatedSales
WHERE pestPacId IS NOT NULL
ORDER BY sell_date DESC
LIMIT @limit
```

**Parameters**:
```javascript
{
  salesPerson: 'Cody Lytle',
  daysBack: 90,
  limit: 500
}
```

---

## New Start Log Integration

### Overview

New Start Log tracks the handoff from Sales (Account Executive) to Operations for new contracts. It shows:
- **Sales Data (RED columns)**: Contract details, pricing, customer info from PestPac
- **Operations Data (YELLOW columns)**: Ops Manager, Technician, install dates, equipment

### Data Source

**Primary**: `BCG_RTD_DB.DR_ContractSales` (3.2M rows, 2026 data)
- Includes `started_ind` field (Y/N) to track service start status
- Has technician assignments (`tech_onsite_employee_nm`)

### Query: New Start Entries

**Purpose**: Get new contract sales with operations details (handoff tracking).

**IMPORTANT**: This query must GROUP BY to consolidate multiple product rows per sale.

**SQL Query**:

```sql
WITH AggregatedContracts AS (
  -- CRITICAL: DR_ContractSales has multiple rows per sale (one per product type: I, P, PC, etc.)
  -- Must GROUP BY customer/date/sales_person/branch to consolidate duplicates
  SELECT
    customer_name,
    sell_date,
    sales_person_nm,
    assigned_branch_code,
    region_cd,
    market_cd,
    -- Aggregate identifiers
    MIN(sales_id) as salesID,
    MIN(COALESCE(location_id, bill_to_id)) as pestPacId,
    MIN(bill_to_id) as billToId,
    MIN(location_id) as locationId,
    -- Technician info
    MIN(tech_onsite_employee_nm) as techName,
    MIN(tech_onsite_employee_num) as techEmployeeNum,
    -- Sum all contract values
    SUM(COALESCE(contract_value, 0)) as totalContractValue,
    SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as totalInitialValue,
    -- Consolidate product info
    STRING_AGG(DISTINCT COALESCE(product_group, 'Unknown'), ', ') as productGroups,
    STRING_AGG(DISTINCT COALESCE(service_type_desc, 'Unknown'), ', ') as serviceTypes,
    -- Status flags
    MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as hasStarted,
    MAX(start_date) as start_date,
    MAX(DATE_DIFF(CURRENT_DATE(), sell_date, DAY)) as daysSinceSold,
    MAX(CASE
      WHEN start_date IS NOT NULL
      THEN DATE_DIFF(start_date, sell_date, DAY)
      ELSE NULL
    END) as daysToInstall,
    MAX(location_zip) as location_zip
  FROM `bidata-sharedus-production.BCG_RTD_DB.DR_ContractSales` c
  WHERE c.sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
    -- Sales person filter (flexible name matching)
    AND (
      (
        LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(0)]), '%')
        AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(1)]), '%')
      )
      OR (
        LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ', ')[SAFE_OFFSET(0)]), '%')
        AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ', ')[SAFE_OFFSET(1)]), '%')
      )
      OR LOWER(sales_person_nm) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
    )
  GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
),
-- SERVICE ADDRESS: Links via location_id
PestPacServiceLocations AS (
  SELECT
    CAST(pl.locationid AS STRING) as location_id,
    TRIM(COALESCE(pl.city, '')) as city,
    TRIM(COALESCE(pl.state, '')) as state,
    TRIM(COALESCE(pl.zip, '')) as zip,
    TRIM(COALESCE(pl.address, '')) as address,
    TRIM(COALESCE(pl.address2, '')) as address2
  FROM `bidata-sharedus-production.S0.pestpac_Locations` pl
  WHERE pl.locationid IS NOT NULL
),
-- BILLING ADDRESS: Links via bill_to_id
PestPacBillTos AS (
  SELECT
    CAST(bt.billtoid AS STRING) as billto_id,
    TRIM(COALESCE(bt.city, '')) as city,
    TRIM(COALESCE(bt.state, '')) as state,
    TRIM(COALESCE(bt.zip, '')) as zip,
    TRIM(COALESCE(bt.address, '')) as address
  FROM `bidata-sharedus-production.S0.pestpac_BillTos` bt
  WHERE bt.billtoid IS NOT NULL
),
-- SERVICE SETUP: Service instructions/notes
PestPacServiceSetups AS (
  SELECT
    CAST(ss.locationid AS STRING) as location_id,
    ss.comment as setup_comment,
    ss.excessmessage as setup_excessmessage
  FROM `bidata-sharedus-production.S0.pestpac_ServiceSetups` ss
  WHERE ss.locationid IS NOT NULL
),
-- BRANCHES: For address fallback
Branches AS (
  SELECT
    b.Current_State_Branch_Code as branch_code,
    b.City,
    b.State
  FROM `bidata-sharedus-production.S2.VwUnf_Branch` b
),
-- EMPLOYEE/SUPERVISOR: Get ops manager from technician's supervisor
TMXEmployees AS (
  SELECT
    CAST(e.Employee_Number AS STRING) as employee_number,
    COALESCE(e.Supervisor_Name, '') as supervisor_name,
    COALESCE(CAST(e.Supervisor_ID AS STRING), '') as supervisor_id
  FROM `bidata-sharedus-production.S0_TMX.Employees_Main` e
  WHERE e.Employee_Number IS NOT NULL
)
SELECT
  CAST(agg.salesID AS STRING) as id,
  CAST(agg.pestPacId AS STRING) as pestPacId,
  FORMAT_DATE('%Y-%m-%d', agg.sell_date) as soldDate,
  COALESCE(agg.customer_name, 'Customer') as accountName,

  -- Service address: Service location → Billing location → Branch fallback
  COALESCE(
    -- 1. Service location full address
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
    -- 2. Billing location full address
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
    -- 3. Branch city + state
    CASE WHEN b.City IS NOT NULL AND b.State IS NOT NULL THEN CONCAT(b.City, ', ', b.State) ELSE NULL END,
    -- 4. Branch code (final fallback)
    CONCAT(COALESCE(agg.assigned_branch_code, 'Unknown'), ' Branch')
  ) as serviceAddress,

  COALESCE(agg.sales_person_nm, 'Unknown') as salesPerson,
  agg.totalInitialValue as initialJobPrice,
  agg.totalContractValue as contractValue,
  agg.serviceTypes as serviceType,
  agg.serviceTypes as serviceTypeName,
  COALESCE(agg.productGroups, '') as productGroup,

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

  -- Operations fields
  -- Convert supervisor name from "LAST, FIRST" to "First Last"
  CASE
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
        TRIM(SPLIT(agg.techName, ',')[SAFE_OFFSET(1)]),
        ' ',
        TRIM(SPLIT(agg.techName, ',')[SAFE_OFFSET(0)])
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

  -- Equipment details (cleaned from service instructions)
  TRIM(
    SPLIT(
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
LEFT JOIN PestPacServiceLocations sl ON agg.locationId = sl.location_id
LEFT JOIN PestPacBillTos bt ON agg.billToId = bt.billto_id
LEFT JOIN PestPacServiceSetups psetup ON agg.locationId = psetup.location_id
LEFT JOIN Branches b ON agg.assigned_branch_code = b.branch_code
LEFT JOIN TMXEmployees emp ON agg.techEmployeeNum = emp.employee_number

ORDER BY agg.sell_date DESC
LIMIT @limit
```

**Parameters**:
```javascript
{
  salesPerson: 'Cody Lytle',
  daysBack: 60,
  limit: 200
}
```

---

## Environment Variables

### Required Environment Variables

```bash
# BigQuery Configuration
BIGQUERY_ENVIRONMENT=production  # production | staging | dev
# Auto-maps to:
#   production → bidata-sharedus-production
#   staging → bidata-sharedus-staging
#   dev → bidata-sharedus-dev

# Optional: Override project ID
# GOOGLE_CLOUD_PROJECT=bidata-sharedus-production

# BigQuery location (default: US)
BIGQUERY_LOCATION=US

# Request timeout in milliseconds
BIGQUERY_TIMEOUT=30000

# Authentication: Service account key file path
# For local dev: use `gcloud auth application-default login` instead
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Google Sheets API Configuration
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_SHEETS_SALES_TRACKER_ID=your-sales-tracker-sheet-id
GOOGLE_SHEETS_NEW_START_LOG_ID=your-new-start-log-sheet-id
```

---

## Code Examples

### Example 1: Node.js Script to Pull Sales Tracker Data

```javascript
const { BigQuery } = require('@google-cloud/bigquery')
const { google } = require('googleapis')

// Initialize BigQuery
const bigquery = new BigQuery({
  projectId: 'bidata-sharedus-production',
  keyFilename: './service-account-key.json',
})

// Initialize Google Sheets
const auth = new google.auth.GoogleAuth({
  keyFile: './service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

async function getSalesTrackerMonthlyTotals(salesPerson, year, month) {
  const query = `
    WITH monthly_sales AS (
      SELECT
        product_group,
        service_type_desc,
        contract_value,
        job_ini_value,
        job_non_ini_value,
        started_ind,
        sell_date
      FROM \`bidata-sharedus-production.BCG_RTD_DB.DR_ContractSales\`
      WHERE EXTRACT(YEAR FROM sell_date) = @year
        AND EXTRACT(MONTH FROM sell_date) = @month
        AND (
          (
            LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(0)]), '%')
            AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(1)]), '%')
          )
          OR LOWER(sales_person_nm) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        )
    )
    SELECT
      @month as month,
      @year as year,
      COALESCE(SUM(CASE WHEN product_group IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value END), 0) as proposalTermite,
      COALESCE(SUM(CASE WHEN service_type_desc LIKE '%Contract%' AND product_group NOT IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value END), 0) as proposalContract,
      COALESCE(SUM(CASE WHEN service_type_desc LIKE '%Job%' OR service_type_desc LIKE '%Initial%' THEN (COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0)) END), 0) as proposalJobWork,
      COUNT(*) as totalProposalsCount,
      COALESCE(SUM(CASE WHEN started_ind = 'Y' AND product_group IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value END), 0) as salesTermite,
      COALESCE(SUM(CASE WHEN started_ind = 'Y' AND service_type_desc LIKE '%Contract%' AND product_group NOT IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value END), 0) as salesContract,
      COALESCE(SUM(CASE WHEN started_ind = 'Y' AND (service_type_desc LIKE '%Job%' OR service_type_desc LIKE '%Initial%') THEN (COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0)) END), 0) as salesJobWork,
      COUNT(CASE WHEN started_ind = 'Y' THEN 1 END) as totalStartedSalesCount
    FROM monthly_sales
  `

  const options = {
    query: query,
    location: 'US',
    params: {
      salesPerson: salesPerson,
      year: year,
      month: month,
    },
  }

  const [job] = await bigquery.createQueryJob(options)
  const [rows] = await job.getQueryResults()

  return rows[0] || null
}

async function writeSalesTrackerToSheets(data, sheetId) {
  const range = 'Sales Tracker!A2:Z2' // Adjust range as needed
  const values = [
    [
      data.month,
      data.year,
      data.proposalTermite,
      data.proposalContract,
      data.proposalJobWork,
      data.totalProposalsCount,
      data.salesTermite,
      data.salesContract,
      data.salesJobWork,
      data.totalStartedSalesCount,
    ],
  ]

  const resource = {
    values,
  }

  const result = await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource,
  })

  console.log(`${result.data.updatedCells} cells updated.`)
  return result
}

// Example usage
async function main() {
  const salesPerson = 'Cody Lytle'
  const year = 2026
  const month = 1

  console.log(`Fetching Sales Tracker data for ${salesPerson} (${year}-${month})...`)
  const data = await getSalesTrackerMonthlyTotals(salesPerson, year, month)

  if (data) {
    console.log('Data fetched:', data)
    const sheetId = process.env.GOOGLE_SHEETS_SALES_TRACKER_ID
    await writeSalesTrackerToSheets(data, sheetId)
    console.log('Data written to Google Sheets successfully!')
  } else {
    console.log('No data found for this month.')
  }
}

main().catch(console.error)
```

---

### Example 2: Python Script to Pull New Start Log Data

```python
from google.cloud import bigquery
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os

# Initialize BigQuery client
credentials = service_account.Credentials.from_service_account_file(
    'service-account-key.json'
)
bigquery_client = bigquery.Client(
    project='bidata-sharedus-production',
    credentials=credentials
)

# Initialize Google Sheets client
sheets_service = build('sheets', 'v4', credentials=credentials)

def get_new_start_entries(sales_person, days_back=60):
    query = """
    WITH AggregatedContracts AS (
      SELECT
        customer_name,
        sell_date,
        sales_person_nm,
        assigned_branch_code,
        MIN(sales_id) as salesID,
        MIN(COALESCE(location_id, bill_to_id)) as pestPacId,
        MIN(tech_onsite_employee_nm) as techName,
        SUM(COALESCE(contract_value, 0)) as totalContractValue,
        SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as totalInitialValue,
        STRING_AGG(DISTINCT COALESCE(product_group, 'Unknown'), ', ') as productGroups,
        MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as hasStarted,
        MAX(start_date) as start_date
      FROM `bidata-sharedus-production.BCG_RTD_DB.DR_ContractSales`
      WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days_back DAY)
        AND LOWER(sales_person_nm) LIKE LOWER(CONCAT('%', @sales_person, '%'))
      GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code
    )
    SELECT
      CAST(salesID AS STRING) as id,
      FORMAT_DATE('%Y-%m-%d', sell_date) as soldDate,
      customer_name as accountName,
      sales_person_nm as salesPerson,
      totalInitialValue as initialJobPrice,
      totalContractValue as contractValue,
      productGroups as productGroup,
      CASE WHEN hasStarted = 1 THEN 'completed' ELSE 'pending_ops' END as status,
      FORMAT_DATE('%Y-%m-%d', start_date) as startDate,
      techName as assignedSpecialist
    FROM AggregatedContracts
    ORDER BY sell_date DESC
    LIMIT 200
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter('sales_person', 'STRING', sales_person),
            bigquery.ScalarQueryParameter('days_back', 'INT64', days_back),
        ]
    )

    query_job = bigquery_client.query(query, job_config=job_config)
    results = query_job.result()

    rows = []
    for row in results:
        rows.append(dict(row))

    return rows

def write_new_starts_to_sheets(data, sheet_id):
    range_name = 'New Start Log!A2:Z'  # Adjust as needed

    # Convert data to 2D array for Sheets API
    values = []
    for row in data:
        values.append([
            row.get('id', ''),
            row.get('soldDate', ''),
            row.get('accountName', ''),
            row.get('salesPerson', ''),
            row.get('initialJobPrice', 0),
            row.get('contractValue', 0),
            row.get('productGroup', ''),
            row.get('status', ''),
            row.get('startDate', ''),
            row.get('assignedSpecialist', ''),
        ])

    body = {
        'values': values
    }

    result = sheets_service.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=range_name,
        valueInputOption='USER_ENTERED',
        body=body
    ).execute()

    print(f"{result.get('updatedCells')} cells updated.")
    return result

# Example usage
if __name__ == '__main__':
    sales_person = 'Cody Lytle'
    days_back = 60

    print(f'Fetching New Start Log data for {sales_person} (last {days_back} days)...')
    data = get_new_start_entries(sales_person, days_back)

    if data:
        print(f'Fetched {len(data)} new start entries')
        sheet_id = os.environ.get('GOOGLE_SHEETS_NEW_START_LOG_ID')
        write_new_starts_to_sheets(data, sheet_id)
        print('Data written to Google Sheets successfully!')
    else:
        print('No new start entries found.')
```

---

## Data Transformation Logic

### Name Format Conversion

The sales person name appears in different formats across systems:
- **BigQuery (DR_ContractSales)**: "LAST, FIRST" (e.g., "LYTLE, CODY")
- **UI/Sheets**: "First Last" (e.g., "Cody Lytle")

**Conversion Logic**:

```javascript
function convertNameFormat(salesPersonNm) {
  if (salesPersonNm.includes(',')) {
    const parts = salesPersonNm.split(',').map(p => p.trim())
    return `${parts[1]} ${parts[0]}` // "LAST, FIRST" → "First Last"
  }
  return salesPersonNm
}

// SQL conversion (use in SELECT clause)
const sqlConversion = `
CASE
  WHEN sales_person_nm LIKE '%,%' THEN
    CONCAT(
      TRIM(SPLIT(sales_person_nm, ',')[SAFE_OFFSET(1)]),  -- First name
      ' ',
      TRIM(SPLIT(sales_person_nm, ',')[SAFE_OFFSET(0)])   -- Last name
    )
  ELSE COALESCE(sales_person_nm, 'Unknown')
END as salesPersonName
`
```

### Product Group Mapping

Map product group codes to friendly names:

```javascript
const PRODUCT_GROUP_MAP = {
  'P': 'Pest Control',
  'PEST': 'Pest Control',
  'PC': 'Pest Control',
  'T': 'Termite',
  'TERM': 'Termite',
  'WD': 'Termite',
  'W': 'Wildlife',
  'WILD': 'Wildlife',
  'WL': 'Wildlife',
  'M': 'Mosquito',
  'MOSQ': 'Mosquito',
  'MQ': 'Mosquito',
  'B': 'Bed Bug',
  'BEDB': 'Bed Bug',
  'BB': 'Bed Bug',
  'L': 'Lawn Care',
  'LAWN': 'Lawn Care',
  'LN': 'Lawn Care',
  'I': 'Insulation',
  'INS': 'Insulation',
  'INL': 'Insulation',
}

function mapProductGroup(productGroup) {
  if (!productGroup) return 'Other'

  // Handle comma-separated multiple products
  if (productGroup.includes(',')) {
    const products = productGroup.split(',').map(p => p.trim())
    return products.map(p => PRODUCT_GROUP_MAP[p] || p).join(', ')
  }

  return PRODUCT_GROUP_MAP[productGroup] || productGroup
}
```

### Status Derivation

Convert BigQuery flags to user-friendly status:

```javascript
function deriveStatus(row) {
  if (row.started_ind === 'Y') {
    return 'completed'
  }
  if (row.start_date && new Date(row.start_date) <= new Date()) {
    return 'in_progress'
  }
  if (row.start_date) {
    return 'confirmed'
  }
  const daysSinceSold = Math.floor((new Date() - new Date(row.sell_date)) / (1000 * 60 * 60 * 24))
  if (daysSinceSold > 7) {
    return 'scheduled'
  }
  return 'pending_ops'
}
```

---

## Error Handling

### BigQuery Error Handling

```javascript
async function safeBigQueryQuery(query, params) {
  try {
    const [job] = await bigquery.createQueryJob({
      query: query,
      location: 'US',
      params: params,
    })

    const [rows] = await job.getQueryResults()
    return { success: true, data: rows }
  } catch (error) {
    console.error('BigQuery error:', error)

    // Check for common errors
    if (error.message.includes('Not found: Table')) {
      return { success: false, error: 'Table not found', code: 'TABLE_NOT_FOUND' }
    }

    if (error.message.includes('Permission denied')) {
      return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' }
    }

    if (error.message.includes('Syntax error')) {
      return { success: false, error: 'SQL syntax error', code: 'SYNTAX_ERROR' }
    }

    return { success: false, error: error.message, code: 'UNKNOWN' }
  }
}
```

### Google Sheets Error Handling

```javascript
async function safeSheetWrite(sheetId, range, values) {
  try {
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    })

    return { success: true, updatedCells: result.data.updatedCells }
  } catch (error) {
    console.error('Google Sheets error:', error)

    if (error.message.includes('not found')) {
      return { success: false, error: 'Sheet not found', code: 'SHEET_NOT_FOUND' }
    }

    if (error.message.includes('permission')) {
      return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' }
    }

    return { success: false, error: error.message, code: 'UNKNOWN' }
  }
}
```

---

## Additional Notes

### Performance Optimization

1. **Use GROUP BY to Consolidate Rows**: DR_ContractSales has multiple rows per sale (one per product). Always GROUP BY to avoid duplicates.

2. **Limit Query Results**: Use `LIMIT` clause to avoid pulling too much data.

3. **Cache Results**: For monthly totals, cache results per month to avoid re-querying.

4. **Use Parameterized Queries**: Prevents SQL injection and enables query plan caching.

### Sales Person Name Matching

The query uses flexible name matching to handle different input formats:

```sql
-- Matches "Cody Lytle", "LYTLE, CODY", "cody lytle", etc.
AND (
  (
    LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(0)]), '%')
    AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ' ')[SAFE_OFFSET(1)]), '%')
  )
  OR (
    LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ', ')[SAFE_OFFSET(0)]), '%')
    AND LOWER(sales_person_nm) LIKE CONCAT('%', LOWER(SPLIT(@salesPerson, ', ')[SAFE_OFFSET(1)]), '%')
  )
  OR LOWER(sales_person_nm) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
)
```

### Data Freshness

- **DR_ContractSales**: Updated nightly (ETL runs overnight)
- **Raw_RTXSF_***: Updated daily (Salesforce sync)
- **pestpac_***: Updated nightly (PestPac ETL)

---

## Contact & Support

For questions or issues:
- **BigQuery Access**: Contact IT > Data Platform team
- **Service Account Setup**: Contact GCP Admin
- **Data Issues**: Check `#data-quality` Slack channel
- **API Issues**: Review BigQuery quotas and limits

---

**Document Version**: 1.0
**Last Updated**: 2026-01-28
**Author**: Claude (Rentokil-BI System Documentation)
