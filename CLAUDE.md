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

### Recent Changes (This Session)

1. **Fixed hydration errors** in DataQualityBanner, RoleTutorial, PresenterMode
2. **Fixed ESLint errors** - escaped quotes in login page and Tutorial.tsx
3. **Fixed tutorial text** - Changed "PestPac" to "Salesforce" for quote import description
4. **Verified role-based sidebar** - Techs and AEs don't see Governance section
5. **Verified settings page** - Clean user-focused page, no demo controls for regular users
