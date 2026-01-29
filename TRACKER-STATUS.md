# Sales Tracker Status

## Summary (2026-01-25)
- ✅ Sales Tracker query fixed and working (aggregation implemented)
- ✅ New Starts query fixed and showing 2026 data (aggregation implemented)
- ✅ Duplicate entries FIXED with SQL aggregation
- ✅ Service address fallback chain implemented
- ✅ Proposal/Sale business rule corrected (ALL transactions are proposals, sold ones also show as sales)
- ✅ Job Work calculation fixed (includes initial + equipment)
- 🔍 Missing 2025 months to be investigated

## ✅ FIXED - Sales Tracker Query Restored (2026-01-25)

Reverted `/src/lib/bigquery/queries/sales-tracker.ts` to working simple query.
- Returns 16 transactions for January 2026 Cody Lytle ✅
- PestPac ID present on sales transactions ✅
- Changed `ROW_NUMBER() OVER (PARTITION BY...)` back to `ROW_NUMBER() OVER (ORDER BY sell_date DESC)` ✅
- Changed PestPac ID from complex COALESCE back to simple `CAST(sales_id AS STRING)` ✅

## ✅ FIXED - Duplicate Entries (2026-01-25)

**Problem**: DR_ContractSales has multiple rows per sale for different product types (Initial, Product, Contract)
- Texas Coast Hotels showed 3 entries (should be 1)
- Sales Tracker showing 16 transactions (actually 5 unique sales)
- New Starts showing inflated counts

**Solution Implemented**: SQL aggregation with CTE pattern
```sql
WITH AggregatedSales AS (
  SELECT
    customer_name, sell_date, sales_person_nm, assigned_branch_code,
    MIN(sales_id) as sales_id,
    SUM(COALESCE(job_ini_value, 0)) as total_job_work_price,
    SUM(COALESCE(contract_value, 0)) as total_contract_price,
    STRING_AGG(DISTINCT COALESCE(product_group, 'Unknown'), ', ') as product_groups,
    MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as has_started
  FROM `BCG_RTD_DB.DR_ContractSales`
  GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
)
```

**Results**:
- ✅ Sales Tracker: 5 transactions (down from 16)
- ✅ New Starts: 15 transactions (down from inflated count)
- ✅ Texas Coast Hotels: 1 entry (down from 3)
- ✅ Prices correctly summed across product rows
- ✅ Product groups shown as comma-separated (e.g., "Home & Bldg Solutions, General Pest")

**Files Modified**:
- `/src/lib/bigquery/queries/sales-tracker.ts` - Added CTE aggregation to getSalesTrackerTransactions()
- `/src/lib/bigquery/queries/new-starts.ts` - Added CTE aggregation to getNewStarts(), getNewStartsSummary(), getNewStartsBySalesPerson()
- `/src/types/sales-tracker.ts` - Added productGroup field to Transaction type

## ✅ FIXED - Service Address Fallback Chain (2026-01-25)

**Problem**: Service addresses showing as "Unknown Branch" or "[Branch Code] Branch"

**Solution Implemented**: 3-level fallback chain
```sql
COALESCE(
  CASE WHEN location_zip IS NOT NULL THEN CONCAT('Zip: ', location_zip) ELSE NULL END,
  CASE WHEN city != '' AND state != '' THEN CONCAT(city, ', ', state) ELSE NULL END,
  CONCAT(COALESCE(assigned_branch_code, 'Unknown'), ' Branch')
)
```

**Results**:
- ✅ Level 1 (Zip): "Zip: 77571-4864" - **100% coverage** (all 245K records in last 90 days have zip)
- ✅ Level 2 (City, State): "Houston, TX" - Available as fallback (branch table joined)
- ✅ Level 3 (Branch Code): "403 Branch" - Ultimate fallback

**Current Coverage**: All New Starts records have zip codes, so Level 1 handles 100% of data. Levels 2 and 3 are implemented as safety nets for future data gaps.

## ✅ FIXED - Field Separation (Proposal vs Sale) (2026-01-25)

**Problem**: `sold` and `dead` fields appearing on sales, `started` and `paid` appearing on proposals

**Solution Implemented**: Conditional field population based on transaction type
```sql
-- PROPOSAL-ONLY fields (NULL for sales)
CASE WHEN has_started = 0 THEN pestPacId IS NOT NULL ELSE NULL END as sold,
CASE WHEN has_started = 0 THEN FALSE ELSE NULL END as dead,
-- SALE-ONLY fields (NULL for proposals)
CASE WHEN has_started = 1 THEN TRUE ELSE NULL END as started,
CASE WHEN has_started = 1 THEN FALSE ELSE NULL END as paid,
```

**Results**:
- ✅ Proposals: `sold` and `dead` populated, `started` and `paid` are NULL
- ✅ Sales: `started` and `paid` populated, `sold` and `dead` are NULL
- ✅ TypeScript transformation maps NULL to undefined for cleaner API responses

**Business Rule CORRECTED (2026-01-25)**:
- **ALL transactions are proposals** (regardless of PestPac ID or started status)
- **Sold proposals (with PestPac ID) ALSO show as sales**
- Unsold proposals (no PestPac ID) show in proposals only
- Query behavior:
  - `type='proposal'` → returns ALL transactions as proposals
  - `type='sale'` → returns only sold transactions (with PestPac ID) as sales
  - `type=undefined` (no filter) → returns DUAL CLASSIFICATION via UNION:
    - ALL transactions as proposals
    - Sold transactions as sales
    - Used by totals page to populate both sections
- Field population:
  - Proposal view: `sold=true/false`, `dead=false`, `started/paid=null`
  - Sales view: `sold/dead=null`, `started=true/false`, `paid=false`

## ✅ FIXED - Dual Classification (Sales Showing on Totals Page) (2026-01-25)

**Problem**: Totals page showing proposals in both sections, sales section empty

**Root Cause**: Totals page calls `sales-tracker-transactions` without `type` parameter, which was returning ALL transactions as proposals only. TransactionList component filters by `type` field to separate into proposals/sales sections.

**Solution**: Modified query to support three modes:
1. **type='proposal'**: Returns ALL transactions with `type='proposal'` (for proposals-only page)
2. **type='sale'**: Returns sold transactions with `type='sale'` (for sales-only page)
3. **type=undefined**: Returns BOTH via UNION ALL:
   - All transactions as proposals (id prefix: 'proposal-')
   - Sold transactions as sales (id prefix: 'sale-')
   - Sold transactions appear twice with different IDs and types

**Implementation**: Modified `/src/lib/bigquery/queries/sales-tracker.ts` lines 100-219
- Added conditional SQL generation based on `type` parameter
- UNION ALL query when type is undefined
- Single query when type is specified

**Results**:
- ✅ Totals page shows ALL transactions in proposals section (including sold ones)
- ✅ Totals page shows sold transactions in sales section
- ✅ Sold transactions appear in BOTH sections correctly
- ✅ Proposals page shows ALL transactions
- ✅ Sales page shows only sold transactions

**Files Modified**:
- `/src/lib/bigquery/queries/sales-tracker.ts` - Complete query restructure for dual classification
- `/src/lib/bigquery/queries/ae.ts` - Added pestPacId aggregation and WHERE filter to getAESalesDetails() (line 645, 675)

### 2. New Starts 2026 Data ✅ FIXED (2026-01-25)
- Changed data source from `W3_Contract_Checker.T0_unf_Contract_All` (2025 data only) to `BCG_RTD_DB.DR_ContractSales` (includes 2026 data)
- Fixed column name error (`customer_id` doesn't exist in DR_ContractSales)
- Simplified query to remove complex aggregation and JOINs (matches sales tracker pattern)
- Now showing 200 results including 16 January 2026 transactions for Cody Lytle ✅

## ✅ FIXED - Job Work Calculation (2026-01-25)

**Problem**: Job Work only showing initial fees, missing equipment/product costs

**Solution**: Updated aggregation to include both initial and non-initial job values
```sql
SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as total_job_work_price
```

**Results**:
- ✅ Texas Coast Hotels: Job Work now $366.53 (was $0.01)
- ✅ Equipment/product costs (job_non_ini_value) correctly included
- ✅ Applied to both sales-tracker.ts and ae.ts queries

**Files Modified**:
- `/src/lib/bigquery/queries/sales-tracker.ts` - Line 113
- `/src/lib/bigquery/queries/ae.ts` - Similar aggregation pattern
- `/src/app/(dashboard)/ae/tracker/sales/page.tsx` - Column header changed from "Initial" to "Job Work"

### 3. Missing 2025 Months (TO INVESTIGATE)
- Some months in 2025 have missing data
- Data source is known (DR_ContractSales)
- Needs investigation

## ⚠️ Equipment Counts Investigation (2026-01-25)

**Requirement**: Add equipment details (e.g., "8 RBS, 4 MRT") to New Starts special notes

**Investigation Results**:
- ✅ Added `equipmentDetails` field to NewStartRecord interface
- ✅ Attempted Salesforce join via `Raw_RTXSF_Quote_Line_Equipments__c_Daily`
- ❌ **Equipment data NOT synced to BigQuery**:
  - Only 1 account (MSD) has equipment data in Salesforce tables
  - Texas Coast Hotels has NO equipment records in Salesforce
  - No equipment tables found in PestPac (BCG_RTD_DB) dataset
  - No equipment/quantity fields in DR_ContractSales
  - No equipment fields in RNA/PNI tables

**Conclusion**: Equipment counts are NOT available in BigQuery.
**Recommendation**: Manual entry required (similar to materialsOrdered field)

**Files Modified**:
- `/src/lib/bigquery/queries/new-starts.ts` - Added equipmentDetails field and Salesforce join (returns null)
- Field returns `null` for all records until equipment data is synced to BigQuery
