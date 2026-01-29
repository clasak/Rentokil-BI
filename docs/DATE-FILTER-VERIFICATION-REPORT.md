# Date Filter Verification Report

**Date**: 2026-01-24
**Status**: ⚠️ **CRITICAL ISSUE IDENTIFIED**

## Executive Summary

Date filtering is **PARTIALLY BROKEN** across the dashboard. While BigQuery queries support date filtering via the `daysBack` parameter, there is a **critical disconnect** between the Zustand store's `dateRange` filter and the actual query execution.

## Critical Findings

### ❌ Issue 1: Store dateRange Filter is NOT Connected to Queries

**Location**: `/src/store/index.ts`

The Zustand store defines a `dateRange` filter with start/end dates:

```typescript
// Line 101-109
const defaultFilters: GlobalFilters = {
  dateRange: {
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  },
  marketIds: [],
  branchIds: [],
  ownerIds: [],
}

// Line 313-317
setDateRange: (start: Date, end: Date) => {
  set((state) => ({
    filters: { ...state.filters, dateRange: { start, end } },
  }))
},
```

**BUT** this `dateRange` object is **NEVER used** by `useBigQueryData` hook or query functions!

### ❌ Issue 2: useBigQueryData Does NOT Apply dateRange Filter

**Location**: `/src/hooks/useBigQueryData.ts`

The hook merges organization and role filters but **ignores** the global `dateRange` filter:

```typescript
// Line 82-109
const effectiveFilters = useMemo(() => {
  const merged = { ...filters }

  // Add role-based filters ✅
  if (includeRoleFilters && effectiveUser && shouldApplyRoleFilters(effectiveUser.role)) {
    const roleFilters = getRoleBasedFilters(effectiveUser)
    Object.entries(roleFilters).forEach(([key, value]) => {
      if (value !== undefined && merged[key] === undefined) {
        merged[key] = value
      }
    })
  }

  // Add organization hierarchy filters ✅
  if (includeOrgFilters) {
    if (organizationFilters.selectedMarket) {
      merged.market = organizationFilters.selectedMarket
    }
    if (organizationFilters.selectedRegion) {
      merged.region = organizationFilters.selectedRegion
    }
    if (organizationFilters.selectedBranch) {
      merged.branch = organizationFilters.selectedBranch
    }
  }

  // ❌ MISSING: dateRange filter is NEVER added here!

  return merged
}, [filters, organizationFilters, includeOrgFilters, includeRoleFilters, effectiveUser])
```

### ✅ Workaround: Page-Level Date Filtering Works

**Location**: Dashboard pages (41 files use date filtering)

Pages implement **local** date filtering by passing `daysBack` directly to the query:

```typescript
// Example from /src/app/(dashboard)/leads/trends/page.tsx
const [dateRange, setDateRange] = useState('30')  // Local state

const { data } = useBigQueryData({
  queryName: 'lead-trends',
  filters: {
    daysBack: parseInt(dateRange),  // ✅ Passed directly
    market: market !== 'All Markets' ? market : undefined,
  },
  defaultData: EMPTY_LEAD_TRENDS,
  transformBigQueryData: transformBigQueryTrends,
})
```

This works **per-page** but is inconsistent and does NOT use the global filter bar.

### ✅ BigQuery Queries Correctly Implement daysBack

**Location**: `/src/lib/bigquery/queries/*.ts` (19 files, 238 occurrences)

All query functions correctly accept and apply `daysBack`:

```typescript
// Example from leads.ts
export async function getLeadsByPestType(
  options: LeadsQueryOptions = {}
): Promise<LeadsByPestType[]> {
  const { daysBack = 30, market, region } = options  // ✅ Accepts daysBack

  // ✅ Correctly applies to SQL WHERE clause
  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
  if (market) whereClause += ` AND market = @market`
  if (region) whereClause += ` AND region = @region`

  // ... SQL query execution
}
```

### ⚠️ FilterBar Component Has Date Pickers But They're NOT Used

**Location**: `/src/components/rtx/FilterBar.tsx`

The FilterBar component includes date range pickers with callbacks:

```typescript
// Lines 40-54
export interface FilterBarProps {
  startDate?: string
  endDate?: string
  onStartDateChange?: (value: string) => void
  onEndDateChange?: (value: string) => void
  showDateRange?: boolean
  // ...
}

// Lines 180-231: Date picker UI exists with calendar popups
```

**BUT** these callbacks are **RARELY connected** to actual query filters in pages.

## Impact Assessment

### Pages with Working Date Filters (via local state)

- ✅ `/leads/trends` - Local `dateRange` state, passes `daysBack`
- ✅ `/leads/cancels` - Local `dateRange` state, passes `daysBack`
- ✅ `/salti/*` - Hardcoded `daysBack: 30`
- ✅ `/sales/*` - Some pages use hardcoded values

### Pages with BROKEN Date Filters

- ❌ Any page relying on global `filters.dateRange` from store
- ❌ Any FilterBar implementation expecting global date filtering

## Root Cause Analysis

1. **Architectural Mismatch**:
   - Store expects Date objects (`dateRange: { start: Date, end: Date }`)
   - Queries expect integer (`daysBack: number`)
   - No conversion layer exists

2. **Incomplete Implementation**:
   - FilterBar UI exists but callbacks not wired
   - `useBigQueryData` doesn't read `filters.dateRange` from store

3. **Workaround Pattern**:
   - Developers bypassed global filter by using local state
   - This works but creates inconsistency across pages

## Recommended Fixes

### Option 1: Convert dateRange to daysBack (Quick Fix)

**Location**: `/src/hooks/useBigQueryData.ts` (Line 108)

```typescript
// Add organization hierarchy filters
if (includeOrgFilters) {
  if (organizationFilters.selectedMarket) {
    merged.market = organizationFilters.selectedMarket
  }
  if (organizationFilters.selectedRegion) {
    merged.region = organizationFilters.selectedRegion
  }
  if (organizationFilters.selectedBranch) {
    merged.branch = organizationFilters.selectedBranch
  }
}

// ✅ ADD THIS: Convert global dateRange to daysBack
const globalFilters = useAppStore.getState().filters
if (globalFilters.dateRange && !merged.daysBack) {
  const start = globalFilters.dateRange.start
  const end = globalFilters.dateRange.end
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  merged.daysBack = diffDays
}
```

**Pros**: Minimal change, preserves existing query logic
**Cons**: Doesn't support exact start/end dates, only day ranges

### Option 2: Add startDate/endDate to Query Options (Robust Fix)

**Location**: Multiple files

1. Update query interfaces to accept `startDate` and `endDate`:

```typescript
// In /src/lib/bigquery/queries/leads.ts
export interface LeadsQueryOptions {
  daysBack?: number
  startDate?: string  // ✅ Add YYYY-MM-DD
  endDate?: string    // ✅ Add YYYY-MM-DD
  market?: string
  region?: string
  branch?: string
  limit?: number
}
```

2. Update queries to use date range when provided:

```typescript
export async function getLeadsByPestType(
  options: LeadsQueryOptions = {}
): Promise<LeadsByPestType[]> {
  const { daysBack = 30, startDate, endDate, market, region } = options

  // ✅ Use explicit date range if provided, otherwise daysBack
  let whereClause: string
  if (startDate && endDate) {
    whereClause = `DATE(received_date) BETWEEN '${startDate}' AND '${endDate}'`
  } else {
    whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
  }

  if (market) whereClause += ` AND market = @market`
  if (region) whereClause += ` AND region = @region`

  // ... rest of query
}
```

3. Update `useBigQueryData` to pass date filters:

```typescript
// In useBigQueryData hook
const globalFilters = useAppStore.getState().filters
if (globalFilters.dateRange && !merged.startDate && !merged.endDate) {
  merged.startDate = format(globalFilters.dateRange.start, 'yyyy-MM-dd')
  merged.endDate = format(globalFilters.dateRange.end, 'yyyy-MM-dd')
}
```

**Pros**: Full date range support, precise filtering
**Cons**: Requires changes to all 19 query modules

### Option 3: Standardize on daysBack Only (Simplest)

Remove `dateRange` from store entirely, replace with `daysBack`:

```typescript
// In /src/store/index.ts
interface GlobalFilters {
  daysBack: number  // Replace dateRange
  marketIds: string[]
  branchIds: string[]
  ownerIds: string[]
}

const defaultFilters: GlobalFilters = {
  daysBack: 30,  // Default to last 30 days
  marketIds: [],
  branchIds: [],
  ownerIds: [],
}
```

**Pros**: Simplest, matches query API
**Cons**: Less flexible than exact date ranges

## Date Format Verification

✅ **BigQuery queries use correct date format** (`YYYY-MM-DD`):
- `DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)` ✅
- Date comparisons use `DATE()` cast for TIMESTAMP fields ✅

✅ **FilterBar uses correct format** (`yyyy-MM-dd`):
- Uses `date-fns` format/parse ✅
- Calendar component returns Date objects ✅

## Test Coverage Needed

Create integration tests for:

1. **Global date filter propagation**:
   - Set store `dateRange` → verify query receives correct `daysBack` or `startDate/endDate`

2. **Per-page date filter override**:
   - Page passes explicit `daysBack` → should override global filter

3. **FilterBar integration**:
   - Change FilterBar dates → verify data refetch with correct filters

4. **Date range edge cases**:
   - Same-day range
   - 1-year range
   - Invalid ranges (end before start)

## Files Requiring Changes

### High Priority (Option 1 - Quick Fix)
- `/src/hooks/useBigQueryData.ts` - Add dateRange → daysBack conversion

### Medium Priority (Option 2 - Robust Fix)
- `/src/lib/bigquery/queries/*.ts` - All 19 query modules
- `/src/hooks/useBigQueryData.ts` - Add date range filter passing
- `/src/store/index.ts` - Document dateRange usage

### Low Priority (Option 3 - Simplify)
- `/src/store/index.ts` - Replace dateRange with daysBack
- `/src/types/index.ts` - Update GlobalFilters interface
- All pages using FilterBar - Update to daysBack selector

## Conclusion

**Date filtering WORKS but is INCONSISTENT**:
- ✅ Query functions correctly implement `daysBack` filtering
- ✅ Page-level local state works as workaround
- ❌ Global `filters.dateRange` from store is IGNORED
- ❌ FilterBar date pickers are often disconnected

**Recommended Action**: Implement **Option 1 (Quick Fix)** immediately to connect global filters, then plan **Option 2 (Robust Fix)** for full date range support.

---

**Verification Performed By**: Claude Code
**Methodology**:
- Analyzed store implementation (`/src/store/index.ts`)
- Reviewed hook implementation (`/src/hooks/useBigQueryData.ts`)
- Examined 19 query modules for date filter usage
- Checked 41 dashboard pages for date filter patterns
- Verified FilterBar component date picker implementation
