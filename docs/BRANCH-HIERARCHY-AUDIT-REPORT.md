# Branch/Market/Region Hierarchy Audit Report

**Audit Date:** January 24, 2026
**Focus:** Part 7 of Comprehensive Data Audit - Branch/Market/Region Pages
**Status:** ⚠️ MIXED - Critical data mismatch issues identified

---

## Executive Summary

The audit of Branch/Market/Region hierarchy pages reveals **inconsistent data patterns**. While most pages correctly use BigQuery data, **two critical pages display synthetic/local data instead of live BigQuery metrics**, creating a misleading user experience.

### Pages Audited (10 total)

| Page | BigQuery Status | Data Source | Issue |
|------|----------------|-------------|-------|
| `/branch` (overview) | ✅ CORRECT | `branch-overview` query | None |
| `/branch/daily` | ✅ CORRECT | `branch-daily` query | None |
| `/branch/[code]` (detail) | ❌ INCORRECT | Synthetic WIG data | **Uses hash-based fake metrics** |
| `/market/daily` | ✅ CORRECT | `market-daily` query | None |
| `/region/daily` | ✅ CORRECT | `region-daily` query | None |
| `/region/weekly-wig` | ✅ CORRECT | `wig-region-summary` query | None |
| `/manager/daily-cadence` | ⚠️ PARTIAL | Local form data + BQ summary | **Primary data is localStorage** |
| `/manager/wig-scorecard` | ✅ CORRECT | `wig-branch-metrics` query | None |
| `/ae` (dashboard) | ✅ CORRECT | `ae-tracker` query | None |
| `/ae/tracker/totals` | ✅ CORRECT | `ae-category-breakdown` query | None |

---

## Critical Issues Identified

### Issue #1: Branch Detail Page Uses Synthetic WIG Data

**File:** `/src/app/(dashboard)/branch/[code]/page.tsx`

**Problem:**
The branch detail page displays 9 WIG metrics that are **entirely synthetic**, generated using a deterministic hash function based on the branch code.

**Evidence (Lines 132-149):**
```typescript
// Generate deterministic branch WIG data (seeded, no Math.random)
function generateBranchWigData(branch: Branch, weekStart: string) {
  const seed = parseInt(branch.code.replace(/\D/g, '')) || 1
  const weekSeed = parseInt(weekStart.replace(/-/g, ''))
  const combinedSeed = (seed * 7 + weekSeed) % 10000

  return {
    salesDollarsPerRep: 10000 + (combinedSeed % 10000),    // FAKE
    tapDollarPerTech: 1500 + (combinedSeed % 2000),         // FAKE
    missedStops: combinedSeed % 6,                          // FAKE
    twentyFourHourStart: 25 + (combinedSeed % 21),         // FAKE
    npsScore: 55 + (combinedSeed % 31),                    // FAKE
    pastDueCcmCfr: combinedSeed % 13,                      // FAKE
    techsOver55Hours: combinedSeed % 4,                     // FAKE
    serviceRevPerHour: 70 + (combinedSeed % 31),           // FAKE
    driverScore: 75 + (combinedSeed % 21),                 // FAKE
  }
}
```

**Impact:**
- Branch managers viewing `/branch/[branchCode]` see **fake WIG metrics**
- Metrics appear to be real data but are deterministic calculations
- BigQuery query `branch-detail` IS called but only for basic branch info (name, manager, employee count)
- The 9-metric WIG table showing Sales $/Rep, TAP $/Tech, Missed Stops, etc. is **100% synthetic**

**What SHOULD Happen:**
- Page should use `wig-branch-metrics` query from `wig.ts`
- Metrics should come from BCG_RTD_DB tables (DR_ContractSales, DR_WorkOrders, DR_PayrollBranch)
- Historical trend data should query actual week-over-week metrics, not generate fake 4-week arrays

---

### Issue #2: Manager Daily Cadence Uses Local Data Entry

**File:** `/src/app/(dashboard)/manager/daily-cadence/page.tsx`

**Problem:**
This page is **primarily a data entry form** using localStorage, not a BigQuery analytics dashboard.

**Evidence (Lines 59-81, 131-139):**
```typescript
// Transform BigQuery data
function transformBigQueryData(bqData: unknown[]): CadenceDisplayData {
  // This page primarily uses local data entry, BigQuery integration for summary only
  return EMPTY_CADENCE_DATA
}

useEffect(() => {
  initializeDailySalesData()  // Loads from localStorage
  const allBranches = getBranches()  // Local data
  setBranches(allBranches)
  setIsLoading(false)
}, [])
```

**Impact:**
- The main table showing branch daily metrics (PCCs, INSP PRP, LOBs Sold, Revenue) comes from **local form inputs**
- Data is stored in browser localStorage, NOT synchronized with BigQuery
- BigQuery is only used for the `DataSourceBadge` decoration, not actual metrics
- Branch managers entering data here are NOT writing to the production database

**What SHOULD Happen:**
- If this is a data entry tool, it should:
  - POST to an API endpoint that writes to BigQuery staging tables
  - Display a clear "Local Data Entry" warning
  - Have a "Sync to BigQuery" button
- If this is an analytics dashboard, it should:
  - Use `branch-daily` query to show actual metrics
  - Remove the form input fields
  - Display read-only data from BigQuery

---

## Correctly Implemented Pages

### ✅ Branch Overview (`/branch/page.tsx`)

**Query Used:** `branch-overview` from `/src/lib/bigquery/queries/branch.ts` (lines 296-341)

**SQL Logic:**
```sql
WITH branch_metrics AS (
  SELECT
    bu.branch_code as branch_id,
    bu.branch_name,
    bu.region_name as region,
    bu.division_name as market,
    COUNT(*) as leads_mtd,
    COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales_mtd,
    SAFE_DIVIDE(COUNT(...), COUNT(*)) * 100 as close_rate
  FROM `S0_TMX.tmx_lead` l
  LEFT JOIN `S0_TMX.tmx_business_unit` bu
    ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
  WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY bu.branch_code, bu.branch_name, bu.region_name, bu.division_name
)
SELECT *, ROW_NUMBER() OVER (PARTITION BY region ORDER BY leads_mtd DESC) as rank_in_region
FROM branch_metrics
ORDER BY leads_mtd DESC
```

**Data Displayed:**
- Branch ID, Name, Region, Market
- Revenue MTD (currently hardcoded to 0, could pull from `tmx_lead_activity_fact`)
- Leads MTD (real count from tmx_lead)
- Sales MTD (real count from tmx_lead.sold_date)
- Close Rate (calculated percentage)
- Rank in Region (window function ranking)

**Verdict:** ✅ Correctly uses BigQuery hierarchy and metrics

---

### ✅ Market Daily Rollup (`/market/daily/page.tsx`)

**Query Used:** `market-daily` from `/src/lib/bigquery/queries/branch.ts` (lines 264-290)

**SQL Logic:**
```sql
SELECT
  FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)) as date,
  COALESCE(bu.division_name, 'Unknown') as market,
  COUNT(DISTINCT bu.region_code) as region_count,
  COUNT(DISTINCT bu.branch_code) as branch_count,
  COUNT(*) as leads,
  COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales,
  SAFE_DIVIDE(...) * 100 as close_rate
FROM `S0_TMX.tmx_lead` l
LEFT JOIN `S0_TMX.tmx_business_unit` bu
  ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY date, bu.division_name
ORDER BY date DESC, leads DESC
```

**Data Displayed:**
- Market name (from division_name)
- Region count, Branch count (distinct counts)
- Leads, Sales, Close Rate (real aggregations)

**Additional Features:**
- Uses `useOrganizationData()` hook to populate market selector
- Displays region breakdown with expandable branch details
- Shows performanc charts with real data from BigQuery

**Verdict:** ✅ Correctly aggregates data at market level

---

### ✅ Region Daily Rollup (`/region/daily/page.tsx`)

**Query Used:** `region-daily` from `/src/lib/bigquery/queries/branch.ts` (lines 227-258)

**SQL Logic:**
```sql
SELECT
  FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)) as date,
  COALESCE(bu.region_name, 'Unknown') as region,
  COUNT(DISTINCT bu.branch_code) as branch_count,
  COUNT(*) as leads,
  COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales,
  SAFE_DIVIDE(...) * 100 as close_rate
FROM `S0_TMX.tmx_lead` l
LEFT JOIN `S0_TMX.tmx_business_unit` bu
  ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY date, bu.region_name
ORDER BY date DESC
```

**Data Displayed:**
- Region name
- Branch count
- Leads, Sales, Close Rate
- Branch-level detail table with goal tracking

**Verdict:** ✅ Correctly aggregates data at region level

---

### ✅ Weekly WIG Scorecard (`/region/weekly-wig/page.tsx`)

**Query Used:** `wig-region-summary` from `/src/lib/bigquery/queries/wig.ts` (lines 286-341)

**SQL Logic:**
Combines three queries:
1. `getWIGBranchMetrics` - Branch-level WIG metrics from BCG_RTD_DB
2. `getWIGLaggingMetrics` - Region-level outcome indicators

**Tables Used:**
- `BCG_RTD_DB.DR_ContractSales` - Sales metrics
- `BCG_RTD_DB.DR_BranchWOCompleted` - Work order completion
- `BCG_RTD_DB.DR_PayrollBranch` - Overtime hours
- `BCG_RTD_DB.DR_PortfolioMonthly` - Retention, revenue growth

**Data Displayed:**
- 6 Lagging Metrics (Sales YOY, Revenue Growth, Retention, Profit, Colleague Retention, Safety)
- 11 Branch Metrics per branch (Sales $/Rep, TAP $/Tech, Missed Stops, 24hr Start, NPS, Past Due, >55hrs, Rev/Hr, Driver Score, Fundamentals, RD Meetings)
- Region-level totals and averages

**Verdict:** ✅ Correctly uses BCG production data for WIG metrics

---

### ✅ Manager WIG Scorecard (`/manager/wig-scorecard/page.tsx`)

**Query Used:** `wig-branch-metrics` from `/src/lib/bigquery/queries/wig.ts` (lines 102-201)

**SQL Logic:**
```sql
WITH sales_metrics AS (
  SELECT
    cs.branch_code,
    SAFE_DIVIDE(SUM(cs.contract_value), NULLIF(COUNT(DISTINCT cs.sales_rep_id), 0)) as sales_dollars_per_rep,
    SAFE_DIVIDE(SUM(CASE WHEN LIKE '%TAP%' ...), ...) as tap_dollars_per_tech,
    SAFE_DIVIDE(...) * 100 as twenty_four_hour_start_pct
  FROM `BCG_RTD_DB.DR_ContractSales` cs
  WHERE DATE(cs.sell_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY cs.branch_code, cs.branch_name, cs.region, cs.market
),
work_order_metrics AS (
  SELECT
    wo.branch,
    SUM(wo.scheduled_count) - SUM(wo.completed_count) as missed_stops,
    SAFE_DIVIDE(SUM(wo.revenue), NULLIF(SUM(wo.total_hours), 0)) as service_rev_per_hour
  FROM `BCG_RTD_DB.DR_BranchWOCompleted` wo
  GROUP BY wo.branch
),
payroll_metrics AS (
  SELECT
    pb.branch,
    COUNT(CASE WHEN pb.total_hours > 55 THEN 1 END) as techs_over_55_hours
  FROM `BCG_RTD_DB.DR_PayrollBranch` pb
  GROUP BY pb.branch
)
SELECT ... FROM sales_metrics sm
LEFT JOIN work_order_metrics wom ON sm.branch_code = wom.branch
LEFT JOIN payroll_metrics pm ON sm.branch_code = pm.branch
```

**Data Displayed:**
- Same 11 WIG metrics as weekly scorecard
- Calculated from actual BCG production tables
- Aggregated by branch for manager view

**Verdict:** ✅ Correctly uses BCG WIG data

---

### ✅ AE Dashboard (`/ae/page.tsx`)

**Query Used:** `ae-tracker` from `/src/lib/bigquery/queries/ae.ts` (lines 178-208)

**SQL Logic:**
```sql
SELECT
  CAST(l.curr_assigned_employee_sid AS STRING) as ae_id,
  COUNT(*) as opportunities_created,
  COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as opportunities_won,
  COUNT(CASE WHEN l.cancel_date IS NOT NULL THEN 1 END) as opportunities_lost,
  SAFE_DIVIDE(...) * 100 as win_rate,
  ROUND(AVG(CASE WHEN l.sold_date IS NOT NULL THEN DATE_DIFF(DATE(l.sold_date), DATE(l.received_date), DAY) END), 1) as avg_cycle_days
FROM `S0_TMX.tmx_lead` l
WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY l.curr_assigned_employee_sid
ORDER BY opportunities_won DESC
```

**Data Displayed:**
- MTD Proposals (count of opportunities)
- MTD Sales (count of won opportunities)
- Win Rate (calculated percentage)
- Avg Cycle Days (time from lead to close)
- Pipeline Value (currently 0, could enhance)

**Verdict:** ✅ Correctly uses tmx_lead for AE metrics

---

### ✅ AE Tracker Totals (`/ae/tracker/totals/page.tsx`)

**Query Used:** `ae-category-breakdown` and `ae-monthly-progression` from `/src/lib/bigquery/queries/ae.ts` (lines 298-381)

**SQL Logic (Category Breakdown):**
```sql
SELECT
  CASE
    WHEN ProductGroup IN ('P', 'PEST', 'PC') THEN 'Pest'
    WHEN ProductGroup IN ('T', 'TERM', 'WD') THEN 'Termite'
    ... (maps product codes to categories)
  END as category,
  COALESCE(SUM(ContractValue), 0) as proposalTotal,
  COUNT(*) as proposalCount,
  COALESCE(SUM(CASE WHEN StartedInd = 'Y' THEN ContractValue END), 0) as salesTotal,
  COUNT(CASE WHEN StartedInd = 'Y' THEN 1 END) as salesCount
FROM `W3_Contract_Checker.T0_unf_Contract_All`
WHERE EXTRACT(YEAR FROM SellDate) = 2026
GROUP BY category
ORDER BY salesTotal DESC
```

**SQL Logic (Monthly Progression):**
```sql
SELECT
  FORMAT_DATE('%b', SellDate) as month,
  SellDateYearMonth as yearMonth,
  COUNT(*) as totalProposals,
  COUNT(CASE WHEN StartedInd = 'Y' THEN 1 END) as totalSales,
  COALESCE(SUM(CASE WHEN StartedInd = 'Y' THEN ContractValue END), 0) as totalStartedSales,
  COALESCE(SUM(...), 0) as isq
FROM `W3_Contract_Checker.T0_unf_Contract_All`
WHERE EXTRACT(YEAR FROM SellDate) = 2026
GROUP BY month, yearMonth
ORDER BY yearMonth
```

**Data Displayed:**
- Category Matrix (Proposals vs Sales by service type)
- Monthly Progression Table (Proposals, Sales, Revenue, ISQ by month)
- Annual Goal Tracking (goal is from localStorage)
- YTD Performance Charts

**Verdict:** ✅ Correctly uses Contract_All table for AE totals

---

## Recommendations

### 🚨 CRITICAL: Fix Branch Detail Page

**File:** `/src/app/(dashboard)/branch/[code]/page.tsx`

**Required Changes:**

1. **Remove synthetic WIG data generation** (lines 132-163)
   - Delete `generateBranchWigData()` function
   - Delete `generateHistoricalData()` function
   - Delete `generateBranchInfo()` function

2. **Add BigQuery WIG query integration**
   ```typescript
   const {
     data: wigData,
     isLoading: wigLoading,
   } = useBigQueryData<WIGBranchMetrics, BranchWIGMetrics>({
     queryName: 'wig-branch-metrics',
     filters: { branch: branchCode, daysBack: 7 },
     defaultData: EMPTY_WIG_DATA,
     transformBigQueryData: transformWIGData,
   })
   ```

3. **Add historical WIG query** (for 4-week trend)
   - Create new query function `getWIGBranchHistorical()` in `wig.ts`
   - Query BCG tables for each of the last 4 weeks
   - Return array of weekly WIG snapshots

4. **Update WIG table to use real data**
   - Replace `wigData` state with `wigData` from BigQuery
   - Replace `historicalData` state with query results

**Estimated Effort:** 2-3 hours

---

### ⚠️ MEDIUM: Fix or Clarify Manager Daily Cadence

**File:** `/src/app/(dashboard)/manager/daily-cadence/page.tsx`

**Decision Required:**

**Option A: Convert to Analytics Dashboard (Recommended)**
- Remove all form input fields
- Use `branch-daily` query to display real metrics
- Make table read-only
- Remove localStorage dependency
- Show actual BigQuery data in table

**Option B: Convert to Data Entry Tool**
- Add clear "Local Data Entry" banner
- Implement API endpoint to write to BigQuery staging tables
- Add "Sync to BigQuery" button
- Show both local draft and BigQuery published data
- Warn users that data is not yet in production database

**Current State is Confusing:** Page looks like an analytics dashboard but functions as a form, which misleads users.

**Estimated Effort:** 4-6 hours (either option)

---

### ✅ LOW: Enhance Revenue Fields

**Files:** Multiple (branch.ts queries)

**Current State:**
- Revenue fields are hardcoded to `0` in several queries
- `tmx_lead_activity_fact` table has `raw_sales_amt` column available

**Enhancement:**
```sql
WITH revenue_data AS (
  SELECT
    laf.assigned_bunit_sid,
    SUM(laf.raw_sales_amt) as revenue
  FROM `S0_TMX.tmx_lead_activity_fact` laf
  WHERE DATE(laf.activity_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND laf.raw_sales_amt > 0
  GROUP BY laf.assigned_bunit_sid
)
SELECT
  bu.branch_code,
  COALESCE(rd.revenue, 0) as revenue_mtd
FROM `S0_TMX.tmx_business_unit` bu
LEFT JOIN revenue_data rd ON bu.tmx_business_unit_sid = rd.assigned_bunit_sid
```

**Impact:** Replace `0 as revenue` with actual revenue calculations in:
- `getBranchDaily()` - line 200
- `getRegionDaily()` - line 237
- `getMarketDaily()` - line 275

**Estimated Effort:** 1-2 hours

---

## Data Source Verification

### BigQuery Tables Used (Verified)

| Table | Rows | Purpose | Status |
|-------|------|---------|--------|
| `S4.Dim_Branch_BranchID_NA_T1_Vw` | ~10K | Branch hierarchy | ✅ Used by organization.ts |
| `S0_TMX.tmx_business_unit` | 13K | Branch/Region/Market mapping | ✅ Used correctly |
| `S0_TMX.tmx_lead` | 2.2M | Lead/opportunity data | ✅ Primary source |
| `S0_TMX.tmx_lead_activity_fact` | 7.7M | Activity with revenue | ⚠️ Available but not used |
| `W3_Contract_Checker.T0_unf_Contract_All` | 7.8M | Contract/sales data | ✅ Used for AE totals |
| `BCG_RTD_DB.DR_ContractSales` | Large | Sales metrics | ✅ Used for WIG |
| `BCG_RTD_DB.DR_BranchWOCompleted` | Large | Work orders | ✅ Used for WIG |
| `BCG_RTD_DB.DR_PayrollBranch` | Large | Payroll/overtime | ✅ Used for WIG |
| `BCG_RTD_DB.DR_PortfolioMonthly` | Large | Portfolio metrics | ✅ Used for lagging WIG |

---

## Test Matrix

### Pages to Re-Test After Fixes

| Page | Test Scenario | Expected Result |
|------|---------------|-----------------|
| `/branch/[code]` | Navigate to any branch detail | WIG metrics match BCG data, not synthetic |
| `/branch/[code]` | Check 4-week trend table | Shows actual historical BCG weekly snapshots |
| `/branch/[code]` | Verify Sales $/Rep | Matches `DR_ContractSales` calculation |
| `/manager/daily-cadence` | View page | Either shows read-only BigQuery data OR has clear "Data Entry" label |
| `/market/daily` | Select market | Shows aggregated lead/sales from tmx_lead |
| `/region/daily` | Select region | Shows branch breakdown with real metrics |
| `/branch` | View branch list | Rankings match actual lead volumes |
| `/region/weekly-wig` | Check lagging metrics | Sales YOY, retention match DR_PortfolioMonthly |

---

## Conclusion

**Severity:** 🔴 HIGH

**Impact:** Branch managers viewing branch detail pages are seeing **fake WIG data** instead of actual business metrics. This creates a false sense of performance and undermines trust in the BI platform.

**Immediate Actions Required:**

1. ✅ Fix `/branch/[code]/page.tsx` to use `wig-branch-metrics` query
2. ⚠️ Decide on `/manager/daily-cadence/page.tsx` strategy (analytics vs data entry)
3. ✅ Add revenue calculations to branch/region/market queries

**Timeline:**
- Critical fixes: 1-2 days
- Enhancement (revenue): 2-4 hours
- Testing: 1 day

**Total Effort:** 2-3 days for complete resolution

---

**Report Generated:** January 24, 2026
**Auditor:** Data Analyst Agent
**Next Review:** After fixes are implemented
