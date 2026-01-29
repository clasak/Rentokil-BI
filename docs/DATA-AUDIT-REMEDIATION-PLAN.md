# Data Audit Remediation Plan
## Rentokil-BI Dashboard Platform

**Plan Date:** 2026-01-27
**Based On:** [LIVE-DATA-AUDIT-REPORT.md](./LIVE-DATA-AUDIT-REPORT.md)
**Status:** OPTIONAL OPTIMIZATIONS ONLY

---

## Executive Summary

The live data audit revealed **ZERO CRITICAL ISSUES**. All remediation items in this plan are optional optimizations to improve code cleanliness, performance, and maintainability. No immediate action is required.

### Priority Levels
- 🔴 **CRITICAL:** Must fix immediately (security, data integrity) - NONE FOUND
- 🟠 **HIGH:** Should fix within 1-2 sprints - NONE FOUND
- 🟡 **MEDIUM:** Nice to have, plan for future sprint - 2 items
- 🟢 **LOW:** Optional cleanup, backlog candidates - 4 items

---

## Remediation Items

### 1. Legacy Mock File Cleanup
**Priority:** 🟢 LOW
**Risk Level:** None
**Effort:** 1-2 hours
**Impact:** Code cleanliness, reduced bundle size (~10-20KB)

#### Problem
8 mock data files in `/src/lib/mock/` appear to be legacy code with no active imports:
- `financeExtendedData.ts`
- `hrData.ts`
- `leadsData.ts`
- `salesExtendedData.ts`
- `saltiExtendedData.ts`
- `termiteData.ts`
- `workforceData.ts`
- `leadJourneyData.ts`

#### Current State
Files exist but are not imported by any dashboard pages.

#### Desired State
Remove unused files to reduce codebase bloat.

#### Verification Steps
```bash
# Step 1: Verify each file is truly unused
cd /Users/codylytle/Rentokil-BI/Rentokil-BI

grep -r "financeExtendedData" src/ --exclude-dir=node_modules
grep -r "hrData" src/ --exclude-dir=node_modules
grep -r "leadsData" src/ --exclude-dir=node_modules
grep -r "salesExtendedData" src/ --exclude-dir=node_modules
grep -r "saltiExtendedData" src/ --exclude-dir=node_modules
grep -r "termiteData" src/ --exclude-dir=node_modules
grep -r "workforceData" src/ --exclude-dir=node_modules
grep -r "leadJourneyData" src/ --exclude-dir=node_modules

# Step 2: If all return 0 results, safe to remove
```

#### Implementation Steps

**Option A: Immediate Deletion (if confident)**
```bash
# Create backup first
mkdir -p archive/mock-files-backup
cp src/lib/mock/financeExtendedData.ts archive/mock-files-backup/
cp src/lib/mock/hrData.ts archive/mock-files-backup/
cp src/lib/mock/leadsData.ts archive/mock-files-backup/
cp src/lib/mock/salesExtendedData.ts archive/mock-files-backup/
cp src/lib/mock/saltiExtendedData.ts archive/mock-files-backup/
cp src/lib/mock/termiteData.ts archive/mock-files-backup/
cp src/lib/mock/workforceData.ts archive/mock-files-backup/
cp src/lib/mock/leadJourneyData.ts archive/mock-files-backup/

# Remove files
rm src/lib/mock/financeExtendedData.ts
rm src/lib/mock/hrData.ts
rm src/lib/mock/leadsData.ts
rm src/lib/mock/salesExtendedData.ts
rm src/lib/mock/saltiExtendedData.ts
rm src/lib/mock/termiteData.ts
rm src/lib/mock/workforceData.ts
rm src/lib/mock/leadJourneyData.ts

# Test build
npm run build

# If successful, commit
git add .
git commit -m "chore: remove unused legacy mock data files

- Removed 8 unused mock data files from src/lib/mock/
- Files backed up in archive/mock-files-backup/
- Verified no imports in codebase via grep search
- Reduces bundle size by ~15KB

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Option B: Deprecation Strategy (cautious approach)**
1. Add `@deprecated` comments to each file
2. Monitor for 2-4 weeks
3. Remove if no usage detected

```typescript
/**
 * @deprecated This file appears to be unused legacy code.
 * Scheduled for removal after 2026-02-15.
 * If you see this and are using this file, please notify the team.
 */
```

#### Testing
- ✅ Run `npm run build` - should succeed
- ✅ Run `npm run lint` - should pass
- ✅ Test 5-10 representative dashboard pages manually
- ✅ Check bundle size reduction (expect ~10-20KB decrease)

#### Rollback Plan
If issues arise, restore from `archive/mock-files-backup/`

---

### 2. Query Duplication Documentation
**Priority:** 🟢 LOW
**Risk Level:** None
**Effort:** 2-3 hours
**Impact:** Developer clarity, prevents confusion

#### Problem
6 pairs of seemingly duplicate queries exist (12 total queries):
- `sales-today` vs `bcg-sales-today`
- `backlog` vs `bcg-backlog`
- `pipeline-by-stage` vs `bcg-pipeline-by-stage`
- `rep-performance` vs `bcg-rep-performance`
- `at-risk-leads` vs `bcg-at-risk-leads` vs `lead-service-at-risk-leads`
- `sales-kpis` vs `bcg-sales-kpis`

Developers may be confused about which query to use.

#### Current State
Both queries exist with no documentation explaining differences.

#### Desired State
Clear documentation in QUERY_REGISTRY comments and CLAUDE.md explaining:
- Why duplicates exist
- When to use each variant
- Data source differences (W3_Contract_Checker vs BCG_RTD_DB)

#### Implementation Steps

**Step 1: Add inline comments to QUERY_REGISTRY**

Edit `/src/app/api/bigquery/query/route.ts`:

```typescript
const QUERY_REGISTRY: Record<string, QueryFn> = {
  // Sales queries - W3_Contract_Checker source (PestPac contracts)
  'sales-today': getSalesToday,           // Real-time contract data from W3
  'backlog': getBacklog,                   // W3 contract backlog
  'pipeline-by-stage': getPipelineByStage, // W3-based pipeline
  'rep-performance': getRepPerformance,    // W3 sales performance
  'at-risk-leads': getAtRiskLeads,         // W3 at-risk analysis
  'sales-kpis': getSalesKPIs,              // W3 summary KPIs

  // BCG Analytics queries - BCG_RTD_DB source (70 tables, 596M rows)
  // Use BCG variants for historical analysis, trend data, and cross-dataset joins
  'bcg-sales-today': getBCGSalesToday,         // BCG DR_ContractSales today
  'bcg-backlog': getBCGBacklog,                 // BCG backlog with enrichment
  'bcg-pipeline-by-stage': getBCGPipelineByStage, // BCG pipeline with metadata
  'bcg-rep-performance': getBCGRepPerformance,  // BCG rep metrics with history
  'bcg-at-risk-leads': getBCGAtRiskLeads,       // BCG at-risk with predictive
  'bcg-sales-kpis': getBCGSalesKPIs,            // BCG KPIs with trends

  // Lead Service Engine - S0_TMX source (SALTI/TMX lead tracking)
  'lead-service-at-risk-leads': getLeadServiceAtRiskLeads, // TMX-based at-risk

  // ... rest of registry
}
```

**Step 2: Add decision matrix to CLAUDE.md**

Add new section after "## BigQuery Datasets Used":

```markdown
### Query Selection Guide

When multiple queries exist for similar purposes, use this guide:

#### Sales Data: W3 vs BCG

**Use W3_Contract_Checker queries when:**
- Need real-time contract data (< 5 min latency)
- Focusing on current day sales
- Basic contract attributes sufficient
- Query: `sales-today`, `backlog`, `pipeline-by-stage`

**Use BCG_RTD_DB queries when:**
- Need historical trends (30+ days)
- Require cross-dataset joins (GL, payroll, portfolio)
- Need predictive analytics or ML features
- Performing aggregate analysis
- Query: `bcg-sales-today`, `bcg-backlog`, `bcg-pipeline-by-stage`

#### At-Risk Leads: Sales vs BCG vs Lead Service

**Use Sales Pipeline queries (`at-risk-leads`):**
- Sales-focused dashboard pages
- Contract-centric view
- W3_Contract_Checker data

**Use BCG Analytics queries (`bcg-at-risk-leads`):**
- Executive dashboards
- Historical trend analysis
- Predictive scoring

**Use Lead Service Engine queries (`lead-service-at-risk-leads`):**
- Lead Service Engine pages
- TMX/SALTI workflow context
- Handoff tracking
```

**Step 3: Update query module docstrings**

Add to `/src/lib/bigquery/queries/sales.ts`:
```typescript
/**
 * Sales Queries - W3_Contract_Checker Source
 *
 * These queries use W3_Contract_Checker.T0_unf_Contract_All for real-time
 * contract data from PestPac. For historical analysis or cross-dataset joins,
 * see bcg-analytics.ts instead.
 */
```

Add to `/src/lib/bigquery/queries/bcg-analytics.ts`:
```typescript
/**
 * BCG Analytics Queries - BCG_RTD_DB Source
 *
 * These queries use BCG_RTD_DB dataset (70 tables, 596M rows) for historical
 * analysis, trends, and cross-dataset joins. For real-time contract data,
 * see sales.ts instead.
 */
```

#### Testing
- ✅ Documentation reviewed by 2+ developers
- ✅ No code changes, only comments - no functional testing needed
- ✅ Check CLAUDE.md renders correctly in GitHub/markdown viewer

#### Success Criteria
- Developers can answer: "Should I use `sales-today` or `bcg-sales-today`?"
- Decision matrix takes < 30 seconds to consult
- New team members understand query selection rationale

---

### 3. Query Performance Monitoring
**Priority:** 🟡 MEDIUM
**Risk Level:** Low
**Effort:** 4-6 hours
**Impact:** User experience, cost reduction

#### Problem
No visibility into query performance. Some queries may be slow (>5s) without team awareness.

#### Current State
- `/api/bigquery/query` route executes queries
- Response times not logged or tracked
- No alerting on slow queries
- No data to inform optimization decisions

#### Desired State
- All query response times logged
- Slow query alerts (>5s threshold)
- Monthly performance report
- Top 10 slowest queries identified

#### Implementation Steps

**Step 1: Add performance logging to query route**

Edit `/src/app/api/bigquery/query/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const DEMO_MODE = !isSupabaseConfigured()

  try {
    const body = await request.json()
    const { query, filters = {} } = body

    // ... existing auth code ...

    // Execute query
    const queryFn = QUERY_REGISTRY[query]
    if (!queryFn) {
      return NextResponse.json(
        { error: `Unknown query: ${query}` },
        { status: 400 }
      )
    }

    const result = await queryFn(finalFilters)
    const responseTime = Date.now() - startTime

    // Log performance
    console.log(JSON.stringify({
      event: 'bigquery_query',
      query,
      responseTime,
      rowCount: Array.isArray(result) ? result.length : 0,
      userId: userProfile?.id || 'demo',
      filters: finalFilters,
      timestamp: new Date().toISOString(),
    }))

    // Alert on slow queries
    if (responseTime > 5000) {
      console.warn(`⚠️  SLOW QUERY: ${query} took ${responseTime}ms`)
      // Optional: Send to monitoring service (DataDog, Sentry, etc.)
    }

    return NextResponse.json({
      data: result,
      dataSource: 'bigquery',
      responseTime,
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(JSON.stringify({
      event: 'bigquery_query_error',
      query: body?.query,
      responseTime,
      error: error.message,
      timestamp: new Date().toISOString(),
    }))
    // ... existing error handling ...
  }
}
```

**Step 2: Create performance analysis script**

Create `/scripts/analyze-query-performance.ts`:

```typescript
#!/usr/bin/env tsx

/**
 * Analyze BigQuery query performance from logs
 *
 * Usage:
 *   npm run analyze-queries
 *   npm run analyze-queries -- --days 7
 *   npm run analyze-queries -- --slow-only
 */

interface QueryLog {
  event: string
  query: string
  responseTime: number
  rowCount: number
  timestamp: string
}

async function analyzeQueryPerformance(options: {
  days?: number
  slowOnly?: boolean
}) {
  // Read logs from Vercel, CloudWatch, or local files
  // Parse JSON log entries
  // Generate report

  console.log('📊 BigQuery Query Performance Report')
  console.log('=' .repeat(60))

  // Top 10 slowest queries
  console.log('\n🐌 Slowest Queries:')
  // ...

  // Most frequently called queries
  console.log('\n🔥 Most Frequent Queries:')
  // ...

  // Queries exceeding 5s threshold
  console.log('\n⚠️  Slow Query Alerts (>5s):')
  // ...

  // Summary stats
  console.log('\n📈 Summary:')
  console.log(`  Total queries: ${totalQueries}`)
  console.log(`  Avg response time: ${avgResponseTime}ms`)
  console.log(`  Median response time: ${medianResponseTime}ms`)
  console.log(`  P95 response time: ${p95ResponseTime}ms`)
  console.log(`  Slow queries (>5s): ${slowQueryCount} (${slowQueryPct}%)`)
}

analyzeQueryPerformance({
  days: 7,
  slowOnly: false,
})
```

Add to `package.json`:
```json
{
  "scripts": {
    "analyze-queries": "tsx scripts/analyze-query-performance.ts"
  }
}
```

**Step 3: Set up Vercel Analytics (optional)**

```bash
npm install @vercel/analytics
```

Add to `/src/app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### Testing
- ✅ Query logs appear in Vercel console
- ✅ Slow query warnings appear for queries >5s
- ✅ JSON format is parseable
- ✅ No performance degradation from logging

#### Success Criteria
- Top 10 slowest queries identified within 1 week
- Monthly performance report generated
- Decision made on which queries to optimize
- Baseline metrics established for future comparison

#### Next Steps (if slow queries found)
1. Analyze query SQL for optimization opportunities
2. Consider materialized views for complex aggregations
3. Add caching for frequently accessed data
4. Implement query result pagination for large datasets

---

### 4. Query Result Caching
**Priority:** 🟡 MEDIUM
**Risk Level:** Low
**Effort:** 1-2 days
**Impact:** Performance (30-50% faster), cost reduction (20-30%)

#### Problem
Every page load executes BigQuery queries, even for data that changes infrequently (e.g., organization hierarchy, historical metrics).

#### Current State
- No caching layer
- Every request hits BigQuery
- Queries like `organization-hierarchy` executed 100+ times/day
- Unnecessary cost and latency

#### Desired State
- Redis/Vercel KV cache for frequently accessed queries
- Cache TTL: 5-15 minutes (configurable per query)
- Cache hit rate: 50-70% for static/slow-changing data
- 30-50% reduction in BigQuery costs

#### Implementation Steps

**Step 1: Install Vercel KV (easiest for Vercel deployments)**

```bash
npm install @vercel/kv
```

Set up in Vercel dashboard:
1. Go to Storage → Create KV Database
2. Link to project
3. Environment variables auto-configured

**Step 2: Create caching utilities**

Create `/src/lib/bigquery/cache.ts`:

```typescript
import { kv } from '@vercel/kv'

interface CacheConfig {
  ttl?: number // seconds, default 300 (5 min)
  enabled?: boolean // default true
}

const DEFAULT_TTL = 300 // 5 minutes
const CACHE_KEY_PREFIX = 'bq:query:'

/**
 * Cache configuration per query
 * Queries with frequent changes: lower TTL
 * Queries with static data: higher TTL
 */
const QUERY_CACHE_CONFIG: Record<string, CacheConfig> = {
  // Static/slow-changing data - 15 min cache
  'organization-hierarchy': { ttl: 900 },
  'organization-markets': { ttl: 900 },
  'organization-regions': { ttl: 900 },
  'organization-branches': { ttl: 900 },
  'product-catalog': { ttl: 900 },

  // Daily aggregates - 5 min cache
  'branch-daily': { ttl: 300 },
  'region-daily': { ttl: 300 },
  'market-daily': { ttl: 300 },

  // Real-time data - 1 min cache
  'sales-today': { ttl: 60 },
  'bcg-sales-today': { ttl: 60 },

  // No caching for user-specific queries
  'salesforce-account-detail': { enabled: false },
  'salesforce-quote-detail': { enabled: false },
}

/**
 * Generate cache key from query name and filters
 */
function getCacheKey(query: string, filters: Record<string, unknown>): string {
  const filterHash = JSON.stringify(filters)
  return `${CACHE_KEY_PREFIX}${query}:${filterHash}`
}

/**
 * Get cached query result
 */
export async function getCachedQuery<T>(
  query: string,
  filters: Record<string, unknown>
): Promise<T | null> {
  const config = QUERY_CACHE_CONFIG[query]
  if (config?.enabled === false) return null

  try {
    const cacheKey = getCacheKey(query, filters)
    const cached = await kv.get<T>(cacheKey)

    if (cached) {
      console.log(`✅ Cache HIT: ${query}`)
      return cached
    }
    console.log(`❌ Cache MISS: ${query}`)
    return null
  } catch (error) {
    console.error('Cache read error:', error)
    return null // Fail open - don't block on cache errors
  }
}

/**
 * Set cached query result
 */
export async function setCachedQuery<T>(
  query: string,
  filters: Record<string, unknown>,
  data: T
): Promise<void> {
  const config = QUERY_CACHE_CONFIG[query] || {}
  if (config.enabled === false) return

  try {
    const cacheKey = getCacheKey(query, filters)
    const ttl = config.ttl || DEFAULT_TTL

    await kv.set(cacheKey, data, { ex: ttl })
    console.log(`💾 Cached: ${query} (TTL: ${ttl}s)`)
  } catch (error) {
    console.error('Cache write error:', error)
    // Fail open - don't block on cache errors
  }
}

/**
 * Invalidate cache for a query (all filter combinations)
 */
export async function invalidateQueryCache(query: string): Promise<void> {
  try {
    const pattern = `${CACHE_KEY_PREFIX}${query}:*`
    const keys = await kv.keys(pattern)

    if (keys.length > 0) {
      await Promise.all(keys.map(key => kv.del(key)))
      console.log(`🗑️  Invalidated ${keys.length} cache entries for: ${query}`)
    }
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }
}
```

**Step 3: Integrate caching into query route**

Edit `/src/app/api/bigquery/query/route.ts`:

```typescript
import { getCachedQuery, setCachedQuery } from '@/lib/bigquery/cache'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const DEMO_MODE = !isSupabaseConfigured()

  try {
    const body = await request.json()
    const { query, filters = {} } = body

    // ... existing auth code ...

    // Try cache first
    const cached = await getCachedQuery(query, finalFilters)
    if (cached) {
      const responseTime = Date.now() - startTime
      return NextResponse.json({
        data: cached,
        dataSource: 'bigquery-cached',
        responseTime,
        cached: true,
      })
    }

    // Execute query
    const queryFn = QUERY_REGISTRY[query]
    if (!queryFn) {
      return NextResponse.json(
        { error: `Unknown query: ${query}` },
        { status: 400 }
      )
    }

    const result = await queryFn(finalFilters)
    const responseTime = Date.now() - startTime

    // Cache result
    await setCachedQuery(query, finalFilters, result)

    return NextResponse.json({
      data: result,
      dataSource: 'bigquery',
      responseTime,
      cached: false,
    })
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Step 4: Add cache monitoring endpoint**

Create `/src/app/api/bigquery/cache-stats/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET() {
  try {
    const keys = await kv.keys('bq:query:*')

    // Group by query name
    const stats: Record<string, number> = {}
    keys.forEach(key => {
      const queryName = key.split(':')[2] // bq:query:QUERYNAME:...
      stats[queryName] = (stats[queryName] || 0) + 1
    })

    return NextResponse.json({
      totalCachedKeys: keys.length,
      byQuery: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch cache stats' },
      { status: 500 }
    )
  }
}
```

#### Testing
- ✅ First request: cache miss, hits BigQuery
- ✅ Second request: cache hit, returns from cache
- ✅ Response includes `cached: true/false` flag
- ✅ Cache expires after TTL
- ✅ Cache invalidation works
- ✅ Performance improvement: 30-50% faster on cache hits

#### Rollback Plan
Remove cache integration from query route, revert to direct BigQuery calls.

#### Success Criteria
- Cache hit rate: 50-70% within 1 week
- Average response time: 30-50% reduction for cached queries
- BigQuery costs: 20-30% reduction
- Zero cache-related errors in production

---

### 5. Data Source Badge Consistency
**Priority:** 🟢 LOW
**Risk Level:** None
**Effort:** 1 hour
**Impact:** User transparency

#### Problem
`dataSource` badge from `useBigQueryData` hook may not be consistently displayed across all pages.

#### Current State
- Some pages display badge
- Some pages don't display badge
- No standardized positioning or styling

#### Desired State
- All BigQuery-driven pages display data source badge
- Consistent positioning (top-right corner of main content area)
- Badge shows: `bigquery`, `bigquery-cached`, `mock`, or `store`
- Color-coded: blue (bigquery), green (cached), amber (mock/store)

#### Implementation Steps

**Step 1: Create standardized badge component**

Edit `/src/components/ui/data-source-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge'
import { Database, Zap, TestTube } from 'lucide-react'

interface DataSourceBadgeProps {
  source: 'bigquery' | 'bigquery-cached' | 'mock' | 'store'
  responseTime?: number
  className?: string
}

export function DataSourceBadge({ source, responseTime, className }: DataSourceBadgeProps) {
  const config = {
    bigquery: {
      label: 'Live Data',
      icon: Database,
      variant: 'default' as const,
      className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
    },
    'bigquery-cached': {
      label: 'Live Data (Cached)',
      icon: Zap,
      variant: 'default' as const,
      className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    },
    mock: {
      label: 'Demo Data',
      icon: TestTube,
      variant: 'outline' as const,
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
    },
    store: {
      label: 'Calculated',
      icon: TestTube,
      variant: 'outline' as const,
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
    },
  }

  const { label, icon: Icon, className: badgeClassName } = config[source]

  return (
    <Badge variant="outline" className={`${badgeClassName} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
      {responseTime && <span className="ml-1 text-xs opacity-70">({responseTime}ms)</span>}
    </Badge>
  )
}
```

**Step 2: Add to PageHeader component**

Edit `/src/components/layout/PageHeader.tsx`:

```typescript
import { DataSourceBadge } from '@/components/ui/data-source-badge'

interface PageHeaderProps {
  title: string
  description?: string
  dataSource?: 'bigquery' | 'bigquery-cached' | 'mock' | 'store'
  responseTime?: number
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  dataSource,
  responseTime,
  actions
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {dataSource && <DataSourceBadge source={dataSource} responseTime={responseTime} />}
        {actions}
      </div>
    </div>
  )
}
```

**Step 3: Update pages to use consistent badge**

Example for `/src/app/(dashboard)/sales/page.tsx`:

```typescript
export default function SalesPage() {
  const { data, isLoading, dataSource, responseTime } = useBigQueryData(...)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Dashboard"
        description="Real-time sales performance across all markets"
        dataSource={dataSource}
        responseTime={responseTime}
      />
      {/* ... rest of page ... */}
    </div>
  )
}
```

#### Testing
- ✅ Badge displays on all BigQuery pages
- ✅ Badge color matches data source type
- ✅ Response time displays correctly
- ✅ Badge responsive on mobile
- ✅ Dark mode styling correct

#### Success Criteria
- 100% of BigQuery pages display badge
- Users can quickly identify data source
- Cached queries visually distinct from fresh queries

---

### 6. Query Consolidation Strategy
**Priority:** 🟢 LOW
**Risk Level:** Medium (requires careful testing)
**Effort:** 3-5 days
**Impact:** Maintainability, reduced code duplication

#### Problem
140+ queries in QUERY_REGISTRY with some duplication (e.g., `sales-today` vs `bcg-sales-today`).

#### Current State
- Separate query functions for similar data from different sources
- QUERY_REGISTRY growing large
- Developers unsure which query to use

#### Desired State
- Consolidated query functions with source parameter
- QUERY_REGISTRY reduced to ~100 queries
- Clear query naming conventions

#### Implementation Options

**Option A: Query Variants System**

```typescript
// Before (2 functions)
function getSalesToday(options) { /* W3 query */ }
function getBCGSalesToday(options) { /* BCG query */ }

// After (1 function with source param)
function getSalesToday(options: QueryOptions & { source?: 'w3' | 'bcg' }) {
  const source = options.source || 'w3' // Default to W3

  if (source === 'bcg') {
    // BCG query logic
  } else {
    // W3 query logic
  }
}

// Registry
const QUERY_REGISTRY = {
  'sales-today': (options) => getSalesToday({ ...options, source: 'w3' }),
  'bcg-sales-today': (options) => getSalesToday({ ...options, source: 'bcg' }),
}
```

**Option B: Source-Specific Modules**

Keep separate functions but organize better:
```
/src/lib/bigquery/queries/
  sales/
    w3.ts       // W3_Contract_Checker queries
    bcg.ts      // BCG_RTD_DB queries
    index.ts    // Re-exports with naming convention
```

**Recommendation:** Start with Option B (reorganization) before attempting Option A (consolidation).

#### Implementation Steps

**Phase 1: Documentation (Safe, 2 hours)**
- Document which queries are duplicates
- Create migration guide
- Get team buy-in

**Phase 2: Reorganization (Low risk, 1 day)**
- Organize query files by source system
- Update imports
- No functional changes

**Phase 3: Consolidation (Higher risk, 2-3 days)**
- Merge duplicate functions
- Add source parameter
- Extensive testing required

**RECOMMENDATION:** Complete Phase 1-2 only. Phase 3 optional and lower priority.

#### Testing
- ✅ All existing pages still work
- ✅ No query results changed
- ✅ Build succeeds
- ✅ Manual testing of 10+ representative pages

#### Success Criteria
- Developer confusion reduced (measured by Slack questions)
- Query organization clearer
- QUERY_REGISTRY easier to navigate

---

## Implementation Timeline

### Sprint 1 (Optional)
**Week 1-2:** Low priority items
- [ ] Item 1: Legacy Mock File Cleanup (1-2 hours)
- [ ] Item 2: Query Duplication Documentation (2-3 hours)
- [ ] Item 5: Data Source Badge Consistency (1 hour)

**Total effort:** 4-6 hours

### Sprint 2 (Optional)
**Week 3-4:** Medium priority items
- [ ] Item 3: Query Performance Monitoring (4-6 hours)
- [ ] Item 4: Query Result Caching (1-2 days)

**Total effort:** 2-3 days

### Sprint 3+ (Optional)
**Future backlog:**
- [ ] Item 6: Query Consolidation Strategy (3-5 days)
- [ ] Additional performance optimizations based on monitoring data

---

## Testing Strategy

### Pre-Implementation Testing
- [ ] Identify representative test pages (10-15 pages covering all patterns)
- [ ] Document expected behavior for each page
- [ ] Create baseline performance metrics

### During Implementation
- [ ] Unit tests for new utilities (cache, logging)
- [ ] Integration tests for query route changes
- [ ] Manual testing of affected pages
- [ ] Performance comparison (before/after)

### Post-Implementation Testing
- [ ] Full regression test of all 100 dashboard pages
- [ ] Build succeeds in production environment
- [ ] No errors in production logs for 48 hours
- [ ] Performance monitoring shows expected improvements

### Rollback Criteria
If any of these occur, rollback immediately:
- 🔴 Build failures
- 🔴 Critical errors in production logs
- 🔴 User-reported data inconsistencies
- 🔴 Performance degradation > 20%

---

## Monitoring & Success Metrics

### Key Performance Indicators

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Bundle Size** | Current | -15KB | webpack-bundle-analyzer |
| **Cache Hit Rate** | 0% | 50-70% | Cache stats endpoint |
| **Avg Response Time** | Current | -30% | Query logs |
| **Slow Queries (>5s)** | Unknown | <5% | Performance monitoring |
| **BigQuery Cost** | Current | -20% | GCP billing |
| **Developer Questions** | Current | -50% | Slack/docs engagement |

### Weekly Monitoring (if implemented)
- [ ] Review query performance logs
- [ ] Check cache hit rates
- [ ] Analyze slow query alerts
- [ ] Review BigQuery costs

### Monthly Review (if implemented)
- [ ] Generate performance report
- [ ] Identify new optimization opportunities
- [ ] Update cache TTL configurations
- [ ] Review query consolidation progress

---

## Risk Assessment

### Low Risk Items ✅
- Legacy mock file cleanup
- Query documentation
- Badge consistency
- Performance logging

**Mitigation:** Easy rollback, no functional changes

### Medium Risk Items ⚠️
- Query result caching
- Query consolidation

**Mitigation:** Extensive testing, gradual rollout, feature flags

### High Risk Items ❌
- None identified in this plan

---

## Appendices

### Appendix A: Verification Commands

```bash
# Verify no mock data imports in production pages
grep -r "from ['\"@/lib/mock" src/app/(dashboard) | grep -v admin | grep -v platform-admin

# Check bundle size
npm run build
# Review .next/build-manifest.json

# Test query performance
curl -X POST http://localhost:3000/api/bigquery/query \
  -H "Content-Type: application/json" \
  -d '{"query":"sales-today","filters":{}}'

# Check cache stats (if implemented)
curl http://localhost:3000/api/bigquery/cache-stats
```

### Appendix B: Rollback Procedures

**For Code Changes:**
```bash
# Revert last commit
git revert HEAD

# Or revert specific commit
git revert <commit-hash>

# Push to trigger redeploy
git push origin main
```

**For Environment Variables:**
1. Go to Vercel dashboard → Settings → Environment Variables
2. Revert to previous values
3. Redeploy

**For Database/Cache:**
```bash
# Flush all cache keys
vercel env pull
# Connect to KV and run:
# FLUSHALL (use with caution!)
```

### Appendix C: Contact Information

**For Questions:**
- Technical Lead: [Name]
- BigQuery Admin: [Name]
- DevOps: [Name]

**For Escalation:**
- Production issues: #incidents Slack channel
- Performance issues: #performance Slack channel

---

**Plan Created:** 2026-01-27
**Status:** READY FOR REVIEW
**Approval Required:** Product Owner, Tech Lead

---

**End of Remediation Plan**
