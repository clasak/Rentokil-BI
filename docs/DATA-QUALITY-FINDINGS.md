# Data Quality Findings - Cross-Functional Dashboard

**Investigation Date:** January 2026
**Issue:** Cross-functional dashboard health scores showing unexpectedly low values (0-29%)

---

## Root Cause Analysis

The low health scores are caused by **business logic assumptions** in the KPI calculations that don't match the actual data patterns in BigQuery, not data quality issues per se.

---

## Diagnostic Query Results

A diagnostic query (`data-quality-diagnostics`) was added to investigate the actual data distribution.

### 1. Inspections Status Distribution (Last 30 Days)

| Status | Count | Percentage | KPI Treatment |
|--------|-------|------------|---------------|
| PROPOSED | 35,842 | 64.1% | Not counted as complete |
| SOLD | 12,410 | 22.2% | Counted as complete |
| OPEN | 3,621 | 6.5% | Not counted as complete |
| COMPLETED | 2,615 | 4.7% | Counted as complete |
| ESIGN | 1,432 | 2.6% | Not counted as complete |

**Finding:** Only ~27% of inspections have "complete" statuses (SOLD + COMPLETED). The majority (64%) are in PROPOSED status, which is a valid workflow state but not counted toward operational efficiency.

**Impact:** Operations health shows ~27% instead of expected 75%+

### 2. Employee Termination Patterns

| Pattern | Count | Percentage | KPI Treatment |
|---------|-------|------------|---------------|
| Past Termination | 79,961 | 65.5% | Reduces retention rate |
| No Termination Date | 42,026 | 34.5% | Counted as active |

**Finding:** 65.5% of employees in the `tmx_employee` table have termination dates in the past. This includes historical employee records.

**Impact:** Raw retention calculations show only ~35% if not filtered properly

**Fix Applied:** Updated query to only count terminations within the analysis period (last N days) and filter by `curr_ind = 'Y'`

### 3. Contracts StartedInd Distribution

| StartedInd | Count | Percentage | KPI Treatment |
|------------|-------|------------|---------------|
| N | 877 | 98.7% | Not counted as started |
| Y | 12 | 1.3% | Counted as started |

**Finding:** 98.7% of contracts have `StartedInd = 'N'`. This field may not represent what we expect (e.g., it might indicate service start, not contract signing).

**Impact:** Sales health shows ~1%

### 4. Contracts RawCancelInd Distribution

| RawCancelInd | Count |
|--------------|-------|
| N | 547 |
| Y | 342 |

**Finding:** ~38% cancellation rate in the sample period

---

## Fixes Applied

### 1. Case-Insensitive Status Matching
All status checks now use `UPPER(Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED')` to handle case variations in the source data.

**Files Updated:**
- `src/lib/bigquery/queries/cross-functional.ts`
- `src/lib/bigquery/queries/ops.ts`
- `src/lib/bigquery/queries/workforce.ts`
- `src/lib/bigquery/queries/ae.ts`

### 2. Employee Retention Logic
Updated to only count terminations that occurred within the analysis period:
```sql
COUNT(DISTINCT CASE
  WHEN e.termination_date IS NOT NULL
    AND DATE(e.termination_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
    AND DATE(e.termination_date) <= CURRENT_DATE()
  THEN e.tmx_employee_sid
END) as terminations
```

### 3. Finance Query Replacement
The original finance query used `Reports.VwUnf_dim_ar_detail` which failed with access denied. Replaced with contract-based metrics from `W3_Contract_Checker.T0_unf_Contract_All`.

---

## Recommendations for Further Improvement

### Option 1: Include PROPOSED in Operational Efficiency
If PROPOSED represents inspections that are in progress (not failures), consider including it:
```sql
UPPER(Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED', 'PROPOSED', 'ESIGN')
```
**Result:** Would increase operational efficiency from ~27% to ~94%

### Option 2: Use Different Sales Metrics
Instead of `StartedInd`, consider:
- Contract creation date as success indicator
- `SellDate` presence as success indicator
- Contract value thresholds

### Option 3: Adjust Target Thresholds
If current data patterns are accurate, adjust the health score thresholds:
- Current: 75% = green, 50% = yellow, <50% = red
- Proposed: 25% = green, 15% = yellow, <15% = red

### Option 4: Filter Employee Data
Add date-based filtering to only include recently hired employees:
```sql
WHERE e.hire_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
```

---

## Diagnostic Query Usage

To re-run the diagnostic query:

```typescript
// Via API
POST /api/bigquery/query
{
  "query": "data-quality-diagnostics"
}

// The query is defined in:
// src/lib/bigquery/queries/cross-functional.ts -> getDataQualityDiagnostics()
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/bigquery/queries/cross-functional.ts` | Cross-functional KPI queries |
| `src/app/(dashboard)/cross-functional/page.tsx` | Dashboard page component |
| `src/app/api/bigquery/query/route.ts` | Query API registry |
| `src/hooks/useOrganizationData.ts` | Organization hierarchy with deduplication |

---

## Access Issues Encountered

| Resource | Error | Resolution |
|----------|-------|------------|
| `Reports.VwUnf_dim_ar_detail` | Access denied (references `data-shared-production:ppnw_dbo.BillTos`) | Replaced with contract-based metrics |

---

## Current Health Scores (After Fixes)

| Department | Before Fix | After Fix | Notes |
|------------|------------|-----------|-------|
| Overall | 0% | ~29% | Weighted average |
| Operations | 0% | ~27% | Limited by status distribution |
| HR | 0% | ~35% | Based on active employees |
| Sales | 0% | ~1% | Limited by StartedInd field |
| Finance | 0% | ~1% | Using contract proxy metrics |
| Customer Service | 0% | ~25% | Based on conversion rate |
