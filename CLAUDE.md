# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:3000) with cache fix
npm run dev:raw    # Start dev server directly (no cache fix wrapper)
npm run dev:clean  # Clear .next cache and start dev server
npm run build      # Production build
npm run build:clean # Clear cache and production build
npm start          # Start production server (after build)
npm run lint       # Run ESLint
npm run clean      # Clear .next and node_modules cache
npm run reset      # Clear cache and restart dev server
npm run audit      # Run dashboard audit script (npx tsx scripts/audit-dashboard.ts)
npm run pre-demo   # Run pre-demo checks (npx tsx scripts/pre-demo-check.ts)
npm test           # Run tests in watch mode (Vitest)
npm run test:run   # Run tests once (CI mode)
npm run test:ui    # Run tests with interactive UI
npm run test:coverage # Run tests with coverage report
```

**Testing**: Vitest + React Testing Library configured. See [`/docs/TESTING_SETUP.md`](docs/TESTING_SETUP.md) for details. Current test coverage: 14/18 tests passing (78%) for `useBigQueryData` hook.

## Architecture Overview

**Next.js 14 App Router** BI dashboard for Rentokil pest control. Uses **live BigQuery data** with empty default states (no mock fallback).

### Data Flow (BigQuery-Primary)

```
BigQuery Production (bidata-sharedus-production)
       │
       ├── S4 (Unified Views) - Leads, Branch hierarchy
       ├── S0_TMX (TMX Data) - Leads, Employees, Inspections
       ├── W3_Contract_Checker - Contracts, Sales
       ├── BCG_RTD_DB (70 tables, 596M rows) - Analytics
       └── Reports - AR/Finance
              │
              ▼
/src/lib/bigquery/queries/*.ts (26 query modules)
              │
              ▼
/api/bigquery/query (POST - centralized query API)
              │
              ▼
useBigQueryData() hook with role-based filtering
              │
              ▼
Dashboard Components (43+ pages)
```

### BigQuery Integration

**All dashboard pages use BigQuery-only** - no mock data fallback. Pages show empty states while loading or on error.

**Environment Auto-Detection** (priority order):
1. `BIGQUERY_ENVIRONMENT` env var (explicit override)
2. `VERCEL_ENV` (`production` → production, `preview` → staging)
3. `NODE_ENV` (`production` → production, `test` → staging)
4. Default: `production` (set `BIGQUERY_ENVIRONMENT=dev` in `.env.local` for local dev)

**Project IDs**:
- Production: `bidata-sharedus-production`
- Staging: `bidata-sharedus-staging`
- Dev: `bidata-sharedus-dev`

**Authentication**:
- Local dev: `gcloud auth application-default login`
- Production: Service account or Workload Identity

### BigQuery Data Pattern (Current Standard)

```typescript
// BigQuery-only pattern with defaultData (no mock fallback)
const EMPTY_DATA: DisplayType = {
  items: [],
  total: 0,
}

const {
  data,
  isLoading,
  dataSource,
  responseTime,
  error,
  refetch,
} = useBigQueryData<BQType, DisplayType>({
  queryName: 'query-name',        // Must match API registry key
  filters: { market: marketId },
  defaultData: EMPTY_DATA,        // Empty state, NOT mock data
  transformBigQueryData: (raw) => transformToUI(raw),
  includeOrgFilters: true,        // Auto-inject market/region/branch
  includeRoleFilters: true,       // Auto-inject user-specific filters
})
```

### Query API Registry

All BigQuery queries are routed through `/api/bigquery/query` POST endpoint. Query names must be registered in `src/app/api/bigquery/query/route.ts`:

```typescript
const QUERY_REGISTRY: Record<string, QueryFn> = {
  'leads-by-pest-type': getLeadsByPestType,
  'bcg-sales-analytics': getBCGSalesAnalytics,
  'data-freshness': getDataFreshness,
  // ... 100+ registered queries
}
```

### BigQuery Integration Standards (Required for All Pages)

**CRITICAL**: All pages using `useBigQueryData` MUST implement these standards. Non-compliance may result in data leakage, poor UX, or production failures.

#### 1. Error Handling (REQUIRED)

Every page with BigQuery data MUST have error handling with recovery actions:

```typescript
// Extract error from useBigQueryData hook
const { data, isLoading, error, dataSource, responseTime, refetch } = useBigQueryData({
  queryName: 'your-query',
  defaultData: EMPTY_DATA,
  transformBigQueryData: transform,
})

// Add error display BEFORE rendering main content
if (error) {
  return (
    <div className="space-y-4">
      <Breadcrumb items={[...]} />
      <PageHeader title="Your Page Title" />

      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">Failed to Load Data</span>
        </div>

        <div className="space-y-3">
          {/* Error message */}
          <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
            {error}
          </div>

          {/* Context information */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
              <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{dataSource}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Query:</span>
              <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">your-query</p>
            </div>
          </div>

          {/* Recovery actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('/platform-admin', '_blank')}>
              <FileText className="h-3 w-3 mr-1.5" />
              View Logs
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 2. DataSourceBadge (REQUIRED)

Every page with BigQuery data MUST display `DataSourceBadge` in the page header:

```typescript
import { DataSourceBadge } from '@/components/ui/data-source-badge'

// In your JSX, place near the page title
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Your Page Title</h1>
    <p className="text-gray-500">Description</p>
  </div>
  <DataSourceBadge
    source={dataSource}
    responseTime={responseTime}
    isLoading={isLoading}
  />
</div>
```

**Badge states:**
- **Live** (green): Data from BigQuery production
- **Demo** (purple): Mock data (test mode)
- **Loading** (blue): Query in progress
- **Error** (red): Query failed

#### 3. Filter Configuration (REQUIRED)

**CRITICAL**: Incorrect filter configuration can cause data leakage between users/roles.

##### When to use `includeOrgFilters: true`

Use for data that should be scoped to user's market/region/branch:

```typescript
// Examples: Lead rankings, sales by territory, operations by location
const { data } = useBigQueryData({
  queryName: 'lead-rankings',
  defaultData: EMPTY_DATA,
  includeOrgFilters: true,  // ✅ Filters to user's org
  transformBigQueryData: transform,
})
```

**Use cases:**
- Lead data by geography (leads/rankings, leads/journey, leads/trends)
- Sales performance by territory (sales/backlog, sales/today)
- Operations metrics by location (ops/page, ops/new-starts)
- Regional/branch dashboards
- Any data showing organizational hierarchy

##### When to use `includeRoleFilters: true`

Use for user-specific data (individual performance):

```typescript
// Examples: Rep's own pipeline, tech's own schedule
const { data } = useBigQueryData({
  queryName: 'tech-schedule',
  defaultData: EMPTY_DATA,
  includeRoleFilters: true,  // ✅ Filters to logged-in user
  transformBigQueryData: transform,
})
```

**Use cases:**
- Rep's own sales/pipeline (ae/tracker, ae/sales)
- Technician's own route/tickets (tech/page, tech/tickets)
- Manager's direct reports
- Individual performance metrics

##### When to use both filters

For pages that need both organizational AND user-specific filtering:

```typescript
// Example: Operations dashboard showing user's assigned work in their org
const { data } = useBigQueryData({
  queryName: 'ops-overview',
  defaultData: EMPTY_DATA,
  includeOrgFilters: true,   // ✅ User's organization
  includeRoleFilters: true,  // ✅ User-specific data
  transformBigQueryData: transform,
})
```

##### When to intentionally omit filters

Use `false` with **explanatory comment** for company-wide views:

```typescript
// Executive/admin dashboards, platform monitoring, national views
const { data } = useBigQueryData({
  queryName: 'executive-kpis',
  defaultData: EMPTY_DATA,
  includeOrgFilters: false,  // Executive view - intentionally shows company-wide data
  includeRoleFilters: false, // No user filtering needed
  transformBigQueryData: transform,
})
```

**Valid use cases:**
- Executive command center (company-wide KPIs)
- Platform admin pages (health, monitoring, data quality)
- National aggregated views (ops/national, sales/national)
- Pages that manually filter by user ID from profile

**REQUIRED**: Always add a comment explaining why filters are omitted.

#### 4. Complete Implementation Example

Reference these pages as gold standard implementations:

- [/daily-performance/page.tsx](src/app/(dashboard)/daily-performance/page.tsx) - Proper error handling, DataSourceBadge, org filters
- [/finance/page.tsx](src/app/(dashboard)/finance/page.tsx) - Full error card with context, retry actions
- [/ae/tracker/page.tsx](src/app/(dashboard)/ae/tracker/page.tsx) - Role-based filtering, multiple error states
- [/sales/national/page.tsx](src/app/(dashboard)/sales/national/page.tsx) - Intentional filter omission with comment

#### 5. Pre-Flight Checklist

Before pushing BigQuery-connected pages:

- [ ] Error handling implemented with recovery actions
- [ ] DataSourceBadge displayed in header
- [ ] `includeOrgFilters` set correctly (true/false with comment)
- [ ] `includeRoleFilters` set correctly (true/false with comment)
- [ ] Empty state `defaultData` defined (NOT mock data)
- [ ] Transform function handles edge cases (empty arrays, nulls)
- [ ] Query name registered in `/api/bigquery/query/route.ts`
- [ ] Tested with different roles (exec, manager, rep, tech)
- [ ] Tested with different org filters (market/region/branch)
- [ ] Verified no data leakage between users

**Audit Reference**: See [/docs/bigquery-audit-2026-02.md](docs/bigquery-audit-2026-02.md) for compliance audit results.

### BigQuery Query Modules (26 files)

| Module | Tables | Purpose |
|--------|--------|---------|
| `leads.ts` | S4.Fact_Leads_Acc_Daily_Dtls_Snp | Lead funnel, trends, rankings |
| `sales.ts` | W3_Contract_Checker.T0_unf_Contract_All | Sales today, backlog, speed-to-install |
| `salti.ts` | S0_TMX.tmx_lead | SALTI dashboard (8 queries) |
| `finance.ts` | Reports.VwUnf_dim_ar_detail | AR aging, collections |
| `termite.ts` | S0.raw_RNA_PNIDetails_Daily | PNI inspections, renewals |
| `bcg-analytics.ts` | BCG_RTD_DB.DR_* | 16 queries from 70-table dataset |
| `lead-service.ts` | S0_TMX.tmx_lead | Lead Service Engine pipeline |
| `executive.ts` | Multiple | Command center KPIs |
| `organization.ts` | S4.Dim_Branch_BranchID_NA_T1_Vw | Market/Region/Branch hierarchy |
| `data-freshness.ts` | Multiple | ETL pipeline SLA tracking |

### Role Hierarchy (10 roles)

```
exec → market_vp / market_sales_director → region_director / region_sales_manager → manager
                                                                                       ↓
                                                                       sales_manager ← → ops_manager
                                                                             ↓               ↓
                                                                            rep         technician
```

- **exec/directors/managers**: Command center routes (`/`, `/sales`, `/ops`, `/finance`, `/governance`)
- **rep**: Account Executive routes (`/ae/*`)
- **technician**: Technician routes (`/tech/*`)

### BigQuery Column Registry

**NEW**: Comprehensive column-level documentation for BigQuery tables.

**Location**: `/src/lib/bigquery/columns/`

Provides detailed metadata for 50+ most-used BigQuery columns across critical tables. Each column documented with:
- Technical specs (type, nullability, precision)
- Business purpose and ownership
- Common SQL usage patterns (filters, joins, aggregations)
- Sample values and validation rules
- Data governance (PII flags, sensitivity)
- Source system lineage

**Quick Reference**:

```typescript
import { getColumnMetadata, searchColumns, getTableColumns } from '@/lib/bigquery/columns'

// Get single column metadata
const sellDate = getColumnMetadata('W3_Contract_Checker', 'T0_unf_Contract_All', 'SellDate')
console.log(sellDate?.description)       // "Date when the contract was sold/closed"
console.log(sellDate?.commonFilters)     // ["SellDate >= DATE_SUB(...)", ...]
console.log(sellDate?.businessOwner)     // "Sales Operations"

// Get all columns for a table
const contractCols = getTableColumns('W3_Contract_Checker', 'T0_unf_Contract_All')
Object.keys(contractCols.columns)  // ["SellDate", "StartDate", "ContractValue", ...]

// Search across all columns
const dateCols = searchColumns('date')   // Find all date-related columns
```

**Documented Tables** (52 columns across 3 tables):

| Dataset | Table | Columns | Status |
|---------|-------|---------|--------|
| W3_Contract_Checker | T0_unf_Contract_All | 18 | ✅ Sales lifecycle tracking |
| S4 | Fact_Leads_Acc_Daily_Dtls_Snp | 17 | ✅ Lead funnel metrics |
| S0_TMX | tmx_lead | 17 | ✅ SALTI lead pipeline |

**See**: `/src/lib/bigquery/columns/README.md` for full documentation and examples.

### Key Files

| File | Purpose |
|------|---------|
| `/src/lib/bigquery/queries/index.ts` | Central export for all 100+ query functions |
| `/src/app/api/bigquery/query/route.ts` | Query API with 100+ registered queries |
| `/src/hooks/useBigQueryData.ts` | Hook for BigQuery data with role filtering |
| `/src/lib/bigquery/role-filters.ts` | Role-based query filter injection |
| `/src/lib/bigquery/client.ts` | BigQuery client with environment auto-detection |
| `/src/store/index.ts` | Zustand store (role, filters, theme, test mode) |
| `/src/components/layout/Sidebar.tsx` | Navigation (role-based visibility) |
| `/src/components/layout/AdminSidebar.tsx` | Admin navigation with role preview menu (all 10 roles) |
| `/src/middleware.ts` | Auth checks, route protection, onboarding flow |
| `/src/hooks/useEffectiveRole.ts` | Returns previewed role for admin or actual role |
| `/src/lib/admin.ts` | Admin email list and access control |

### Authentication

**Supabase Auth** with magic link (OTP) flow. Falls back to demo mode if Supabase not configured.

```typescript
import { useAuth } from '@/components/providers/AuthProvider'
const { user, profile, loading, signIn, signOut } = useAuth()
```

**Middleware flow** (`/src/middleware.ts`):
1. No Supabase configured → demo mode (allow all)
2. Not authenticated → redirect to `/login`
3. Admin email → skip onboarding, set `onboarding_complete` cookie
4. No profile → redirect to `/onboarding`
5. Has profile → allow access

### Admin Access

Admin emails are defined in `/src/lib/admin.ts`. Admin privileges:
- Skip onboarding (auto-assigned exec role)
- Access to `/admin` page with role simulation, test mode controls
- Role preview mode (view dashboard as any role)

### Role Preview Pattern

```typescript
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
const role = useEffectiveRole(mounted)  // Returns previewedRole if admin is previewing
```

### Organization Data Pattern

```typescript
import { useOrganizationData } from '@/hooks/useOrganizationData'
const { markets, regions, branches, isLoading } = useOrganizationData()
// Returns BigQuery-sourced org hierarchy for cascading Market → Region → Branch filters
```

---

## Critical Patterns

### Hydration Fix (Required for Zustand persisted state)

```typescript
export function MyComponent() {
  const [mounted, setMounted] = useState(false)
  const { settings } = useAppStore()

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null
  // Now safe to use settings.role, settings.theme, etc.
}
```

### Adding a New BigQuery Query

1. Create query function in `/src/lib/bigquery/queries/your-module.ts`:
```typescript
export async function getYourData(options: QueryOptions): Promise<YourType[]> {
  const sql = `SELECT ... FROM \`${PROJECT}.dataset.table\` WHERE ...`
  const result = await bigQueryClient.query<YourType>(sql)
  return result.rows
}
```

2. Export from `/src/lib/bigquery/queries/index.ts`

3. Register in `/src/app/api/bigquery/query/route.ts`:
```typescript
const QUERY_REGISTRY = {
  'your-query-name': getYourData,
  // ...
}
```

4. Use in component:
```typescript
const { data } = useBigQueryData({
  queryName: 'your-query-name',
  defaultData: EMPTY_STATE,
  transformBigQueryData: (raw) => transform(raw),
})
```

### Chart Styling (Recharts)

```typescript
// Always disable gray hover overlay
<Tooltip cursor={false} content={...} />

// Dark mode grid lines - wrap chart container
<div className="[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700">

// Never hardcode grid stroke colors
<CartesianGrid strokeDasharray="3 3" />  // Let CSS handle it
```

### ESLint Build Fixes

```typescript
// Unescaped quotes in JSX
don't → don&apos;t
"quote" → &quot;quote&quot;
```

### Tooltip Pattern (Radix UI)

All interactive elements should have tooltips for better UX. Use the standardized tooltip component:

```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Wrap component with TooltipProvider (usually at parent level)
<TooltipProvider>
  <Tooltip delayDuration={0}>  {/* 0 for instant, 300 for delayed */}
    <TooltipTrigger asChild>
      <Button>Your Button</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Helpful tooltip text</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**When to add tooltips:**
- Sidebar navigation icons (when collapsed)
- Status badges (explain what Good/Warning/Critical means)
- Trend arrows (show prior/current values and interpretation)
- Icon buttons without text labels
- Data source badges (explain Live/Demo/Loading/Error states)
- Complex metrics (show calculation methodology)

### Error State Pattern

All error states must provide clear context and recovery actions:

```typescript
// Error display with recovery actions
<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
    <AlertTriangle className="h-4 w-4" />
    <span className="font-semibold">Error Title</span>
  </div>

  <div className="space-y-3">
    {/* Error message */}
    <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
      {errorMessage}
    </div>

    {/* Context (optional) */}
    <div className="grid grid-cols-2 gap-3 text-xs">
      <div>
        <span className="text-gray-500">Context Label:</span>
        <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">Context Value</p>
      </div>
    </div>

    {/* Recovery actions */}
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
      <Button variant="outline" size="sm" onClick={retryAction}>
        <RefreshCw className="h-3 w-3 mr-1.5" />
        Retry
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.open(logsUrl, '_blank')}>
        <FileText className="h-3 w-3 mr-1.5" />
        View Logs
        <ExternalLink className="h-3 w-3 ml-1" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.location.href = mailtoLink}>
        <Mail className="h-3 w-3 mr-1.5" />
        Contact Support
      </Button>
    </div>
  </div>
</div>
```

**Error state requirements:**
- Prominent visual indicator (red background, AlertTriangle icon)
- Clear error message in monospace font
- Contextual information (what failed, when, affected resources)
- 2-4 actionable recovery buttons:
  - Retry operation
  - View logs/details (deep link to admin console)
  - Contact support (pre-filled mailto with error details)
- Consistent styling with dark mode support

---

## Adding Features

**New BigQuery-Connected Page:**
1. Create page in `/src/app/(dashboard)/your-route/page.tsx`
2. Define empty default state constant (e.g., `EMPTY_DATA`)
3. Use `useBigQueryData` hook with registered query name
4. Add transform function for BQ data → display format
5. Add to sidebar in `/src/components/layout/Sidebar.tsx` with role visibility

**New KPI:**
1. Add definition to `/src/lib/kpis.ts`
2. Add calculation to `/src/lib/kpi-calculations.ts`

---

## Route Consolidations & Redirects

**IMPORTANT**: Some dashboard pages have been consolidated from multiple routes into single pages with tabs.

### Sales Tracker (Consolidated Jan 2026)

**Current Route**: `/ae/tracker` (single page with tabs)

**Old Routes** (redirected in `next.config.js`):
- `/ae/tracker/proposals` → `/ae/tracker` (Proposals tab)
- `/ae/tracker/sales` → `/ae/tracker` (Sales tab)
- `/ae/tracker/totals` → `/ae/tracker` (Totals tab)

**DO NOT**:
- Create separate pages for proposals/sales/totals routes
- Remove redirects from `next.config.js` without replacing them
- Split the consolidated page back into separate pages without updating all references

**If modifying routes**:
1. Update `next.config.js` redirects
2. Update `src/hooks/useRecentPages.ts` PAGE_TITLES mapping
3. Update navigation links in `src/components/layout/Sidebar.tsx`
4. Add migration comment in the page file
5. Test all old routes still redirect correctly

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | App health status |
| `/api/kpis` | GET | All KPIs (supports `?role=` and `?top10=true`) |
| `/api/bigquery/query` | POST | Execute named queries (100+ registered) |
| `/api/bigquery/health` | GET | BigQuery connection status |
| `/api/bigquery/health-check` | GET | Detailed BigQuery health with dataset access |

**POST /api/bigquery/query body:**
```json
{
  "query": "leads-by-pest-type",
  "filters": { "market": "NE", "daysBack": 30 }
}
```

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# BigQuery (optional - auto-detects from Vercel/NODE_ENV if not set)
BIGQUERY_ENVIRONMENT=dev              # production | staging | dev
BIGQUERY_PROJECT_ID=                  # Override auto-detected project ID
GOOGLE_APPLICATION_CREDENTIALS=       # Path to service account key (if not using ADC)
BIGQUERY_LOCATION=US

# Maps
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=      # For technician route maps
```

---

## BigQuery Datasets Used

| Dataset | Purpose | Key Tables |
|---------|---------|------------|
| `S4` | Unified views | Fact_Leads_Acc_Daily_Dtls_Snp, Dim_Branch_BranchID_NA_T1_Vw |
| `S0_TMX` | TMX data | tmx_lead (2.2M), tmx_employee (1.2M), Inspections (3.3M) |
| `W3_Contract_Checker` | Contracts | T0_unf_Contract_All (7.8M) |
| `BCG_RTD_DB` | Analytics | DR_Leads, DR_ContractSales, DR_Cancels (70 tables, 596M rows) |
| `Reports` | Finance | VwUnf_dim_ar_detail, VwUnf_ar_amount |

---

## localStorage Keys

| Key | Values | Purpose |
|-----|--------|---------|
| `rentokil-bi-store` | JSON | Zustand persisted state (role, theme, sidebar, test mode) |
| `onboarding_complete` | `true` | Cookie set by middleware after profile exists |

---

## Documentation

| Doc | Purpose |
|-----|---------|
| `/README.md` | Demo script with stakeholder questions & answers |
| `/docs/bigquery-integration-status.md` | BigQuery table/page mapping status |
| `/docs/rtx-deployment-guide.md` | RTX monitoring system deployment |
| `/docs/database-schema.md` | Supabase migration schemas |
| `/docs/alpha-test-matrix.md` | Test matrix with acceptance criteria |
| `/docs/executive-demo-script.md` | 10-12 minute demo walkthrough |
| `/docs/TESTING_SETUP.md` | Testing framework setup guide (Vitest + React Testing Library) |
| `/docs/TESTING_RESULTS.md` | Test suite results and regression prevention coverage |

---

## Mobile Builds (Capacitor)

```bash
npm run cap:init           # Initialize Capacitor (one-time setup)
npm run cap:add:ios        # Add iOS platform
npm run cap:add:android    # Add Android platform
npm run cap:sync           # Build web and sync to native platforms
npm run cap:build          # Alias for cap:sync
npm run cap:open:ios       # Open iOS project in Xcode
npm run cap:open:android   # Open Android project in Android Studio
```

---

## Git Notes

```bash
# If push rejected for private email
GIT_COMMITTER_EMAIL="user@users.noreply.github.com" \
git commit --amend --author="Name <user@users.noreply.github.com>" --no-edit

# Force Vercel rebuild
echo "trigger" >> vercel-build.txt && git add . && git commit -m "trigger rebuild"
```
