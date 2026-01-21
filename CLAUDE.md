# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:3000)
npm run dev:clean  # Clear .next cache and start dev server
npm run build      # Production build
npm run lint       # Run ESLint
npm run clean      # Clear .next and node_modules cache
```

## Architecture Overview

**Next.js 14 App Router** BI dashboard for Rentokil pest control. Uses **synthetic deterministic data** (seeded random generation) with optional Supabase/RTX backend.

### Data Flow

```
/src/lib/kpis.ts (KPI definitions - single source of truth)
       ↓
/src/lib/kpi-calculations.ts (value calculations with role-based filtering)
       ↓
/src/lib/data.ts (synthetic data: accounts, opportunities, invoices, service events)
       ↓
/src/services/ (abstraction layer - swap mock ↔ Supabase ↔ RTX via env)
       ↓
/src/store/index.ts (Zustand state: role, scenario, filters, theme)
       ↓
React components consume via useAppStore()
```

### Service Layer (`/src/services/`)

```typescript
import { services } from '@/services'
await services.accounts.getAll()
```

Provider selection via `NEXT_PUBLIC_DATA_SOURCE` env: `mock` | `rtx` | `salesforce` | `hybrid`

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

### Key Files

| File | Purpose |
|------|---------|
| `/src/lib/kpis.ts` | KPI definitions (add new KPIs here) |
| `/src/lib/kpi-calculations.ts` | KPI calculation logic |
| `/src/store/index.ts` | Zustand store (role, scenario, theme) |
| `/src/components/layout/Sidebar.tsx` | Navigation (role-based visibility) |
| `/src/middleware.ts` | Auth checks, route protection |
| `/src/lib/admin.ts` | Admin email list and access control |
| `/src/lib/mock/platformAdminData.ts` | Platform Admin mock data (TEST_MODE toggle) |
| `/src/lib/mock/saltiData.ts` | SALTI Dashboard mock data (47 KPIs) |

### Admin Access

Admin emails are defined in `/src/lib/admin.ts`:

```typescript
export const ADMIN_EMAILS = [
  'cody.lytle@rentokil.com',
  'cody.lytle@prestox.com',
]
```

**Admin privileges:**
- Skip onboarding (auto-assigned exec role)
- Access to `/admin` page with role simulation, test mode controls
- Admin link visible in sidebar

### SALTI Dashboard

The SALTI Dashboard at `/admin` (SALTI tab) contains **47 KPIs in 9 categories**:

| Category | KPIs | Component |
|----------|------|-----------|
| Lead Funnel | MQL, SQL, Scheduled, Inspected, Proposed, Sold, conversion rates | `SALTILeadFunnel.tsx` |
| Target KPIs | Revenue vs target, proposal goals, close rates | `SALTITargetKPIGauge.tsx` |
| 5-10-2 | Daily activity metrics (5 calls, 10 emails, 2 visits) | `SALTIFiveTenTwo.tsx` |
| Sales Results | Won/lost deals, avg deal size, cycle time | `SALTISalesResults.tsx` |
| Portfolio | Account health, churn risk, expansion opportunities | `SALTIPortfolio.tsx` |
| HR Metrics | Headcount, turnover, training completion | `SALTIHRMetrics.tsx` |

Mock data: `/src/lib/mock/saltiData.ts`

---

## Critical Patterns

### Hydration Fix (Required for Zustand persisted state)

Components using persisted Zustand state need hydration guards to avoid React errors 418/423/425:

```typescript
export function MyComponent() {
  const [mounted, setMounted] = useState(false)
  const { settings } = useAppStore()

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null
  // Now safe to use settings.role, settings.theme, etc.
}
```

### KPI Calculation Pitfalls

```typescript
// WRONG - circular target (variance always meaningless)
const target = actual * 1.05

// CORRECT - fixed target based on business logic
const target = accounts.length * 1400

// WRONG - mixing count goals with revenue
const progress = revenue / proposalCountGoal

// CORRECT - use revenue quota
const progress = revenue / monthlyRevenueQuota
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

---

## Adding Features

**New KPI:**
1. Add definition to `/src/lib/kpis.ts`
2. Add calculation to `/src/lib/kpi-calculations.ts`

**New Route:**
1. Create page in `/src/app/(dashboard)/your-route/page.tsx`
2. Add to sidebar in `/src/components/layout/Sidebar.tsx` with role visibility

**New Google Sheets Integration:**
1. Types in `/src/types/` matching CSV columns exactly
2. Data generation in `/src/lib/`
3. Role-appropriate pages in `/src/app/`

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | App health status |
| `/api/kpis` | GET | All KPIs (supports `?role=` and `?top10=true`) |
| `/api/reconcile` | GET/POST | KPI reconciliation with tolerance rules |
| `/api/rtx/health` | GET | RTX Data Hub connection status |
| `/api/rtx/discover` | POST | Schema discovery (requires auth) |

See `/docs/api-reference.md` for full endpoint documentation.

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_DATA_SOURCE=mock          # mock | rtx | salesforce | hybrid
NEXT_PUBLIC_SUPABASE_URL=             # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # Supabase anon key
RTX_API_ENDPOINT=                     # RTX Data Hub URL (if using rtx/hybrid)
RTX_API_KEY=                          # RTX API key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=      # For technician route maps
```

---

## Testing Platform Admin UI

The Platform Admin console at `/platform-admin` has a stress-test mode:

```typescript
// /src/lib/mock/platformAdminData.ts
export const TEST_MODE = true  // Toggle to inject stress-test data
```

When `TEST_MODE = true`, all alert states trigger: SLA breaches, critical anomalies, schema changes, failed jobs.

---

## Documentation

| Doc | Purpose |
|-----|---------|
| `/docs/rtx-deployment-guide.md` | RTX monitoring system deployment |
| `/docs/database-schema.md` | Supabase migration schemas |
| `/docs/alpha-test-matrix.md` | Test matrix with acceptance criteria |
| `/docs/executive-demo-script.md` | 10-12 minute demo walkthrough |
| `/n8n/README.md` | n8n AI agent workflows setup |

---

## Git Notes

```bash
# If push rejected for private email
GIT_COMMITTER_EMAIL="user@users.noreply.github.com" \
git commit --amend --author="Name <user@users.noreply.github.com>" --no-edit

# Force Vercel rebuild
echo "trigger" >> vercel-build.txt && git add . && git commit -m "trigger rebuild"
```
