# Daily Cadence Page Conversion Report

**Date:** 2026-01-24
**File:** `/src/app/(dashboard)/manager/daily-cadence/page.tsx`
**Status:** ✅ Complete

## Overview

Converted the Manager Daily Cadence page from a local data entry form (localStorage-based) to a proper analytics dashboard using BigQuery data.

## Changes Made

### 1. Removed localStorage Dependencies

**Removed imports:**
- `initializeDailySalesData`
- `getDailyEntries`
- `getBranches`
- `getBranchesByRegion`
- `addDailyEntry`
- `getRegionSummary`
- `getBranchDashboardStats`
- `DEFAULT_DAILY_GOALS`

**Removed types:**
- `Branch`
- `RegionCode`
- `DailySalesMetrics`
- `DailySalesEntry`
- `DailyInput`

**Removed state:**
- `inputs` - Form input state
- `saving` - Save button loading state
- `existingEntries` - LocalStorage entries
- `branches` - Local branch list
- `showTapLeads` - Toggle for TAP leads column

### 2. Added BigQuery Integration

**New imports:**
```typescript
import type { BranchDaily } from '@/lib/bigquery/queries/branch'
```

**New query:**
```typescript
const {
  data: cadenceData,
  isLoading: isBQLoading,
  dataSource,
  responseTime,
  refetch: refetchBQ,
} = useBigQueryData<BranchDaily[], CadenceDisplayData>({
  queryName: 'branch-daily',
  filters: {
    region: selectedRegion,
    daysBack: daysBackFromDate + 1,
  },
  defaultData: EMPTY_CADENCE_DATA,
  transformBigQueryData,
  includeOrgFilters: false,
})
```

**Query filters:**
- `region`: Selected region code
- `daysBack`: Calculated from selected date to today

### 3. Updated Data Types

**Old:** Form-based PCC/TAP/INSP/LOB metrics
**New:** BigQuery lead/sales/close_rate metrics

**New display type:**
```typescript
interface BranchDailyMetrics {
  branch_id: string
  branch_name: string
  leads: number
  sales: number
  close_rate: number
}

interface CadenceDisplayData {
  branches: BranchDailyMetrics[]
  totals: {
    totalLeads: number
    totalSales: number
    avgCloseRate: number
    branchCount: number
  }
}
```

**Transform function:**
```typescript
function transformBigQueryData(bqData: BranchDaily[]): CadenceDisplayData {
  if (!bqData || bqData.length === 0) return EMPTY_CADENCE_DATA

  const branches = bqData.map(row => ({
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    leads: row.leads,
    sales: row.sales,
    close_rate: row.close_rate,
  }))

  const totals = {
    totalLeads: bqData.reduce((sum, b) => sum + b.leads, 0),
    totalSales: bqData.reduce((sum, b) => sum + b.sales, 0),
    avgCloseRate: bqData.reduce((sum, b) => sum + b.close_rate, 0) / bqData.length,
    branchCount: bqData.length,
  }

  return { branches, totals }
}
```

### 4. Updated UI Components

**Header:**
- Changed title from "Daily Sales Cadence" to "Daily Branch Performance"
- Changed description from "Branch Manager daily metrics entry" to "Branch-level daily metrics and performance tracking"
- Made export button disabled when no data available

**Summary Cards (4 cards, was 5):**
| Old Metric | New Metric |
|------------|------------|
| Total PCCs | Branches |
| INSP/PRP | Total Leads |
| LOBs Sold | Total Sales |
| Dollars Sold | Avg Close Rate |
| ~~Goal Attainment~~ | _(removed)_ |

**Date Navigation:**
- Removed "Show TAP Leads" checkbox
- Kept week navigation (Mon-Fri)
- Removed "has data" indicators (green dots)

**Data Table:**
| Old Columns | New Columns |
|-------------|-------------|
| Code, Branch, Manager, # PCCs, TAP Leads, INSP PRP, LOBs PRP, LOBs Sold, Dollars SLD, Next Day, PC/TC, Save | Code, Branch Name, Leads, Sales, Close Rate |

**Table features:**
- Read-only cells (no input fields)
- Color-coded close rates:
  - Green: ≥ 30%
  - Yellow: 20-30%
  - Red: < 20%
- Loading state with spinner
- Empty state message

**Legend:**
- Removed: "Entry saved", "Below 80% goal", "At or above goal"
- Added: Color-coded close rate thresholds
- Updated footer text: "Data refreshes automatically from BigQuery | Close rate = Sales / Leads"

### 5. Removed Functions

**Deleted:**
- `handleInputChange()` - Form input handler
- `handleSaveRow()` - Save to localStorage
- `getGoalStatus()` - Goal attainment calculation
- `formatCurrency()` - Currency formatter (not needed)

**Kept:**
- `formatDate()` - Date formatting utility
- `getWeekDates()` - Week navigation helper
- `handleExportCSV()` - CSV export (updated for new data)

### 6. Updated CSV Export

**Old format:**
```csv
Branch Code,Branch Name,Manager,# PCCs,TAP Leads,INSP PRP,LOBs PRP,LOBs Sold,Dollars Sold,Next Day Conf,PC/TC Conv
```

**New format:**
```csv
Branch Code,Branch Name,Leads,Sales,Close Rate %
```

## BigQuery Query Used

**Query Name:** `branch-daily`
**Source Module:** `/src/lib/bigquery/queries/branch.ts`
**Function:** `getBranchDaily()`

**SQL Source:**
```sql
SELECT
  FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)) as date,
  COALESCE(bu.branch_code, '') as branch_id,
  COALESCE(bu.branch_name, 'Unknown') as branch_name,
  0 as revenue,
  COUNT(*) as leads,
  COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales,
  0 as services_completed,
  0 as callbacks,
  SAFE_DIVIDE(
    COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) * 100,
    NULLIF(COUNT(*), 0)
  ) as close_rate
FROM `bidata-sharedus-production.S0_TMX.tmx_lead` l
LEFT JOIN `bidata-sharedus-production.S0_TMX.tmx_business_unit` bu
  ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
  AND bu.region_name = @region
GROUP BY date, branch_id, branch_name
ORDER BY date DESC, leads DESC
LIMIT 500
```

**Tables:**
- `S0_TMX.tmx_lead` (2.2M rows) - Lead data
- `S0_TMX.tmx_business_unit` (13K rows) - Branch hierarchy

## Metrics Mapping

| Old Metric (localStorage) | New Metric (BigQuery) | Source |
|---------------------------|----------------------|--------|
| PCC In Field | _(not tracked)_ | - |
| TAP Leads | _(not tracked)_ | - |
| INSP PRP | _(not tracked)_ | - |
| LOBs PRP | _(not tracked)_ | - |
| LOBs Sold | _(not tracked)_ | - |
| Dollars Sold | _(not tracked)_ | - |
| Next Day Conf | _(not tracked)_ | - |
| PC/TC Conversions | _(not tracked)_ | - |
| _(new)_ | Leads | `tmx_lead.received_date` count |
| _(new)_ | Sales | `tmx_lead.sold_date` count |
| _(new)_ | Close Rate | Sales / Leads * 100 |

## Functional Changes

### Before (Form Mode)
1. Manager selects region from dropdown
2. Selects date from week picker
3. Manually enters metrics for each branch:
   - PCCs in field
   - TAP leads
   - Inspections prepared
   - LOBs prepared
   - LOBs sold
   - Dollars sold
   - Next day confirmations
   - PC/TC conversions checkbox
4. Clicks save button per row
5. Data saved to browser localStorage
6. Can export to CSV

### After (Analytics Mode)
1. Manager selects region from dropdown
2. Selects date from week picker
3. **Automatically loads BigQuery data** for selected region/date
4. Views read-only branch performance:
   - Branch code/name
   - Leads received
   - Sales closed
   - Close rate percentage
5. Color-coded close rate indicators (green/yellow/red)
6. Can export to CSV
7. Can refresh data with button

## Benefits

1. **Data Accuracy**: Real data from BigQuery instead of manual entry
2. **No Data Loss**: Data isn't stored locally and lost on browser clear
3. **Consistency**: All users see the same data
4. **Real-time**: Data refreshes from production tables
5. **No Manual Entry**: Eliminates human error and data entry time
6. **Role Filtering**: Automatically filters to manager's assigned region (when implemented)

## Known Limitations

1. **Metric Coverage**: Original form tracked 8+ metrics (PCCs, TAP, INSP, LOBs, etc.), but BigQuery only provides 3 (leads, sales, close_rate)
2. **Missing Metrics**: PCC counts, TAP leads, inspections, and LOB metrics are not currently in BigQuery tables
3. **Date Filtering**: Currently filters by `received_date`, not `sold_date` or other activity dates
4. **Revenue**: The `branch-daily` query returns 0 for revenue (not yet connected to financial data)

## Future Enhancements

To restore full metric coverage, consider:

1. **Create new BigQuery query** `manager-daily-cadence` that includes:
   - PCC counts from employee data
   - TAP leads from product/service filters
   - Inspection data from work order tables
   - LOB counts from contract line items
   - Revenue from financial tables

2. **Add to query registry:**
   ```typescript
   'manager-daily-cadence': getManagerDailyCadence
   ```

3. **Update page to use new query** with full metric set

4. **Add trend indicators** (up/down arrows vs previous day/week)

5. **Add goal tracking** from BCG_RTD_DB or other targets table

## Testing Checklist

- [x] Page loads without errors
- [x] Region selector populates from BigQuery organization data
- [x] Date navigation works (week forward/back)
- [x] Data loads when region/date changes
- [x] Loading spinner shows during query
- [x] Empty state shows when no data
- [x] Table displays branch metrics correctly
- [x] Close rate colors display (green/yellow/red)
- [x] DataSourceBadge shows BigQuery status
- [x] Refresh button re-fetches data
- [x] Export CSV works with new format
- [x] Hydration warning resolved (mounted state)
- [x] Dark mode styling works
- [x] Responsive design works on mobile
- [x] Build succeeds with no TypeScript errors

## Files Modified

1. `/src/app/(dashboard)/manager/daily-cadence/page.tsx` - Complete rewrite (640 lines → 335 lines)

## Files NOT Modified

- `/src/lib/daily-sales-data.ts` - Still used by other pages (if any)
- `/src/types/daily-sales-cadence.ts` - Still defined (unused by this page)
- `/src/lib/bigquery/queries/branch.ts` - Used existing query
- `/src/app/api/bigquery/query/route.ts` - Used existing registry entry

## Rollback Plan

If needed, the original localStorage-based version can be restored from git:

```bash
git checkout HEAD~1 -- src/app/\(dashboard\)/manager/daily-cadence/page.tsx
```

## Migration Notes for Other Pages

This pattern can be applied to other form-based pages:

1. **Identify localStorage dependencies** (initializeX, getX, saveX functions)
2. **Find matching BigQuery query** or create new one
3. **Define transform function** to map BQ data to display format
4. **Replace form inputs** with read-only table cells
5. **Remove save handlers** and local state management
6. **Update CSV export** to use transformed data
7. **Add loading/empty states** for better UX
8. **Test with role filtering** if applicable

## Related Documentation

- `/docs/bigquery-integration-status.md` - BigQuery table/page mapping
- `/CLAUDE.md` - BigQuery data pattern guidelines
- `/src/lib/bigquery/queries/README.md` - Query module documentation
