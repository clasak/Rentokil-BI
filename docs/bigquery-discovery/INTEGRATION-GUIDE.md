# Dashboard to BigQuery Integration Guide

**Generated:** 2026-01-22T17:37:23.536Z
**Project:** bidata-sharedus-production

---

## Executive Summary

| Status | Pages | Percentage |
|--------|-------|------------|
| ✅ Full Match (80%+) | 26 | 51.0% |
| ⚠️ Partial Match (50-79%) | 16 | 31.4% |
| 🔶 Poor Match (30-49%) | 5 | 9.8% |
| ❌ No Match (<30%) | 4 | 7.8% |
| **Total** | **51** | **100%** |

---

## Pages Ready for Immediate Connection

These pages have 80%+ field match and can be connected to BigQuery immediately:

### Lead Trends (`/leads/trends`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S4.Unf_RTX_cm_proj`
- Match: 100%
- Rows: 150,387,455
- Size: 9.27 GB
- Fresh Data: Yes
- Matched Fields: received_date, lead_date, lead_count, scheduled_date, inspected_date, proposed_date, sold_date


### Lead Cancellations (`/leads/cancels`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S4.Fact_Leads_Acc_Daily_Dtls_Snp`
- Match: 80%
- Rows: 11,846,813
- Size: 5.87 GB
- Fresh Data: Yes
- Matched Fields: cancel_reason, cancel_date, lead_type, received_date
- Missing: days_to_cancel

### Geographic Analysis (`/leads/geographic`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0.raw_TDW_PNIDetails_Daily`
- Match: 86%
- Rows: 6,920,595
- Size: 3.13 GB
- Fresh Data: Yes
- Matched Fields: state, zip_code, city, branch, region, lead_count
- Missing: market

### Lead Journey Tracking (`/leads/journey`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0_TMX.tmx_lead`
- Match: 88%
- Rows: 74,445,347
- Size: 43.30 GB
- Fresh Data: Yes
- Matched Fields: lead_id, received_date, assigned_date, scheduled_date, inspected_date, proposed_date, sold_date
- Missing: stage

### SALTI Daily Check-In (`/salti/daily-check-in`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0_TMX.tmx_lead`
- Match: 86%
- Rows: 74,445,347
- Size: 43.30 GB
- Fresh Data: Yes
- Matched Fields: date, scheduled, inspected, proposed, sold, activity
- Missing: sales_rep

### Proposal Pipeline (`/salti/proposal-pipeline`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0_TMX.tmx_ar`
- Match: 100%
- Rows: 238,782,610
- Size: 94.92 GB
- Fresh Data: Yes
- Matched Fields: proposal_id, proposal_date, proposal_status, sales_rep, proposal_amount


### Weekend Blitz (`/salti/weekend-blitz`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0.LeadExec_Export`
- Match: 80%
- Rows: 984,245
- Size: 4.55 GB
- Fresh Data: Yes
- Matched Fields: date, appointments, sales, revenue
- Missing: sales_rep

### YoY Trends (`/salti/yoy-trends`)
**Status:** ✅ FULL_MATCH
**Best Match:** `Test.DSP_AllSales`
- Match: 80%
- Rows: 0
- Size: 0.00 GB
- Fresh Data: No
- Matched Fields: year, month, metric, value
- Missing: yoy_change

### Speed to Install (`/sales/speed-to-install`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0_TMX.ExtRaw_TDW_Time`
- Match: 100%
- Rows: 49,308
- Size: 0.01 GB
- Fresh Data: No
- Matched Fields: sell_date, start_date, install_date, days_to_install, days_to_start


### Today's Sales (`/sales/today`)
**Status:** ✅ FULL_MATCH
**Best Match:** `W3_Contract_Checker.T0_unf_Contract_All`
- Match: 80%
- Rows: 7,886,431
- Size: 6.03 GB
- Fresh Data: No
- Matched Fields: sell_date, contract_value, contract_type, product_group
- Missing: sales_rep

### Sales Backlog (`/sales/backlog`)
**Status:** ✅ FULL_MATCH
**Best Match:** `W3_Contract_Checker.T0_unf_Contract_All`
- Match: 80%
- Rows: 7,886,431
- Size: 6.03 GB
- Fresh Data: No
- Matched Fields: sell_date, status, customer_name, contract_value
- Missing: days_in_backlog

### Canceled Agreements (`/sales/canceled-agreements`)
**Status:** ✅ FULL_MATCH
**Best Match:** `W3_Contract_Checker.T0_unf_Contract_All`
- Match: 80%
- Rows: 7,886,431
- Size: 6.03 GB
- Fresh Data: No
- Matched Fields: sell_date, cancel_date, cancel_reason, contract_value
- Missing: days_to_cancel

### Start Rate (`/sales/start-rate`)
**Status:** ✅ FULL_MATCH
**Best Match:** `W3_Contract_Checker.T0_unf_Contract_All`
- Match: 100%
- Rows: 7,886,431
- Size: 6.03 GB
- Fresh Data: No
- Matched Fields: sell_date, start_date, started_ind, contract_count


### National Sales (`/sales/national`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0_TMX.tmx_survey_Qualtrics_V5`
- Match: 80%
- Rows: 5,651,459
- Size: 6.61 GB
- Fresh Data: Yes
- Matched Fields: market, region, sales, revenue
- Missing: quota

### Termite Renewals (`/termite/renewals`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S1.vw_rna_termite_renewals`
- Match: 100%
- Rows: 0
- Size: 0.00 GB
- Fresh Data: No
- Matched Fields: customer, renewal_month, autopay_flag, service_frequency, branch


### National Ops (`/ops/national`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S1.VwStg_RNA_INPDetails`
- Match: 80%
- Rows: 0
- Size: 0.00 GB
- Fresh Data: No
- Matched Fields: region, market, work_orders, completion
- Missing: technicians

### New Starts (`/ops/new-starts`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S4_CusFP.US_CustomerFootPrint_0001`
- Match: 100%
- Rows: 50,274,622
- Size: 18.41 GB
- Fresh Data: Yes
- Matched Fields: start_date, customer, service_type, branch


### People Overview (`/people`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S3.Employee`
- Match: 80%
- Rows: 27,090
- Size: 0.02 GB
- Fresh Data: No
- Matched Fields: employee, hire_date, branch, role
- Missing: department

### Branch Dashboard (`/branch/[code]`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0.raw_RNA_PNIDetails_Sch_Daily`
- Match: 80%
- Rows: 6,225,287
- Size: 2.65 GB
- Fresh Data: Yes
- Matched Fields: branch_code, branch_name, region, market
- Missing: metrics

### Branch Daily (`/branch/daily`)
**Status:** ✅ FULL_MATCH
**Best Match:** `Playground.InvoiceHistoryChangeTracking`
- Match: 100%
- Rows: 114,096,143
- Size: 131.48 GB
- Fresh Data: Yes
- Matched Fields: branch, date, sales, service, ar


### Region Daily (`/region/daily`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S2.snp_RPP_Portfolio_Monthly`
- Match: 100%
- Rows: 57,822,190
- Size: 17.76 GB
- Fresh Data: No
- Matched Fields: region, date, sales, service, ar


### Market Daily (`/market/daily`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0_TMX.tmx_dor_bkp_20251217`
- Match: 100%
- Rows: 679,072,470
- Size: 60.08 GB
- Fresh Data: No
- Matched Fields: market, date, sales, service, ar


### AE Pipeline (`/ae/pipeline`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0.Raw_RTXSF_Opportunity_Daily`
- Match: 100%
- Rows: 195,932
- Size: 0.26 GB
- Fresh Data: Yes
- Matched Fields: opportunity, stage, amount, close_date, account


### AE Activity Tracker (`/ae/tracker`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S0_TMX.vfct_gl_activity`
- Match: 80%
- Rows: 60,976,663
- Size: 11.96 GB
- Fresh Data: Yes
- Matched Fields: activity, date, type, account
- Missing: outcome

### Tech Tickets (`/tech/tickets`)
**Status:** ✅ FULL_MATCH
**Best Match:** `BCG_RTD_DB.DR_CCM_Test`
- Match: 80%
- Rows: 0
- Size: 0.00 GB
- Fresh Data: No
- Matched Fields: ticket, customer, status, resolution
- Missing: issue

### Lead Service Engine (`/lead-service-engine`)
**Status:** ✅ FULL_MATCH
**Best Match:** `S4.Fact_Leads_Acc_Daily_Dtls_Snp`
- Match: 80%
- Rows: 11,846,813
- Size: 5.87 GB
- Fresh Data: Yes
- Matched Fields: lead, stage, source, status
- Missing: flow


---

## Pages Needing Minor Work (Partial Match)

These pages have 50-79% field match. Some columns may need aliasing or calculations:

### Leads by Type & Pest (`/leads/type-pest`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `Deprecated.Fact_Leads_Acc_Daily_Agg_Snp_Backup_20251001`
- Match: 71%
- Rows: 13,905,336
- Matched Fields: pest_type, primary_pest, lead_type, received_date, sold_date
- **Missing Fields:** lead_count, conversion_rate

**Alternatives:**
- `S4.Fact_Leads_Acc_Daily_Dtls_Snp` (71% match)
- `BCG_RTD_DB.DR_Leads_SM_20251120` (71% match)
- `Deprecated.Fact_Leads_Acc_Daily_Dtls_Snp_Backup_20250925` (71% match)

### Lead Rankings (`/leads/rankings`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S0.raw_TDW_PNIDetails_Daily`
- Match: 57%
- Rows: 6,920,595
- Matched Fields: branch, region, sales_rep, lead_count
- **Missing Fields:** market, conversion_rate, rank

**Alternatives:**
- `Test.raw_TDW_PNIDetails_Daily` (57% match)
- `Test.raw_TDW_PNIDetails_Daily_bkp_20241208` (57% match)
- `S0_TMX.raw_TDW_PNIDetails_Daily_bkp_20241208` (57% match)

### SALTI Dashboard (`/salti`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S0_TMX.tmx_lead`
- Match: 67%
- Rows: 74,445,347
- Matched Fields: scheduled, inspected, proposed, sold
- **Missing Fields:** sales_rep, lead_funnel

**Alternatives:**
- `S0.tmx_lead` (67% match)
- `S0.tmx_lead_bkp_20250120` (67% match)
- `S0_TMX.tmx_lead_bkp_20250120` (67% match)

### SALTI Productivity (`/salti/productivity`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S0_TMX.tmx_ar`
- Match: 60%
- Rows: 238,782,610
- Matched Fields: sales_rep, proposals, sales
- **Missing Fields:** inspections, productivity_score

**Alternatives:**
- `S0_TMX.tmx_ar_bkp_202050422` (60% match)
- `S0.tmx_ar` (60% match)
- `S0.tmx_ar_bkp_20250422` (60% match)

### Funnel Fallout (`/salti/funnel-fallout`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S1.Five9_CallLog_Export_History`
- Match: 75%
- Rows: 59,767,602
- Matched Fields: stage, count, rate
- **Missing Fields:** fallout_reason

**Alternatives:**
- `S0.Five9_CallLog_Export` (75% match)
- `S1.Five9_CallLog_Export` (75% match)
- `S0.five9_call_export_12` (75% match)

### Sales Ladders (`/salti/sales-ladders`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S1.Five9_CallLog_Export_History`
- Match: 50%
- Rows: 59,767,602
- Matched Fields: level, skills
- **Missing Fields:** sales_rep, progression

**Alternatives:**
- `S0.Five9_CallLog_Export` (50% match)
- `S1.Five9_CallLog_Export` (50% match)
- `S0.five9_call_export_12` (50% match)

### Sales Overview (`/sales`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S0.Raw_RTXSF_OpportunityHistory_Daily`
- Match: 67%
- Rows: 456,854
- Matched Fields: opportunity, stage, amount, close_date
- **Missing Fields:** pipeline, rep

**Alternatives:**
- `S1.Raw_RTXSF_OpportunityHistory_Daily` (67% match)
- `S0.Raw_RTXSF_Opportunity_Daily` (67% match)
- `S1.Raw_RTXSF_Opportunity_Daily` (67% match)

### Finance Overview (`/finance`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `Playground.InvoiceHistoryChangeTracking`
- Match: 50%
- Rows: 114,096,143
- Matched Fields: ar_balance, revenue
- **Missing Fields:** ar_aging, collections

**Alternatives:**
- `S0_TMX.InvoiceHistory_bkp20250130_BeforeRebranch` (50% match)
- `S0_TMX.Invoices_bkp20250130_BeforeRebranch` (50% match)
- `S0.pestpac_Invoices` (50% match)

### Accounts Receivable (`/finance/ar`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `Validation.pestpac_wo_migration_branches_2024`
- Match: 67%
- Rows: 123,269
- Matched Fields: customer, invoice_date, amount, days_outstanding
- **Missing Fields:** aging_bucket, past_due_bucket

**Alternatives:**
- `Reference_User_Managed.S4Fact_PortfolioActivity_Txn_Na_Daily_Dtl_Vw_v2LAST2YEARS` (67% match)
- `Reports.VwUnf_dim_ar_detail` (67% match)
- `S4.Fact_PortfolioActivity_Txn_Na_Daily_Dtl_Vw` (67% match)

### P&L Statement (`/finance/pnl`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `Playground.InvoiceHistoryChangeTracking`
- Match: 60%
- Rows: 114,096,143
- Matched Fields: credit, balance, period
- **Missing Fields:** gl_account, debit

**Alternatives:**
- `S0_TMX.InvoiceHistory_bkp20250130_BeforeRebranch` (60% match)
- `S0_TMX.Invoices_bkp20250130_BeforeRebranch` (60% match)
- `S0.pestpac_Invoices` (60% match)

### PNI (Paid Not Installed) (`/termite/pni`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S0_RNA.user_statistics`
- Match: 67%
- Rows: 304,189,822
- Matched Fields: customer, paid_date, install_date, branch
- **Missing Fields:** days_pending, revenue

**Alternatives:**
- `Validation.pestpac_wo_migration_branches_2024` (67% match)
- `S3.in_month_prj_pctc_job` (67% match)
- `S3.in_month_prj_tc_contract_tmx` (67% match)

### Employee Retention (`/hr/retention`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S0_RNA.user_statistics`
- Match: 50%
- Rows: 304,189,822
- Matched Fields: employee, hire_date, term_date
- **Missing Fields:** term_reason, voluntary, tenure

**Alternatives:**
- `S0_TMX.tmx_survey_l360_V2` (50% match)
- `S0_TMX.vw_tmx_survey_l360_V2` (50% match)
- `S4.Unf_RTX_cm_proj` (33% match)

### Admin Dashboard (`/admin`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `S0.Raw_PBIGatewayConnections`
- Match: 75%
- Rows: 0
- Matched Fields: role, user, data_source
- **Missing Fields:** settings

**Alternatives:**
- `W3_Contract_Checker.T0_unf_Contract_All` (50% match)
- `W3_Contract_Checker.T0_FullYear` (50% match)
- `Custom_Data_Tables.testGCSexport` (50% match)

### Field Lineage (`/governance/field-lineage`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `Playground.InvoiceHistoryChangeTracking`
- Match: 75%
- Rows: 114,096,143
- Matched Fields: field, source, target
- **Missing Fields:** transformation

**Alternatives:**
- `S0_TMX.InvoiceHistory_bkp20250130_BeforeRebranch` (75% match)
- `Playground.ServiceOrders_PIT` (75% match)
- `S0_TMX.Invoices_bkp20250130_BeforeRebranch` (75% match)

### Data Quality (`/data-quality`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `ndp_repo.Ndp_Ingest_Config`
- Match: 50%
- Rows: 65
- Matched Fields: table, column
- **Missing Fields:** quality_score, issues

**Alternatives:**
- `S0_TMX.rspr_ingestconfig` (50% match)
- `S0_TMX.rspr_ingestconfig_bkp_20241204` (50% match)
- `dpipeconfig.rtx_dpipe_ingestconfig` (50% match)

### Tech Dispatch (`/tech/dispatch`)
**Status:** ⚠️ PARTIAL_MATCH
**Best Match:** `Playground.ServiceOrders_PIT`
- Match: 75%
- Rows: 6,648,605
- Matched Fields: route, appointments, status
- **Missing Fields:** technician

**Alternatives:**
- `S0.pestpac_ServiceOrders` (75% match)
- `S0_TMX.ServiceOrders_bkp20250130_BeforeRebranch` (75% match)
- `S0.Raw_RTXSF_Opportunity_Daily` (75% match)


---

## Pages Requiring Investigation

These pages have low match (<50%) or no suitable table found:

### Executive Command Center (`/`)
**Status:** 🔶 POOR_MATCH
**Required Fields:** revenue, pipeline, win_rate, ar_aging, callbacks, backlog

**Best Available Match:** `S0.pestpac_Services` (33%)
- Missing: pipeline, win_rate, ar_aging, backlog


### Revenue Projections (`/finance/projections`)
**Status:** ❌ NO_MATCH
**Required Fields:** forecast, projection, actual, variance

**No suitable table found.** May require:
- Custom view/query combining multiple tables
- Data not currently in BigQuery
- External data source integration


### Operations Overview (`/ops`)
**Status:** 🔶 POOR_MATCH
**Required Fields:** technician, dispatch, capacity, work_order, completion_rate

**Best Available Match:** `BCG_RTD_DB.250911_cc_techrouting_helper_tmx` (40%)
- Missing: technician, dispatch, completion_rate


### Tech Productivity (`/workforce/tech-productivity`)
**Status:** 🔶 POOR_MATCH
**Required Fields:** technician, stops_completed, work_orders, revenue, efficiency

**Best Available Match:** `S0_TMX.tmx_wo_item` (40%)
- Missing: technician, stops_completed, efficiency


### KPI Detail (`/kpi/[slug]`)
**Status:** 🔶 POOR_MATCH
**Required Fields:** kpi_name, actual, target, variance, trend

**Best Available Match:** `S0.Raw_RTXSF_Opportunity_Daily` (40%)
- Missing: actual, variance, trend


### Quarterly Business Review (`/qbr`)
**Status:** ❌ NO_MATCH
**Required Fields:** quarter, metrics, goals, achievements

**No suitable table found.** May require:
- Custom view/query combining multiple tables
- Data not currently in BigQuery
- External data source integration


### Weekly Business Review (`/wbr`)
**Status:** ❌ NO_MATCH
**Required Fields:** week, metrics, issues, actions

**No suitable table found.** May require:
- Custom view/query combining multiple tables
- Data not currently in BigQuery
- External data source integration


### Manager Daily Cadence (`/manager/daily-cadence`)
**Status:** 🔶 POOR_MATCH
**Required Fields:** date, team, metrics, actions, issues

**Best Available Match:** `S0_RNA.user_statistics` (40%)
- Missing: team, metrics, issues


### WIG Scorecard (`/manager/wig-scorecard`)
**Status:** ❌ NO_MATCH
**Required Fields:** wig, lead_measure, lag_measure, score

**No suitable table found.** May require:
- Custom view/query combining multiple tables
- Data not currently in BigQuery
- External data source integration



---

## Integration by Category

### SALTI (8/8 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| SALTI Dashboard | ⚠️ | tmx_lead | 67% |
| SALTI Daily Check-In | ✅ | tmx_lead | 86% |
| SALTI Productivity | ⚠️ | tmx_ar | 60% |
| Proposal Pipeline | ✅ | tmx_ar | 100% |
| Funnel Fallout | ⚠️ | Five9_CallLog_Export_History | 75% |
| Sales Ladders | ⚠️ | Five9_CallLog_Export_History | 50% |
| Weekend Blitz | ✅ | LeadExec_Export | 80% |
| YoY Trends | ✅ | DSP_AllSales | 80% |

### Sales (7/7 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Sales Overview | ⚠️ | Raw_RTXSF_OpportunityHistory_Daily | 67% |
| Speed to Install | ✅ | ExtRaw_TDW_Time | 100% |
| Today's Sales | ✅ | T0_unf_Contract_All | 80% |
| Sales Backlog | ✅ | T0_unf_Contract_All | 80% |
| Canceled Agreements | ✅ | T0_unf_Contract_All | 80% |
| Start Rate | ✅ | T0_unf_Contract_All | 100% |
| National Sales | ✅ | tmx_survey_Qualtrics_V5 | 80% |

### Leads (6/6 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Leads by Type & Pest | ⚠️ | Fact_Leads_Acc_Daily_Agg_Snp_Backup_20251001 | 71% |
| Lead Trends | ✅ | Unf_RTX_cm_proj | 100% |
| Lead Rankings | ⚠️ | raw_TDW_PNIDetails_Daily | 57% |
| Lead Cancellations | ✅ | Fact_Leads_Acc_Daily_Dtls_Snp | 80% |
| Geographic Analysis | ✅ | raw_TDW_PNIDetails_Daily | 86% |
| Lead Journey Tracking | ✅ | tmx_lead | 88% |

### Finance (3/4 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Finance Overview | ⚠️ | InvoiceHistoryChangeTracking | 50% |
| Accounts Receivable | ⚠️ | pestpac_wo_migration_branches_2024 | 67% |
| Revenue Projections | ❌ | N/A | N/A |
| P&L Statement | ⚠️ | InvoiceHistoryChangeTracking | 60% |

### Termite (2/2 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| PNI (Paid Not Installed) | ⚠️ | user_statistics | 67% |
| Termite Renewals | ✅ | vw_rna_termite_renewals | 100% |

### Operations (2/3 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Operations Overview | 🔶 | 250911_cc_techrouting_helper_tmx | 40% |
| National Ops | ✅ | VwStg_RNA_INPDetails | 80% |
| New Starts | ✅ | US_CustomerFootPrint_0001 | 100% |

### HR (2/2 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| People Overview | ✅ | Employee | 80% |
| Employee Retention | ⚠️ | user_statistics | 50% |

### Branch (2/2 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Branch Dashboard | ✅ | raw_RNA_PNIDetails_Sch_Daily | 80% |
| Branch Daily | ✅ | InvoiceHistoryChangeTracking | 100% |

### Governance (2/2 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Field Lineage | ⚠️ | InvoiceHistoryChangeTracking | 75% |
| Data Quality | ⚠️ | Ndp_Ingest_Config | 50% |

### AE (2/2 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| AE Pipeline | ✅ | Raw_RTXSF_Opportunity_Daily | 100% |
| AE Activity Tracker | ✅ | vfct_gl_activity | 80% |

### Tech (2/2 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Tech Dispatch | ⚠️ | ServiceOrders_PIT | 75% |
| Tech Tickets | ✅ | DR_CCM_Test | 80% |

### Admin (1/1 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Admin Dashboard | ⚠️ | Raw_PBIGatewayConnections | 75% |

### Region (1/1 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Region Daily | ✅ | snp_RPP_Portfolio_Monthly | 100% |

### Market (1/1 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Market Daily | ✅ | tmx_dor_bkp_20251217 | 100% |

### LSE (1/1 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Lead Service Engine | ✅ | Fact_Leads_Acc_Daily_Dtls_Snp | 80% |

### Executive (0/1 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Executive Command Center | 🔶 | pestpac_Services | 33% |

### Workforce (0/1 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Tech Productivity | 🔶 | tmx_wo_item | 40% |

### KPI (0/1 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| KPI Detail | 🔶 | Raw_RTXSF_Opportunity_Daily | 40% |

### Reviews (0/2 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Quarterly Business Review | ❌ | N/A | N/A |
| Weekly Business Review | ❌ | N/A | N/A |

### Manager (0/2 ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
| Manager Daily Cadence | 🔶 | user_statistics | 40% |
| WIG Scorecard | ❌ | N/A | N/A |


---

## Recommended Tables for Each Domain

Based on analysis, these are the primary BigQuery tables for each business domain:

### Leads
- `S4.Fact_Leads_Acc_Daily_Dtls_Vw` - Primary leads fact table (70+ columns)
- `Leads_S3.rtx_lead` - Lead details from RTX

### Sales
- `S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw` - Contract sales transactions
- `S4.Fact_ContractBacklog_Txn_Na_Daily_Dtl_Vw` - Sales backlog
- `S4.Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw` - Canceled agreements
- `S4.Fact_ContractStartRateByDuration_Txn_Na_Daily_Agg_Vw` - Start rate metrics

### Finance
- `S4.VwUnf_daily_ar` - AR aging
- `S0_TMX.tmx_ar_detail` - AR detail (220GB, 434M rows)

### Termite
- `S4.Fact_PNI_Details_Txn_Na_Daily_Dtl_vw` - PNI inspections
- `S4.Fact_TermiteRenewals_Snp_Na_Daily_Agg_Vw` - Renewals

### Operations
- `S4.Fact_WorkOrderCompleted_Txn_Na_Daily_Dtl_Vw` - Work orders
- `S0.tmx_wo_item` - Work order items (779M rows)

### HR
- `S4.Fact_RTX_Employees_Latest` - Employee master
- `WorkDayTerm.WorkDayTermDtls` - Employee terminations

### Geography
- `S4.dim_branch` - Branch hierarchy
- `Reference.Ref_Map_BranchHeirarchy_GCS` - Branch mapping

---

## Next Steps

### Immediately Actionable (This Week)
1. [ ] Connect `/leads/trends` to `S4.Unf_RTX_cm_proj`
2. [ ] Connect `/leads/cancels` to `S4.Fact_Leads_Acc_Daily_Dtls_Snp`
3. [ ] Connect `/leads/geographic` to `S0.raw_TDW_PNIDetails_Daily`
4. [ ] Connect `/leads/journey` to `S0_TMX.tmx_lead`
5. [ ] Connect `/salti/daily-check-in` to `S0_TMX.tmx_lead`
6. [ ] Connect `/salti/proposal-pipeline` to `S0_TMX.tmx_ar`
7. [ ] Connect `/salti/weekend-blitz` to `S0.LeadExec_Export`
8. [ ] Connect `/salti/yoy-trends` to `Test.DSP_AllSales`
9. [ ] Connect `/sales/speed-to-install` to `S0_TMX.ExtRaw_TDW_Time`
10. [ ] Connect `/sales/today` to `W3_Contract_Checker.T0_unf_Contract_All`

### Needs Query Development (Next Sprint)
1. [ ] Add missing fields for `/leads/type-pest`: lead_count, conversion_rate
2. [ ] Add missing fields for `/leads/rankings`: market, conversion_rate, rank
3. [ ] Add missing fields for `/salti`: sales_rep, lead_funnel
4. [ ] Add missing fields for `/salti/productivity`: inspections, productivity_score
5. [ ] Add missing fields for `/salti/funnel-fallout`: fallout_reason
6. [ ] Add missing fields for `/salti/sales-ladders`: sales_rep, progression
7. [ ] Add missing fields for `/sales`: pipeline, rep
8. [ ] Add missing fields for `/finance`: ar_aging, collections
9. [ ] Add missing fields for `/finance/ar`: aging_bucket, past_due_bucket
10. [ ] Add missing fields for `/finance/pnl`: gl_account, debit

### Requires Investigation
1. [ ] Find data source for `/`
2. [ ] Find data source for `/finance/projections`
3. [ ] Find data source for `/ops`
4. [ ] Find data source for `/workforce/tech-productivity`
5. [ ] Find data source for `/kpi/[slug]`
6. [ ] Find data source for `/qbr`
7. [ ] Find data source for `/wbr`
8. [ ] Find data source for `/manager/daily-cadence`
9. [ ] Find data source for `/manager/wig-scorecard`

---

*See `dashboard-integration-mapping.json` for complete machine-readable mapping.*
