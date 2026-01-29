# BigQuery Gap Analysis

**Generated:** 2026-01-22
**Purpose:** Map dashboard mock data requirements to available BigQuery tables
**Project:** bidata-sharedus-production (PRODUCTION)

---

## Executive Summary

| Module | Pages | Full Match | Partial Match | No Match | Coverage |
|--------|-------|------------|---------------|----------|----------|
| Executive Command Center | 1 | 0 | 1 | 0 | ⚠️ 50% |
| Leads | 5 | 5 | 0 | 0 | ✅ 100% |
| SALTI | 8 | 3 | 4 | 1 | ⚠️ 60% |
| Sales | 7 | 5 | 1 | 1 | ✅ 80% |
| Finance | 4 | 1 | 1 | 2 | ⚠️ 35% |
| HR | 1 | 0 | 1 | 0 | ⚠️ 50% |
| Termite | 2 | 2 | 0 | 0 | ✅ 100% |
| Workforce | 1 | 0 | 1 | 0 | ⚠️ 50% |
| Lead Service Engine | 6 | 1 | 2 | 3 | ⚠️ 35% |
| **Total** | **35** | **17** | **11** | **7** | **⚠️ 63%** |

**Recommendation:** Focus integration on Leads (100%), Sales (80%), and Termite (100%) modules for Phase 1.

---

## Production BigQuery Tables Reference

| Table | Dataset | Primary Use |
|-------|---------|-------------|
| `Fact_Leads_Acc_Daily_Dtls_Vw` | S4 | Lead tracking (70 columns) |
| `Fact_ContractSales_Txn_Na_Daily_Dtl_Vw` | S4 | Contract sales (72 columns) |
| `Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw` | S4 | Contract cancellations |
| `Fact_ContractBacklog_Txn_Na_Daily_Dtl_Vw` | S4 | Sales backlog |
| `Fact_ContractStartRateByDuration_Txn_Na_Daily_Agg_Vw` | S4 | Start rate metrics |
| `VwUnf_daily_ar` | S4 | AR aging |
| `Fact_PNI_Details_Txn_Na_Daily_Dtl_vw` | S4 | Termite PNI inspections |
| `Fact_TermiteRenewals_Snp_Na_Daily_Agg_Vw` | S4 | Termite renewals |
| `Fact_WorkOrderCompleted_Txn_Na_Daily_Dtl_Vw` | S4 | Work orders |
| `Fact_RTX_Employees_Latest` | S4 | Employee master (28K rows) |
| `dim_branch` | S4 | Branch hierarchy |

---

## Detailed Gap Analysis by Module

---

### 1. Executive Command Center (Page: `/`)

**Mock Data Source:** `/src/lib/kpi-calculations.ts`, `/src/lib/data.ts`

#### Match Assessment: ⚠️ Partial Match (50%)

| Metric | Status | BigQuery Source |
|--------|--------|-----------------|
| Revenue MTD | ⚠️ | Calculate from `Fact_ContractSales` |
| Pipeline | ❌ | No CRM data |
| Win Rate | ❌ | No CRM data |
| AR 90+ | ✅ | `VwUnf_daily_ar.PastDueBUCKET` |
| Callbacks | ⚠️ | `Fact_WorkOrderCompleted` (needs filtering) |
| Backlog | ✅ | `Fact_ContractBacklog` |

---

### 2. Leads Module (5 Pages) ✅ FULL MATCH

**Mock Data Source:** `/src/lib/mock/leadsData.ts`
**BigQuery Table:** `S4.Fact_Leads_Acc_Daily_Dtls_Vw`

---

#### 2.1 Leads by Type/Pest (`/leads/type-pest`) ✅

**Required Fields:**
- `pestType`, `leadCount`, `converted`, `avgValue`, `marketShare`

**BigQuery Columns:** `primary_pest`, `primary_pest_report_group`, `primary_pest_type_1`, `market_type`

```sql
SELECT
  primary_pest_report_group as pest_type,
  COUNT(*) as lead_count,
  COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as converted,
  SAFE_DIVIDE(COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END), COUNT(*)) as conversion_rate
FROM `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Vw`
WHERE received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY primary_pest_report_group
ORDER BY lead_count DESC
```

---

#### 2.2 Lead Trends (`/leads/trends`) ✅

**Required Fields:**
- `date`, `leads`, `converted`, `conversionRate`

**BigQuery Columns:** `received_date`, `scheduled_date`, `inspected_date`, `proposed_date`, `sold_date`

```sql
SELECT
  DATE(received_date) as date,
  COUNT(*) as leads,
  COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as converted,
  SAFE_DIVIDE(COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END), COUNT(*)) as conversion_rate
FROM `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Vw`
WHERE received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY DATE(received_date)
ORDER BY date
```

---

#### 2.3 Lead Rankings (`/leads/rankings`) ✅

**Required Fields:**
- `rank`, `entity`, `leads`, `converted`, `conversionRate`, `trend`

**BigQuery Columns:** `report_branch`, `assigned_branch`, market/region from `dim_branch`

```sql
SELECT
  b.market_nm as market,
  b.region_nm as region,
  l.report_branch as branch,
  COUNT(*) as leads,
  COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as converted,
  SAFE_DIVIDE(COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END), COUNT(*)) as conversion_rate
FROM `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Vw` l
LEFT JOIN `bidata-sharedus-production.S4.dim_branch` b ON l.report_branch = b.branch_num
WHERE l.received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY b.market_nm, b.region_nm, l.report_branch
ORDER BY leads DESC
```

---

#### 2.4 Lead Cancellations (`/leads/cancels`) ✅

**Required Fields:**
- `cancelReason`, `count`, `avgDaysToCancel`

**BigQuery Columns:** `cancel_reason`, `cancel_date`, `received_date`

```sql
SELECT
  cancel_reason,
  COUNT(*) as count,
  AVG(DATE_DIFF(cancel_date, DATE(received_date), DAY)) as avg_days_to_cancel
FROM `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Vw`
WHERE cancel_date IS NOT NULL
  AND received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY cancel_reason
ORDER BY count DESC
```

---

#### 2.5 Lead Geographic (`/leads/geographic`) ✅

**Required Fields:**
- `market`, `region`, `leads`, `avgResponseTime`

**BigQuery Columns:** `contact_state`, `contact_zip_code`, `contact_city`, with `dim_branch` join

```sql
SELECT
  contact_state as state,
  b.market_nm as market,
  b.region_nm as region,
  COUNT(*) as leads,
  COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as converted
FROM `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Vw` l
LEFT JOIN `bidata-sharedus-production.S4.dim_branch` b ON l.report_branch = b.branch_num
WHERE l.received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY contact_state, b.market_nm, b.region_nm
ORDER BY leads DESC
```

---

### 3. SALTI Module (8 Pages)

**Mock Data Source:** `/src/lib/mock/saltiData.ts`

---

#### 3.1 SALTI Lead Funnel (`/salti`) ✅

**BigQuery Table:** `S4.Fact_Leads_Acc_Daily_Dtls_Vw`

**Available Stage Columns:**
- `received_date` → MQL
- `assigned_date` → SQL
- `scheduled_date` → Scheduled
- `inspected_date` → Inspected
- `proposed_date` → Proposed
- `sold_date` → Sold
- `cancel_date` → Canceled

```sql
SELECT
  COUNT(CASE WHEN received_date IS NOT NULL THEN 1 END) as mql_count,
  COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as scheduled_count,
  COUNT(CASE WHEN inspected_date IS NOT NULL THEN 1 END) as inspected_count,
  COUNT(CASE WHEN proposed_date IS NOT NULL THEN 1 END) as proposed_count,
  COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as sold_count,
  COUNT(CASE WHEN cancel_date IS NOT NULL THEN 1 END) as canceled_count
FROM `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Vw`
WHERE received_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
```

---

#### 3.2 SALTI Target KPIs ⚠️ Partial

- **Available:** Actual rates from lead/sales data
- **Missing:** Target values (require configuration)

---

#### 3.3 SALTI Sales Results ⚠️ Partial

**BigQuery Table:** `S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw`

Available: Contract counts, values, started metrics
Missing: Some YoY comparison views

---

#### 3.4 SALTI HR Metrics ❌ No Match

No HR retention/turnover data in production BigQuery.

---

### 4. Sales Module (7 Pages)

**Mock Data Source:** `/src/lib/mock/salesExtendedData.ts`

---

#### 4.1 Speed to Install (`/sales/speed-to-install`) ✅

**BigQuery Table:** `S4.Fact_ContractStartRateByDuration_Txn_Na_Daily_Agg_Vw`

```sql
SELECT
  SellDateYearMonth as period,
  SUM(ContractCount) as total_sold,
  SUM(ContractStartedCount) as total_started,
  SUM(CASE WHEN DaysToStartBucket <= 2 THEN ContractStartedCount END) as within_48_hours,
  SUM(CASE WHEN DaysToStartBucket <= 7 THEN ContractStartedCount END) as within_7_days
FROM `bidata-sharedus-production.S4.Fact_ContractStartRateByDuration_Txn_Na_Daily_Agg_Vw`
WHERE SellDateYearMonth >= 202401
GROUP BY SellDateYearMonth
ORDER BY SellDateYearMonth
```

---

#### 4.2 Sales Today (`/sales/today`) ✅

**BigQuery Table:** `S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw`

```sql
SELECT
  COUNT(CASE WHEN started_ind = 'Y' THEN 1 END) as closed_won,
  SUM(CASE WHEN started_ind = 'Y' THEN contract_value END) as closed_won_value,
  COUNT(CASE WHEN raw_cancel_ind = 'Y' THEN 1 END) as canceled
FROM `bidata-sharedus-production.S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw`
WHERE sell_date = CURRENT_DATE()
```

---

#### 4.3 Backlog (`/sales/backlog`) ✅

**BigQuery Table:** `S4.Fact_ContractBacklog_Txn_Na_Daily_Dtl_Vw`

```sql
SELECT
  salesID,
  customer_name,
  ProductGroup as service_type,
  SellDate as sold_date,
  DATE_DIFF(CURRENT_DATE(), SellDate, DAY) as days_since_sold,
  ContractValue as amount
FROM `bidata-sharedus-production.S4.Fact_ContractBacklog_Txn_Na_Daily_Dtl_Vw`
WHERE CancelDate IS NULL
ORDER BY days_since_sold DESC
LIMIT 100
```

---

#### 4.4 Canceled Agreements (`/sales/canceled-agreements`) ✅

**BigQuery Table:** `S4.Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw`

```sql
SELECT
  salesID,
  customer_name,
  ProductGroup as service_type,
  SellDate as sold_date,
  CancelDate as cancel_date,
  CancelReasonCode as cancel_reason,
  DATE_DIFF(CancelDate, SellDate, DAY) as days_to_cancel,
  ContractValue as amount
FROM `bidata-sharedus-production.S4.Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw`
WHERE CancelDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
ORDER BY CancelDate DESC
```

---

#### 4.5 Start Rate (`/sales/start-rate`) ✅

**BigQuery Table:** `S4.Fact_ContractStartRateByDuration_Txn_Na_Daily_Agg_Vw`

```sql
SELECT
  SellDateYearMonth as period,
  SUM(ContractCount) as total_sold,
  SUM(ContractStartedCount) as total_started,
  SAFE_DIVIDE(SUM(ContractStartedCount), SUM(ContractCount)) as start_rate
FROM `bidata-sharedus-production.S4.Fact_ContractStartRateByDuration_Txn_Na_Daily_Agg_Vw`
WHERE SellDateYearMonth >= 202401
GROUP BY SellDateYearMonth
ORDER BY SellDateYearMonth
```

---

#### 4.6 Opportunity Detail (`/sales/opportunity/[id]`) ❌

No CRM opportunity data in BigQuery.

---

### 5. Finance Module (4 Pages)

---

#### 5.1 AR Aging (`/finance/ar`) ✅

**BigQuery Table:** `S4.VwUnf_daily_ar`

```sql
SELECT
  PastDueBUCKET as aging_bucket,
  COUNT(*) as invoice_count,
  SUM(Amount) as total_amount,
  market_nm as market,
  region_nm as region
FROM `bidata-sharedus-production.S4.VwUnf_daily_ar`
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `bidata-sharedus-production.S4.VwUnf_daily_ar`)
GROUP BY PastDueBUCKET, market_nm, region_nm
```

---

#### 5.2 Revenue Projections (`/finance/projections`) ❌

No forecast data in BigQuery.

---

#### 5.3 P&L Statement (`/finance/pnl`) ❌

No P&L/GL data in BigQuery.

---

### 6. HR Module (1 Page)

---

#### 6.1 HR Retention (`/hr/retention`) ⚠️ Partial

**BigQuery Table:** `S4.Fact_RTX_Employees_Latest`

Available: Employee master with hire/term dates (28K employees)
Missing: Historical snapshots for turnover calculation

```sql
SELECT
  b.market_nm as market,
  COUNT(*) as headcount,
  COUNT(CASE WHEN e.Termination_Date IS NOT NULL THEN 1 END) as terminated,
  AVG(DATE_DIFF(CURRENT_DATE(), DATE(e.Hire_Date), MONTH)) as avg_tenure_months
FROM `bidata-sharedus-production.S4.Fact_RTX_Employees_Latest` e
LEFT JOIN `bidata-sharedus-production.S4.dim_branch` b ON e.Branch = b.branch_num
WHERE e.Active = 'Y'
GROUP BY b.market_nm
```

---

### 7. Termite Module (2 Pages) ✅ FULL MATCH

---

#### 7.1 PNI Inspections (`/termite/pni`) ✅

**BigQuery Table:** `S4.Fact_PNI_Details_Txn_Na_Daily_Dtl_vw`

```sql
SELECT
  Branch_Number,
  Branch_Name,
  COUNT(*) as inspection_count,
  SUM(AR_Collections_Amt) as revenue,
  COUNT(DISTINCT Customer_Number) as unique_customers
FROM `bidata-sharedus-production.S4.Fact_PNI_Details_Txn_Na_Daily_Dtl_vw`
WHERE Service_Begin_Date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY Branch_Number, Branch_Name
ORDER BY inspection_count DESC
```

---

#### 7.2 Termite Renewals (`/termite/renewals`) ✅

**BigQuery Table:** `S4.Fact_TermiteRenewals_Snp_Na_Daily_Agg_Vw`

```sql
SELECT
  SalesAgreement_Number,
  Customer_Number,
  Full_Name as customer_name,
  Branch_Number,
  Branch_Name,
  Service_Frequency,
  AutoPay_Flag,
  Renewal_Month,
  Annual_Service_Count
FROM `bidata-sharedus-production.S4.Fact_TermiteRenewals_Snp_Na_Daily_Agg_Vw`
WHERE Renewal_Month = EXTRACT(MONTH FROM CURRENT_DATE())
```

---

### 8. Workforce Module (1 Page)

---

#### 8.1 Tech Productivity (`/workforce/tech-productivity`) ⚠️ Partial

**BigQuery Table:** `S4.Fact_WorkOrderCompleted_Txn_Na_Daily_Dtl_Vw`

Available: Work orders completed by tech
Missing: Productivity targets, customer ratings

```sql
SELECT
  TechName,
  AssignedTech as tech_id,
  COUNT(*) as stops_completed,
  SUM(WorkOrderAmount) as revenue_generated,
  AVG(WorkOrderAmount) as avg_revenue_per_stop
FROM `bidata-sharedus-production.S4.Fact_WorkOrderCompleted_Txn_Na_Daily_Dtl_Vw`
WHERE EndDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY TechName, AssignedTech
ORDER BY stops_completed DESC
```

---

### 9. Lead Service Engine (6 Pages)

---

#### 9.1 Lead Journey (`/lead-service-engine`, `/leads/journey`) ✅

**BigQuery Table:** `S4.Fact_Leads_Acc_Daily_Dtls_Vw`

Lead stage progression available via date columns.

---

#### 9.2 Other LSE Pages ⚠️/❌

- At-risk leads: ⚠️ Partial (calculate from stalled dates)
- Automation: ❌ No workflow data
- Integration: ❌ No integration status
- Handoffs: ❌ No handoff tracking

---

## Recommended Integration Priority

### Phase 1: Full Match (✅) - Implement First

| Page | BigQuery Table | Complexity |
|------|----------------|------------|
| `/leads/type-pest` | `Fact_Leads_Acc_Daily_Dtls_Vw` | Low |
| `/leads/trends` | `Fact_Leads_Acc_Daily_Dtls_Vw` | Low |
| `/leads/rankings` | `Fact_Leads_Acc_Daily_Dtls_Vw` + `dim_branch` | Medium |
| `/leads/cancels` | `Fact_Leads_Acc_Daily_Dtls_Vw` | Low |
| `/leads/geographic` | `Fact_Leads_Acc_Daily_Dtls_Vw` + `dim_branch` | Medium |
| `/sales/speed-to-install` | `Fact_ContractStartRateByDuration_*` | Low |
| `/sales/backlog` | `Fact_ContractBacklog_*` | Low |
| `/sales/canceled-agreements` | `Fact_ContractCancels_*` | Low |
| `/sales/start-rate` | `Fact_ContractStartRateByDuration_*` | Low |
| `/sales/today` | `Fact_ContractSales_*` | Low |
| `/finance/ar` | `VwUnf_daily_ar` | Low |
| `/termite/pni` | `Fact_PNI_Details_*` | Medium |
| `/termite/renewals` | `Fact_TermiteRenewals_*` | Medium |
| `/salti` (funnel) | `Fact_Leads_Acc_Daily_Dtls_Vw` | Medium |
| `/leads/journey` | `Fact_Leads_Acc_Daily_Dtls_Vw` | Medium |

### Phase 2: Partial Match (⚠️) - Requires Additional Work

| Page | Gap | Effort |
|------|-----|--------|
| `/workforce/tech-productivity` | Need productivity targets | Medium |
| `/hr/retention` | Need historical snapshots | High |
| `/salti` (full) | Need targets, HR data | High |

### Phase 3: No Match (❌) - Blocked

| Page | Blocker |
|------|---------|
| `/finance/projections` | Need forecasting system |
| `/finance/pnl` | Need GL/finance system |
| `/sales/opportunity/[id]` | Need Salesforce integration |

---

## Implementation Notes

### Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_DATA_SOURCE=mock          # Default: mock data
# NEXT_PUBLIC_DATA_SOURCE=bigquery    # Switch to live BigQuery

BIGQUERY_ENVIRONMENT=production        # Use production tables
BIGQUERY_PROJECT_ID=bidata-sharedus-production
```

### Query File Structure

```
/src/lib/bigquery/queries/
  ├── leads.ts         # Lead queries
  ├── sales.ts         # Sales/contract queries
  ├── finance.ts       # AR/finance queries
  ├── termite.ts       # PNI/renewal queries
  ├── workforce.ts     # Tech productivity queries
  └── index.ts         # Export all
```

### Fallback Pattern

```typescript
async function getLeadsByPestType() {
  const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE

  if (dataSource === 'bigquery') {
    try {
      return await bigQueryLeadsByPestType()
    } catch (error) {
      console.error('BigQuery failed, falling back to mock:', error)
      return mockLeadsData.getLeadsByPestType()
    }
  }

  return mockLeadsData.getLeadsByPestType()
}
```

---

## Next Steps

1. Create BigQuery query functions in `/src/lib/bigquery/queries/`
2. Add data source toggle to admin page
3. Update Phase 1 pages to check `NEXT_PUBLIC_DATA_SOURCE`
4. Add "Live Data" / "Demo Data" badge indicator
5. Implement error handling with mock fallback
6. Test with production data
7. Run `npm run build` to verify
