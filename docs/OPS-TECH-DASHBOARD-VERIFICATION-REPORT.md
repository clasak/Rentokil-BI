# Ops/Tech Dashboard Data Verification Report

**Date:** January 24, 2026
**Auditor:** Data Analyst Agent
**Scope:** Part 5 of Comprehensive Data Audit - Operations and Tech Dashboards

---

## Executive Summary

**Overall Status: ⚠️ MIXED - Critical Issues Found**

The Ops/Tech dashboard pages show a mix of appropriate and inappropriate data usage. While operations pages use correct queries, technician-specific pages are using Account Executive (AE) queries that don't reflect actual technician dispatch/ticket data.

Additionally, **BCG work order queries exist but are not registered**, preventing access to the most comprehensive tech operations data.

---

## Page-by-Page Verification

### ✅ CORRECT: Operations Overview (`/ops/page.tsx`)

**Query Used:** `ops-overview`
**Query Location:** `/src/lib/bigquery/queries/ops.ts` → `getOpsOverview()`
**Data Source:** `S0_TMX.Inspections`

**Verification:**
- ✅ Uses inspection data for service completion metrics
- ✅ Calculates completion rate (Complete/Sold vs Total)
- ✅ Calculates conversion rate (Sold vs Completed)
- ✅ Appropriate for operations dashboard showing inspection/service activity

**Query Preview:**
```sql
SELECT
  'Completion Rate' as metric,
  ROUND(SAFE_DIVIDE(completed_inspections, total_inspections) * 100, 2) as value,
  85.0 as target
FROM S0_TMX.Inspections
WHERE DateInspected >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
```

---

### ✅ CORRECT: National Operations (`/ops/national/page.tsx`)

**Query Used:** `ops-national`
**Query Location:** `/src/lib/bigquery/queries/ops.ts` → `getOpsNational()`
**Data Source:** `S0_TMX.Inspections`

**Verification:**
- ✅ Aggregates by region (BillingState)
- ✅ Counts unique branches (BUCode)
- ✅ Counts unique technicians (EmployeeNumber)
- ✅ Calculates stops completed and completion rates
- ✅ Appropriate regional operations metrics

**Query Preview:**
```sql
SELECT
  COALESCE(i.BillingState, 'Unknown') as region,
  COUNT(DISTINCT i.BUCode) as branch_count,
  COUNT(DISTINCT i.EmployeeNumber) as technician_count,
  COUNT(CASE WHEN i.Status = 'Complete' OR i.Status = 'Sold' THEN 1 END) as stops_completed
FROM S0_TMX.Inspections i
WHERE DateInspected >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY i.BillingState
```

---

### ✅ CORRECT: New Starts Queue (`/ops/new-starts/page.tsx`)

**Query Used:** `new-starts`
**Query Location:** `/src/lib/bigquery/queries/new-starts.ts` → `getNewStarts()`
**Data Source:** `W3_Contract_Checker.T0_unf_Contract_All`

**Verification:**
- ✅ Pulls from contract data (7.8M rows)
- ✅ Filters by SellDate within timeframe
- ✅ Shows contracts awaiting installation (raw_sale_yn = 'Y')
- ✅ Includes AE-provided fields (soldDate, accountName, salesPerson) - READ-ONLY red zone ✅
- ✅ Allows Ops Manager to add yellow zone fields (operationsManager, assignedSpecialist) ✅
- ✅ Appropriate for New Start Management workflow

**Query Preview:**
```sql
SELECT
  CAST(ContractNumber AS STRING) as id,
  FORMAT_DATE('%Y-%m-%d', DATE(SellDate)) as soldDate,
  COALESCE(CustomerName, 'Unknown') as accountName,
  COALESCE(Branch, 'Unknown') as branchCode,
  COALESCE(SalesPerson, 'Unknown') as salesPerson,
  COALESCE(InitialJobPrice, 0) as initialJobPrice
FROM W3_Contract_Checker.T0_unf_Contract_All
WHERE SellDate IS NOT NULL
  AND raw_sale_yn = 'Y'
ORDER BY SellDate DESC
```

**Red/Yellow Zone Compliance:** ✅ CORRECT
- Red zone (AE fields) comes from BigQuery - read-only
- Yellow zone (Ops fields) stored in localStorage - editable by OM

---

### ⚠️ ISSUE: Tech Dispatch (`/tech/page.tsx`)

**Query Used:** `tech-dispatch`
**Query Location:** `/src/lib/bigquery/queries/ae.ts` → `getTechDispatch()`
**Data Source:** `S0_TMX.Inspections` (using AE query pattern)

**Problems:**
1. ❌ Query located in **AE (Account Executive) module**, not tech-specific module
2. ❌ Uses generic Inspections table without technician-specific context
3. ❌ Missing employee name lookup (returns `EmployeeNumber` as `technician_name`)
4. ❌ Hardcodes 0 for `total_hours` and `avg_time_per_stop`
5. ❌ Does NOT use BCG_RTD_DB.DR_TechWorkOrders which has proper tech dispatch data

**Current Query Preview:**
```sql
SELECT
  FORMAT_DATE('%Y-%m-%d', DATE(i.DateInspected)) as dispatch_date,
  COALESCE(i.EmployeeNumber, 'Unknown') as technician_id,
  COALESCE(i.EmployeeNumber, 'Unknown') as technician_name,  -- ❌ Wrong: should be actual name
  COALESCE(i.BUCode, 'Unknown') as branch,
  COUNT(*) as stops_scheduled,
  0 as total_hours,  -- ❌ Hardcoded
  0 as avg_time_per_stop  -- ❌ Hardcoded
FROM S0_TMX.Inspections i
```

**Recommendation:**
- Move query to `/src/lib/bigquery/queries/tech.ts` (new file)
- JOIN with `S0_TMX.Employees_Main` for actual technician names
- Consider enhancing with BCG_RTD_DB.DR_TechWorkOrders for work order metrics

---

### ⚠️ ISSUE: Tech Tickets (`/tech/tickets/page.tsx`)

**Query Used:** `tech-tickets`
**Query Location:** `/src/lib/bigquery/queries/ae.ts` → `getTechTickets()`
**Data Source:** `S0_TMX.Inspections` (proxy for tickets)

**Problems:**
1. ❌ Query located in **AE (Account Executive) module**, not tech-specific module
2. ❌ Uses Inspections as "proxy" for service tickets (not actual ticket data)
3. ❌ Returns `CustomerNumber` as `customer_name` (should be actual customer name)
4. ❌ Issue type is always 'Inspection' (not real ticket types like 'callback', 'complaint')
5. ❌ Priority logic is oversimplified (Pending = High, else Normal)
6. ❌ Does NOT use BCG_RTD_DB.DR_TechWorkOrders or any actual ticket tracking system

**Current Query Preview:**
```sql
SELECT
  CAST(i.InspectionId AS STRING) as ticket_id,
  COALESCE(i.CustomerNumber, 'Unknown') as customer_name,  -- ❌ Wrong: numeric ID, not name
  'Inspection' as issue_type,  -- ❌ Always 'Inspection', not real ticket types
  CASE i.Status
    WHEN 'Pending' THEN 'High'
    ELSE 'Normal'
  END as priority,  -- ❌ Oversimplified
  CASE
    WHEN i.Status = 'Complete' OR i.Status = 'Sold' THEN 'Closed'
    ELSE 'Open'
  END as status
FROM S0_TMX.Inspections i
```

**Recommendation:**
- Create proper `getTechTickets()` in `/src/lib/bigquery/queries/tech.ts`
- Query actual service ticket/work order system
- Consider BCG_RTD_DB.DR_TechWorkOrders or create view in TMX for real tickets

---

### ⚠️ PARTIALLY CORRECT: Tech Productivity (`/workforce/tech-productivity/page.tsx`)

**Query Used:** `tech-productivity`
**Query Location:** `/src/lib/bigquery/queries/workforce.ts` → `getTechProductivity()`
**Data Source:** `S0_TMX.Inspections` JOIN `S0_TMX.Employees_Main`

**What's CORRECT:**
- ✅ Uses Inspections table for actual service activity
- ✅ JOINs with Employees_Main for real employee names (First_Name, Last_Name)
- ✅ Calculates work_days, stops_completed, stops_per_day
- ✅ Filters by job title to find technicians
- ✅ Ranks technicians by efficiency

**What's MISSING:**
- ❌ Does NOT use BCG_RTD_DB.DR_TechWorkOrders (596M row dataset with comprehensive work order data)
- ❌ Missing revenue data (hardcoded to 0)
- ❌ Missing actual hours worked (hardcoded to 0)
- ❌ Missing callback tracking
- ⚠️ BCG query `getBCGTechWorkOrders()` EXISTS but is NOT REGISTERED in API

**Current Query Preview:**
```sql
SELECT
  CAST(i.EmployeeNumber AS STRING) as technician_id,
  COALESCE(e.First_Name, '') as first_name,
  COALESCE(e.Last_Name, '') as last_name,
  TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as technician_name,
  COUNT(DISTINCT DATE(i.DateInspected)) as work_days,
  COUNT(CASE WHEN i.Status = 'Complete' OR i.Status = 'Sold' THEN 1 END) as stops_completed,
  0 as total_hours,  -- ❌ Hardcoded
  0 as revenue_generated,  -- ❌ Hardcoded
  0 as callbacks  -- ❌ Hardcoded
FROM S0_TMX.Inspections i
LEFT JOIN S0_TMX.Employees_Main e
  ON CAST(i.EmployeeNumber AS STRING) = CAST(e.Employee_Number AS STRING)
```

**BCG Enhancement Available (NOT USED):**
```sql
-- FROM bcg-analytics.ts (getBCGTechWorkOrders) - EXISTS BUT NOT REGISTERED
SELECT
  technician_id,
  technician_name,
  branch,
  COUNT(*) as total_work_orders,
  COUNTIF(status = 'Completed') as completed_count,
  SUM(revenue) as total_revenue,  -- ✅ Real revenue data
  COUNT(*) / COUNT(DISTINCT DATE(work_date)) as avg_stops_per_day
FROM BCG_RTD_DB.DR_TechWorkOrders
```

**Recommendation:**
- Register `getBCGTechWorkOrders` in query API
- Create enhanced query that combines TMX employee data with BCG work order metrics
- Or create new query name like `tech-productivity-enhanced`

---

## Critical Discovery: BCG Queries Exist But Are NOT Registered

### Available BCG Queries (UNREGISTERED)

The following queries exist in `/src/lib/bigquery/queries/bcg-analytics.ts` but are **NOT in the query registry**:

1. **`getBCGWorkOrders()`**
   - Table: `BCG_RTD_DB.DR_WorkOrders`
   - Purpose: Work order completion metrics by branch/market
   - Would enhance: `/ops` dashboard

2. **`getBCGTechWorkOrders()`**
   - Table: `BCG_RTD_DB.DR_TechWorkOrders`
   - Purpose: Technician work order productivity (revenue, completion rate, efficiency)
   - Would enhance: `/workforce/tech-productivity` and `/tech` dashboards

3. **Other BCG queries available:**
   - `getBCGTerminations()` - DR_Terminations
   - `getBCGPortfolioDaily()` - DR_PortfolioDaily
   - `getBCGPortfolioMonthly()` - DR_PortfolioMonthly
   - `getBCGPayrollBranch()` - DR_PayrollBranch
   - `getBCGMRLTVSummary()` - DR_MRLTVSummary
   - `getBCGMRLTVConversion()` - DR_MRLTVConversion
   - `getBCGBranchWOCompleted()` - DR_BranchWOCompleted
   - `getBCGWOSupervisor()` - DR_WOSupervisor

**None of these are registered in `/src/app/api/bigquery/query/route.ts`**

---

## Recommendations

### 1. Register BCG Queries (IMMEDIATE)

Add to `/src/app/api/bigquery/query/route.ts`:

```typescript
// BCG Analytics (16 queries) - EXPANDED
'bcg-work-orders': getBCGWorkOrders,
'bcg-tech-work-orders': getBCGTechWorkOrders,
'bcg-terminations': getBCGTerminations,
'bcg-portfolio-daily': getBCGPortfolioDaily,
'bcg-portfolio-monthly': getBCGPortfolioMonthly,
'bcg-payroll-branch': getBCGPayrollBranch,
'bcg-mrltv-summary': getBCGMRLTVSummary,
'bcg-mrltv-conversion': getBCGMRLTVConversion,
'bcg-branch-wo-completed': getBCGBranchWOCompleted,
'bcg-wo-supervisor': getBCGWOSupervisor,
```

### 2. Create Tech-Specific Query Module (RECOMMENDED)

Create `/src/lib/bigquery/queries/tech.ts` with:
- `getTechDispatch()` - Real dispatch data from BCG or enhanced TMX
- `getTechTickets()` - Real ticket data (not inspection proxy)
- `getTechSchedule()` - Daily route/schedule data
- `getTechPerformance()` - Combine TMX + BCG for complete picture

### 3. Enhance Tech Productivity (MEDIUM PRIORITY)

Either:
- **Option A:** Modify `getTechProductivity()` to JOIN BCG data
- **Option B:** Create `tech-productivity-enhanced` query combining both sources
- **Option C:** Use parallel queries (TMX for names, BCG for metrics) and merge in frontend

### 4. Move Tech Queries Out of AE Module (LOW PRIORITY)

- Move `getTechTickets()` and `getTechDispatch()` from `ae.ts` to `tech.ts`
- Update query registry to point to new location
- Maintain backward compatibility if needed

---

## Data Source Summary

| Page | Current Source | Should Use | Status |
|------|----------------|------------|--------|
| `/ops` | S0_TMX.Inspections | S0_TMX.Inspections ✅ + BCG.DR_WorkOrders 🔵 | OK, could enhance |
| `/ops/national` | S0_TMX.Inspections | S0_TMX.Inspections ✅ | ✅ CORRECT |
| `/ops/new-starts` | W3_Contract_Checker | W3_Contract_Checker ✅ | ✅ CORRECT |
| `/tech` (dispatch) | S0_TMX.Inspections (AE query) | BCG.DR_TechWorkOrders 🔴 | ❌ WRONG QUERY |
| `/tech/tickets` | S0_TMX.Inspections (AE query proxy) | BCG.DR_TechWorkOrders 🔴 or Ticket System | ❌ WRONG QUERY |
| `/workforce/tech-productivity` | S0_TMX.Inspections + Employees_Main | TMX ✅ + BCG.DR_TechWorkOrders 🔵 | ⚠️ MISSING BCG |

**Legend:**
- ✅ = Appropriate source, used correctly
- 🔵 = Available but not registered/used
- 🔴 = Better source exists, not used
- ❌ = Using wrong data

---

## Conclusion

**Operations pages (3/3)** use appropriate data for their purpose.

**Technician pages (3/3)** have issues:
1. `/tech` - Wrong query source (AE module)
2. `/tech/tickets` - Wrong query source (AE module) + proxy data
3. `/workforce/tech-productivity` - Missing BCG enhancement

**Root cause:** BCG work order queries exist but aren't registered in the API, preventing the most comprehensive tech operations data from being accessible.

**Impact:** Technician-facing pages show generic inspection data instead of specialized technician dispatch/ticket/productivity metrics.

**Priority:** Register BCG queries ASAP to unlock full operational analytics capability.

---

**Report Generated:** January 24, 2026
**Next Steps:** Implement recommendations 1-3 in priority order
