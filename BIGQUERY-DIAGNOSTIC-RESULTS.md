# BigQuery Diagnostic Results
## Table Availability Across Environments

**Date:** 2026-01-27
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## Executive Summary

✅ **GOOD NEWS:** All business data exists in **production**!
❌ **ISSUE:** One view is missing: `S4.Dim_Branch_BranchID_NA_T1_Vw`
✅ **SOLUTION FOUND:** Organization data exists in `Reference.GS_Ref_BranchHierarchy`

### Quick Fix Required
Create the missing view in production OR update code to use the existing table.

---

## Detailed Findings

### Environment Comparison

| Table | Production | Dev | Staging | Priority |
|-------|-----------|-----|---------|----------|
| **S4.Dim_Branch_BranchID_NA_T1_Vw** | ❌ | ✅ | ❌ | 🔴 CRITICAL |
| S4.Fact_Leads_Acc_Daily_Dtls_Snp | ✅ | ✅ | ❌ | 🟠 HIGH |
| S0_TMX.tmx_lead | ✅ | ✅ | ❌ | 🟠 HIGH |
| S0_TMX.tmx_employee | ✅ | ✅ | ❌ | 🟠 HIGH |
| W3_Contract_Checker.T0_unf_Contract_All | ✅ | ❌ | ❌ | 🟠 HIGH |
| BCG_RTD_DB.DR_ContractSales | ✅ | ❌ | ❌ | 🟠 HIGH |
| Reports.VwUnf_dim_ar_detail | ✅ | ❌ | ❌ | 🟠 HIGH |
| S0_TMX.vfct_gl_activity | ✅ | ❌ | ❌ | 🟡 MEDIUM |
| S0.raw_RNA_PNIDetails_Daily | ✅ | ✅ | ❌ | 🟡 MEDIUM |

### Summary Scores

- **Production:** 8/9 tables (89%) - **BEST CHOICE** ✅
- **Dev:** 5/9 tables (56%) - Missing business data
- **Staging:** 0/9 tables (0%) - Empty environment

---

## Root Cause Analysis

### The Missing View

**Code expects:** `S4.Dim_Branch_BranchID_NA_T1_Vw`
**Status in production:** ❌ Does not exist
**Why it's missing:** View was not created/migrated to production

### The Alternative Source (FOUND!)

**Production HAS organization data in:**
✅ `Reference.GS_Ref_BranchHierarchy` (External table - Google Sheets)

**Schema includes:**
- `BranchNumber` - Branch code
- `BranchName` - Branch name
- `BranchRegion` - Region name
- `BranchRegionCode` - Region code (likely)
- `BranchMarket` - Market name
- `BranchMarketCode` - Market code
- `BranchCity`, `BranchJurisdiction` - Location data

**Table type:** EXTERNAL (backed by Google Sheets)
**Rows:** ~1,092 branches
**Access:** Requires Drive permissions (currently failing)

---

## Recommended Solutions

### Option 1: Create Missing View in Production (RECOMMENDED) ⭐

**Complexity:** Medium
**Time:** 30-60 minutes
**Risk:** Low
**Impact:** Permanent fix

#### Steps:

1. **Get view definition from dev:**
```bash
bq show --format=prettyjson --view \
  bidata-sharedus-dev:S4.Dim_Branch_BranchID_NA_T1_Vw \
  > view-definition.json
```

2. **Adapt the view for production sources:**

The dev view likely queries from tables that don't exist in production. You'll need to:
- Replace source tables with production equivalents
- Primary source should be `Reference.GS_Ref_BranchHierarchy`
- Map fields appropriately:

```sql
CREATE OR REPLACE VIEW `bidata-sharedus-production.S4.Dim_Branch_BranchID_NA_T1_Vw` AS
SELECT
  BranchNumber as Current_State_Branch_Code,
  BranchName as RTX_Branch_Name,
  BranchRegion as RTX_Region_Name,
  -- Add Region Code (may need lookup or derive from BranchRegion)
  UPPER(LEFT(BranchRegion, 3)) as RTX_Region_Code,
  BranchMarket as RTX_Market_Name,
  BranchMarketCode as RTX_Market_Code,
  COALESCE(Brand, 'Rentokil') as Brand,
  BranchCity as City,
  BranchJurisdiction as State
FROM `bidata-sharedus-production.Reference.GS_Ref_BranchHierarchy`
WHERE BranchNumber IS NOT NULL
  AND BranchName IS NOT NULL
```

3. **Create the view:**
```bash
bq query --project_id=bidata-sharedus-production \
  --use_legacy_sql=false \
  < create-view.sql
```

4. **Grant permissions if needed:**
```bash
# Ensure service account has access to Google Sheets source
# Contact GCP admin if permission errors occur
```

5. **Test the view:**
```bash
bq query --project_id=bidata-sharedus-production \
  "SELECT COUNT(*) as branches FROM \`S4.Dim_Branch_BranchID_NA_T1_Vw\`"
```

---

### Option 2: Update Code to Use Reference Table Directly

**Complexity:** Low
**Time:** 15-30 minutes
**Risk:** Medium (changes affect 70+ pages)
**Impact:** Workaround, not ideal

#### Steps:

1. **Edit `/src/lib/bigquery/queries/organization.ts`**

Change all queries from:
```typescript
FROM `${PROJECT}.S4.Dim_Branch_BranchID_NA_T1_Vw`
```

To:
```typescript
FROM `${PROJECT}.Reference.GS_Ref_BranchHierarchy`
```

2. **Update field mappings:**

```typescript
// Before (S4 view fields)
RTX_Market_Code as market_code,
RTX_Market_Name as market_name,
RTX_Region_Code as region_code,
RTX_Region_Name as region_name,
Current_State_Branch_Code as branch_code,
RTX_Branch_Name as branch_name

// After (Reference table fields)
BranchMarketCode as market_code,
BranchMarket as market_name,
-- Need to derive region code from region name or add to source
UPPER(LEFT(BranchRegion, 3)) as region_code,
BranchRegion as region_name,
BranchNumber as branch_code,
BranchName as branch_name
```

3. **Test queries:**
```bash
npm run dev
# Visit http://localhost:3000/branch
# Check organization dropdowns populate
```

#### Pros:
- Quick fix
- No BigQuery changes needed

#### Cons:
- Couples code to specific table (less flexible)
- May have field mapping issues
- Code diverges from dev environment

---

### Option 3: Fix Google Sheets Permissions

**Complexity:** Low
**Time:** 5-15 minutes (if you have access)
**Risk:** Low
**Impact:** Enables access to existing data

The error "Permission denied while getting Drive credentials" suggests:
1. Service account needs Google Drive API access
2. Google Sheet needs to be shared with service account email
3. External table connection may need reconfiguration

**Steps:**
1. Identify service account email (check `GOOGLE_APPLICATION_CREDENTIALS`)
2. Share Google Sheets with service account email (Editor or Viewer role)
3. Ensure BigQuery connection to external data source is configured
4. Test access with simple query

---

## Immediate Action Plan

### Step 1: Verify Access to Reference Table (5 min)

```bash
# Try to query the reference table
bq query --project_id=bidata-sharedus-production \
  "SELECT COUNT(*) FROM \`Reference.GS_Ref_BranchHierarchy\` LIMIT 1"
```

**If succeeds:** Organization data is accessible, proceed to Option 2
**If fails:** Fix permissions first (Option 3), then create view (Option 1)

### Step 2: Choose Solution Path

**Best for production:** Option 1 (create view)
**Quickest workaround:** Option 2 (update code)
**If permissions issue:** Option 3 first, then Option 1

### Step 3: Test Fix

```bash
# After applying fix:
npm run dev

# Test these pages:
curl http://localhost:3000/api/organization/hierarchy | jq
# Should return markets, regions, branches

# Visit in browser:
# http://localhost:3000/branch
# http://localhost:3000/sales
# Organization filters should populate
```

---

## Additional Findings

### Production Environment is BEST Choice

Despite the missing view, production has:
- ✅ All business data tables (sales, analytics, finance)
- ✅ Organization data (in Reference.GS_Ref_BranchHierarchy)
- ✅ 89% table coverage (8/9 tables)
- ✅ Production-quality data

**Recommendation:** Stay on production, fix the missing view.

### Dev Environment is Incomplete

Dev has the organization view but is missing:
- ❌ W3_Contract_Checker (sales contracts)
- ❌ BCG_RTD_DB (analytics - 596M rows)
- ❌ Reports (finance/AR data)
- ❌ Critical business data

**Verdict:** Dev is good for testing but lacks real data.

### Staging Environment is Empty

Staging has 0/9 critical tables. Not usable for development.

---

## Long-Term Recommendations

### 1. Create All Missing Views in Production

Create production versions of all dev-specific views:
- `S4.Dim_Branch_BranchID_NA_T1_Vw` ← Priority 1
- Any other views that exist in dev but not production

### 2. Document Table Equivalents

Create mapping document:
```
Dev Table → Production Table
S4.Dim_Branch_* → Reference.GS_Ref_BranchHierarchy
...
```

### 3. Sync Environment Structures

Ensure all 3 environments (dev/staging/production) have:
- Same view definitions
- Same table structures
- Same field names
- Consistent data access patterns

### 4. Add Health Checks

Implement automated checks:
```bash
# Run daily
npm run verify-tables

# Alert if critical tables missing
# Monitor view availability
# Track schema changes
```

### 5. Fix External Table Permissions

Ensure service account has proper access to Google Sheets:
- Share sheets with service account email
- Grant BigQuery Data Viewer role
- Enable Drive API for service account

---

## Next Steps

### Immediate (Today)
1. [ ] Test access to `Reference.GS_Ref_BranchHierarchy`
2. [ ] Choose solution path (Option 1, 2, or 3)
3. [ ] Implement chosen solution
4. [ ] Test organization data loads
5. [ ] Verify 5-10 dashboard pages work

### Short-Term (This Week)
1. [ ] Create view `S4.Dim_Branch_BranchID_NA_T1_Vw` in production
2. [ ] Document field mappings
3. [ ] Update CLAUDE.md with correct table names
4. [ ] Add health check to CI/CD

### Medium-Term (Next Sprint)
1. [ ] Sync all views across environments
2. [ ] Fix Google Sheets permissions
3. [ ] Create environment parity checklist
4. [ ] Add automated monitoring

---

## Commands Reference

```bash
# Verify table availability
npm run verify-tables

# Check specific environment
npm run verify-tables -- --environment production
npm run verify-tables -- --environment dev

# List datasets
bq ls --project_id=bidata-sharedus-production

# List tables in dataset
bq ls --project_id=bidata-sharedus-production S4
bq ls --project_id=bidata-sharedus-production Reference

# Show table schema
bq show --format=prettyjson --schema \
  bidata-sharedus-production:Reference.GS_Ref_BranchHierarchy

# Test query
bq query --project_id=bidata-sharedus-production \
  "SELECT COUNT(*) FROM \`Reference.GS_Ref_BranchHierarchy\`"

# Get view definition
bq show --format=prettyjson --view \
  bidata-sharedus-dev:S4.Dim_Branch_BranchID_NA_T1_Vw
```

---

## Contact Information

**For BigQuery Issues:**
- GCP Project: bidata-sharedus-production
- BigQuery Admin: [Contact your GCP admin]
- Service Account: Check `GOOGLE_APPLICATION_CREDENTIALS`

**For Code Issues:**
- See: [LIVE-DATA-AUDIT-REPORT.md](./docs/LIVE-DATA-AUDIT-REPORT.md)
- See: [DATA-AUDIT-REMEDIATION-PLAN.md](./docs/DATA-AUDIT-REMEDIATION-PLAN.md)

---

**Report Generated:** 2026-01-27
**Diagnostic Tool:** `scripts/verify-bigquery-tables-simple.ts`
**Status:** Root cause identified, solutions provided

---

**End of Diagnostic Report**
