# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
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
/src/store/index.ts (Zustand state: role, scenario, filters, presenter mode)
       ↓
React components consume via useAppStore()
```

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

### Data Generation

All synthetic data uses `seedrandom` for determinism:
- Same seed = identical data
- Refresh button changes seed
- Volumes: ~1,500 accounts, ~2,500 opportunities, ~12,000 service events
