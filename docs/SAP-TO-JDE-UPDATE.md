# SAP to JD Edwards (JDE) Data Source Update

## Summary

Corrected data source references from "SAP" to "JD Edwards (JDE)", the actual ERP system used by Rentokil.

## Investigation Findings

### Evidence of JD Edwards
1. **Employee Field**: `employee_jde_number` in TMX employee mapping
2. **Revenue Table**: `S1.vw_iris_jde_daily_revenue_detail` for daily revenue details
3. **Finance Tables**: All AR/finance data sourced from JDE via Reports dataset

### Actual Data Flow
```
JD Edwards (JDE) ERP
       ↓
Reports.VwUnf_dim_ar_detail (AR detail)
Reports.VwUnf_ar_amount (AR balances)
S4.VwUnf_daily_ar (daily AR summary)
S1.vw_iris_jde_daily_revenue_detail (revenue detail)
       ↓
Finance Dashboard Pages
```

## Changes Made

### 1. Data Dictionary Type ([src/lib/data-dictionary.ts](src/lib/data-dictionary.ts))
```typescript
// BEFORE
export type DataSource = ... | 'sap' | ...

// AFTER
export type DataSource = ... | 'jde' | ...
```

### 2. Data Source Metadata ([src/lib/data-dictionary.ts](src/lib/data-dictionary.ts))
```typescript
// BEFORE
sap: {
  name: 'SAP Financials',
  description: 'Enterprise financials - invoices, payments, AR/AP',
  ...
}

// AFTER
jde: {
  name: 'JD Edwards (JDE)',
  description: 'Oracle JD Edwards ERP - financials, AR/AP, billing, P&L',
  type: 'primary',
  refreshFrequency: 'Hourly',
  owner: 'Finance'
}
```

### 3. BigQuery Dataset Metadata ([src/lib/data-dictionary-bigquery.ts](src/lib/data-dictionary-bigquery.ts))
Updated all finance dataset source systems from `['sap']` to `['jde']`:
- Reports dataset
- S4_Reports dataset
- AR dataset

### 4. Source Systems ([src/lib/bigquery/source-systems.ts](src/lib/bigquery/source-systems.ts))
```typescript
// BEFORE
ERP: {
  id: 'ERP',
  name: 'ERP/Finance',
  description: 'Enterprise financial systems - AR, billing, P&L data',
  knownTables: ['Reports.VwUnf_dim_ar_detail', 'Reports.VwUnf_ar_amount', 'S4.VwUnf_daily_ar'],
  ...
}

// AFTER
ERP: {
  id: 'ERP',
  name: 'JD Edwards (JDE)',
  description: 'Oracle JD Edwards ERP - AR, billing, P&L, revenue detail',
  knownTables: [
    'Reports.VwUnf_dim_ar_detail',
    'Reports.VwUnf_ar_amount',
    'S4.VwUnf_daily_ar',
    'S1.vw_iris_jde_daily_revenue_detail'  // Added
  ],
  ...
}
```

### 5. Mock Data ([src/lib/data-quality-engine.ts](src/lib/data-quality-engine.ts))
Updated all mock data references:
- `source: 'sap'` → `source: 'jde'`
- `sourceA: 'sap'` → `sourceA: 'jde'`

## Impact

### Affected Areas
✅ Data Dictionary definitions
✅ BigQuery dataset metadata
✅ Source system configurations
✅ Mock data quality engine
✅ Governance documentation

### No Breaking Changes
- BigQuery queries continue to use `Reports.*` tables (unchanged)
- Table mappings use `sourceSystem: 'ERP'` ID (unchanged)
- Only display names and documentation updated

## JD Edwards Overview

**JD Edwards EnterpriseOne** is Oracle's ERP system used for:
- Financial Management (GL, AR, AP)
- Billing and Revenue Recognition
- P&L Reporting
- Accounts Receivable Aging
- Revenue Detail Tracking

**BigQuery Integration**:
- Primary Dataset: `Reports`
- Secondary Datasets: `S4_Reports`, `S1`, `AR`
- Refresh Frequency: Hourly
- Row Count: Millions (AR detail)

## Verification

Run these checks to verify the update:
```bash
# No SAP references should remain in source code
grep -r "'sap'" src/lib/*.ts | wc -l  # Should be 0

# JDE references should exist
grep -r "'jde'" src/lib/*.ts | wc -l  # Should be > 0

# Source system should be labeled correctly
grep "name: 'JD Edwards" src/lib/bigquery/source-systems.ts
```

## Date
2026-01-26
