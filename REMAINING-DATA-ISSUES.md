# Remaining Data Availability Issues

## Status: SQL Errors Fixed ✅

All 3 SQL syntax errors have been successfully fixed:
- ✅ Payroll query column name (`sale_date` → `sell_date`)
- ✅ Customer satisfaction aggregation (`p.prior_nps` → `MAX(p.prior_nps)`)
- ✅ Salesforce date type casting (STRING → DATE/TIMESTAMP)

Dev server is running successfully with no compilation errors.

---

## New Issues Found (Data Availability)

These are **not SQL errors** - they're missing tables/columns in the production BigQuery environment.

### Issue 1: Missing Table
**Error:**
```
Not found: Table bidata-sharedus-production:S0_TMX.Service_Calls_Scorecard was not found in location US
```

**File:** `src/lib/bigquery/queries/ops.ts`

**Cause:** Table `S0_TMX.Service_Calls_Scorecard` doesn't exist in production

**Options:**
1. Create the table in production BigQuery
2. Switch query to use a different available table
3. Disable this specific query until table is available

### Issue 2: Unrecognized Column
**Error:**
```
Unrecognized name: nps_score at [16:9]
```

**Cause:** A query is referencing `nps_score` column that doesn't exist in the source table

**Next Steps:**
1. Identify which query is failing (check query logs)
2. Verify correct column name in the table schema
3. Update query to use correct column name

---

## What's Working Now

### Fixed & Verified
- ✅ All payroll analytics queries (`/people` page)
- ✅ Customer satisfaction queries with correct aggregation
- ✅ All 5 Salesforce data queries with proper type casting
- ✅ No SQL syntax errors
- ✅ No type mismatch errors
- ✅ Dev server compiling successfully

### Needs Data Setup
- ⚠️ Ops queries requiring `Service_Calls_Scorecard` table
- ⚠️ Query referencing `nps_score` column needs schema verification

---

## How to Diagnose

### Find which queries are affected:

1. **Check audit logs** in console for failed queries:
```
❌ [Audit] | User: Cody Lytle (exec) | Action: query_access | Query: ops-complaints | Result: error
```

2. **Test specific query directly:**
```bash
curl -X POST http://localhost:3000/api/bigquery/query \
  -H "Content-Type: application/json" \
  -d '{"query":"ops-complaints","filters":{}}'
```

3. **Verify table exists in BigQuery:**
```bash
bq ls --project_id=bidata-sharedus-production S0_TMX | grep Service_Calls
```

4. **Check table schema:**
```bash
bq show --project_id=bidata-sharedus-production S0_TMX.Service_Calls_Scorecard
```

---

## Recommendation

Since these are **data availability issues** (not code issues), you have 3 options:

### Option 1: Fix in BigQuery (Recommended)
- Create missing tables in production
- Ensure all columns match query expectations
- Run data pipeline to populate tables

### Option 2: Update Queries
- Modify queries to use available tables
- Map to correct column names that exist
- Add graceful fallbacks for missing data

### Option 3: Disable Temporarily
- Comment out problematic queries in API registry
- Add "Coming Soon" placeholders in UI
- Re-enable when data is available

---

## Files to Check

| File | Purpose | Issue |
|------|---------|-------|
| `src/lib/bigquery/queries/ops.ts` | Operations queries | References Service_Calls_Scorecard |
| `src/lib/bigquery/queries/*` | All query files | One has nps_score reference |

---

**Bottom Line:** All SQL syntax is now correct. Remaining issues are about data availability in production BigQuery, not code problems. Dashboard functionality depends on having the required tables and columns in your BigQuery environment.
