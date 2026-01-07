# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Production build (required before deploying)
npm run lint     # Run ESLint
npm start        # Start production server
```

## Architecture Overview

This is a **Next.js 14 App Router** demo application for Rentokil pest control business intelligence. It uses **synthetic deterministic data** (seeded random generation) with no external database.

### Core Patterns

**Data Layer** (`/src/lib/`):
- `kpis.ts` - Single source of truth for 20 KPI definitions with full metadata
- `data.ts` - Synthetic data generation (accounts, opportunities, invoices, etc.)
- `kpi-calculations.ts` - All KPI value calculations derived from `kpis.ts`
- `sales-tracker-data.ts` - Account Executive sales tracker matching Google Sheets CSV format
- `new-start-data.ts` - Sales-to-Ops handoff tracking
- `daily-sales-data.ts` - Branch Manager daily activity tracker with 65+ branches

**State Management** (`/src/store/index.ts`):
- Zustand store with settings (demo mode, role, scenario, seed)
- Role-based filtering: `exec`, `vp_director`, `manager`, `rep`
- Three demo modes: `exec_bi_review`, `sales_ops_execution`, `branch_field_manager`

**Types** (`/src/types/`):
- `index.ts` - Core domain types (Role, User, Account, Opportunity, KPIDefinition, etc.)
- `sales-tracker.ts` - AE proposal/sale tracking types
- `new-start-log.ts` - Sales→Ops handoff types
- `daily-sales-cadence.ts` - Branch Manager daily metrics types

### Role-Based Navigation

The sidebar navigation changes based on the selected role:
- **Account Executive (`rep`)**: `/ae/*` routes (personal dashboard, proposals, sales, new starts)
- **Branch Manager+ (`manager`, `vp_director`, `exec`)**: `/` routes (command center, sales, ops, finance, governance)

### Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Executive Command Center (top 10 KPIs) |
| `/kpi/[slug]` | KPI detail with 5 tabs (Overview, Drivers, Actions, Reconcile, Definition) |
| `/ae` | Account Executive personal dashboard |
| `/ae/new-starts` | Sales→Ops handoff log |
| `/branch/daily` | Branch Manager daily sales cadence entry |
| `/region/daily` | Area Manager regional rollup view |
| `/ops/new-starts` | Ops Manager new start queue |
| `/governance` | KPI Dictionary, Data Quality, Permissions |
| `/settings` | Demo mode, role simulation, data controls |

### CSV Data Structures

The app mirrors actual Google Sheets structures used by the field:

1. **Sales Tracker** (`sales-tracker-data.ts`): Monthly proposals/sales with Job Work, Termite, Contract pricing
2. **New Start Log** (`new-start-data.ts`): RED columns (AE fills) → YELLOW columns (Ops fills)
3. **Daily Sales Cadence** (`daily-sales-data.ts`): Branch metrics with TAP Leads column (optional for backwards compatibility)

### UI Components

- **shadcn/ui** components in `/src/components/ui/`
- **Layout** components: `Sidebar.tsx`, `Header.tsx`, `MainLayout.tsx`
- **Feature** components: `KPICard.tsx`, `ActionList.tsx`, `VarianceNarrative.tsx`, `LineageModal.tsx`

### Data Generation

All synthetic data uses `seedrandom` for deterministic generation:
- Same seed = same data every time
- Refresh button changes seed for variation
- Data volumes: ~1,500 accounts, ~2,500 opportunities, ~12,000 service events

### Adding New Google Sheets Integrations

When adding support for new CSV structures:
1. Create types in `/src/types/` matching the CSV columns exactly
2. Create data layer in `/src/lib/` with generation functions
3. Handle optional columns (like TAP Leads) for backwards compatibility
4. Create role-appropriate pages in `/src/app/`
5. Update sidebar navigation in `/src/components/layout/Sidebar.tsx` for the appropriate role
