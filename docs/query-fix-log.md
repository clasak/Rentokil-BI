# Query Fix Log

**Date:** 2026-01-22
**Task:** Fix all broken BigQuery queries for dashboard pages
**Status:** COMPLETE - 18/18 queries passing

---

## Summary

Updated 12 query functions across 3 modules to use verified production tables:

| Module | Queries | Primary Table |
|--------|---------|---------------|
| Sales | 5 | `W3_Contract_Checker.T0_unf_Contract_All` |
| Finance | 3 | `Reports.VwUnf_dim_ar_detail` |
| Termite | 4 | `S0.raw_RNA_PNIDetails_Daily` + `T0_unf_Contract_All` |

---

## Sales Queries (5)

### getSpeedToInstall
- **Table:** `W3_Contract_Checker.T0_unf_Contract_All`
- **Columns:** SellDateYearMonth, StartedInd, DaysToStart
- **Result:** 101 rows returned

### getSalesToday
- **Table:** `W3_Contract_Checker.T0_unf_Contract_All`
- **Columns:** SellDate, StartedInd, RawCancelInd, ContractValue
- **Result:** 1 row (aggregated)

### getBacklog
- **Table:** `W3_Contract_Checker.T0_unf_Contract_All`
- **Columns:** salesID, customer_name, SellDate, StartedInd, ContractValue, SalesPerson
- **Filter:** StartedInd = 'N' AND RawCancelInd != 'Y'
- **Result:** 5 rows returned

### getCanceledAgreements
- **Table:** `W3_Contract_Checker.T0_unf_Contract_All`
- **Columns:** salesID, CancelDate, CancelReasonCode, DaysToRawCancel, ContractValue
- **Filter:** CancelDate IS NOT NULL
- **Result:** 5 rows returned

### getStartRate
- **Table:** `W3_Contract_Checker.T0_unf_Contract_All`
- **Columns:** SellDateYearMonth, StartedInd, ContractValue
- **Result:** 101 rows returned

---

## Finance Queries (3)

### getARAging
- **Table:** `Reports.VwUnf_dim_ar_detail`
- **Columns:** Age, Outstanding_Amount, RTX_Market_Name, RTX_Region_Name
- **Group By:** Age bucket
- **Result:** 0 rows (no data in current filter)

### getARSummary
- **Table:** `Reports.VwUnf_dim_ar_detail`
- **Columns:** Days, Outstanding_Amount
- **Aggregation:** SUM by aging bucket
- **Result:** 1 row (aggregated summary)

### getARByBranch
- **Table:** `Reports.VwUnf_dim_ar_detail`
- **Columns:** RTX_Branch_Codes, RTX_Branch_Name, Outstanding_Amount, Days
- **Group By:** Branch
- **Result:** 0 rows (no data in current filter)

---

## Termite Queries (4)

### getPNIByBranch
- **Table:** `S0.raw_RNA_PNIDetails_Daily`
- **Columns:** branchnumber, branch, order_total, locationcode
- **Group By:** Branch
- **Result:** 0 rows (no data in date range)

### getPNIDetails
- **Table:** `S0.raw_RNA_PNIDetails_Daily`
- **Columns:** locationcode, fname, lname, branchnumber, invoicebalance, setupstartdate
- **Result:** 0 rows (no data in date range)

### getTermiteRenewals
- **Table:** `W3_Contract_Checker.T0_unf_Contract_All`
- **Columns:** Contract, salesID, customer_name, AssignedBranchCode, TAPInd
- **Filter:** ProductGroup/ServiceType/LOB LIKE '%Termite%'
- **Result:** 5 rows returned

### getTermiteRenewalSummary
- **Table:** `W3_Contract_Checker.T0_unf_Contract_All`
- **Columns:** TAPInd, ServiceType_Description
- **Filter:** Termite products only
- **Result:** 1 row (aggregated)

---

## Architecture Changes

### Before (Broken)
```
Primary: S4 views (cross-project reference errors)
  ↓ FAIL
Fallback: Leads_S1 tables (dataset doesn't exist)
  ↓ FAIL
Result: 12 queries failing
```

### After (Working)
```
Direct: Verified production tables
  W3_Contract_Checker.T0_unf_Contract_All (7.8M rows)
  Reports.VwUnf_dim_ar_detail
  S0.raw_RNA_PNIDetails_Daily
  ↓ SUCCESS
Result: All 18 queries passing
```

---

## Verification

```bash
# Health check command
curl -X POST http://localhost:3000/api/bigquery/health-check

# Results
Connection: connected
Summary: 18/18 passed, 0 failed
```

---

## Files Modified

1. `src/lib/bigquery/queries/sales.ts` - 298 lines (simplified from 450)
2. `src/lib/bigquery/queries/finance.ts` - 212 lines (simplified from 320)
3. `src/lib/bigquery/queries/termite.ts` - 272 lines (simplified from 414)

Total: ~780 lines (down from ~1,180 lines)

---

**Completed:** 2026-01-22
