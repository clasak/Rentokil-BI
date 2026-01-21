# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server with auto cache fix (http://localhost:3000)
npm run dev:clean  # Clear .next cache and start dev server
npm run build      # Production build
npm run lint       # Run ESLint
npm run clean      # Clear .next and node_modules cache
npm run reset      # Clean and restart dev server
```

## Architecture Overview

**Next.js 14 App Router** demo for Rentokil pest control BI. Uses **synthetic deterministic data** (seeded random generation) with no external database.

### Data Flow

```
/src/lib/kpis.ts (KPI definitions - single source of truth)
       ↓
/src/lib/kpi-calculations.ts (value calculations)
       ↓
/src/lib/data.ts (synthetic data: accounts, opportunities, invoices, service events)
       ↓
/src/services/ (abstraction layer - swap mock ↔ Supabase via USE_MOCK_DATA env)
       ↓
/src/store/index.ts (Zustand state: role, scenario, filters, presenter mode)
       ↓
React components consume via useAppStore()
```

### Service Abstraction Layer (`/src/services/`)

Backend-ready architecture with swappable providers:
- `services/index.ts` - Provider selection based on `NEXT_PUBLIC_USE_MOCK_DATA` env
- `services/mock/` - Current implementation using synthetic data from `/lib/data.ts`
- `services/supabase/` - Stub for Supabase backend (set `USE_MOCK_DATA=false`)
- `services/types.ts` - Shared interfaces for all service methods

Usage: `import { services } from '@/services'` then `await services.accounts.getAll()`

### Role Hierarchy (10 roles)

```
exec → market_vp / market_sales_director → region_director / region_sales_manager → manager
                                                                                       ↓
                                                                       sales_manager ← → ops_manager
                                                                             ↓               ↓
                                                                            rep         technician
```

Navigation and data visibility change based on role:
- **exec/directors/managers**: Command center routes (`/`, `/sales`, `/ops`, `/finance`, `/governance`)
- **rep**: Account Executive routes (`/ae/*`)
- **technician**: Technician routes (`/tech/*`)

### State Management (`/src/store/index.ts`)

Zustand store with persistence. Key state:
- `settings.role` - Current role for RLS simulation
- `settings.demoMode` - Demo mode (currently only `bi_leadership`)
- `settings.scenario` - Forecast scenario (`base`, `upside`, `downside`)
- `presenterMode` - Guided demo walkthrough with spotlight overlays
- `theme` - Light/dark/system theme

### Types (`/src/types/`)

- `index.ts` - Core: Role, User, Account, Opportunity, KPIDefinition, Invoice, ServiceEvent
- `sales-tracker.ts` - AE proposal/sale tracking (mirrors Google Sheets CSV)
- `new-start-log.ts` - Sales→Ops handoff types
- `daily-sales-cadence.ts` - Branch Manager daily metrics

### Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Executive Command Center (top 10 KPIs) |
| `/kpi/[slug]` | KPI detail (Overview, Drivers, Actions, Reconcile, Definition tabs) |
| `/sales`, `/ops`, `/finance` | Department dashboards |
| `/forecast` | 8-week forecast with scenarios and backtest |
| `/governance` | KPI Dictionary, Data Quality, Permissions |
| `/ae/*` | Account Executive personal routes |
| `/tech/*` | Technician routes |
| `/presenter` | Presenter mode launcher |
| `/wbr`, `/qbr` | Weekly/Quarterly Business Review (PDF export) |

### CSV Data Structures

App mirrors Google Sheets used in the field:
1. **Sales Tracker** (`sales-tracker-data.ts`): Proposals/sales with Job Work, Termite, Contract pricing
2. **New Start Log** (`new-start-data.ts`): RED columns (AE) → YELLOW columns (Ops)
3. **Daily Sales Cadence** (`daily-sales-data.ts`): Branch metrics with optional TAP Leads column

### Adding New Features

**New KPI**: Add to `/src/lib/kpis.ts` → calculation in `/src/lib/kpi-calculations.ts`

**New Google Sheets integration**:
1. Types in `/src/types/` matching CSV columns exactly
2. Data generation in `/src/lib/`
3. Handle optional columns for backwards compatibility
4. Role-appropriate pages in `/src/app/`
5. Update sidebar in `/src/components/layout/Sidebar.tsx`

### Theme System

ThemeProvider in `/src/components/providers/ThemeProvider.tsx` supports:
- Light, dark, and system-preference modes
- Persisted via Zustand store
- Toggle in Header component

### Presenter Mode (`/src/components/features/DemoSpotlight.tsx`)

Guided demo walkthrough with spotlight overlays:
- Steps defined in `DEMO_CONFIG` object with routes, speaker notes, and spotlight targets
- Each spotlight can auto-click elements, show data sources, and display lineage
- Keyboard controls: `←→` navigate, `Space` auto-play, `N` toggle notes, `P` pop-out, `Esc` exit
- Pop-out window option for presenter notes on second screen

### Data Generation

All synthetic data uses `seedrandom` for determinism:
- Same seed = identical data
- Refresh button changes seed
- Volumes: ~1,500 accounts, ~2,500 opportunities, ~12,000 service events

---

## Alpha Testing Environment (Current State)

### Authentication System

**Supabase email/password authentication** is configured:
- Login page: `/login` with password-based sign-in (not magic links)
- Forgot password: Sends reset email via Supabase
- Reset password: `/auth/reset-password` handles the reset flow
- Onboarding: `/onboarding` collects user profile (name, department, role)

**Middleware** (`/src/middleware.ts`):
- Checks for authenticated user on protected routes
- Sets `onboarding_complete` cookie when profile exists in Supabase
- Falls back to demo mode if Supabase tables don't exist

**Profile Storage**:
- Primary: Supabase `user_profiles` table (if exists)
- Fallback: localStorage `user_profile` key
- Cookie: `onboarding_complete` to skip profile check after first login

### Admin Access

**Admin emails** (defined in `/src/components/layout/Sidebar.tsx`):
```typescript
const ADMIN_EMAILS = [
  'cody.lytle@rentokil.com',
  'cody.lytle@prestox.com',
]
```

**Admin-only features**:
- Admin link in sidebar (Lock icon)
- Admin console at `/admin` with:
  - Role simulation controls
  - Demo mode settings
  - Presenter mode launcher
  - Data quality toggle

### Role-Based Navigation

| Role | Main Navigation | Governance Section |
|------|----------------|-------------------|
| `exec` | Command Center, Sales, Ops, Finance, People, Forecast, Lead Service Engine | Yes |
| `market_vp` | Same as exec + Daily Rollup | Yes |
| `market_sales_director` | Same as exec + Daily Rollup | Yes |
| `region_director` | Same as exec + Daily Rollup | Yes |
| `region_sales_manager` | Same as exec + Daily Rollup | Yes |
| `sales_manager` | Same as exec | Yes |
| `manager` | Command Center, Daily Cadence, WIG Scorecard, Sales, Ops, Forecast, Lead Service Engine | Yes |
| `ops_manager` | Command Center, Ops, New Starts, Sales, Finance, Forecast, Lead Service Engine | Yes |
| `rep` | My Dashboard, Import Quote, Sales Tracker, Proposals, Sales, New Starts | **No** |
| `technician` | My Schedule, Service Tickets, Route | **No** |

### Settings Page

User-focused settings at `/settings` (same for all roles):
- Profile display (read-only role/access)
- Theme toggle (Light/Dark/System)
- Forecast scenario preference (Base/Upside/Downside)
- Notifications (disabled, "coming soon")
- Sign out button

**No demo controls** visible to regular users - those are admin-only.

### Tutorial System

**Role-specific tutorials** (`/src/components/features/Tutorial.tsx`):
- Each role has customized tutorial steps
- Guides users to relevant pages for their role
- Stored completion in localStorage: `tutorial_completed_{role}`

**RoleTutorial component** (`/src/components/features/RoleTutorial.tsx`):
- Can auto-show for new users
- Dialog-based step-by-step walkthrough

### Hydration Fix Pattern

Components using Zustand persisted state need hydration guards:

```typescript
export function MyComponent() {
  const [mounted, setMounted] = useState(false)
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use default during SSR
  const value = mounted ? settings.someValue : defaultValue

  if (!mounted) return null // or loading state
  // ... rest of component
}
```

**Fixed components**:
- `DataQualityBanner.tsx`
- `RoleTutorial.tsx`
- `PresenterMode.tsx`
- `DemoSpotlight.tsx`
- `Tutorial.tsx`
- `Sidebar.tsx` (uses `isClient` state)
- `Header.tsx` (uses `isClient` state)

### Known Issues & Solutions

**React Hydration Errors (418, 423, 425)**:
- Caused by Zustand persist middleware loading different state on client than SSR default
- Solution: Add `mounted` state check before accessing persisted values

**ESLint Build Errors**:
- Unescaped quotes in JSX: Use `&apos;` for `'` and `&quot;` for `"`
- Example: `don't` → `don&apos;t`

**Vercel Build Caching**:
- If old errors persist, push a trivial change to `vercel-build.txt` to force fresh build

### Deployment

- **Branch**: `alpha-test`
- **Platform**: Vercel
- **Build trigger file**: `vercel-build.txt` (change to force rebuild)

### Recent Changes (January 2026)

**Documentation Update (Jan 12):**
- Added Environment Variables section with all data source configs
- Added API Endpoints section with 11 documented endpoints
- Added n8n AI Workforce Agents section (Timmy, Tommy, Tina)
- Added Database Schema section with migration summaries
- Added Lead Service Engine section with routes and components
- Added PDF & Start Packet System section
- Added Extended Routes Table with 40+ routes by category
- Added Data Quality & Validation section
- Added Additional Components section
- Added Documentation Reference section

**Previous Changes:**
1. **Fixed hydration errors** in DataQualityBanner, RoleTutorial, PresenterMode
2. **Fixed ESLint errors** - escaped quotes in login page and Tutorial.tsx
3. **Fixed tutorial text** - Changed "PestPac" to "Salesforce" for quote import description
4. **Verified role-based sidebar** - Techs and AEs don't see Governance section
5. **Verified settings page** - Clean user-focused page, no demo controls for regular users

---

## Critical KPI Calculation Patterns

### Role-Based Data Filtering

KPI calculations in `/src/lib/kpi-calculations.ts` use role-based filtering to scope data appropriately:

```typescript
function filterDataByRole(
  role: Role,
  userId: string | undefined,
  accounts: Account[],
  opportunities: Opportunity[],
  invoices: Invoice[],
  serviceEvents: ServiceEvent[]
): FilteredData
```

**Important**: Always pass `role` and `userId` to `calculateKPIValues()` to ensure proper data scoping.

### Common Calculation Pitfalls (AVOID THESE)

**1. Circular Target Calculations**
```typescript
// WRONG - target always tracks actual, variance meaningless
const monthlyTarget = revenueMTD * 1.05

// CORRECT - fixed target based on account base
const monthlyTarget = accounts.length * 1400  // ~$1,400 per account/month
```

**2. Count vs Revenue Goals**
```typescript
// WRONG - using proposal COUNT as revenue denominator
const progress = revenue / proposalSummary.proposalGoal  // proposalGoal = ~15 proposals!

// CORRECT - using ISQ (Individual Sales Quota) revenue goal
const progress = revenue / salesSummary.monthISQ  // monthISQ = ~$15-20K
```

**3. Role-Scoped Counts**
```typescript
// WRONG - showing all technicians regardless of manager assignment
const techs = users.filter(u => u.role === 'technician')

// CORRECT - filter to assigned technicians for ops_manager role
const assignedTechIds = currentUser?.assignedTechnicians || []
const techs = users.filter(u =>
  u.role === 'technician' &&
  (assignedTechIds.length === 0 || assignedTechIds.includes(u.id))
)
```

### Understanding Inverse Metrics

Some metrics show "higher is better" even when the name sounds negative:

- **Service Risk Index**: Higher = Better (71 < target 85 = red card, but +2.2% = green arrow showing improvement)
- **Churn Rate**: Lower = Better (standard)
- **DSO (Days Sales Outstanding)**: Lower = Better (standard)

### KPI Detail Page Structure

Each KPI at `/kpi/[slug]` includes tabs:
- **Overview**: Summary with key drivers and actions
- **Drivers**: What impacts this metric
- **Actions**: Recommended next steps
- **Reconcile**: Compare to source systems
- **Definition**: Full KPI definition and calculation methodology

---

## UI Components

### Breadcrumb Navigation

Added breadcrumb component at `/src/components/ui/breadcrumb.tsx` for drill-down pages:

```typescript
import { Breadcrumb } from '@/components/ui/breadcrumb'

<Breadcrumb items={[
  { label: 'Sales', href: '/sales' },
  { label: 'Opportunity Name' }  // Last item has no href (current page)
]} />
```

Used on detail pages: KPI detail, Account detail, Opportunity detail, Invoice detail

### Lead Scoring Methodology

Lead Source Matrix component includes methodology documentation:
- Quality factors with weights (Historical Conversion 35%, Avg Deal Size 25%, etc.)
- Star ratings (1-5) definitions
- At-risk indicators (SLA breach, stale contact, etc.)

Access via Help button in `/src/components/lead-engine/LeadSourceMatrix.tsx`

### Chart Styling Rules (Recharts)

**IMPORTANT**: All Recharts charts MUST follow these patterns:

1. **No Gray Hover Overlay**: Always add `cursor={false}` to Tooltip components to disable the default gray overlay on hover:
   ```typescript
   <Tooltip cursor={false} content={...} />
   ```

2. **Dark Mode Grid Lines**: Wrap chart containers with these Tailwind CSS classes for theme-aware grid lines:
   ```typescript
   <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
   ```

3. **Tooltip Border Colors**: Always include explicit light mode border color:
   ```typescript
   <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
   ```

4. **Hover Glow Effect** (optional): Add SVG filter for bar chart hover effects:
   ```typescript
   <BarChart>
     <defs>
       <filter id="glow-unique-id" x="-50%" y="-50%" width="200%" height="200%">
         <feGaussianBlur stdDeviation="3" result="blur"/>
         <feMerge>
           <feMergeNode in="blur"/>
           <feMergeNode in="SourceGraphic"/>
         </feMerge>
       </filter>
     </defs>
     <Bar activeBar={{ filter: 'url(#glow-unique-id)' }} />
   </BarChart>
   ```

5. **No Hardcoded Grid Stroke Colors**: Never use `stroke="#e5e7eb"` on CartesianGrid - let CSS handle it:
   ```typescript
   // WRONG
   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

   // CORRECT
   <CartesianGrid strokeDasharray="3 3" />
   ```

Reference implementation: `/src/components/dashboard/OpsManagerCommandCenter.tsx`

---

## Git Workflow Notes

### GitHub Email Privacy

If commits are rejected with `GH007: Your push would publish a private email address`:

```bash
# Amend with noreply email
GIT_COMMITTER_EMAIL="username@users.noreply.github.com" \
git commit --amend --author="Name <username@users.noreply.github.com>" --no-edit
git push
```

### Commit Co-Author

All Claude-assisted commits should include:
```
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

### Data Source Configuration

```bash
# Primary data source selector
# Options: mock | rtx | salesforce | hybrid
#   - mock: Use synthetic demo data (default)
#   - rtx: Use RTX Data Hub enterprise warehouse
#   - salesforce: Use Salesforce CRM
#   - hybrid: Try RTX first, fallback to mock if unavailable
NEXT_PUBLIC_DATA_SOURCE=mock

# Legacy compatibility (deprecated - use NEXT_PUBLIC_DATA_SOURCE)
NEXT_PUBLIC_USE_MOCK_DATA=true
```

### RTX Data Hub (when DATA_SOURCE=rtx or hybrid)

```bash
RTX_API_ENDPOINT=https://rtx-data-hub.rentokil.com/api/v1
RTX_API_KEY=              # Get from IT > Data Platform > API Key Management
RTX_API_TIMEOUT=30000     # Request timeout in ms
```

### Salesforce (when DATA_SOURCE=salesforce)

```bash
SALESFORCE_LOGIN_URL=https://login.salesforce.com  # or test.salesforce.com for sandbox
SALESFORCE_USERNAME=
SALESFORCE_PASSWORD=
SALESFORCE_SECURITY_TOKEN=
```

### Supabase (optional backend)

```bash
NEXT_PUBLIC_SUPABASE_URL=        # Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # anon public key
# SUPABASE_SERVICE_ROLE_KEY=     # Server-side only, never expose to client
```

### Mapbox (for route mapping)

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=  # For technician route visualization
```

---

## API Endpoints

| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|---------|
| `/api/health` | GET | App health status | Timmy, Derek agents |
| `/api/health/kpis` | GET | KPI health with thresholds | Tommy agent |
| `/api/kpis` | GET | All KPIs with role filtering | Dashboard components, Pete |
| `/api/kpis?top10=true` | GET | TOP_10 KPIs only | Command Center |
| `/api/kpis?role=rep` | GET | Role-scoped KPI data | Role-specific views |
| `/api/reconcile` | GET/POST | Reconciliation with tolerance rules | Tommy agent, Governance |
| `/api/reconcile/refresh` | POST | Auto-remediation: refresh data & retry reconciliation | Tommy agent |
| `/api/governance/definitions` | GET | KPI definitions for audit | Tina agent |
| `/api/parse-pdf` | POST | Extract text from Start Packet PDFs | New Start flow |
| `/api/start-packet` | GET/POST | CRUD for Start Packets | AE new starts |
| `/api/start-packet/[id]` | GET/PUT/DELETE | Individual Start Packet | Start Packet detail |
| `/api/notifications/ops-email` | POST | Ops notification emails | Handoff alerts |
| `/api/alerts/business` | GET | Business rule alerts | Bailey agent |
| `/api/security/events` | GET/POST | Security event logging | Login page, Sam agent |
| `/api/security/threats` | GET | Threat detection (brute force, etc.) | Sam agent |
| `/api/performance/metrics` | GET/POST | Performance metrics (latency) | Pete agent |
| `/api/deployments` | GET/POST | Deployment tracking | Derek agent |
| `/api/engagement/summary` | GET | User engagement metrics | Emma agent |
| `/api/telemetry` | GET/POST | Client-side activity tracking | Dashboard telemetry |

### RTX Data Hub Endpoints

| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|---------|
| `/api/rtx/health` | GET | RTX connection health, latency, entity availability | RTX Intake workflow, Unified Monitor |
| `/api/rtx/discover` | POST | Schema discovery - auto-detect entities and fields | RTX Intake workflow |
| `/api/rtx/sync` | POST | Trigger data sync (full or incremental) | RTX Intake workflow |
| `/api/rtx/sync/status` | GET | Check sync status by ID or latest | RTX Intake workflow |
| `/api/rtx/integrity` | GET | Data quality checks (nulls, duplicates, orphans) | RTX Intake workflow |
| `/api/rtx/reconcile` | POST | Compare RTX values with app KPI calculations | Tommy agent |
| `/api/rtx/failover` | GET/POST | Get status or log failover/recovery events | Service layer, RTX Intake |

### RTX Failover System

The service layer includes automatic failover when RTX Data Hub is unavailable:

```typescript
// Failover configuration (/src/services/index.ts)
const FAILOVER_CONFIG = {
  maxConsecutiveFailures: 3,      // Trigger failover after 3 failures
  healthCheckIntervalMs: 60000,   // Check RTX health every 60 seconds
  recoveryCheckIntervalMs: 300000 // Try to recover every 5 minutes
}
```

**Failover Flow:**
1. Track consecutive RTX failures via `recordRTXFailure()`
2. After 3 failures, trigger failover to mock data
3. Send Slack alert via `/api/rtx/failover`
4. Continue health checks in background
5. Auto-recover when RTX becomes healthy via `recordRTXSuccess()`

**Failover State:**
```typescript
interface FailoverState {
  isUsingFallback: boolean        // Currently using mock data?
  primarySource: 'rtx'            // Primary data source
  fallbackSource: 'mock'          // Fallback data source
  consecutiveFailures: number     // Failure count
  failoverAt: Date | null         // When failover occurred
  lastHealthCheck: Date | null    // Last health check time
  lastError: string | null        // Last error message
}
```

### Reconciliation Tolerance Rules

```typescript
// Tolerances by KPI category:
revenue:   0.1%   // 1 basis point
count:     0%     // exact match
rate:      0.5%   // half percent
index:     1.0    // 1 point
forecast:  5%     // 5 percent
default:   1%     // fallback
```

### Auto-Remediation System

When reconciliation failures are detected, Tommy automatically attempts to fix them:

**Flow:**
```
Reconciliation fails → Prepare failed KPIs → Call /api/reconcile/refresh
                                                     ↓
                                            Refresh all data sources
                                                     ↓
                                            Re-calculate KPIs
                                                     ↓
                                            Re-run reconciliation
                                                     ↓
                       ┌─── All fixed → Log success + Slack (green) ───┐
                       │                                                │
                       └─── Still failing → Log failure + Slack (red) ─┘
                                    ↓
                            nextAction: 'escalate_manual'
```

**Request body for `/api/reconcile/refresh`:**
```typescript
{
  failedKpis: string[]      // KPI slugs that failed
  retryCount: number        // Current attempt (default: 1)
  maxRetries: number        // Max before escalation (default: 3)
  originalResults: array    // Original reconciliation results
}
```

**Response:**
```typescript
{
  success: boolean
  remediationResults: [{
    kpiSlug: string
    wasFixed: boolean
    action: 'data_refresh' | 'recalculate' | 'none'
    originalValue: number
    newValue: number
  }]
  summary: {
    fixed: number
    stillFailing: number
  }
  nextAction: 'none' | 'escalate_manual' | 'retry_later'
  message: string
}
```

**Slack Alert Types:**
- ✅ **Green**: All KPIs auto-fixed via data refresh
- 🚨 **Red**: Some KPIs still failing after remediation attempt

---

## n8n AI Workforce Agents

Nine automated agents monitor the application via n8n workflows. Configuration files in `/n8n/`.

### Consolidated Workflows (Recommended)

For production use, we recommend the consolidated two-workflow architecture:

| Workflow | File | Schedule | Purpose |
|----------|------|----------|---------|
| **OPS-UNIFIED-001** | `OPS-UNIFIED-001.json` | Every 5 min | Consolidated monitoring (all 9 agents with conditional execution) |
| **OPS-RTX-INTAKE-001** | `OPS-RTX-INTAKE-001.json` | Every 15 min | RTX Data Hub data intake, schema discovery, and validation |

**Benefits:**
- ~70% reduction in workflow executions (from ~1,153/day to ~300-350/day)
- Single point of control for all monitoring
- Conditional execution based on time (agents run at their designated intervals)
- Separate data intake workflow for easy refinement

**OPS-UNIFIED-001 Agent Schedule:**
| Agent | Frequency | Condition |
|-------|-----------|-----------|
| Timmy, Pete, RTX Health | Every 5 min | Always |
| Sophia | Every 10 min | `minute % 10 === 0` |
| Tommy, Sam | Every 15 min | `minute % 15 === 0` |
| Bailey, Derek, RTX Integrity | Every 30 min | `minute % 30 === 0` |
| Tina, Reconcile | Hourly | `minute === 0` |
| Emma | Daily 6am | `minute === 0 && hour === 6` |

### Individual Agent Workflows (Legacy)

The individual workflows below are kept for reference:

### Core Agents (Monitoring & Quality)

| Agent | File | Schedule | Purpose |
|-------|------|----------|---------|
| **Timmy** | `OPS-TIMMY-001.json` | Every 5 min | Health monitoring, uptime checks |
| **Tommy** | `OPS-TOMMY-001.json` | 15 min + hourly | KPI snapshots, reconciliation |
| **Tina** | `OPS-TINA-001.json` | Every hour | Governance, definition change detection |
| **Sophia** | `OPS-SOPHIA-001.json` | Every 10 min | Feedback triage, Slack alerts |

### Extended Agents (Business, Security, Performance, DevOps, Engagement)

| Agent | File | Schedule | Purpose |
|-------|------|----------|---------|
| **Bailey** | `OPS-BAILEY-001.json` | Every 30 min | Business alerts - KPI threshold monitoring |
| **Sam** | `OPS-SAM-001.json` | Every 15 min | Security - threat detection & anomaly monitoring |
| **Pete** | `OPS-PETE-001.json` | Every 5 min | Performance - SLA monitoring & latency tracking |
| **Derek** | `OPS-DEREK-001.json` | Every 30 min | Deployment - health verification post-deploy |
| **Emma** | `OPS-EMMA-001.json` | Daily at 6am | Engagement - user activity & adoption metrics |

### Core Agent Details

**Timmy (Health Monitor)**
- Calls `/api/health` every 5 minutes
- Logs to `ops_events` table with severity `info` or `critical`
- Monitors: app health, synthetic data, KPI calculation availability
- Sends Slack alerts on failure

**Tommy (KPI Snapshot + Auto-Remediation)**
- Calls `/api/health/kpis` every 15 minutes for threshold checks
- Calls `/api/reconcile` hourly for tolerance validation
- Inserts snapshots into `kpi_snapshots` table
- Detects anomalies (values outside 2 std deviations)
- **Auto-remediation**: On reconciliation failure, calls `/api/reconcile/refresh` to refresh data and retry
- Sends Slack alerts for critical KPIs or remediation results

**Tina (Governance)**
- Calls `/api/governance/definitions` hourly
- Compares current definitions against `governance_snapshots` via hash
- Tracks changes in `governance_changes` table
- Detects unauthorized KPI modifications
- Sends Slack alerts when definitions change

**Sophia (Feedback Triage)**
- Queries `feedback_submissions` table every 10 minutes for new feedback
- Prioritizes by severity (critical > high > medium > low)
- Automatically acknowledges feedback and updates status
- Sends Slack alerts for critical/high severity items
- Logs triage activity to `ops_events` table

### Extended Agent Details

**Bailey (Business Alerts)**
- Calls `/api/alerts/business` every 30 minutes (business hours)
- Monitors KPIs against business-defined thresholds (via `business_alert_rules` table)
- Alerts: Revenue below target, Win rate declining, Service risk, AR aging, DSO
- Sends Slack alerts by severity (Critical=Red, High=Orange)

**Sam (Security Monitor)**
- Calls `/api/security/threats` every 15 minutes
- Reads from `security_events` table for login patterns
- Detects: Brute force (>5 failures in 15 min), Privilege escalation, Session anomalies
- Sends immediate Slack alerts for critical threats

**Pete (Performance Monitor)**
- Measures endpoint response times every 5 minutes
- Monitors: `/api/health`, `/api/health/kpis`, `/api/kpis`
- Tracks p50, p95, p99 latency; alerts on SLA breach (p95 > 2000ms)
- Stores metrics in `performance_metrics` table

**Derek (Deployment Monitor)**
- Calls `/api/deployments` every 30 minutes
- Waits 60s after new deploy for warmup, then verifies `/api/health`
- Alerts on deployment failure with rollback recommendation
- Stores deployment records in `deployments` table

**Emma (Engagement Monitor)**
- Calls `/api/engagement/summary` daily at 6am
- Tracks DAU, sessions, avg duration, top pages, feature adoption
- Reads from `user_activity` table (populated via `/api/telemetry`)
- Alerts if DAU < 10 or engagement drops > 20%

### n8n Setup

1. Create Postgres credential `Supabase-Prod` using Session Pooler connection string
2. Import workflow JSON files from `/n8n/` directory
3. Re-link credentials in each Postgres node (search for `REPLACE_WITH_CREDENTIAL_ID`)
4. Update Slack webhook URLs (or disable Slack nodes if not using alerts)
5. Test each workflow manually before activating
6. Toggle workflows to Active to enable scheduled runs

### n8n Troubleshooting

**Common Issues:**

- **UUID null constraint error**: Fixed by omitting `id` field from inserts (database generates via `DEFAULT gen_random_uuid()`)
- **Status check constraint error**: Ensure status values match database constraints (`good`/`warning`/`critical`/`neutral` for kpi_snapshots)
- **Merge node errors**: Use `mode: "append"` for combining data without field matching
- **Code node return format**: Always return `[{ json: {...} }]` array format from Code nodes

See `/n8n/README.md` for detailed setup and troubleshooting.

---

## Database Schema (Supabase Migrations)

Migrations in `/supabase/migrations/`:

### 001_user_profiles.sql

```sql
-- user_profiles: User authentication and profile data
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  department TEXT,
  role role_enum DEFAULT 'rep',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- alpha_feedback: User feedback collection
CREATE TABLE alpha_feedback (...);
```

### 002_kpi_snapshots.sql

```sql
-- kpi_snapshots: Historical KPI values for trending and anomaly detection
CREATE TABLE kpi_snapshots (
  id UUID PRIMARY KEY,
  kpi_slug TEXT NOT NULL,
  value NUMERIC NOT NULL,
  target NUMERIC,
  status status_enum,  -- good/warning/critical/neutral
  source source_enum,  -- tommy/scheduled/manual/api
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper functions:
-- get_kpi_stats(slug, days) - Calculate KPI statistics
-- detect_kpi_anomaly(slug, value) - Detect values outside 2 std devs
```

### 003_governance.sql

```sql
-- governance_snapshots: Point-in-time KPI definitions with hash comparison
-- governance_changes: Individual KPI changes with approval workflow
-- incidents: Operational incident tracking with severity/status

-- Helper functions:
-- get_latest_governance_snapshot()
-- get_pending_governance_changes()
-- get_open_incidents()
```

### 007_new_agents.sql

```sql
-- Extended agent support tables for Bailey, Sam, Pete, Derek, Emma

-- security_events: Login tracking for Sam security monitoring
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,  -- login_success, login_failure, logout, password_reset, role_change, etc.
  user_email TEXT,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL,    -- critical, high, medium, low, info
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- performance_metrics: API latency for Pete performance monitoring
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER,
  is_error BOOLEAN DEFAULT FALSE,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- deployments: Deployment tracking for Derek
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id TEXT UNIQUE NOT NULL,
  git_commit TEXT,
  git_branch TEXT,
  status TEXT NOT NULL,      -- building, ready, error, canceled
  health_status TEXT,        -- healthy, degraded, unhealthy, pending
  deployed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_activity: Client telemetry for Emma engagement tracking
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  page_url TEXT NOT NULL,
  route TEXT,
  action TEXT DEFAULT 'view',  -- view, click, submit, export, search
  session_id TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- engagement_summary: Daily rollups for Emma
CREATE TABLE engagement_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER DEFAULT 0,
  top_pages JSONB DEFAULT '[]',
  engagement_by_role JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- business_alert_rules: Configurable thresholds for Bailey
CREATE TABLE business_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  kpi_slug TEXT NOT NULL,
  condition TEXT NOT NULL,   -- below_target, above_target, below_threshold, above_threshold
  threshold_value NUMERIC,
  threshold_percent NUMERIC,
  severity TEXT NOT NULL,    -- critical, high, medium, low
  notify_roles TEXT[] DEFAULT ARRAY['exec'],
  is_active BOOLEAN DEFAULT TRUE,
  cooldown_minutes INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 008_rtx_monitoring.sql

```sql
-- RTX Data Hub monitoring and data integrity tables

-- rtx_health_log: Connection health history
CREATE TABLE rtx_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,           -- healthy, degraded, unhealthy, unreachable
  latency_ms INTEGER,
  entities_available TEXT[],
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- rtx_schema_registry: Discovered entities and fields
CREATE TABLE rtx_schema_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT,                -- string, number, date, boolean, object, array
  is_required BOOLEAN DEFAULT FALSE,
  is_nullable BOOLEAN DEFAULT TRUE,
  sample_values JSONB DEFAULT '[]',
  null_rate NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_name, field_name)
);

-- rtx_sync_log: Data sync history
CREATE TABLE rtx_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,        -- full, incremental, schema_only
  entity_name TEXT,
  status TEXT NOT NULL,           -- running, success, partial, failed
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- rtx_integrity_checks: Data quality validation results
CREATE TABLE rtx_integrity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL,
  check_type TEXT NOT NULL,       -- null_rate, duplicate, orphan, range, format
  status TEXT NOT NULL,           -- ok, warning, critical
  records_checked INTEGER,
  issues_found INTEGER,
  issue_details JSONB DEFAULT '[]',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- data_source_status: Current source with failover tracking
CREATE TABLE data_source_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_source TEXT NOT NULL DEFAULT 'rtx',
  fallback_source TEXT NOT NULL DEFAULT 'mock',
  is_using_fallback BOOLEAN DEFAULT FALSE,
  event_type TEXT,                -- failover, recovery, manual_switch
  failover_reason TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  rtx_health TEXT,                -- healthy, degraded, unhealthy, unreachable
  failover_at TIMESTAMPTZ,
  recovery_at TIMESTAMPTZ,
  alert_sent BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper functions:
-- get_rtx_entity_schema(entity_name) - Get schema for an entity
-- detect_rtx_schema_changes(entity_name) - Detect schema drift
-- get_last_rtx_sync(entity_name) - Get last successful sync
-- get_rtx_integrity_status() - Get overall data quality status
-- get_current_data_source() - Get current active data source
```

---

## Lead Service Engine

Full-featured lead management system at `/lead-service-engine/*`.

### Routes

| Route | Purpose |
|-------|---------|
| `/lead-service-engine` | Main dashboard with funnel metrics |
| `/lead-service-engine/stages` | Pipeline stage visualization |
| `/lead-service-engine/handoffs` | Sales→Ops handoff tracking |
| `/lead-service-engine/at-risk` | At-risk account identification |
| `/lead-service-engine/automation` | Workflow automation rules |
| `/lead-service-engine/integration` | Lead source integration status |

### Components (`/src/components/lead-engine/`)

- `DataFlowDiagram.tsx` - Lead funnel flow visualization
- `FunnelChart.tsx` - Conversion rate chart
- `HandoffCard.tsx` - Sales→Ops handoff cards
- `LeadSourceMatrix.tsx` - Lead quality scoring with methodology
- `LeadTable.tsx` - Filterable lead listing
- `PipelineVisual.tsx` - Visual pipeline stages
- `ROICalculator.tsx` - Lead source ROI calculation
- `StageDefinitionCard.tsx` - Stage definition display

### Data Standards (`/src/lib/data-standards/`)

- `lead-intake.ts` - Lead quality criteria
- `lead-source-classifications.ts` - Source categorization
- `at-risk-definitions.ts` - At-risk indicators
- `start-packet-requirements.ts` - Sales→Ops handoff requirements

---

## PDF & Start Packet System

Handles Start Packet creation for Sales→Ops handoffs.

### Components

- `FileUploadZone.tsx` - Drag-and-drop PDF upload
- `StartPacketPreview.tsx` - Start Packet preview and editing

### Services (`/src/services/pdf-parser/`)

- PDF text extraction with pattern matching
- Scenario-based mock parsing (commercial, residential, termite)
- Validation rules for required fields

### API Flow

```
[AE uploads PDF] → [POST /api/parse-pdf] → [Extract fields]
                                              ↓
[Review extracted data] → [POST /api/start-packet] → [Notify Ops]
```

---

## Extended Routes Table

### Command Center Routes

| Route | Purpose | Roles |
|-------|---------|-------|
| `/` | Executive Command Center | All (view varies by role) |
| `/sales` | Sales pipeline dashboard | exec, directors, managers |
| `/ops` | Operations dashboard | exec, directors, ops_manager |
| `/finance` | Finance/AR dashboard | exec, directors, managers |
| `/people` | People/HR metrics | exec, directors |
| `/forecast` | 8-week forecast with scenarios | exec, directors, managers |

### Governance Routes

| Route | Purpose | Roles |
|-------|---------|-------|
| `/governance` | Governance hub | exec, directors, managers (not rep/tech) |
| `/governance/kpi-dictionary` | All KPI definitions | Same |
| `/governance/data-quality` | Data freshness metrics | Same |
| `/governance/permissions` | Role access matrix | Same |

### Role-Specific Routes

| Route | Purpose | Role |
|-------|---------|------|
| `/ae/dashboard` | AE personal dashboard | rep |
| `/ae/sales-tracker` | Proposals and sales tracking | rep |
| `/ae/tracker/proposals` | Proposal detail view | rep |
| `/ae/tracker/sales` | Sales detail view | rep |
| `/ae/proposals` | Proposal listing | rep |
| `/ae/import` | Quote import from Salesforce | rep |
| `/ae/sale/new` | Log new sale | rep |
| `/ae/proposal/new` | Create new proposal | rep |
| `/ae/new-starts` | New start listing | rep |
| `/ae/new-starts/new` | Create new start entry | rep |
| `/tech/schedule` | Daily service schedule | technician |
| `/tech/tickets` | Service ticket management | technician |
| `/tech/route` | Route map (Mapbox) | technician |
| `/manager/daily-cadence` | Branch daily standup | manager |
| `/manager/wig-scorecard` | WIG scorecard | manager |

### Detail/Drill-Down Routes

| Route | Purpose |
|-------|---------|
| `/kpi/[slug]` | KPI detail with 5 tabs |
| `/account/[id]` | Account detail |
| `/sales/opportunity/[id]` | Opportunity detail |
| `/finance/invoice/[id]` | Invoice detail |

### System Routes

| Route | Purpose |
|-------|---------|
| `/login` | Email/password authentication |
| `/onboarding` | New user profile setup |
| `/auth/reset-password` | Password reset flow |
| `/settings` | User settings (theme, scenario, profile) |
| `/settings/data-sources` | Data source configuration |
| `/admin` | Admin console (admin emails only) |
| `/presenter` | Presenter mode launcher |
| `/wbr` | Weekly Business Review (PDF export) |
| `/qbr` | Quarterly Business Review (PDF export) |
| `/integration` | System integration status |

---

## Data Quality & Validation

### Data Dictionary (`/src/lib/data-dictionary.ts`)

Complete field definitions with:
- Field names and descriptions
- Data types and constraints
- Source system mappings
- Validation rules

### Data Quality Engine (`/src/lib/data-quality-engine.ts`)

- Quality scoring algorithms
- Completeness checks
- Freshness monitoring
- Anomaly detection

### Business Units (`/src/lib/business-units.ts`)

Hierarchy definitions:
- Markets (6 total)
- Regions (within markets)
- Branches (within regions)

---

## Additional Components

### Maps (`/src/components/maps/`)

- `RouteMap.tsx` - Mapbox GL integration for technician routes
- Requires `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

### Features (`/src/components/features/`)

- `DataQualityBanner.tsx` - Data freshness indicator
- `BusinessUnitSelector.tsx` - Market/region/branch filter
- `ConnectionStatus.tsx` - RTX/Supabase connection health
- `VarianceNarrative.tsx` - Auto-generated KPI variance explanations
- `ViewToggle.tsx` - Data visualization switcher

---

## Documentation Reference

Additional documentation in `/docs/`:

| File | Purpose |
|------|---------|
| `alpha-test-matrix.md` | Comprehensive test matrix with acceptance criteria |
| `executive-demo-script.md` | 10-12 minute demo walkthrough |

### Alpha Test Matrix Highlights

- Navigation access matrix for all 8 roles
- Data scoping validation tests
- KPI reconciliation test cases
- API endpoint tests
- Authentication flow tests
- Performance targets (page load < 2s, KPI calc < 500ms)

---

## RTX Monitoring System Deployment Guide

This section provides step-by-step instructions for deploying the RTX Data Hub monitoring system to production.

### Prerequisites

Before deploying, ensure you have:
- [ ] Vercel project connected to this repository
- [ ] Supabase project with admin access
- [ ] n8n instance (cloud or self-hosted)
- [ ] Slack workspace (optional, for alerts)

---

### Step 1: Run Database Migration (Supabase)

**Time required**: ~5 minutes

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com/dashboard
   - Navigate to **SQL Editor**

2. **Run Migration 008**
   - Open `/supabase/migrations/008_rtx_monitoring.sql` from this repository
   - Copy the entire contents
   - Paste into SQL Editor and click **Run**

3. **Verify Tables Created**
   ```sql
   -- Run this query to verify
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'rtx_%' OR table_name = 'data_source_status';
   ```

   Expected tables (6 total):
   - `rtx_health_log`
   - `rtx_schema_registry`
   - `rtx_sync_log`
   - `rtx_integrity_checks`
   - `rtx_reconciliation`
   - `data_source_status`

4. **Verify Helper Functions**
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name LIKE 'get_rtx_%' OR routine_name LIKE 'detect_rtx_%';
   ```

---

### Step 2: Configure Vercel Environment Variables

**Time required**: ~5 minutes

1. **Open Vercel Dashboard**
   - Go to your project at https://vercel.com
   - Navigate to **Settings** > **Environment Variables**

2. **Add RTX API Authentication Key**

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `INTERNAL_API_KEY` | Generate a secure random string (32+ chars) | Production, Preview |

   **Generate a secure key:**
   ```bash
   # Option 1: Using openssl
   openssl rand -base64 32

   # Option 2: Using node
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Add RTX Data Hub Credentials** (if connecting to actual RTX)

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `RTX_API_ENDPOINT` | `https://rtx-data-hub.rentokil.com/api/v1` | Production |
   | `RTX_API_KEY` | Your RTX API key from IT | Production |
   | `RTX_API_TIMEOUT` | `30000` | Production |

4. **Add Slack Webhook** (optional, for alerts)

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `SLACK_WEBHOOK_URL` | Your Slack incoming webhook URL | Production |

5. **Redeploy**
   - Click **Deployments** > Select latest > **Redeploy**
   - Or push a commit to trigger automatic deployment

---

### Step 3: Configure n8n Credentials

**Time required**: ~10 minutes

1. **Create HTTP Header Auth Credential**
   - In n8n, go to **Settings** > **Credentials** > **Add Credential**
   - Select **HTTP Header Auth**
   - Configure:
     - **Name**: `RTX-API-Key`
     - **Header Name**: `Authorization`
     - **Header Value**: `Bearer YOUR_INTERNAL_API_KEY_FROM_STEP_2`
   - Save the credential
   - **Copy the credential ID** (shown in URL: `/credentials/xxxxx`)

2. **Create Supabase Postgres Credential** (if not already done)
   - Add Credential > **Postgres**
   - Configure:
     - **Name**: `Supabase-Prod`
     - **Host**: Your Supabase Session Pooler host (from Settings > Database > Connection string)
     - **Database**: `postgres`
     - **User**: `postgres.xxxxx` (from connection string)
     - **Password**: Your database password
     - **Port**: `5432` (or `6543` for pooler)
     - **SSL**: Enable
   - Save and copy the credential ID

---

### Step 4: Import and Configure n8n Workflows

**Time required**: ~15 minutes

#### 4.1 Import OPS-RTX-INTAKE-001 Workflow

1. **Import the workflow**
   - In n8n, click **Workflows** > **Import from File**
   - Select `/n8n/OPS-RTX-INTAKE-001.json`

2. **Update credential references**
   - Open the imported workflow
   - Search for `REPLACE_WITH_RTX_API_CREDENTIAL_ID`
   - Replace all instances with your `RTX-API-Key` credential ID
   - Search for `REPLACE_WITH_SUPABASE_CREDENTIAL_ID`
   - Replace all instances with your `Supabase-Prod` credential ID

3. **Update API base URL**
   - Search for `YOUR_VERCEL_DEPLOYMENT_URL`
   - Replace with your production URL (e.g., `https://rentokil-bi.vercel.app`)

4. **Update Slack webhook** (if using alerts)
   - Find the Slack nodes
   - Update the webhook URL to your Slack incoming webhook

5. **Save and activate**
   - Click **Save**
   - Toggle **Active** to enable the workflow

#### 4.2 Import OPS-UNIFIED-001 Workflow (Optional)

If using the consolidated monitoring workflow:

1. Import `/n8n/OPS-UNIFIED-001.json`
2. Follow the same credential replacement steps as above
3. This workflow includes all 9 agents with conditional execution

---

### Step 5: Test the Deployment

**Time required**: ~10 minutes

1. **Test RTX Health Endpoint**
   ```bash
   # Should return health status (no auth required for GET)
   curl https://YOUR_VERCEL_URL/api/rtx/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-01-14T...",
     "connection": { "reachable": true, "latency_ms": 45 },
     "entities": { "accounts": { "available": true } }
   }
   ```

2. **Test Authenticated Endpoint**
   ```bash
   # Should require auth for POST
   curl -X POST https://YOUR_VERCEL_URL/api/rtx/discover \
     -H "Authorization: Bearer YOUR_INTERNAL_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"force": true}'
   ```

3. **Test n8n Workflow Manually**
   - In n8n, open the workflow
   - Click **Execute Workflow** (play button)
   - Verify all nodes execute successfully
   - Check Supabase tables for new records

4. **Verify Database Writes**
   ```sql
   -- Check health logs
   SELECT * FROM rtx_health_log ORDER BY captured_at DESC LIMIT 5;

   -- Check sync logs
   SELECT * FROM rtx_sync_log ORDER BY completed_at DESC LIMIT 5;

   -- Check data source status
   SELECT * FROM data_source_status ORDER BY created_at DESC LIMIT 1;
   ```

---

### Step 6: Verify RTX Discovery Dashboard

**Time required**: ~5 minutes

1. **Navigate to the dashboard**
   - Go to `https://YOUR_VERCEL_URL/governance/rtx-discovery`
   - Login with a governance-enabled role (exec, manager, etc.)

2. **Run Discovery**
   - Click the **Run Discovery** button
   - Wait for schema discovery to complete
   - Verify entity cards appear with field information

3. **Check Sidebar Navigation**
   - Governance section should show **RTX Discovery** link
   - Only visible to roles with governance access

---

### Troubleshooting

#### API Returns 401 Unauthorized

**Cause**: Invalid or missing `INTERNAL_API_KEY`

**Fix**:
1. Verify the key is set in Vercel environment variables
2. Verify the key matches what's in n8n credential
3. Ensure the `Authorization` header format is `Bearer <key>`

#### n8n Workflow Fails with "Invalid credentials"

**Cause**: Credential ID not updated in workflow

**Fix**:
1. Open workflow JSON in a text editor
2. Search for all `REPLACE_WITH_` placeholders
3. Replace with actual credential IDs from n8n

#### Database Tables Not Found

**Cause**: Migration not run

**Fix**:
1. Re-run `/supabase/migrations/008_rtx_monitoring.sql` in SQL Editor
2. Check for any SQL errors in the output
3. Verify using the verification queries above

#### Slack Alerts Not Sending

**Cause**: Webhook URL not configured

**Fix**:
1. Create an incoming webhook in Slack (Apps > Incoming Webhooks)
2. Add `SLACK_WEBHOOK_URL` to Vercel environment variables
3. Redeploy the application

#### Health Check Shows "unreachable"

**Cause**: RTX Data Hub not configured or unavailable

**Fix**:
1. This is expected if `RTX_API_ENDPOINT` is not set
2. The app will use mock data as fallback
3. To connect to actual RTX, add the RTX credentials to Vercel

---

### Production Checklist

Before going live, verify:

- [ ] Database migration ran successfully (6 tables created)
- [ ] `INTERNAL_API_KEY` set in Vercel (32+ character random string)
- [ ] n8n `RTX-API-Key` credential created with matching key
- [ ] n8n `Supabase-Prod` credential created and working
- [ ] OPS-RTX-INTAKE-001 workflow imported and activated
- [ ] Manual workflow execution succeeds
- [ ] `/api/rtx/health` returns valid response
- [ ] RTX Discovery dashboard accessible at `/governance/rtx-discovery`
- [ ] Slack alerts working (if configured)

---

### Security Notes

1. **INTERNAL_API_KEY**: This key protects all RTX POST endpoints. Keep it secret.
   - Never commit to repository
   - Rotate periodically (quarterly recommended)
   - Only share with n8n administrators

2. **Supabase Service Role Key**: Used by API routes for database access.
   - Already set in Vercel as `SUPABASE_SERVICE_ROLE_KEY`
   - Never expose to client-side code

3. **Row Level Security**: All RTX tables have RLS policies.
   - `authenticated` users can read
   - Only `service_role` can write
   - API routes use service role for writes

---

### Monitoring and Maintenance

#### Daily Checks

- [ ] n8n workflow execution history - any failures?
- [ ] Supabase logs - any errors?
- [ ] Slack alerts - any critical issues?

#### Weekly Checks

- [ ] Review `rtx_health_log` for degraded periods
- [ ] Review `rtx_integrity_checks` for data quality trends
- [ ] Check `data_source_status` for failover events

#### Monthly Tasks

- [ ] Review and rotate `INTERNAL_API_KEY` if needed
- [ ] Clean up old logs (>90 days)
- [ ] Review n8n workflow execution statistics

---

## Additional npm Scripts

```bash
npm run dev:raw     # Dev server without cache fix
npm run build:clean # Full clean build
npm run start       # Production server
```
