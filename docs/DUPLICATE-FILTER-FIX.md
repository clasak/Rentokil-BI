# Duplicate Filter Controls Fix

**Date**: 2026-01-24
**Issue**: Multiple leads pages had local market/region filter dropdowns that duplicated the global organization filter in the header.

## Problem

Users were confused by seeing two sets of filter controls:
1. **Global organization filter** (in header) - filters all data at the API level via `includeOrgFilters`
2. **Local page filters** (in page UI) - redundant market/region dropdowns

This created ambiguity about which filter controlled the data.

## Solution

**Removed all local market/region/branch filter controls** from leads pages. Users now use ONLY the global organization filter in the header to filter by market/region/branch.

**Page-specific filters retained**:
- Date range filters (7/14/30/60/90 days) - varies by analysis timeframe
- Group By filter (market/region/branch) - changes data aggregation level
- Market Type filter (Residential/Commercial) - business segment filter

## Files Fixed

### 1. `/src/app/(dashboard)/leads/trends/page.tsx`
**Removed**:
- `const [market, setMarket] = useState('All Markets')`
- `const { markets: orgMarkets } = useOrganizationData()`
- Market filter dropdown UI (lines 205-221)
- `market` parameter from `useBigQueryData` filters
- `market` parameter from BCG analytics fetch
- Unused imports: `Filter`, `useOrganizationData`

**Retained**:
- Date range filter (7/14/30/60/90 days) - page-specific

**Before**:
```typescript
const [market, setMarket] = useState('All Markets')
const { data } = useBigQueryData({
  queryName: 'lead-trends',
  filters: {
    daysBack: parseInt(dateRange),
    market: market !== 'All Markets' ? market : undefined, // ❌ Duplicate
  },
})
```

**After**:
```typescript
const { data } = useBigQueryData({
  queryName: 'lead-trends',
  filters: {
    daysBack: parseInt(dateRange),
    // ✅ Global filter handles market/region/branch via includeOrgFilters
  },
})
```

### 2. `/src/app/(dashboard)/leads/geographic/page.tsx`
**Removed**:
- `const [selectedMarket, setSelectedMarket] = useState<string>('All')`
- Market filter dropdown UI (lines 184-198)
- Client-side market filtering logic
- Unused imports: `Filter`

**Retained**:
- None (purely uses global filter)

**Before**:
```typescript
const [selectedMarket, setSelectedMarket] = useState<string>('All')
const filteredData = useMemo(() =>
  selectedMarket === 'All'
    ? data
    : data.filter((d) => d.market === selectedMarket), // ❌ Client-side duplicate
  [data, selectedMarket]
)
```

**After**:
```typescript
const filteredData = data // ✅ Global filter already applied server-side
```

### 3. `/src/app/(dashboard)/leads/rankings/page.tsx`
**Removed**:
- `const [selectedMarket, setSelectedMarket] = useState<string>('all')`
- `const [selectedRegion, setSelectedRegion] = useState<string>('all')`
- Market and region filter dropdowns (lines 309-342)
- Market/region filter logic in `queryFilters` (lines 119-128)
- Unused imports: `Building2`, `MapPin`, `useOrganizationData`
- `useEffect` for resetting region when market changes

**Retained**:
- `groupBy` filter (market/region/branch) - controls aggregation level, not filtering

**Before**:
```typescript
const [selectedMarket, setSelectedMarket] = useState<string>('all')
const [selectedRegion, setSelectedRegion] = useState<string>('all')

const queryFilters = useMemo(() => {
  const filters = { groupBy, daysBack: 30, limit: 25 }
  if (selectedMarket !== 'all') {
    const market = getMarketByCode(selectedMarket)
    if (market) filters.market = market.market_name // ❌ Duplicate
  }
  if (selectedRegion !== 'all') {
    filters.region = regionName // ❌ Duplicate
  }
  return filters
}, [groupBy, selectedMarket, selectedRegion])
```

**After**:
```typescript
const queryFilters = useMemo(() => {
  return {
    daysBack: 30,
    limit: groupBy === 'branch' ? 50 : 25,
    groupBy, // ✅ Only aggregation level, global filter handles filtering
  }
}, [groupBy])
```

## Pages Verified (No Changes Needed)

### ✅ `/src/app/(dashboard)/leads/cancels/page.tsx`
- Already correct - only has date range filter (page-specific)
- No market/region controls

### ✅ `/src/app/(dashboard)/leads/type-pest/page.tsx`
- Already correct - no local filters
- Clean implementation

### ✅ `/src/app/(dashboard)/leads/journey/page.tsx`
- Already correct - has `marketType` filter (Residential/Commercial)
- This is a **business segment filter**, not an organizational hierarchy filter
- Different from market/region/branch filtering

## User Experience Impact

**Before** (Confusing):
```
┌─────────────────────────────────────────┐
│ Header: [Global Filter: Northeast ▼]   │ ← Global control
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Lead Trends                             │
│ [Market: All Markets ▼]                 │ ← Local duplicate (confusing!)
│ [Date: Last 30 Days ▼]                  │
└─────────────────────────────────────────┘
```

**After** (Clear):
```
┌─────────────────────────────────────────┐
│ Header: [Global Filter: Northeast ▼]   │ ← Single source of truth
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Lead Trends                             │
│ [Date: Last 30 Days ▼]                  │ ← Only page-specific filters
└─────────────────────────────────────────┘
```

## Testing Checklist

- [ ] **Leads Trends**: Verify global filter controls data, date range works
- [ ] **Leads Geographic**: Verify global filter controls data
- [ ] **Leads Rankings**: Verify global filter + groupBy dropdown work together
- [ ] **All other leads pages**: Ensure no regression

## Technical Details

### How Global Filtering Works

When `useBigQueryData` is called without explicit market/region filters:

```typescript
const { data } = useBigQueryData({
  queryName: 'lead-trends',
  filters: { daysBack: 30 },
  // includeOrgFilters: true (default) auto-injects:
  // - market (from global filter)
  // - region (from global filter)
  // - branch (from global filter)
})
```

The hook automatically:
1. Reads global filter state from Zustand store
2. Injects `market`, `region`, `branch` into query filters
3. Passes to BigQuery API via `/api/bigquery/query`
4. Role-based filters also applied server-side

### When to Use Local Filters

✅ **Use local page filters when**:
- The filter is **page-specific** (e.g., date range, report type)
- The filter changes **analysis scope**, not organizational scope
- The filter is **temporary** and doesn't affect other pages

❌ **Do NOT use local filters for**:
- Market, Region, Branch (use global filter)
- Any organizational hierarchy filtering
- Anything that duplicates global controls

## Related Files

- `/src/hooks/useBigQueryData.ts` - Implements `includeOrgFilters` auto-injection
- `/src/store/index.ts` - Global filter state (market, region, branch)
- `/src/components/layout/GlobalOrganizationFilter.tsx` - Global filter UI
- `/src/lib/bigquery/role-filters.ts` - Role-based filter injection

## Status

✅ **Complete** - All duplicate filter controls removed from leads pages.
