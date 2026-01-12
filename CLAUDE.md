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

### Role Hierarchy (8 roles)

```
exec → market_director → region_director → manager
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
| `market_director` | Same as exec | Yes |
| `region_director` | Same as exec | Yes |
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
| `/api/health` | GET | App health status | Timmy agent, monitoring |
| `/api/health/kpis` | GET | KPI health with thresholds | Tommy agent |
| `/api/kpis` | GET | All KPIs with role filtering | Dashboard components |
| `/api/kpis?top10=true` | GET | TOP_10 KPIs only | Command Center |
| `/api/kpis?role=rep` | GET | Role-scoped KPI data | Role-specific views |
| `/api/reconcile` | GET/POST | Reconciliation with tolerance rules | Tommy agent, Governance |
| `/api/reconcile/refresh` | POST | Auto-remediation: refresh data & retry reconciliation | Tommy agent |
| `/api/governance/definitions` | GET | KPI definitions for audit | Tina agent |
| `/api/parse-pdf` | POST | Extract text from Start Packet PDFs | New Start flow |
| `/api/start-packet` | GET/POST | CRUD for Start Packets | AE new starts |
| `/api/start-packet/[id]` | GET/PUT/DELETE | Individual Start Packet | Start Packet detail |
| `/api/notifications/ops-email` | POST | Ops notification emails | Handoff alerts |

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

Four automated agents monitor the application via n8n workflows. Configuration files in `/n8n/`.

| Agent | File | Schedule | Purpose |
|-------|------|----------|---------|
| **Timmy** | `OPS-TIMMY-001.json` | Every 5 min | Health monitoring, uptime checks |
| **Tommy** | `OPS-TOMMY-001.json` | 15 min + hourly | KPI snapshots, reconciliation |
| **Tina** | `OPS-TINA-001.json` | Every hour | Governance, definition change detection |
| **Sophia** | `OPS-SOPHIA-001.json` | Every 10 min | Feedback triage, Slack alerts |

### Agent Details

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

## Additional npm Scripts

```bash
npm run dev:raw     # Dev server without cache fix
npm run build:clean # Full clean build
npm run start       # Production server
```
