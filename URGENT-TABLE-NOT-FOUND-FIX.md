# 🔴 URGENT: BigQuery Table Not Found - Quick Fix Guide

**Error:** `Not found: Table bidata-sharedus-production:S4.Dim_Branch_BranchID_NA_T1_Vw`

**Impact:** Organization filters and many dashboard pages are non-functional

**Time to Fix:** 2-5 minutes (most likely)

---

## Step 1: Run Diagnostic (30 seconds)

```bash
npm run verify-tables
```

This will check:
- ✅ If BigQuery connection works
- ✅ Which tables exist in your current environment
- ✅ What datasets are available

**If script shows all tables exist:** Skip to Step 3 (restart dev server)

**If script shows missing tables:** Continue to Step 2

---

## Step 2: Try Different Environments (2 minutes)

Your `.env.local` is set to `BIGQUERY_ENVIRONMENT=production`, but the table might exist in `dev` or `staging`.

### Test Dev Environment
```bash
npm run verify-tables -- --environment dev
```

### Test Staging Environment
```bash
npm run verify-tables -- --environment staging
```

### Identify Which Environment Has Tables

✅ **If dev has all tables:**
```bash
# Edit .env.local
echo "BIGQUERY_ENVIRONMENT=dev" > .env.local
```

✅ **If staging has all tables:**
```bash
# Edit .env.local
echo "BIGQUERY_ENVIRONMENT=staging" > .env.local
```

---

## Step 3: Restart Dev Server

```bash
# Kill current dev server (Ctrl+C)
npm run dev
```

Then refresh your browser at http://localhost:3000

---

## Step 4: Verify Fix

Test one of these pages:
- http://localhost:3000/sales
- http://localhost:3000/ops
- http://localhost:3000/branch

**Expected:**
- ✅ No console errors about "Table not found"
- ✅ Organization dropdowns populate with markets/regions/branches
- ✅ Data loads successfully

---

## Still Not Working?

### Option A: Check Your GCP Credentials

```bash
# Re-authenticate with GCP
gcloud auth application-default login

# Verify project access
gcloud config get-value project

# List available projects
gcloud projects list
```

### Option B: Check Available Datasets

```bash
# List datasets in production
bq ls --project_id=bidata-sharedus-production

# List datasets in dev
bq ls --project_id=bidata-sharedus-dev

# List datasets in staging
bq ls --project_id=bidata-sharedus-staging
```

### Option C: Check Table Directly

```bash
# Try to query the table directly
bq query --project_id=bidata-sharedus-production \
  "SELECT COUNT(*) FROM S4.Dim_Branch_BranchID_NA_T1_Vw LIMIT 1"
```

**If this fails:** Table doesn't exist or you don't have access

**If this works:** Environment configuration issue

---

## Most Likely Scenarios

### Scenario 1: You Should Be Using Dev (90% probability)
**Fix:** Change `.env.local` to `BIGQUERY_ENVIRONMENT=dev`

### Scenario 2: Table Name Changed
**Fix:** Find actual table name in BigQuery console, update `src/lib/bigquery/queries/organization.ts`

### Scenario 3: You Don't Have BigQuery Access Yet
**Fix:** Contact your GCP admin to grant BigQuery Data Viewer role

---

## Need More Help?

See detailed documentation:
- [Critical Addendum (Full Details)](./docs/LIVE-DATA-AUDIT-CRITICAL-ADDENDUM.md)
- [Complete Audit Report](./docs/LIVE-DATA-AUDIT-REPORT.md)
- [Remediation Plan](./docs/DATA-AUDIT-REMEDIATION-PLAN.md)

---

## Quick Reference Commands

```bash
# Verify tables in current environment
npm run verify-tables

# Verify tables in specific environment
npm run verify-tables -- --environment dev
npm run verify-tables -- --environment staging
npm run verify-tables -- --environment production

# Check BigQuery health
curl http://localhost:3000/api/bigquery/health-check | jq

# Test organization data
curl http://localhost:3000/api/organization/hierarchy | jq
```

---

**Created:** 2026-01-27
**Status:** Active Issue
