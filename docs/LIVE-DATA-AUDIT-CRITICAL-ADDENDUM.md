# CRITICAL ADDENDUM: Missing BigQuery Tables
## Live Data Audit Report - Critical Finding

**Date:** 2026-01-27
**Status:** 🔴 CRITICAL - Immediate Action Required
**Related:** [LIVE-DATA-AUDIT-REPORT.md](./LIVE-DATA-AUDIT-REPORT.md)

---

## Executive Summary

**CRITICAL ISSUE DISCOVERED AFTER AUDIT COMPLETION:**

The table `S4.Dim_Branch_BranchID_NA_T1_Vw` referenced throughout the codebase **does not exist** in the BigQuery production project `bidata-sharedus-production`.

This contradicts the initial audit findings which assumed all referenced BigQuery tables exist. The error manifests at runtime when users access any page requiring organization hierarchy data (markets, regions, branches).

### Impact Assessment

**Severity:** 🔴 CRITICAL
**Affected Pages:** 70+ pages (all pages using organization filters)
**User Impact:** HIGH - Organization filters fail silently, many dashboards inaccessible

---

## Error Details

### Runtime Error
```
Not found: Table bidata-sharedus-production:S4.Dim_Branch_BranchID_NA_T1_Vw
was not found in location US
```

**Source:** `useOrganizationData.ts:147`

**Trigger:** Any page calling `useOrganizationData()` hook or `/api/organization/hierarchy`

### Current Configuration
- **Environment:** `production` (from `.env.local`)
- **Project ID:** `bidata-sharedus-production` (auto-detected)
- **Expected Table:** `S4.Dim_Branch_BranchID_NA_T1_Vw`
- **Table Status:** ❌ NOT FOUND

---

## Root Cause Analysis

### Potential Causes

1. **Table Name Mismatch**
   - Code expects: `S4.Dim_Branch_BranchID_NA_T1_Vw`
   - Actual table name may be different

2. **Dataset Missing**
   - `S4` dataset may not exist in production project
   - Dataset name may differ between dev/staging/production

3. **Permissions Issue**
   - Service account lacks access to `S4` dataset
   - IAM roles not configured correctly

4. **Environment Mismatch**
   - `.env.local` set to `production` but should be `dev` or `staging`
   - Table exists in dev/staging but not production

5. **Table Not Created Yet**
   - Production database not fully provisioned
   - Migration scripts not run on production

---

## Affected Code Locations

### Primary Files Using This Table

1. **Organization Query Module**
   - File: [/src/lib/bigquery/queries/organization.ts](../src/lib/bigquery/queries/organization.ts)
   - Lines: 98, 131, 174, 214, 238, 260
   - Functions: `getMarkets()`, `getRegions()`, `getBranches()`, `getOrganizationHierarchy()`

2. **API Routes**
   - [/src/app/api/organization/hierarchy/route.ts](../src/app/api/organization/hierarchy/route.ts) - Line 28
   - [/src/app/api/bigquery/query/route.ts](../src/app/api/bigquery/query/route.ts) - Registry entries 484-487

3. **Hooks**
   - [/src/hooks/useOrganizationData.ts](../src/hooks/useOrganizationData.ts) - Line 132 (API call)

### Query Registry Entries
```typescript
// QUERY_REGISTRY in /src/app/api/bigquery/query/route.ts
'organization-markets': getMarkets,          // ❌ FAILS
'organization-regions': getRegions,          // ❌ FAILS
'organization-branches': getBranches,        // ❌ FAILS
'organization-hierarchy': getOrganizationHierarchy, // ❌ FAILS
```

### Pages Potentially Affected (70+)

Any page using:
- `useOrganizationData()` hook
- `GlobalOrganizationFilter` component
- `OrganizationFilterBar` component
- Market/Region/Branch selectors

**Examples:**
- Sales dashboards (all)
- Operations pages (all)
- Finance pages (with filters)
- Branch detail pages
- Admin pages with organization filters
- And 60+ more...

---

## Immediate Remediation Steps

### Step 1: Verify Table Existence (5 minutes)

**Option A: Using gcloud CLI**
```bash
# Check if S4 dataset exists
gcloud auth application-default login
bq ls --project_id=bidata-sharedus-production

# If S4 exists, check for the table
bq ls --project_id=bidata-sharedus-production S4

# If table exists, check schema
bq show --project_id=bidata-sharedus-production S4.Dim_Branch_BranchID_NA_T1_Vw
```

**Option B: Using BigQuery Console**
1. Go to https://console.cloud.google.com/bigquery
2. Select project: `bidata-sharedus-production`
3. Look for dataset `S4`
4. Look for table `Dim_Branch_BranchID_NA_T1_Vw`

**Option C: Using Code**
```bash
cd /Users/codylytle/Rentokil-BI/Rentokil-BI
npm run dev

# In browser console or create test script:
fetch('/api/bigquery/health-check')
  .then(r => r.json())
  .then(console.log)
```

### Step 2: Determine Correct Environment (2 minutes)

Check which environment has the table:

```bash
# Check dev
bq show --project_id=bidata-sharedus-dev S4.Dim_Branch_BranchID_NA_T1_Vw

# Check staging
bq show --project_id=bidata-sharedus-staging S4.Dim_Branch_BranchID_NA_T1_Vw

# Check production
bq show --project_id=bidata-sharedus-production S4.Dim_Branch_BranchID_NA_T1_Vw
```

### Step 3: Apply Fix (Choose One)

#### Fix Option A: Use Correct Environment (FASTEST - 30 seconds)

If table exists in `dev` or `staging`:

**Edit `.env.local`:**
```bash
# Change from:
BIGQUERY_ENVIRONMENT=production

# To:
BIGQUERY_ENVIRONMENT=dev
# or
BIGQUERY_ENVIRONMENT=staging
```

**Restart dev server:**
```bash
npm run dev
```

#### Fix Option B: Use Correct Table Name (2 minutes)

If table has different name in production:

1. Find actual table name in production
2. Edit `/src/lib/bigquery/queries/organization.ts`
3. Replace all occurrences of `Dim_Branch_BranchID_NA_T1_Vw` with correct name
4. Test queries

#### Fix Option C: Create Missing Table/View (15-30 minutes)

If table needs to be created in production:

```sql
-- Connect to bidata-sharedus-production
-- Create view/table based on dev definition

CREATE OR REPLACE VIEW `bidata-sharedus-production.S4.Dim_Branch_BranchID_NA_T1_Vw` AS
SELECT
  -- Copy definition from dev environment
  -- Or adjust based on available source tables
FROM `bidata-sharedus-production.{source_dataset}.{source_table}`
```

#### Fix Option D: Add Fallback Mock Data (NOT RECOMMENDED - 1 hour)

**Only use if other options fail and you need immediate demo capability:**

1. Create fallback in `useOrganizationData.ts`
2. Return mock hierarchy on BigQuery error
3. Display warning badge to user
4. This violates "BigQuery-only" pattern - temporary measure only

---

## Verification Steps

After applying fix:

### 1. Test Organization Data Endpoint
```bash
curl http://localhost:3000/api/organization/hierarchy | jq

# Expected output:
# {
#   "success": true,
#   "data": {
#     "markets": [...],
#     "regions": [...],
#     "branches": [...]
#   },
#   "counts": { ... }
# }
```

### 2. Check Browser Console
- Open dev tools
- Navigate to any dashboard page
- Should see NO errors about table not found
- Organization dropdowns should populate

### 3. Test Affected Pages
- Sales dashboard: http://localhost:3000/sales
- Operations: http://localhost:3000/ops
- Branch list: http://localhost:3000/branch
- Should load without errors

### 4. Check Data Freshness
- Admin page: http://localhost:3000/admin?tab=slas
- Verify "Organization Hierarchy" shows recent update time

---

## Comprehensive Table Audit Needed

This finding suggests **other tables may also be missing**. Recommend immediate audit:

### High-Priority Tables to Verify

| Table Reference | Query Module | Usage | Verify Status |
|-----------------|--------------|-------|---------------|
| `S4.Dim_Branch_BranchID_NA_T1_Vw` | organization.ts | Markets/Regions/Branches | ❌ NOT FOUND |
| `S4.Fact_Leads_Acc_Daily_Dtls_Snp` | leads.ts | Lead analytics | ❓ Unknown |
| `S0_TMX.tmx_lead` | salti.ts | SALTI dashboard | ❓ Unknown |
| `S0_TMX.tmx_employee` | hr.ts | Employee data | ❓ Unknown |
| `W3_Contract_Checker.T0_unf_Contract_All` | sales.ts | Contract data | ❓ Unknown |
| `BCG_RTD_DB.DR_ContractSales` | bcg-analytics.ts | BCG analytics | ❓ Unknown |
| `Reports.VwUnf_dim_ar_detail` | finance.ts | AR aging | ❓ Unknown |

### Audit Script

Create `/scripts/verify-bigquery-tables.ts`:

```typescript
#!/usr/bin/env tsx

import { bigQueryClient } from '../src/lib/bigquery/client'

const TABLES_TO_VERIFY = [
  'S4.Dim_Branch_BranchID_NA_T1_Vw',
  'S4.Fact_Leads_Acc_Daily_Dtls_Snp',
  'S0_TMX.tmx_lead',
  'S0_TMX.tmx_employee',
  'W3_Contract_Checker.T0_unf_Contract_All',
  'BCG_RTD_DB.DR_ContractSales',
  'Reports.VwUnf_dim_ar_detail',
  // Add all 100+ tables from audit
]

async function verifyTables() {
  console.log('🔍 Verifying BigQuery Table Availability\\n')
  console.log(`Project: ${bigQueryClient.getProjectId()}`)
  console.log(`Environment: ${bigQueryClient.getEnvironment()}\\n`)

  const results = await Promise.all(
    TABLES_TO_VERIFY.map(async (tableName) => {
      const [dataset, table] = tableName.split('.')
      const exists = await bigQueryClient.tableExists(dataset, table)
      return { tableName, exists }
    })
  )

  console.log('Results:')
  results.forEach(({ tableName, exists }) => {
    const status = exists ? '✅' : '❌'
    console.log(`${status} ${tableName}`)
  })

  const missingCount = results.filter(r => !r.exists).length
  console.log(`\\n📊 Summary: ${results.length - missingCount}/${results.length} tables exist`)

  if (missingCount > 0) {
    console.log(`\\n⚠️  ${missingCount} tables are missing!`)
    process.exit(1)
  }
}

verifyTables()
```

Run with:
```bash
npx tsx scripts/verify-bigquery-tables.ts
```

---

## Updated Audit Assessment

### Revised Compliance Score

| Metric | Original | Revised | Status |
|--------|----------|---------|--------|
| Pages Audited | 100 | 100 | ✅ |
| BigQuery-Only Pages | 70 | 70 | ⚠️ Code pattern correct |
| **Runtime Availability** | **Assumed 100%** | **Unknown** | 🔴 CRITICAL |
| Mock Fallbacks | 0 | 0 | ✅ |
| Anti-patterns | 0 | 0 | ✅ |
| **Overall Status** | **COMPLIANT** | **BLOCKED** | 🔴 Cannot verify |

### Revised Risk Assessment

**Overall Risk Level:** 🔴 CRITICAL (was: LOW)

- **Data Integrity:** 🔴 CRITICAL - Cannot fetch organization data
- **Mock Data Leakage:** ✅ NONE - Pattern still correct
- **User Experience:** 🔴 CRITICAL - Many pages non-functional
- **Maintainability:** ✅ GOOD - Code patterns remain sound
- **Production Readiness:** 🔴 BLOCKED - Missing critical tables

---

## Action Items

### Immediate (Today)

- [ ] Verify table existence in all 3 environments (dev/staging/production)
- [ ] Determine correct environment to use for local development
- [ ] Update `.env.local` with correct `BIGQUERY_ENVIRONMENT`
- [ ] Restart dev server and verify organization data loads
- [ ] Test 5-10 representative pages for data loading

### Short-Term (This Week)

- [ ] Create and run table verification script
- [ ] Document which tables exist in which environments
- [ ] Update CLAUDE.md with accurate table inventory
- [ ] Fix or document all missing table references
- [ ] Set up automated table availability monitoring

### Medium-Term (Next Sprint)

- [ ] Ensure all environments have consistent table structure
- [ ] Create fallback error messages for missing tables
- [ ] Add health check endpoint that verifies table availability
- [ ] Document table provisioning process
- [ ] Create migration scripts if tables need to be created

---

## Communication

### For Development Team
"The organization hierarchy BigQuery table doesn't exist in production. Need to verify environment configuration and table availability before resuming development."

### For Stakeholders
"Discovered that production BigQuery environment is not fully provisioned. Code architecture is sound, but database tables need to be created or environment needs to be reconfigured. Estimated fix time: 1-2 hours."

---

## Lessons Learned

### Why This Was Missed in Initial Audit

1. **Static code analysis only** - Audit examined code patterns without runtime testing
2. **Assumed table existence** - Did not verify BigQuery table availability
3. **No environment validation** - Did not check if configured environment matches available data
4. **Trust in comments** - `organization.ts:6` says "VERIFIED TABLE" but was not re-verified

### Improvements for Future Audits

1. **Runtime testing required** - Start dev server and test actual data loading
2. **Table availability check** - Query BigQuery to verify all referenced tables exist
3. **Environment validation** - Confirm .env settings match available infrastructure
4. **Health checks** - Run built-in health check endpoints before completing audit

---

## Revised Conclusion

The original audit conclusion that **"NO REMEDIATION REQUIRED"** is **INCORRECT**.

**New Conclusion:**

The Rentokil-BI codebase demonstrates excellent **code architecture patterns** with zero anti-patterns. However, the application is currently **non-functional** due to missing BigQuery tables in the configured environment.

**Status:** 🔴 CRITICAL BLOCKING ISSUE

**Required Action:** Immediate environment configuration fix or table provisioning before any pages can load real data.

**Timeline:** 30 minutes - 2 hours depending on chosen fix option

---

**Addendum Created:** 2026-01-27
**Supersedes:** LIVE-DATA-AUDIT-REPORT.md Section 9 (Conclusions)
**Next Steps:** Execute Step 1-3 of Immediate Remediation

---

**End of Critical Addendum**
