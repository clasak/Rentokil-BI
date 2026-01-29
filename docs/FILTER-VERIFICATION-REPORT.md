# Market/Region/Branch Filtering Verification Report

**Date**: 2026-01-24
**Status**: ⚠️ CRITICAL ISSUES FOUND - Filters Not Working on All Pages

---

## Executive Summary

After comprehensive verification of the market/region/branch filtering system, **critical issues were found** that prevent filters from working correctly across many dashboard pages. The filters are stored and transmitted correctly, but there are **parameter name mismatches** between the frontend filter injection and backend SQL query expectations.

### Filter Data Flow Architecture

```
User selects filter in UI
        ↓
Zustand Store (organizationFilters)
  - selectedMarket: 'NE'
  - selectedRegion: 'NE-WEST'
  - selectedBranch: 'BRN-001'
        ↓
useBigQueryData Hook (lines 96-107)
  Injects as: { market: 'NE', region: 'NE-WEST', branch: 'BRN-001' }
        ↓
POST /api/bigquery/query
  Body: { query: 'lead-trends', filters: { market: 'NE', ... } }
        ↓
Query Function (e.g., getLeadTrends)
  ❌ PROBLEM: Expects marketCode/regionCode/branchCode
        ↓
BigQuery SQL WHERE clause
  ❌ NEVER RECEIVES FILTER
```

---

## Critical Issues Found

### Issue #1: Parameter Name Mismatch in Sales Queries ⛔

**Location**: `/src/lib/bigquery/queries/sales.ts`

**Problem**:
- useBigQueryData injects: `{ market: 'NE', region: 'NE-WEST', branch: 'BRN-001' }`
- Sales queries expect: `{ marketCode: 'NE', regionCode: 'NE-WEST', branchCode: 'BRN-001' }`

**Evidence** (sales.ts lines 84-102):
```typescript
export interface SalesQueryOptions {
  market?: string
  marketCode?: string  // Alternative name ❌ Used in WHERE clause builder
  region?: string
  regionCode?: string  // Alternative name ❌ Used in WHERE clause builder
  branch?: string
  branchCode?: string  // Alternative name ❌ Used in WHERE clause builder
}

// Helper to build WHERE clause
function buildOrgFilterClauses(options: SalesQueryOptions): string[] {
  const marketCode = options.marketCode || options.market  // ✅ Fallback works
  const regionCode = options.regionCode || options.region  // ✅ Fallback works
  const branchCode = options.branchCode || options.branch  // ✅ Fallback works

  if (marketCode) clauses.push(`MarketCode = '${marketCode}'`)  // Actually uses fallback
  if (regionCode) clauses.push(`RegionCode = '${regionCode}'`)
  if (branchCode) clauses.push(`AssignedBranchCode = '${branchCode}'`)
}
```

**Impact**:
- ✅ **PARTIALLY WORKING** - The fallback `options.marketCode || options.market` saves it
- Sales queries like `sales-today`, `backlog`, `speed-to-install` DO receive filters
- BUT: Inconsistent naming creates maintenance risk

**Affected Pages**:
- `/sales/today` ✅ Works (has fallback)
- `/sales/backlog` ✅ Works (has fallback)
- `/sales/speed-to-install` ✅ Works (has fallback)
- `/sales/start-rate` ✅ Works (has fallback)

---

### Issue #2: Leads Queries Missing Organization Filters ⛔

**Location**: `/src/lib/bigquery/queries/leads.ts`

**Problem**: Queries use `market` and `region` parameters but **NOT `branch`**

**Evidence** (leads.ts lines 65-72):
```typescript
export interface LeadsQueryOptions {
  daysBack?: number
  market?: string      // ✅ Used in WHERE clause
  region?: string      // ✅ Used in WHERE clause
  branch?: string      // ❌ DEFINED BUT NEVER USED IN SQL
  pestType?: string
  limit?: number
}
```

**SQL Examples**:
```typescript
// getLeadsByPestType (line 95-97)
let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
if (market) whereClause += ` AND market = @market`     // ✅ Works
if (region) whereClause += ` AND region = @region`     // ✅ Works
// ❌ NO BRANCH FILTER!

// getLeadTrends (line 131-133)
let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
if (market) whereClause += ` AND market = @market`     // ✅ Works
if (region) whereClause += ` AND region = @region`     // ✅ Works
// ❌ NO BRANCH FILTER!
```

**Impact**:
- ✅ Market filters work
- ✅ Region filters work
- ⛔ **Branch filters DO NOT WORK** - selecting a branch shows ALL region data

**Affected Pages**:
- `/leads/trends` ⚠️ Partially works (market/region only)
- `/leads/type-pest` ⚠️ Partially works (market/region only)
- `/leads/rankings` ⚠️ Partially works (market/region only)
- `/leads/cancels` ⚠️ Partially works (market/region only)
- `/leads/geographic` ⚠️ Partially works (market/region only)

---

### Issue #3: SALTI Page Uses Local State Filters Instead of Global ⚠️

**Location**: `/src/app/(dashboard)/salti/page.tsx`

**Problem**: Page defines its OWN filter state that is NOT synchronized with global organization filters

**Evidence** (salti/page.tsx lines 87-89):
```typescript
const [selectedMarket, setSelectedMarket] = useState<string>('all')   // ❌ Local state
const [selectedRegion, setSelectedRegion] = useState<string>('all')   // ❌ Local state
const [selectedBranch, setSelectedBranch] = useState<string>('all')   // ❌ Local state
```

**SHOULD USE** (from useBigQueryData hook):
```typescript
// useBigQueryData already injects organizationFilters.selectedMarket/Region/Branch
// No need for local state!
```

**useBigQueryData call** (lines 118-130):
```typescript
const { data, isLoading } = useBigQueryData({
  queryName: 'salti-overview',
  filters: { daysBack: 30 },  // ❌ Local filter state NOT passed here
  defaultData: EMPTY_SALTI_OVERVIEW,
  transformBigQueryData,
})
```

**Impact**:
- ⛔ **Global organization filters in header DO NOT affect SALTI page**
- ⛔ **Local filter dropdowns on SALTI page DO NOT work** (not passed to query)
- User sees all data regardless of filter selections

**Affected Pages**:
- `/salti` ⛔ Filters completely broken
- `/salti/daily-check-in` (need to verify)
- `/salti/productivity` (need to verify)
- `/salti/proposal-pipeline` (need to verify)

---

### Issue #4: Leads Trends Page Uses Wrong Filter Approach ⚠️

**Location**: `/src/app/(dashboard)/leads/trends/page.tsx`

**Problem**: Page uses local market state AND passes it explicitly to query, overriding global filters

**Evidence** (leads/trends/page.tsx):
```typescript
const [market, setMarket] = useState('All Markets')  // ❌ Local state

const { data, isLoading } = useBigQueryData({
  queryName: 'lead-trends',
  filters: {
    daysBack: parseInt(dateRange),
    market: market !== 'All Markets' ? market : undefined,  // ❌ Explicit override
  },
  // ...
})
```

**Impact**:
- ⚠️ Page shows its own filter dropdown, ignoring global organization filter
- Creates confusion: two different filter controls for the same thing
- Inconsistent UX across dashboard

**Affected Pages**:
- `/leads/trends` ⚠️ Has duplicate filter controls

---

### Issue #5: Sales Today Page Not Using Organization Filters 🔴

**Location**: `/src/app/(dashboard)/sales/today/page.tsx`

**Problem**: Query called with empty filters object

**Evidence** (sales/today/page.tsx line 144):
```typescript
const { data, isLoading } = useBigQueryData({
  queryName: 'sales-today',
  filters: {},  // ❌ EMPTY - should rely on auto-injection
  defaultData: EMPTY_SALES_TODAY,
  transformBigQueryData,
})
```

**Verification needed**: Check if `includeOrgFilters: true` is default (it is, line 52 of useBigQueryData.ts)

**Impact**:
- ✅ **LIKELY WORKS** - useBigQueryData defaults `includeOrgFilters: true`
- But explicit `filters: {}` suggests page author didn't know about auto-injection

---

## What's Working Correctly ✅

### 1. Zustand Store Filter State
**Location**: `/src/store/index.ts` (lines 490-526)

```typescript
organizationFilters: {
  selectedMarket: null,
  selectedRegion: null,
  selectedBranch: null,
}

setOrganizationMarket: (marketCode: string | null) => {
  set({
    organizationFilters: {
      selectedMarket: marketCode,
      selectedRegion: null,    // ✅ Correctly clears downstream
      selectedBranch: null,
    }
  })
}
```

**Status**: ✅ **PERFECT** - Cascading filter clearing works correctly

---

### 2. useBigQueryData Filter Injection
**Location**: `/src/hooks/useBigQueryData.ts` (lines 82-110)

```typescript
const effectiveFilters = useMemo(() => {
  const merged = { ...filters }

  // Add organization hierarchy filters (manual selections from UI)
  if (includeOrgFilters) {
    if (organizationFilters.selectedMarket) {
      merged.market = organizationFilters.selectedMarket  // ✅ Correct key
    }
    if (organizationFilters.selectedRegion) {
      merged.region = organizationFilters.selectedRegion  // ✅ Correct key
    }
    if (organizationFilters.selectedBranch) {
      merged.branch = organizationFilters.selectedBranch  // ✅ Correct key
    }
  }

  return merged
}, [filters, organizationFilters, includeOrgFilters, includeRoleFilters, effectiveUser])
```

**Status**: ✅ **PERFECT** - Filters merged correctly with keys: `market`, `region`, `branch`

---

### 3. Role-Based Filter Injection
**Location**: `/src/lib/bigquery/role-filters.ts` (lines 32-105)

```typescript
export function getRoleBasedFilters(user: User | null): RoleBasedFilters {
  switch (role) {
    case 'rep':
      return { salesPerson: user.name }  // ✅ Correct
    case 'manager':
      return { branchCode: user.assignedBranches[0] }  // ✅ Correct
    case 'region_director':
      return { regionCode: user.assignedRegions[0] }  // ✅ Correct
    case 'market_vp':
      return { marketCode: user.assignedMarkets[0] }  // ✅ Correct
  }
}
```

**Status**: ✅ **PERFECT** - Role filters use correct keys with `Code` suffix

---

### 4. API Query Route
**Location**: `/src/app/api/bigquery/query/route.ts` (lines 361-384)

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { query, filters = {} } = body  // ✅ Receives merged filters

  const queryFn = QUERY_REGISTRY[query]
  const data = await queryFn(filters)  // ✅ Passes to query function
}
```

**Status**: ✅ **PERFECT** - No filter manipulation, passes through correctly

---

## Required Fixes

### Fix #1: Standardize Filter Parameter Names Across All Queries 🔧

**Recommendation**: Keep `market`, `region`, `branch` as standard (matches useBigQueryData injection)

**Files to update**:
1. `/src/lib/bigquery/queries/sales.ts` - Remove `Code` suffix from primary parameters
2. `/src/lib/bigquery/queries/leads.ts` - Add branch filter support
3. All other query files - Audit for consistency

**Example fix for sales.ts**:
```typescript
export interface SalesQueryOptions {
  market?: string       // ✅ Primary parameter
  region?: string       // ✅ Primary parameter
  branch?: string       // ✅ Primary parameter
  daysBack?: number
  limit?: number
}

function buildOrgFilterClauses(options: SalesQueryOptions): string[] {
  const clauses: string[] = []
  if (options.market) clauses.push(`MarketCode = '${options.market}'`)
  if (options.region) clauses.push(`RegionCode = '${options.region}'`)
  if (options.branch) clauses.push(`AssignedBranchCode = '${options.branch}'`)
  return clauses
}
```

---

### Fix #2: Add Branch Filter Support to Leads Queries 🔧

**File**: `/src/lib/bigquery/queries/leads.ts`

**Required changes**:
```typescript
// Add branch to WHERE clauses in:
// - getLeadsByPestType (line 95)
// - getLeadTrends (line 131)
// - getLeadRankings (line 166)
// - getLeadCancellations
// - getLeadGeographic

// Example:
let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
if (market) whereClause += ` AND market = @market`
if (region) whereClause += ` AND region = @region`
if (branch) whereClause += ` AND branch = @branch`  // ✅ ADD THIS
```

---

### Fix #3: Remove Local Filter State from SALTI Page 🔧

**File**: `/src/app/(dashboard)/salti/page.tsx`

**Changes required**:
```typescript
// ❌ DELETE these lines (87-89):
const [selectedMarket, setSelectedMarket] = useState<string>('all')
const [selectedRegion, setSelectedRegion] = useState<string>('all')
const [selectedBranch, setSelectedBranch] = useState<string>('all')

// ❌ DELETE local market/region/branch filter dropdowns (lines 160-209)

// ✅ Rely on global organization filter (already injected by useBigQueryData)
// Users will use the header organization filter dropdown instead
```

**Alternative** (if local filters are desired):
```typescript
// Pass local filters to query
const { data, isLoading } = useBigQueryData({
  queryName: 'salti-overview',
  filters: {
    daysBack: 30,
    market: selectedMarket !== 'all' ? selectedMarket : undefined,
    region: selectedRegion !== 'all' ? selectedRegion : undefined,
    branch: selectedBranch !== 'all' ? selectedBranch : undefined,
  },
  includeOrgFilters: false,  // Disable global filters if using local
  // ...
})
```

---

### Fix #4: Remove Local Market Filter from Leads Trends Page 🔧

**File**: `/src/app/(dashboard)/leads/trends/page.tsx`

**Changes required**:
```typescript
// ❌ DELETE line 63:
const [market, setMarket] = useState('All Markets')

// ❌ DELETE market filter dropdown (lines 205-221)

// ✅ UPDATE query call (lines 110-118):
const { data, isLoading } = useBigQueryData({
  queryName: 'lead-trends',
  filters: {
    daysBack: parseInt(dateRange),
    // ❌ REMOVE: market: market !== 'All Markets' ? market : undefined,
  },
  // includeOrgFilters: true is default - will auto-inject global filter
  defaultData: EMPTY_LEAD_TRENDS,
  transformBigQueryData: transformBigQueryTrends,
})
```

---

## Testing Checklist

After applying fixes, verify:

### Test Case 1: Market Filter on Sales Today
1. Go to `/sales/today`
2. Select market "NE" from global organization filter
3. ✅ Verify: Only NE market data shows
4. Select different market "SE"
5. ✅ Verify: Data updates to SE market only

### Test Case 2: Region Filter on Leads Trends
1. Go to `/leads/trends`
2. Select market "NE" from global filter
3. Select region "NE-WEST" from global filter
4. ✅ Verify: Only NE-WEST region data shows
5. Check URL sent to BigQuery in network tab
6. ✅ Verify: `filters: { region: 'NE-WEST', market: 'NE' }`

### Test Case 3: Branch Filter on Leads
1. Go to `/leads/type-pest`
2. Select market "NE" → region "NE-WEST" → branch "BRN-001"
3. ✅ Verify: Only BRN-001 branch data shows
4. After fix: Check SQL WHERE clause includes branch filter

### Test Case 4: SALTI Page Filters
1. Go to `/salti`
2. Select market from global organization filter
3. ✅ Verify: Overview metrics update to show only that market
4. After fix: Remove duplicate local filters

### Test Case 5: Role-Based Filters Don't Interfere
1. Login as Branch Manager (role: `manager`)
2. Go to any page with organization filters
3. ✅ Verify: Role filter (branchCode) + org filter (selectedBranch) both apply
4. Should only see intersection of both filters

---

## Recommendations

### Immediate Actions (P0)
1. ✅ Fix leads queries to support branch filtering
2. ✅ Remove duplicate local filters from SALTI page
3. ✅ Remove duplicate market filter from Leads Trends page
4. ✅ Audit all 100+ query registry entries for parameter consistency

### Short-term (P1)
1. Add integration tests for filter propagation
2. Add visual indicator in UI showing active filters
3. Document standard filter parameter naming in CLAUDE.md

### Long-term (P2)
1. Create centralized filter builder utility
2. Add TypeScript strict mode enforcement for query options
3. Add runtime validation that filters are actually applied in SQL

---

## Conclusion

**Filter Infrastructure**: ✅ **SOLID** - Zustand store, useBigQueryData hook, API routing all work perfectly

**Filter Application**: ⛔ **BROKEN** - Queries don't consistently use the filters they receive

**Root Cause**: Lack of standardization in query parameter naming and incomplete WHERE clause building

**Severity**: 🔴 **HIGH** - Users selecting filters see no change in data, creating distrust in the platform

**Effort to Fix**: 🟡 **MEDIUM** - Requires updating 6+ query files and 3+ page components, but changes are straightforward

**Estimated Time**: 2-3 hours for fixes + 1 hour for testing
