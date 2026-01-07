# Rentokil BI - Business Operating System

A comprehensive Business Intelligence demo application showcasing enterprise-grade BI capabilities for Rentokil leadership. This application demonstrates executive command center KPIs, actionable insights, role-based access control, governance features, and forecasting capabilities.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
http://localhost:3000
```

## Stack

- **Next.js 14** - App Router with TypeScript
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - UI component library
- **Recharts** - Data visualization
- **TanStack Table** - Data tables
- **Zustand** - State management
- **Deterministic Seeded Data** - No external dependencies

## Features

### Executive Command Center (/)
- Top 10 KPI cards with sparklines and deltas
- Variance narrative explaining revenue drivers
- Priority action list with next-best-actions
- Real-time status indicators

### KPI Drill-Down (/kpi/[slug])
- **Overview Tab**: Trend analysis with targets
- **Drivers Tab**: Variance explanation with contributing factors
- **Actions Tab**: Ranked action items for the KPI
- **Reconcile Tab**: KPI total vs source system comparison
- **Definition Tab**: Full KPI dictionary entry

### Sales Module (/sales)
- Pipeline funnel by stage (30/60/90 days)
- Rep coaching panel with hygiene scores
- At-risk opportunities table
- Opportunity detail with activity timeline

### Operations Module (/ops)
- Service status breakdown (completed/callback/missed)
- At-risk accounts with retention indicators
- Branch capacity utilization
- Complaint analysis

### Finance Module (/finance)
- AR aging breakdown (0-30, 31-60, 61-90, 90+)
- Collection priorities with next-best-actions
- Invoice detail with payment timeline

### People Module (/people)
- Capacity utilization by branch
- Weekly scheduling pressure heatmap
- Overutilization alerts

### Governance (/governance)
- **KPI Dictionary**: All 20 KPIs with full metadata
- **Data Quality Dashboard**: Source freshness, metrics, issues
- **Permissions Matrix**: Role-based access visualization
- **Change Log**: Version history of KPI definitions

### Forecasting (/forecast)
- 8-week revenue forecast with scenarios (Base/Upside/Downside)
- Confidence bands on projections
- Assumptions table
- Backtest results with MAE/MAPE metrics

### Business Reviews
- **WBR (/wbr)**: Weekly Business Review with 5 sections, PDF export
- **QBR (/qbr)**: Quarterly Business Review with trends, initiatives tracking

### Settings (/settings)
- Demo mode selector (3 modes)
- Role simulator (Exec/VP/Manager/Rep)
- Scenario toggles
- Data quality injection
- Refresh data button

---

## 5-Minute Demo Script

### Demo Mode 1: Exec BI Review (Susan - VP BI)

**Goal**: Show governance, trust, forecast, variance, and scale story

1. **Start at Command Center (/)**
   - Point out the 10 KPI cards with status indicators (green/yellow/red)
   - Click on "Revenue MTD" card to drill down

2. **KPI Detail (/kpi/revenue_mtd)**
   - Show the **Overview** tab with trend chart
   - Click **Reconcile** tab - "Here's how we ensure data accuracy"
   - Click **Definition** tab - "Every KPI has a full dictionary entry"
   - Click **"View Lineage"** button - Show data flow diagram

3. **Governance (/governance)**
   - **KPI Dictionary**: Search for any KPI, show full metadata
   - **Data Quality**: Show source freshness, click on any warning
   - **Permissions**: Show how different roles see different data

4. **Forecast (/forecast)**
   - Toggle between Base/Upside/Downside scenarios
   - Point out confidence bands
   - Show **Backtest** tab - "Our MAPE is under 8%"

5. **Settings (/settings)**
   - Change role from Exec to Manager
   - Show how the RLS badge updates
   - Enable "Data Quality Issues" to show degraded state

### Demo Mode 2: Sales Ops Execution (Jason Gonski - Director Business Intelligence)

**Goal**: Pipeline, hygiene, conversion, coaching, action lists

1. **Sales Dashboard (/sales)**
   - Show pipeline funnel by stage
   - Point out the stalled opportunities action list
   - Review the Rep Coaching Panel

2. **Stalled Opportunities (/kpi/stalled_opps)**
   - Drill into specific stalled deals
   - Show next-best-action recommendations

3. **Opportunity Detail (/sales/opportunity/OPP-000001)**
   - Show risk factors and mitigation
   - Review activity timeline
   - Point out "Next Best Action" recommendation

4. **CRM Hygiene (/kpi/crm_hygiene_score)**
   - Show what's driving the score
   - Drill to specific issues

### Demo Mode 3: Branch/Field Manager

**Goal**: Service quality, callbacks, capacity, retention risk

1. **Operations Dashboard (/ops)**
   - Show service status breakdown
   - Review at-risk accounts
   - Check branch capacity chart

2. **People/Capacity (/people)**
   - Show scheduling pressure heatmap
   - Identify overutilized branches

3. **Account Detail (/account/ACC-000001)**
   - Show retention risk factors
   - Review mitigation plan
   - Check service history and complaints

---

## Questions BI Leadership Will Ask

### "Where does this number come from?"
→ Click any KPI card → **Definition tab** shows calculation
→ Click **"View Lineage"** to see data flow from source systems

### "How do you reconcile it?"
→ KPI Detail → **Reconcile tab** shows:
- KPI total vs source system total
- Difference with tolerance threshold
- Explanation of variances (timing, voids, etc.)

### "What's the refresh cadence?"
→ KPI Dictionary shows refresh cadence per KPI
→ Data Quality dashboard shows actual last refresh time per source

### "Who owns this KPI?"
→ KPI Dictionary → Owner column
→ Each KPI has assigned business owner

### "How does security/RLS work?"
→ Settings → Change role to see scope change
→ Header badge shows "Viewing as: [Role] • Scope: [Markets/Branches]"
→ Governance → Permissions Matrix shows role access

### "How does this scale?"
→ Current demo has 1,500 accounts, 2,500 opportunities, 12,000 service events
→ Same patterns work with millions of records
→ All queries are pre-aggregated at KPI level

---

## Definition of Done Checklist

### Core Features
- [x] 20 KPIs defined in dictionary
- [x] Command Center with top 10 KPI cards
- [x] KPI detail page with 5 tabs
- [x] Sales module with funnel and coaching
- [x] Ops module with service quality
- [x] Finance module with AR aging
- [x] People module with capacity
- [x] Governance with KPI Dictionary
- [x] Data Quality dashboard
- [x] Permissions matrix
- [x] Forecast with scenarios
- [x] Backtest with MAE/MAPE
- [x] WBR with 5 sections
- [x] QBR with initiatives tracking
- [x] PDF export (client-side)
- [x] CSV export for KPI Dictionary

### Actionability
- [x] Stalled opportunities action list
- [x] At-risk accounts action list
- [x] Capacity pressure action list
- [x] Collections priority action list
- [x] Next-best-action text on all items

### RLS Simulation
- [x] 4 roles (Exec, VP/Director, Manager, Rep)
- [x] Persistent scope badge in header
- [x] Data filtering by role
- [x] Permissions matrix page

### Demo Features
- [x] 3 demo modes with different focus
- [x] Demo tour with guided steps
- [x] Data quality injection toggle
- [x] Refresh data button
- [x] Global search

### UX Quality
- [x] BI-sleek executive design
- [x] Sidebar navigation
- [x] Loading skeletons
- [x] Responsive layout
- [x] Proper status colors

---

## Data Model

```
Markets (6)
├── Branches (3-5 per market, ~25 total)
│   ├── Teams (2-4 per branch)
│   └── Routes (5-10 per branch)
│
Users (~150)
├── Executives (3)
├── VP/Directors (1-2 per market)
├── Managers (1-2 per branch)
└── Reps (3-8 per branch)

Accounts (1,500)
├── Vertical: Commercial, Residential, Government, Healthcare, Food Service
├── Contract Value: $500 - $200,000
└── Retention Risk: Low, Medium, High

Opportunities (2,500)
├── Stages: Prospect, Qualified, Proposal, Negotiation, Closed Won/Lost
├── Amount: $5,000 - $150,000
└── Linked to: Account, Owner, Market, Branch

Service Events (12,000)
├── Status: Scheduled, Completed, Missed, Callback
└── Linked to: Account, Technician, Route

Invoices (~9,000)
├── Status: Paid, Open, Overdue, Disputed, Void
├── Aging: 0-30, 31-60, 61-90, 90+
└── Linked to: Account
```

---

## Architecture Notes

### Single Source of Truth
- All KPIs defined in `/lib/kpis.ts`
- UI generated from dictionary metadata
- Calculations in `/lib/kpi-calculations.ts`

### Deterministic Data
- Seed-based random generation (`seedrandom`)
- Same seed = same data every time
- "Refresh Data" changes seed for variation

### State Management
- Zustand store for global state
- Persisted settings (demo mode, role, seed)
- Real-time filtering by role scope

---

## File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Command Center
│   ├── kpi/[slug]/        # KPI detail
│   ├── sales/             # Sales + opportunity detail
│   ├── ops/               # Operations
│   ├── finance/           # Finance + invoice detail
│   ├── people/            # Capacity
│   ├── governance/        # KPI Dictionary, Data Quality
│   ├── forecast/          # Forecasting
│   ├── wbr/               # Weekly Business Review
│   ├── qbr/               # Quarterly Business Review
│   ├── account/[id]/      # Account detail
│   └── settings/          # Settings
│
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Sidebar, Header, MainLayout
│   └── features/          # KPICard, ActionList, etc.
│
├── lib/
│   ├── data.ts            # Synthetic data generation
│   ├── kpis.ts            # KPI dictionary
│   ├── kpi-calculations.ts # KPI value calculations
│   └── utils.ts           # Formatting utilities
│
├── store/
│   └── index.ts           # Zustand store
│
└── types/
    └── index.ts           # TypeScript types
```

---

## License

Demo application for Rentokil BI presentation purposes.
