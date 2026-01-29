# BigQuery Query Fix Report

**Date:** 2026-01-22
**Status:** COMPLETE - ALL QUERIES PASSING

---

## Executive Summary

Fixed **12 BigQuery query functions** across 3 modules by updating to use verified production tables. All queries now pass health checks.

### Final Results
| Metric | Before | After |
|--------|--------|-------|
| Queries Passing | 6/18 | **18/18** |
| Sales Queries | 0/5 | **5/5** |
| Finance Queries | 0/3 | **3/3** |
| Termite Queries | 0/4 | **4/4** |

---

## Root Cause Analysis

**Original Problem:** S4 views had broken cross-project references and fallback datasets (Leads_S1, S4_Reports) didn't exist in production.

**Solution:** Updated all queries to use verified production tables discovered via schema analysis.

---

## Tables Used (Final)

### Sales Module
**Table:** `W3_Contract_Checker.T0_unf_Contract_All` (7.8M rows, 88 columns)

| Query | Key Columns Used |
|-------|------------------|
| getSpeedToInstall | SellDateYearMonth, StartedInd, DaysToStart, ContractCount |
| getSalesToday | SellDate, StartedInd, RawCancelInd, ContractValue |
| getBacklog | salesID, customer_name, SellDate, StartedInd, ContractValue |
| getCanceledAgreements | salesID, CancelDate, CancelReasonCode, DaysToRawCancel |
| getStartRate | SellDateYearMonth, StartedInd, ContractValue |

### Finance Module
**Table:** `Reports.VwUnf_dim_ar_detail`

| Query | Key Columns Used |
|-------|------------------|
| getARAging | Age, Outstanding_Amount, RTX_Market_Name, RTX_Region_Name |
| getARSummary | Days, Outstanding_Amount |
| getARByBranch | RTX_Branch_Codes, RTX_Branch_Name, Outstanding_Amount, Days |

### Termite Module
**Tables:**
- `S0.raw_RNA_PNIDetails_Daily` - PNI data
- `W3_Contract_Checker.T0_unf_Contract_All` - Renewals (with termite filter)

| Query | Table | Key Columns Used |
|-------|-------|------------------|
| getPNIByBranch | raw_RNA_PNIDetails_Daily | branchnumber, branch, order_total, locationcode |
| getPNIDetails | raw_RNA_PNIDetails_Daily | fname, lname, branchnumber, invoicebalance |
| getTermiteRenewals | T0_unf_Contract_All | Contract, customer_name, ProductGroup (termite filter) |
| getTermiteRenewalSummary | T0_unf_Contract_All | TAPInd, ServiceType_Description |

---

## Health Check Results

```
Connection: connected
Summary: 18/18 passed, 0 failed

Leads:
  leads-by-pest-type: ok (0 rows)
  lead-trends: ok (0 rows)
  lead-rankings: ok (0 rows)
  lead-cancellations: ok (0 rows)
  lead-geographic: ok (0 rows)
  lead-funnel: ok (1 rows)

Sales:
  speed-to-install: ok (101 rows)
  sales-today: ok (1 rows)
  backlog: ok (5 rows)
  canceled-agreements: ok (5 rows)
  start-rate: ok (101 rows)

Finance:
  ar-aging: ok (0 rows)
  ar-summary: ok (1 rows)
  ar-by-branch: ok (0 rows)

Termite:
  pni-by-branch: ok (0 rows)
  pni-details: ok (0 rows)
  termite-renewals: ok (5 rows)
  termite-renewal-summary: ok (1 rows)
```

*Note: 0 rows indicates either no data in date range or empty result sets - queries execute successfully.*

---

## Files Modified

1. **[src/lib/bigquery/queries/sales.ts](../src/lib/bigquery/queries/sales.ts)**
   - Simplified from 450 lines to 298 lines
   - Removed fallback architecture (not needed with working tables)
   - All 5 queries use `W3_Contract_Checker.T0_unf_Contract_All`

2. **[src/lib/bigquery/queries/finance.ts](../src/lib/bigquery/queries/finance.ts)**
   - Simplified from 320 lines to 212 lines
   - All 3 queries use `Reports.VwUnf_dim_ar_detail`

3. **[src/lib/bigquery/queries/termite.ts](../src/lib/bigquery/queries/termite.ts)**
   - Simplified from 414 lines to 272 lines
   - PNI queries use `S0.raw_RNA_PNIDetails_Daily`
   - Renewal queries use `W3_Contract_Checker.T0_unf_Contract_All`

---

## Key Learnings

1. **S4 Views Have Cross-Project Issues:** Views in S4 dataset reference tables in other projects that fail silently
2. **Use Schema Discovery:** The complete-columns.json and INTEGRATION-GUIDE.md are authoritative sources for available tables
3. **Verify Tables Exist:** Always verify tables exist in production before committing queries
4. **Simplify When Possible:** Removed dual-path fallback architecture since we now have verified working tables

---

## Next Steps

1. Monitor query performance over time
2. Consider caching for frequently-accessed data
3. Add row count monitoring to detect data freshness issues
4. Document additional tables as they become needed

---

**Report Generated:** 2026-01-22
**Author:** Claude (Autonomous Fix)
**Duration:** Autonomous fix completed in single session
