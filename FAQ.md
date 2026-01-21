# Rentokil BI - Frequently Asked Questions

This FAQ addresses common questions about the Rentokil BI application, its architecture, features, and development workflow.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Authentication & Authorization](#authentication--authorization)
4. [Role-Based Access Control](#role-based-access-control)
5. [KPI System](#kpi-system)
6. [Features & Modules](#features--modules)
7. [Data Generation & Management](#data-generation--management)
8. [Development & Build](#development--build)
9. [Configuration & Environment](#configuration--environment)
10. [Troubleshooting](#troubleshooting)
11. [Deployment](#deployment)
12. [Extending the Application](#extending-the-application)

---

## Getting Started

### What is Rentokil BI?

Rentokil BI is a Next.js 14 Business Intelligence demonstration application for pest control leadership teams. It showcases enterprise-grade analytics with role-based dashboards, KPI tracking, forecasting, and workflow automation. The application uses deterministic synthetic data, requiring no external database for demos.

### How do I run the application locally?

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

### What are all the available npm scripts?

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with auto cache fix |
| `npm run dev:clean` | Clear `.next` cache and start dev server |
| `npm run dev:raw` | Start raw Next.js dev server |
| `npm run build` | Production build |
| `npm run build:clean` | Clear cache and build |
| `npm run lint` | Run ESLint |
| `npm run clean` | Clear `.next` and `node_modules` cache |
| `npm run reset` | Full clean and restart dev server |

### What technology stack is used?

- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: React 18.3, Tailwind CSS, shadcn/ui components
- **State Management**: Zustand with persistence
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Auth**: Supabase (optional)
- **Maps**: Mapbox GL

---

## Architecture & Data Flow

### How does data flow through the application?

```
KPI Definitions (/src/lib/kpis.ts)
       ↓
KPI Calculations (/src/lib/kpi-calculations.ts)
       ↓
Synthetic Data (/src/lib/data.ts)
       ↓
Service Layer (/src/services/)
       ↓
Zustand Store (/src/store/index.ts)
       ↓
React Components (via useAppStore())
```

### What is the service abstraction layer?

The service layer (`/src/services/`) provides a backend-ready architecture with swappable data providers:

- **Mock Provider** (default): Uses synthetic data from `/lib/data.ts`
- **Supabase Provider**: For backend integration
- **RTX Provider**: Enterprise data hub integration (stub)
- **Hybrid**: Fallback support

Switch providers via `NEXT_PUBLIC_DATA_SOURCE` environment variable.

### How do I use the service layer?

```typescript
import { services } from '@/services'

// Fetch accounts
const accounts = await services.accounts.getAll()

// Fetch opportunities
const opportunities = await services.opportunities.getAll()
```

### What state does Zustand manage?

The store (`/src/store/index.ts`) manages:

- **Settings**: role, demoMode, scenario, userId, refreshSeed
- **Filters**: dateRange, marketIds, branchIds, ownerIds
- **UI State**: sidebarCollapsed, tourActive, searchQuery
- **Presenter Mode**: presenterMode, presenterStep
- **Theme**: light/dark/system

---

## Authentication & Authorization

### How does authentication work?

Authentication uses Supabase email/password flow:

1. **Login** (`/login`): Password-based sign-in
2. **Forgot Password**: Sends reset email via Supabase
3. **Reset Password** (`/auth/reset-password`): Handles the reset flow
4. **Onboarding** (`/onboarding`): Collects user profile after first login

### What does the middleware protect?

The middleware (`/src/middleware.ts`):

- Checks for authenticated users on protected routes
- Redirects unauthenticated users to `/login`
- Redirects new users without profiles to `/onboarding`
- Sets `onboarding_complete` cookie after profile setup
- Falls back to demo mode if Supabase is unconfigured

### How is user profile stored?

- **Primary**: Supabase `user_profiles` table
- **Fallback**: `localStorage` under `user_profile` key
- **Cookie**: `onboarding_complete` to skip checks

### Who has admin access?

Admin emails are defined in `/src/components/layout/Sidebar.tsx`:

```typescript
const ADMIN_EMAILS = [
  'cody.lytle@rentokil.com',
  'cody.lytle@prestox.com',
]
```

Admins see the Admin link in the sidebar and can access `/admin` console.

---

## Role-Based Access Control

### What roles are available?

The system has 8 roles in a hierarchy:

```
exec → market_director → region_director → manager
                                             ↓
                             sales_manager ← → ops_manager
                                   ↓               ↓
                                  rep         technician
```

### What can each role see?

| Role | Main Navigation | Governance |
|------|-----------------|------------|
| `exec` | Command Center, Sales, Ops, Finance, People, Forecast, Lead Service Engine | Yes |
| `market_director` | Same as exec | Yes |
| `region_director` | Same as exec | Yes |
| `sales_manager` | Same as exec | Yes |
| `manager` | Command Center, Daily Cadence, WIG Scorecard, Sales, Ops, Forecast | Yes |
| `ops_manager` | Command Center, Ops, New Starts, Sales, Finance, Forecast | Yes |
| `rep` | My Dashboard, Import Quote, Sales Tracker, Proposals, New Starts | No |
| `technician` | My Schedule, Service Tickets, Route | No |

### How does row-level security work?

The `filterDataByRole()` function in `/lib/kpi-calculations.ts` filters data based on role:

- **Executives**: See all data
- **Directors/Managers**: Filtered by marketId, branchId
- **Reps/Technicians**: See only their own assigned data

---

## KPI System

### Where are KPIs defined?

KPIs are defined in `/src/lib/kpis.ts` as the single source of truth. Each KPI includes:

- Name, category, and description
- Calculation formula and SQL
- Data lineage (source, transformations, refresh cadence)
- Targets and benchmarks
- Dependencies

### How many KPIs are there?

20 KPIs across 6 categories: Revenue, Sales, Operations, Finance, People, Service.

### How do I add a new KPI?

1. Add definition to `/src/lib/kpis.ts`:
```typescript
{
  slug: 'new-kpi-slug',
  name: 'New KPI Name',
  category: 'sales',
  description: 'What this KPI measures',
  calculation: 'How it is calculated',
  // ... other properties
}
```

2. Add calculation logic to `/src/lib/kpi-calculations.ts`:
```typescript
case 'new-kpi-slug':
  return calculateNewKpi(data, filters)
```

### What does a KPI detail page show?

Each KPI page (`/kpi/[slug]`) has 5 tabs:

1. **Overview**: Trend charts and target analysis
2. **Drivers**: Variance explanation and contributing factors
3. **Actions**: Ranked action items with CTAs
4. **Reconcile**: KPI vs source system comparison
5. **Definition**: Full dictionary entry with lineage visualization

---

## Features & Modules

### What dashboards are available?

| Route | Purpose |
|-------|---------|
| `/` | Executive Command Center (top 10 KPIs) |
| `/sales` | Sales pipeline, rep coaching, opportunities |
| `/ops` | Service status, at-risk accounts, capacity |
| `/finance` | AR aging, collection priorities |
| `/people` | Capacity utilization, scheduling |
| `/forecast` | 8-week forecast with scenarios |
| `/governance` | KPI Dictionary, Data Quality, Permissions |

### What is the Lead Service Engine?

An automated sales-to-ops handoff system that:

- Detects at-risk accounts
- Triggers automation workflows
- Manages integration between sales and operations
- Tracks stages and escalations

### What are the AE (Account Executive) features?

- **Sales Tracker** (`/ae/sales-tracker`): Track proposals and sales
- **Proposals** (`/ae/proposals`): Create and manage proposals
- **New Starts** (`/ae/new-starts`): AE to Ops handoff workflow
- **Import Quote** (`/ae/import`): Parse Salesforce PDF quotes

### What are the Technician features?

- **My Schedule** (`/tech/schedule`): Daily route assignments
- **Service Tickets** (`/tech/tickets`): Ticket list with status
- **Route** (`/tech/route`): Map visualization with Mapbox

### What is Presenter Mode?

A guided demo walkthrough (`/presenter`) with:

- Step-by-step navigation
- Spotlight overlays on UI elements
- Speaker notes (optionally on second screen)
- Keyboard controls: `←→` navigate, `Space` auto-play, `N` notes, `P` pop-out, `Esc` exit

### How do business reviews work?

- **WBR** (`/wbr`): Weekly Business Review with PDF export
- **QBR** (`/qbr`): Quarterly Business Review with trends and initiatives

---

## Data Generation & Management

### Is this connected to a real database?

By default, no. The application uses deterministic synthetic data generated at runtime. This allows for:

- Consistent demos (same seed = same data)
- No database setup required
- Easy data refresh via seed change

### How much synthetic data is generated?

- ~1,500 accounts
- ~2,500 opportunities
- ~12,000 service events
- ~9,000 invoices
- ~150 users across 8 roles

### How does deterministic data work?

The `seedrandom` library ensures the same seed produces identical data:

```typescript
initializeSeed('my-seed')
// All subsequent random calls produce the same sequence
```

Click "Refresh Data" in the app to change the seed and get different data.

### Can I connect to a real database?

Yes! The service abstraction layer supports multiple providers:

1. Set `NEXT_PUBLIC_DATA_SOURCE=supabase` in environment
2. Configure Supabase credentials
3. The app will use the Supabase provider instead of mock data

---

## Development & Build

### How do I fix cache issues during development?

```bash
# Clear cache and restart
npm run dev:clean

# Or full reset
npm run reset
```

### What utilities are available for formatting?

In `/src/lib/utils.ts`:

```typescript
formatCurrency(1234.56)      // "$1,234.56"
formatPercent(0.156)         // "15.6%"
formatDeltaPercent(0.05)     // "+5.0%"
formatNumber(1234567)        // "1,234,567"
formatCompactNumber(1234567) // "1.2M"
```

### What are the safe math utilities?

```typescript
isValidNumber(value)           // Check for valid finite number
safeDivide(10, 0, 0)          // Returns 0 (fallback) instead of Infinity
safePercent(part, total)      // Safe percentage calculation
clampValue(value, min, max)   // Clamp to range
```

### How do I merge CSS classes safely?

Use the `cn()` utility:

```typescript
import { cn } from '@/lib/utils'

cn('base-class', isActive && 'active-class', className)
```

---

## Configuration & Environment

### What environment variables are needed?

Create `.env.local` with:

```bash
# Data Source (mock is default)
NEXT_PUBLIC_DATA_SOURCE=mock

# Supabase (optional - for auth and backend)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Mapbox (for technician route maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-token
```

### What data sources are supported?

| Value | Description |
|-------|-------------|
| `mock` | Synthetic demo data (default) |
| `supabase` | Supabase backend |
| `rtx` | RTX Data Hub (stub) |
| `salesforce` | Salesforce integration (stub) |
| `hybrid` | Fallback support |

---

## Troubleshooting

### Why am I getting React hydration errors (418, 423, 425)?

**Cause**: Zustand persist middleware loads different state on client than SSR default.

**Solution**: Add mounted state check:

```typescript
export function MyComponent() {
  const [mounted, setMounted] = useState(false)
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const value = mounted ? settings.someValue : defaultValue

  if (!mounted) return null
  // ... rest of component
}
```

### Why is ESLint failing on quotes?

**Issue**: Unescaped quotes in JSX.

**Solution**: Use HTML entities:
- `'` → `&apos;`
- `"` → `&quot;`

Example: `don't` → `don&apos;t`

### Why are old errors persisting after fixes?

**Cause**: Vercel build caching.

**Solution**: Push a trivial change to `vercel-build.txt` to force fresh build.

### Why is the sidebar showing wrong navigation?

Check that:
1. The user role is correctly set in the store
2. The component has proper hydration handling
3. Clear localStorage and refresh if state is stale

### Why is KPI data not showing?

1. Check if synthetic data generation completed (see console for errors)
2. Verify role has permission to see the KPI
3. Check filter settings in the store
4. Use `/api/health` endpoint to diagnose issues

---

## Deployment

### Where is the app deployed?

- **Platform**: Vercel
- **Branch**: `alpha-test`

### How do I force a rebuild?

Edit `/vercel-build.txt` with any change and push to trigger a fresh build.

### What happens during build?

1. TypeScript compilation
2. ESLint checks
3. Next.js static generation
4. API routes bundled
5. Client bundles optimized

---

## Extending the Application

### How do I add a new page?

1. Create file at `/src/app/(dashboard)/your-route/page.tsx`
2. Use `"use client"` directive if needed
3. Import components from `/components`
4. Update sidebar in `/src/components/layout/Sidebar.tsx` if needed

### How do I add a new component?

1. Create file at `/src/components/features/MyComponent.tsx`
2. Export as default
3. Import where needed

### How do I add a new type?

Add to `/src/types/index.ts`:

```typescript
export interface NewType {
  id: string
  name: string
  // ... properties
}
```

### How do I add a new API route?

Create file at `/src/app/api/your-route/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Your logic
    return NextResponse.json({ success: true, data: {} })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error' },
      { status: 500 }
    )
  }
}
```

### How do I add state to the store?

Edit `/src/store/index.ts`:

```typescript
interface AppState {
  // Add new state
  myNewState: string
  setMyNewState: (value: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      myNewState: 'default',
      setMyNewState: (value) => set({ myNewState: value }),
      // ... existing state
    }),
    { name: 'app-storage' }
  )
)
```

---

## API Reference

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/kpis` | GET | All KPI values with status and variance |
| `/api/health` | GET | System health check |
| `/api/health/kpis` | GET | KPI calculation health |
| `/api/governance/definitions` | GET | KPI dictionary |
| `/api/parse-pdf` | POST | Parse Salesforce quote PDF |
| `/api/start-packet` | POST | Create Start Packet |
| `/api/start-packet/[id]` | GET | Fetch Start Packet by ID |
| `/api/notifications/ops-email` | POST | Send Ops notification |
| `/api/reconcile` | POST | KPI reconciliation |

---

## Quick Reference

### Directory Structure

```
/src
├── /app                 # Next.js routes (49 pages)
├── /components          # React components (61 total)
│   ├── /layout         # Sidebar, Header, MainLayout
│   ├── /features       # Complex features
│   ├── /dashboard      # Dashboard components
│   └── /ui             # shadcn/ui components
├── /lib                # Business logic
├── /services           # Service abstraction layer
├── /store              # Zustand state management
├── /types              # TypeScript definitions
└── middleware.ts       # Auth middleware
```

### Common Tasks Cheat Sheet

| Task | Location | Notes |
|------|----------|-------|
| Add KPI | `/lib/kpis.ts` | Single source of truth |
| KPI calculation | `/lib/kpi-calculations.ts` | Add case to switch |
| New page | `/app/(dashboard)/...` | Use client directive |
| New component | `/components/features/` | Export default |
| Add type | `/types/index.ts` | Export interface |
| State change | `/store/index.ts` | Add to Zustand store |
| API route | `/app/api/...` | Export GET/POST |

---

## Need More Help?

- Check the main [CLAUDE.md](./CLAUDE.md) for detailed development guidance
- Review existing components for patterns
- Use the `/api/health` endpoint to diagnose issues
- Contact the admin team for access issues
