# Implementation Plan: Convert Admin Console Tabs to Standalone Pages + Add SALTI KPIs to Dictionary

## Overview

1. Convert 5 Admin Console tabs into dedicated standalone pages with expanded content
2. **Add all 47 SALTI KPIs to the KPI Dictionary** with full metadata (definition, formula, lineage, owner)
3. Update sidebar navigation to use direct routes

---

## CRITICAL: KPI Dictionary Gap Analysis

**Current State:** KPI_DICTIONARY has 20 KPIs, SALTI has 42+ metrics = **42 KPIs MISSING**

### SALTI KPIs to Add to `src/lib/kpis.ts`:

| Category | KPIs to Add | Count |
|----------|-------------|-------|
| Lead Funnel | mql_count, sql_count, scheduled_count, inspected_count, proposed_count, sold_count, unscheduled_count, canceled_count, mql_to_sql_rate, sql_to_scheduled_rate, scheduled_to_inspected_rate, inspected_to_proposed_rate, proposed_to_sold_rate | 13 |
| Sales Targets | close_rate, speed_to_lead, bundle_rate, avg_started_value | 4 |
| Productivity | schedule_rate, fulfillment_rate, inspection_rate, offer_rate, proposal_rate, mql_cancel_rate, mql_to_sql_conversion | 7 |
| Sales Results | started_sales, net_sales, contracts_value, contracts_units, inis_value, inis_units, jobs_value, jobs_units, started_as_pct_of_net, cy_vs_lytd_pct, yoy_variance, yoy_variance_pct | 12 |
| 5-10-2 | inspections_per_day_per_rep, services_proposed_per_day_per_rep, sales_per_day_per_rep, reps_5_plus_inspections_pct, reps_10_plus_proposed_pct, reps_2_plus_sales_pct | 6 |
| Portfolio | gross_sales, net_price, gross_adjustments, gross_terminations, net_gain | 5 |
| HR | headcount, voluntary_terms, involuntary_terms, retention_rate | 4 |

**Total: 51 new KPIs** (bringing dictionary from 20 to 71 KPIs)

---

## Phase 0: Add SALTI KPIs to KPI Dictionary (MUST DO FIRST)

**File:** `src/lib/kpis.ts`

Each KPI needs full metadata:
```typescript
{
  slug: 'close_rate',
  name: 'Close Rate',
  category: 'sales',
  definition: 'Percentage of proposals that convert to closed sales',
  calculationNotes: 'Sold Count / Proposed Count * 100',
  grain: 'Daily rollup by rep, branch, region, market',
  filters: ['market', 'region', 'branch', 'rep', 'time_period'],
  primarySource: 'Salesforce CRM',
  secondarySources: ['RTX Data Hub'],
  refreshCadence: 'Every 15 minutes',
  owner: 'Sales Ops - Director',
  reconciliationTarget: 'Salesforce Opportunity Reports',
  dataQualityChecks: ['Range: 0-100%', 'Not null'],
  drillPath: '/salti?metric=close_rate',
  format: 'percent',
  unit: '%',
  higherIsBetter: true,
  target: 40,
  warningThreshold: 35,
  criticalThreshold: 30,
  formula: '(Sold Count / Proposed Count) × 100',
  sqlFormula: 'ROUND(sold_count::numeric / NULLIF(proposed_count, 0) * 100, 1)',
  lineage: {
    sourceSystem: 'Salesforce CRM',
    sourceTable: 'Opportunity',
    sourceFields: ['Stage', 'CloseDate', 'Amount'],
    transformations: ['Filter: Stage = Closed Won', 'Group by period'],
    updateFrequency: 'Every 15 minutes',
    dataLag: 'T-0'
  },
  aggregationType: 'weighted_average',
  weightField: 'proposal_count'
}
```

---

## Current State

- Admin Console at `/admin` has 11 tabs
- Sidebar links use `/admin?tab=xxx` pattern for 5 items
- Components exist in `src/app/(dashboard)/admin/components/`
- App Router pattern: `src/app/(dashboard)/[route]/page.tsx`
- **KPI Dictionary has only 20 KPIs - missing 47 SALTI KPIs**

## Target State

| Current Route | New Route | Page |
|---------------|-----------|------|
| `/admin?tab=salti` | `/salti` | SALTI Dashboard |
| `/admin?tab=overview` | `/platform-health` | Platform Health |
| `/admin?tab=adoption` | `/user-adoption` | User Adoption |
| `/admin?tab=quality` | `/data-quality` | Data Quality |
| `/admin?tab=anomalies` | `/anomalies` | Anomalies |

**KPI Dictionary: 20 → 71 KPIs** (add all SALTI metrics with full governance metadata)

---

## Phase 1: Create Standalone Pages

### 1.1 SALTI Dashboard (`/salti`)
**File:** `src/app/(dashboard)/salti/page.tsx`

**Layout:**
- Header with filters (Market, Region, Branch, Time Period)
- 4 Target KPI gauge cards row
- Lead Funnel horizontal visualization
- 5-10-2 Tracker section
- Tabbed section: Manager Scorecard | Colleague Scorecard | YoY Trends | Fallout Detail

**Components to use:**
- Existing: `SALTITargetKPIGauge`, `SALTILeadFunnel`, `SALTIFiveTenTwo`, `SALTISalesResults`, `SALTIPortfolio`, `SALTIHRMetrics`
- New: Manager/Colleague scorecard tables, YoY trends chart, Fallout detail table

**Role Access:** exec, market_vp, region_director, manager, sales_manager, rep

---

### 1.2 Platform Health (`/platform-health`)
**File:** `src/app/(dashboard)/platform-health/page.tsx`

**Layout:**
- Header with status badge, last refresh time, refresh button
- 6 System Vitals metric cards (Uptime, ETL Success, Query Time, API Latency, Downtime, Failed Jobs)
- Data Freshness SLA Tracker table
- ETL Job Monitor with filter tabs (All | Running | Completed | Failed)
- Incident Log table

**Components to use:**
- Existing: `PlatformHealth`, `DataFreshnessSLA`
- New: SystemVitalsRow, ETLJobMonitor, IncidentLog

**Role Access:** Admin emails only (exec for non-admin view)

---

### 1.3 User Adoption (`/user-adoption`)
**File:** `src/app/(dashboard)/user-adoption/page.tsx`

**Layout:**
- Header with date range selector, export button
- 4 Summary cards (Active Users, Sessions/Week, Avg Duration, Feature Adoption)
- Two-column: Users by Role bar chart | Login Activity line chart
- Peak Usage Heatmap (Day x Hour)
- Dashboard Usage table
- Two-column: Feature Adoption bars | Recent Activity feed

**Components to use:**
- Existing: `UserAdoption`
- New: AdoptionSummaryCards, UsersByRoleChart, LoginActivityChart, UsageHeatmap, DashboardUsageTable, FeatureAdoptionBars, RecentActivityFeed

**Role Access:** exec, market_vp, region_director, manager

---

### 1.4 Data Quality (`/data-quality`)
**File:** `src/app/(dashboard)/data-quality/page.tsx`

**Layout:**
- Header with overall score badge, time period selector, refresh button
- Quality Score Trend line chart
- 6 Quality Dimension cards (Accuracy, Completeness, Consistency, Timeliness, Validity, Uniqueness)
- 4 Live Validation status cards
- Issues table with severity/status filters
- Quality by Source table

**Components to use:**
- Existing: `DataQualityScorecard`
- Existing governance: `src/app/(dashboard)/governance/data-quality/page.tsx` patterns
- New: QualityScoreTrend, QualityDimensionCard, LiveValidationCards, IssuesTable, QualityBySourceTable

**Role Access:** exec, market_vp, region_director, manager

---

### 1.5 Anomalies (`/anomalies`)
**File:** `src/app/(dashboard)/anomalies/page.tsx`

**Layout:**
- Header with severity counts, time selector
- 4 Summary cards (Critical Anomalies, Schema Changes, SLA Breaches, Data Drift)
- Active Anomalies list with expandable cards and action buttons
- Anomaly Trends line chart
- Schema Changes table
- Alert Configuration section
- Historical Log table with search

**Components to use:**
- Existing: `AnomalyDetection`, `SchemaChangeAlerts`
- New: AnomalySummaryCards, ActiveAnomalyCard, AnomalyTrendsChart, AlertConfiguration, AnomalyHistoryTable

**Role Access:** exec, market_vp, region_director, manager

---

## Phase 2: Update Sidebar Navigation

**File:** `src/components/layout/AdminSidebar.tsx`

Update `adminNav` array:
```typescript
const adminNav = [
  { name: 'Admin Dashboard', href: '/admin', icon: Shield },
  { name: 'Platform Admin', href: '/platform-admin', icon: ShieldCheck },
  { name: 'SALTI Dashboard', href: '/salti', icon: Target },           // Changed
  { name: 'Platform Health', href: '/platform-health', icon: Activity }, // Changed
  { name: 'User Adoption', href: '/user-adoption', icon: Users },       // Changed
  { name: 'Data Quality', href: '/data-quality', icon: ClipboardCheck }, // Changed
  { name: 'Anomalies', href: '/anomalies', icon: AlertTriangle },       // Changed
]
```

---

## Phase 3: Mock Data Extensions

**File:** `src/lib/mock/adminPagesData.ts` (New)

Add mock data generators for expanded content:
- Manager/Colleague scorecards
- ETL job list
- Incident log history
- Dashboard usage stats
- Anomaly history
- Alert configurations

---

## Files to Create (5 pages)

1. `src/app/(dashboard)/salti/page.tsx`
2. `src/app/(dashboard)/platform-health/page.tsx`
3. `src/app/(dashboard)/user-adoption/page.tsx`
4. `src/app/(dashboard)/data-quality/page.tsx`
5. `src/app/(dashboard)/anomalies/page.tsx`

## Files to Modify (2)

1. `src/lib/kpis.ts` - **Add 47 SALTI KPIs with full metadata**
2. `src/components/layout/AdminSidebar.tsx` - Update navigation hrefs

---

## Phase 0: SALTI KPIs to Add to KPI_DICTIONARY

### Lead Funnel KPIs (13)
| Slug | Name | Format | Owner |
|------|------|--------|-------|
| `mql_count` | MQL Count | number | Sales Ops - Director |
| `sql_count` | SQL Count | number | Sales Ops - Director |
| `scheduled_count` | Scheduled Count | number | Sales Ops - Director |
| `inspected_count` | Inspected Count | number | Sales Ops - Director |
| `proposed_count` | Proposed Count | number | Sales Ops - Director |
| `sold_count` | Sold Count | number | Sales Ops - Director |
| `unscheduled_count` | Unscheduled Count | number | Sales Ops - Director |
| `canceled_count` | Canceled Count | number | Sales Ops - Director |
| `mql_to_sql_rate` | MQL to SQL Rate | percent | Sales Ops - Director |
| `sql_to_scheduled_rate` | SQL to Scheduled Rate | percent | Sales Ops - Director |
| `scheduled_to_inspected_rate` | Scheduled to Inspected Rate | percent | Sales Ops - Director |
| `inspected_to_proposed_rate` | Inspected to Proposed Rate | percent | Sales Ops - Director |
| `proposed_to_sold_rate` | Proposed to Sold Rate | percent | Sales Ops - Director |

### Sales Target KPIs (4)
| Slug | Name | Format | Target |
|------|------|--------|--------|
| `close_rate` | Close Rate | percent | 40% |
| `speed_to_lead` | Speed to Lead | days | 2 days |
| `bundle_rate` | Bundle Rate | number | 1.5 |
| `avg_started_value` | Avg Started Value | currency | $4,000 |

### Productivity KPIs (7)
| Slug | Name | Format | Owner |
|------|------|--------|-------|
| `schedule_rate` | Schedule Rate | percent | Sales Ops |
| `fulfillment_rate` | Fulfillment Rate | percent | Operations |
| `inspection_rate` | Inspection Rate | percent | Sales Ops |
| `offer_rate` | Offer Rate | percent | Sales Ops |
| `proposal_rate` | Proposal Rate | percent | Sales Ops |
| `mql_cancel_rate` | MQL Cancel Rate | percent | Sales Ops |
| `mql_to_sql_conversion` | MQL to SQL Conversion | percent | Sales Ops |

### Sales Results KPIs (12)
| Slug | Name | Format | Owner |
|------|------|--------|-------|
| `started_sales` | Started Sales | currency | Finance |
| `net_sales` | Net Sales | currency | Finance |
| `contracts_value` | Contracts Value | currency | Finance |
| `contracts_units` | Contracts Units | number | Sales Ops |
| `inis_value` | INIs Value | currency | Finance |
| `inis_units` | INIs Units | number | Sales Ops |
| `jobs_value` | Jobs Value | currency | Finance |
| `jobs_units` | Jobs Units | number | Sales Ops |
| `started_as_pct_of_net` | Started as % of Net | percent | Finance |
| `cy_vs_lytd_pct` | CY vs LYTD % | percent | Finance |
| `yoy_variance` | YoY Variance | currency | Finance |
| `yoy_variance_pct` | YoY Variance % | percent | Finance |

### 5-10-2 KPIs (6)
| Slug | Name | Format | Target |
|------|------|--------|--------|
| `inspections_per_day_per_rep` | Inspections/Day/Rep | number | 5 |
| `services_proposed_per_day_per_rep` | Proposed/Day/Rep | number | 10 |
| `sales_per_day_per_rep` | Sales/Day/Rep | number | 2 |
| `reps_5_plus_inspections_pct` | Reps 5+ Inspections % | percent | 80% |
| `reps_10_plus_proposed_pct` | Reps 10+ Proposed % | percent | 70% |
| `reps_2_plus_sales_pct` | Reps 2+ Sales % | percent | 60% |

### Portfolio KPIs (5)
| Slug | Name | Format | Owner |
|------|------|--------|-------|
| `gross_sales` | Gross Sales | currency | Finance |
| `net_price` | Net Price | currency | Finance |
| `gross_adjustments` | Gross Adjustments | currency | Finance |
| `gross_terminations` | Gross Terminations | currency | Finance |
| `net_gain` | Net Gain | currency | Finance |

### HR KPIs (4)
| Slug | Name | Format | Target |
|------|------|--------|--------|
| `headcount` | Headcount | number | N/A |
| `voluntary_terms` | Voluntary Terminations | number | N/A |
| `involuntary_terms` | Involuntary Terminations | number | N/A |
| `retention_rate` | Retention Rate | percent | 95% |

**Total: 51 new KPIs** (Dictionary grows from 20 to 71)

---

## Verification Steps

1. **KPI Dictionary Verification:**
   - Navigate to `/governance` > KPI Dictionary tab
   - Verify 71 KPIs displayed (20 existing + 51 new)
   - Search for "close_rate", "mql_count", "net_gain" - all should appear
   - Filter by category "sales" - should show all SALTI sales KPIs
   - Export CSV and verify all 71 KPIs included

2. **Build Check:** `npm run build` passes with zero errors

3. **Route Verification:**
   - `/salti` loads SALTI Dashboard with all sections
   - `/platform-health` loads with System Vitals, SLA Tracker, ETL, Incidents
   - `/user-adoption` loads with Summary, Charts, Tables, Activity Feed
   - `/data-quality` loads with Score, Dimensions, Validation, Issues
   - `/anomalies` loads with Summary, Active list, Trends, Config, History

4. **Sidebar Navigation:**
   - All 5 links navigate to new routes (not /admin?tab=xxx)
   - Active state highlights correctly on each page

5. **Visual Check:**
   - No text truncation
   - Mobile responsive
   - Dark mode compatible

---

## Implementation Order

1. **Add 51 SALTI KPIs to `src/lib/kpis.ts`** - Full metadata for each
2. Create `/salti/page.tsx` - Reuse SALTI components
3. Create `/platform-health/page.tsx` - Expand PlatformHealth
4. Create `/user-adoption/page.tsx` - Expand UserAdoption
5. Create `/data-quality/page.tsx` - Leverage governance patterns
6. Create `/anomalies/page.tsx` - Combine Anomaly + Schema components
7. Update AdminSidebar navigation
8. Run build and verify all routes + KPI Dictionary

When complete: `<promise>COMPLETE</promise>`
