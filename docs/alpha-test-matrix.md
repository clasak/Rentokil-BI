# Alpha Test Matrix

**Version:** 1.0
**Date:** January 11, 2026
**Status:** Alpha Testing

---

## Navigation Access Matrix

This matrix shows which roles can access which routes in the Rentokil BI application.

| Route | exec | market_dir | region_dir | manager | sales_mgr | ops_mgr | rep | tech |
|-------|:----:|:----------:|:----------:|:-------:|:---------:|:-------:|:---:|:----:|
| `/` (Command Center) | Full | Full | Full | Full | Sales View | Ops View | Rep View | Tech View |
| `/sales` | Full | Full | Full | Full | Full | Full | No Nav | No Nav |
| `/ops` | Full | Full | Full | Full | No Nav | Full | No Nav | No Nav |
| `/finance` | Full | Full | Full | Full | Full | Full | No Nav | No Nav |
| `/forecast` | Full | Full | Full | Full | Full | Full | No Nav | No Nav |
| `/governance/*` | Full | Full | Full | Full | Full | Full | Hidden | Hidden |
| `/ae/*` | No Nav | No Nav | No Nav | No Nav | No Nav | No Nav | Full | No Nav |
| `/tech/*` | No Nav | No Nav | No Nav | No Nav | No Nav | No Nav | No Nav | Full |
| `/manager/*` | No Nav | No Nav | No Nav | Full | No Nav | No Nav | No Nav | No Nav |
| `/admin` | Admin | Admin | Admin | Admin | No Access | No Access | No Access | No Access |
| `/kpi/[slug]` | Full | Full | Full | Full | Full | Full | Full | Full |
| `/wbr` | Full | Full | Full | Full | Full | Full | Hidden | Hidden |
| `/qbr` | Full | Full | Full | Full | Full | Full | Hidden | Hidden |
| `/lead-service-engine` | Full | Full | Full | Full | Full | Full | No Nav | No Nav |
| `/people` | Full | Full | Full | Full | No Nav | No Nav | No Nav | No Nav |
| `/settings` | Full | Full | Full | Full | Full | Full | Full | Full |

### Legend

- **Full** = Full access with appropriate data scoping
- **Admin** = Access requires admin email whitelist check
- **No Nav** = Route accessible directly but not shown in navigation
- **Hidden** = Route not visible and may redirect or show empty state
- **No Access** = Route blocked (returns 403 or redirects)

---

## Data Scoping Tests

| Role | Expected Scope | Test Criteria | Status |
|------|---------------|---------------|--------|
| exec | All markets, all data | See 6 markets, all KPIs, full pipeline | [ ] |
| market_vp | Assigned market(s) | Only assigned market data in grids | [ ] |
| market_sales_director | Assigned market(s) | Only assigned market data, sales-focused views | [ ] |
| region_director | Assigned region | Only assigned region branches | [ ] |
| region_sales_manager | Assigned region | Only assigned region branches, sales-focused views | [ ] |
| manager | Assigned branch | Single branch data only | [ ] |
| sales_manager | Assigned reps | Only opportunities owned by assigned reps | [ ] |
| ops_manager | Assigned technicians | Only service events for assigned techs | [ ] |
| rep | Own data only | Only own opportunities, accounts | [ ] |
| technician | Own routes/services | Only own schedule, tickets | [ ] |

---

## Route Acceptance Criteria

### Core Routes

| Route | Acceptance Criteria | Status |
|-------|---------------------|--------|
| `/` | Role-appropriate command center loads; KPIs display correct values; No hydration errors | [ ] |
| `/sales` | Pipeline stages sum correctly; Win rate matches calculation; Stalled opps flagged | [ ] |
| `/ops` | Service Risk Index displays; Callback rate accurate; Capacity utilization shown | [ ] |
| `/finance` | AR aging buckets correct; DSO calculation accurate; Invoice drilldown works | [ ] |
| `/forecast` | 8-week projection displays; 3 scenarios selectable; Backtest MAE shown | [ ] |

### Governance Routes

| Route | Acceptance Criteria | Status |
|-------|---------------------|--------|
| `/governance` | KPI Dictionary loads; Data Quality metrics display; Permissions matrix accurate | [ ] |
| `/governance/kpi-dictionary` | All 20 KPIs listed with definitions | [ ] |
| `/governance/data-quality` | Data source freshness indicators work | [ ] |
| `/governance/permissions` | Role matrix displays correctly | [ ] |

### KPI Detail Routes

| Route | Acceptance Criteria | Status |
|-------|---------------------|--------|
| `/kpi/[slug]` | All 5 tabs load (Overview, Drivers, Actions, Reconcile, Definition) | [ ] |
| `/kpi/revenue_mtd` | Shows correct MTD value; Target comparison accurate | [ ] |
| `/kpi/win_rate` | Percentage matches closed won/lost calculation | [ ] |
| `/kpi/service_risk_index` | Composite score calculates correctly from components | [ ] |

### Role-Specific Routes

| Route | Role | Acceptance Criteria | Status |
|-------|------|---------------------|--------|
| `/ae/dashboard` | rep | Personal KPIs and metrics display | [ ] |
| `/ae/sales-tracker` | rep | Proposals/sales entry works; Totals correct | [ ] |
| `/ae/proposals` | rep | Proposal list and details load | [ ] |
| `/tech/schedule` | technician | Daily schedule loads correctly | [ ] |
| `/tech/tickets` | technician | Service tickets filterable | [ ] |
| `/manager/daily-cadence` | manager | Branch metrics display | [ ] |

---

## KPI Reconciliation Tests

### TOP_10_KPIS Validation

| KPI | Test | Expected | Tolerance | Status |
|-----|------|----------|-----------|--------|
| `revenue_mtd` | Sum invoices manually vs calculated | Match | 0.1% | [ ] |
| `variance_to_target_mtd` | Verify target is FIXED, not circular | Not tracking actual | 0.1% | [ ] |
| `pipeline_30_60_90` | Sum weighted pipeline by bucket | Match | 0.1% | [ ] |
| `win_rate` | Count won/lost manually vs displayed | Exact | 0.5% | [ ] |
| `forecast_revenue_8w` | Verify pipeline + base calculation | Within range | 5% | [ ] |
| `service_risk_index` | Verify component weights sum correctly | Within range | 1 point | [ ] |
| `callback_rate` | Count callbacks / completions | Match | 0.5% | [ ] |
| `ar_aging` | Sum bucket amounts vs total AR | Exact | 0.1% | [ ] |
| `capacity_utilization` | Used hours / available hours | Match | 0.5% | [ ] |
| `crm_hygiene_score` | Verify 40/30/30 weighting | Within range | 1 point | [ ] |

### Additional KPI Validation

| KPI | Test | Tolerance | Status |
|-----|------|-----------|--------|
| `avg_cycle_time_days` | Average of closed won cycle times | 0 (exact) | [ ] |
| `missed_service_rate` | Missed / scheduled count | 0.5% | [ ] |
| `avg_response_time_hours` | Average on-demand response time | 0 (exact) | [ ] |
| `dso` | AR balance / revenue * 30 | 0 (exact) | [ ] |
| `scheduling_pressure_index` | Component calculation | 1 point | [ ] |
| `stalled_opps` | Count of 14+ day stalled | 0 (exact) | [ ] |
| `retention_risk` | At-risk account value sum | 0.1% | [ ] |
| `complaint_rate` | Complaints per 1000 services | 0.5% | [ ] |
| `nrr` | Net revenue retention calculation | 0.5% | [ ] |
| `margin_proxy` | Margin calculation | 0.5% | [ ] |

---

## API Endpoint Tests

| Endpoint | Method | Test | Expected | Status |
|----------|--------|------|----------|--------|
| `/api/health` | GET | Returns health status | `{ status: 'healthy' }` | [ ] |
| `/api/health/kpis` | GET | Returns KPI health | All TOP_10 computed | [ ] |
| `/api/kpis` | GET | Returns all KPIs | 20 KPIs with values | [ ] |
| `/api/kpis?top10=true` | GET | Returns TOP_10 only | 10 KPIs returned | [ ] |
| `/api/kpis?role=rep` | GET | Returns role-scoped data | Data filtered | [ ] |
| `/api/reconcile` | GET | Runs reconciliation | All within tolerance | [ ] |
| `/api/reconcile` | POST | Custom KPI list | Specified KPIs checked | [ ] |

---

## Authentication Tests

| Test | Criteria | Status |
|------|----------|--------|
| Login with email/password | Successful login, redirect to dashboard | [ ] |
| Login with invalid credentials | Error message displayed | [ ] |
| Forgot password | Reset email sent | [ ] |
| Protected route without auth | Redirect to login | [ ] |
| Admin route without admin email | Access denied or redirect | [ ] |
| Session expiry | Redirect to login after timeout | [ ] |
| Logout | Session cleared, redirect to login | [ ] |

---

## UI/UX Tests

| Test | Criteria | Status |
|------|----------|--------|
| Theme toggle (Light/Dark/System) | Theme changes correctly | [ ] |
| Sidebar navigation | All links work for role | [ ] |
| Breadcrumb navigation | Correct hierarchy shown | [ ] |
| KPI card click | Navigates to detail page | [ ] |
| Presenter mode | Steps progress correctly | [ ] |
| Mobile responsive | Layout adjusts appropriately | [ ] |
| PDF export (WBR/QBR) | PDF generates correctly | [ ] |
| Data refresh | Synthetic data regenerates | [ ] |

---

## Performance Tests

| Test | Target | Status |
|------|--------|--------|
| Initial page load (Command Center) | < 2 seconds | [ ] |
| KPI calculation time | < 500ms | [ ] |
| Navigation between routes | < 300ms | [ ] |
| Health endpoint response | < 100ms | [ ] |
| Reconciliation endpoint | < 1 second | [ ] |

---

## Test Execution Log

### Test Session Template

```
Date: ____________________
Tester: ____________________
Role Tested: ____________________
Browser: ____________________
Environment: [ ] Local [ ] Vercel Preview [ ] Production

Findings:
-

Bugs Found:
-

Notes:
-
```

---

## Sign-Off

| Milestone | Approver | Date | Signature |
|-----------|----------|------|-----------|
| Role Testing Complete | | | |
| KPI Reconciliation Pass | | | |
| API Endpoints Verified | | | |
| Alpha Ready | | | |
