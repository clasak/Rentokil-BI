# Performance Analysis Report

**Date:** 2026-01-21
**Analyzed by:** Claude (Opus 4.5)
**Repository:** Rentokil-BI

---

## Executive Summary

This analysis identified **50+ performance issues** across the codebase, categorized into:
- N+1 query patterns and inefficient data fetching
- React re-render issues
- Inefficient algorithms and data structures
- Service layer anti-patterns

---

## Critical Issues

### 1. N+1 Query Pattern: Activity Lookup in CRM Hygiene Score

**File:** `src/lib/kpi-calculations.ts:445-448`

```typescript
const recentActivityOpps = openOpps.filter(o => {
  const oppActivities = activities.filter(a => a.opportunityId === o.id)  // N+1!
  return oppActivities.some(a => a.timestamp > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
}).length
```

**Impact:** With ~2,500 opportunities, this performs 2,500 full array scans of the activities array.

**Fix:** Pre-build a Map of activities by opportunityId:
```typescript
const activityMap = new Map<string, Activity[]>()
activities.forEach(a => {
  const list = activityMap.get(a.opportunityId) || []
  list.push(a)
  activityMap.set(a.opportunityId, list)
})
// Then use: activityMap.get(o.id) || []
```

---

### 2. Triple Pipeline Filtering

**File:** `src/lib/kpi-calculations.ts:150-164`

```typescript
const pipeline30 = openOpps.filter(o => daysToClose >= 0 && daysToClose <= 30)
const pipeline60 = openOpps.filter(o => daysToClose > 30 && daysToClose <= 60)
const pipeline90 = openOpps.filter(o => daysToClose > 60 && daysToClose <= 90)
```

**Impact:** Same data filtered 3 times with redundant date calculations in each filter.

**Fix:** Single-pass categorization:
```typescript
const pipeline = { p30: 0, p60: 0, p90: 0 }
openOpps.forEach(o => {
  const daysToClose = Math.floor((o.closeDate.getTime() - now) / DAY_MS)
  if (daysToClose <= 30) pipeline.p30 += o.value
  else if (daysToClose <= 60) pipeline.p60 += o.value
  else if (daysToClose <= 90) pipeline.p90 += o.value
})
```

---

### 3. Service Event Triple Filter

**File:** `src/lib/kpi-calculations.ts:274-276`

```typescript
const completedServices = serviceEvents.filter(s => s.status === 'completed')
const callbacks = serviceEvents.filter(s => s.status === 'callback')
const missedServices = serviceEvents.filter(s => s.status === 'missed')
```

**Impact:** ~12,000 service events filtered 3 times instead of once.

**Fix:** Single-pass categorization with reduce or Map.

---

### 4. Mock Service Duplicate Data Fetches

**File:** `src/services/mock/index.ts:156-440`

Each service method calls its getter function independently:
```typescript
async getById(id) {
  return getBranches().find(b => b.id === id)  // Regenerates array
},
async getByMarket(marketId) {
  return getBranches().filter(b => b.marketId === marketId)  // Regenerates again
}
```

**Lines with duplicate calls:**
- `getBranches()`: 171, 174, 177
- `getAccounts()`: 240, 246, 249, 252, 255
- `getOpportunities()`: 292, 301, 304, 307
- `getServiceEvents()`: 382, 385, 391, 394, 397, 400, 411
- `getInvoices()`: 425, 434, 437, 440

**Fix:** Cache data at service initialization or use memoization.

---

### 5. Linear KPI Dictionary Lookup in Loop

**File:** `src/app/api/kpis/route.ts:58`

```typescript
for (const slug of slugsToReturn) {
  const kpiDef = KPI_DICTIONARY.find(k => k.slug === slug)  // O(n) per iteration
}
```

**Impact:** With 20 KPIs, performs 400 comparisons instead of 20.

**Fix:** Pre-build a Map:
```typescript
const KPI_MAP = new Map(KPI_DICTIONARY.map(k => [k.slug, k]))
// Then use: KPI_MAP.get(slug)
```

---

### 6. Synchronous Data Generation at Module Load

**File:** `src/lib/data.ts:826`

```typescript
regenerateData()  // Called at module import
```

**Impact:** Generates 15,000+ records synchronously, blocking app startup.

**Fix:** Use lazy initialization or move to async initialization.

---

## React Re-render Issues

### 7. Zustand Store Over-subscription (Critical)

Multiple components subscribe to entire store instead of specific slices:

**File:** `src/components/layout/Header.tsx:69-75`
```typescript
const { settings, refreshData, getCurrentUserScope, theme, setTheme } = useAppStore()
```

**File:** `src/components/layout/Sidebar.tsx:143`
```typescript
const { sidebarCollapsed, setSidebarCollapsed, settings: appSettings } = useAppStore()
```

**File:** `src/components/features/DemoSpotlight.tsx:779-786`
```typescript
const { presenterMode, presenterStep, settings, nextPresenterStep, prevPresenterStep, setPresenterMode } = useAppStore()
```

**Impact:** Any store update causes all subscribed components to re-render.

**Fix:** Add selectors to store:
```typescript
// In store/index.ts
export const useTheme = () => useAppStore(state => state.theme)
export const useRole = () => useAppStore(state => state.settings.role)
```

---

### 8. Missing useMemo on Expensive Computations

**File:** `src/components/dashboard/ExecutiveCommandCenter.tsx:80-87`

```typescript
const criticalKpis = Array.from(kpiValues.values()).filter(k => k.status === 'critical')
const warningKpis = Array.from(kpiValues.values()).filter(k => k.status === 'warning')
const goodKpis = Array.from(kpiValues.values()).filter(k => k.status === 'good')
```

**Impact:** 3 filter operations on every render.

**Fix:** Wrap in useMemo with kpiValues as dependency.

---

### 9. Missing React.memo on KPICard

**File:** `src/components/features/KPICard.tsx`

Component receives stable props but lacks `React.memo()`, causing re-renders when parent updates.

**Fix:** Wrap component export:
```typescript
export const KPICard = React.memo(function KPICard({ kpiValue }: Props) {
  // ...
})
```

---

### 10. Inline Functions in Event Handlers

**File:** `src/components/layout/Header.tsx:288, 386, 427-430`

```typescript
onChange={(e) => handleSearch(e.target.value)}
onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
onClick={() => { refreshData(); window.location.reload() }}
```

**Impact:** Creates new function references on every render, causing child re-renders.

**Fix:** Use useCallback:
```typescript
const handleThemeChange = useCallback((value: string) => {
  setTheme(value as 'light' | 'dark' | 'system')
}, [setTheme])
```

---

### 11. Component Defined Inside Render

**File:** `src/components/layout/Sidebar.tsx:188`

```typescript
const NavItem = ({ item }: { item: typeof executiveNav[0] }) => { ... }
```

**Impact:** NavItem component is recreated on every Sidebar render.

**Fix:** Extract to separate file or define outside component.

---

### 12. ActionList Multiple Filter Operations

**File:** `src/components/features/ActionList.tsx:68-74`

```typescript
const filterOptions = [
  { key: 'all', label: 'All', count: typeFilteredActions.length },
  { key: 'critical', label: 'Critical', count: typeFilteredActions.filter(a => a.severity === 'critical').length },
  { key: 'high', label: 'High', count: typeFilteredActions.filter(a => a.severity === 'high').length },
  // ...
]
```

**Impact:** 5 filter operations on every render.

**Fix:** Use useMemo with single-pass categorization.

---

## Algorithm Inefficiencies

### 13. Nested Loop Filtering in Data Generation

**File:** `src/lib/data.ts:361`

```typescript
// Inside loop iterating ~1500 times:
const branchReps = reps.filter(r => r.assignedBranches.includes(branch.id))
```

**Impact:** O(n * m * k) complexity where n=1500 accounts, m=100 reps, k=branches per rep.

**Fix:** Pre-build Map of reps by branch:
```typescript
const repsByBranch = new Map<string, User[]>()
reps.forEach(r => r.assignedBranches.forEach(b => {
  const list = repsByBranch.get(b) || []
  list.push(r)
  repsByBranch.set(b, list)
}))
```

---

### 14. Array.includes() Instead of Set.has()

**File:** `src/lib/kpi-calculations.ts:150, 181, 637, 940`

```typescript
opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
```

**Impact:** Creates new array and performs linear search for every opportunity.

**Fix:**
```typescript
const CLOSED_STAGES = new Set(['closed_won', 'closed_lost'])
opportunities.filter(o => !CLOSED_STAGES.has(o.stage))
```

---

### 15. Repeated Date Calculations

**File:** `src/lib/data.ts` (multiple locations: 379, 384, 415, 423, 432, 506, 533, 543)

```typescript
new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
```

**Fix:** Define constants:
```typescript
const DAY_MS = 24 * 60 * 60 * 1000
const DAYS_90_MS = 90 * DAY_MS
const now = Date.now()
const date90DaysAgo = new Date(now - DAYS_90_MS)
```

---

### 16. Repeated toISOString().split('T')[0] Pattern

**File:** `src/lib/daily-sales-data.ts:143, 214, 223, 255, 273`

```typescript
date.toISOString().split('T')[0]
```

**Fix:** Create utility function:
```typescript
const toDateString = (d: Date) => d.toISOString().split('T')[0]
```

Or use direct comparison for date-only checks:
```typescript
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()
```

---

### 17. Inefficient Date Comparison in Capacity Service

**File:** `src/services/mock/index.ts:559-564`

```typescript
async getByDate(date) {
  const dateStr = date.toISOString().split('T')[0]
  return getTechnicianCapacity().filter(c =>
    c.date.toISOString().split('T')[0] === dateStr
  )
}
```

**Impact:** String conversion for every record instead of direct Date comparison.

---

### 18. slice().forEach() Creates Unnecessary Copies

**File:** `src/lib/kpi-calculations.ts:638, 659, 687`

```typescript
stalledOpps.slice(0, 20).forEach(...)
highRiskAccounts.slice(0, 15).forEach(...)
```

**Fix:** Use index-limited loop:
```typescript
const limit = Math.min(20, stalledOpps.length)
for (let i = 0; i < limit; i++) {
  const opp = stalledOpps[i]
  // ...
}
```

---

## Summary by Severity

| Severity | Count | Examples |
|----------|-------|----------|
| **Critical** | 8 | N+1 activity lookup, triple filtering, store over-subscription |
| **High** | 12 | Missing memoization, linear lookups in loops, data re-fetching |
| **Medium** | 18 | Inline functions, Array.includes vs Set, date calculations |
| **Low** | 15 | Minor optimizations, code style improvements |

---

## Recommended Priority Fixes

### Immediate (High Impact, Low Effort)

1. Add KPI_DICTIONARY Map for O(1) lookups
2. Convert stage checks to use Set
3. Add Zustand selectors for common state slices
4. Wrap KPICard and similar components in React.memo

### Short-term (High Impact, Medium Effort)

5. Single-pass pipeline and service event categorization
6. Pre-build activity Map by opportunityId
7. Add useMemo to ExecutiveCommandCenter and ActionList
8. Extract inline components (NavItem, etc.)

### Medium-term (Medium Impact, Higher Effort)

9. Implement data caching in mock services
10. Refactor data generation to use index Maps
11. Add useCallback for event handlers
12. Lazy initialization of synthetic data

---

## Performance Testing Recommendations

1. **Add React DevTools Profiler** to measure component render times
2. **Use Chrome Performance tab** to identify expensive JS operations
3. **Add custom timing** around calculateKPIValues() and data generation
4. **Consider React.Profiler** component for production monitoring

---

*This analysis was performed using static code analysis. Actual performance impact may vary based on usage patterns and data volumes.*
