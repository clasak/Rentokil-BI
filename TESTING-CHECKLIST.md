# Implementation Testing Checklist

## Overview
This checklist covers testing for Action Items 1 & 2: BigQuery admin page connections and new API endpoints.

---

## ✅ Prerequisites
- [x] Dev server running on http://localhost:3000
- [x] Supabase migration applied (tables: proposals, sales, new_starts, automation_rules)
- [x] User logged in with authenticated session

---

## Action Item 1: BigQuery Admin Pages (Live Data)

### 1. Platform Health Page
**URL:** http://localhost:3000/platform-health

**Expected Behavior:**
- ✅ Metrics load from BigQuery INFORMATION_SCHEMA
- ✅ Shows pipeline uptime, ETL success rate, avg query time
- ✅ Failed jobs table shows recent errors (or "No failed jobs" if clean)
- ✅ Refresh button works
- ✅ No mock data - all metrics from BigQuery
- ✅ Loading states show spinner
- ✅ Error states show retry button

**Test Cases:**
- [ ] Metrics cards display real numbers (not 0 or mock data)
- [ ] Data freshness table shows table names and last update times
- [ ] Failed jobs section shows "No failed jobs" or actual errors
- [ ] Click refresh and verify data updates
- [ ] Check console for any errors

---

### 2. User Adoption Page
**URL:** http://localhost:3000/user-adoption

**Expected Behavior:**
- ✅ User counts from S0_TMX.tmx_employee (1.2M rows)
- ✅ Shows "Data Source" badge (may show disclaimer if ops_events tracking unavailable)
- ✅ Active users, total users, new users metrics
- ✅ Feature usage section (may be empty if tracking not instrumented)
- ✅ Most viewed dashboards (may be empty)

**Test Cases:**
- [ ] User metrics show real counts from Workday
- [ ] Disclaimer badge appears if dashboard tracking unavailable
- [ ] Empty states show informative messages (not errors)
- [ ] Data source indicator shows "BigQuery" or "Partial"
- [ ] Check if ops_events has page_view data

**Note:** If ops_events table doesn't have tracking data, you'll see partial metrics with a disclaimer. This is expected until instrumentation is added.

---

### 3. Anomalies Page
**URL:** http://localhost:3000/anomalies

**Expected Behavior:**
- ✅ Z-score anomaly detection on revenue and sales metrics
- ✅ Shows "No Anomalies Detected" with green checkmark when healthy
- ✅ Severity badges: Critical (>3σ), Warning (>2σ), Info (>1.5σ)
- ✅ Expandable anomaly cards show:
  - Z-score
  - Actual vs Expected values
  - Affected KPIs
  - Likely causes

**Test Cases:**
- [ ] Page loads without errors
- [ ] If no anomalies: shows green checkmark with "All KPIs within normal ranges"
- [ ] If anomalies detected: cards show severity, description, Z-score
- [ ] Trend charts display correctly
- [ ] Statistical details are accurate

**Statistical Thresholds:**
- Critical: Z-score > 3 (red badge)
- Warning: Z-score > 2 (yellow badge)
- Info: Z-score > 1.5 (blue badge)

---

### 4. Admin Console Page
**URL:** http://localhost:3000/admin

**Expected Behavior:**
- ✅ Overview tab aggregates real BigQuery metrics
- ✅ Platform health summary from INFORMATION_SCHEMA
- ✅ Data quality scores from existing queries
- ✅ User adoption stats from tmx_employee
- ✅ Recent anomaly alerts
- ✅ Role preview menu still works
- ✅ Test mode toggle still functional

**Test Cases:**
- [ ] Overview tab shows all 4 metric sections:
  - Platform Health
  - Data Quality
  - User Adoption
  - Anomaly Alerts
- [ ] All metrics are real numbers (not mock data)
- [ ] Role preview dropdown works (10 roles)
- [ ] Test mode toggle works
- [ ] Navigation tabs work (Overview, Users, Roles, Settings)

---

## Action Item 2: New API Endpoints

### 5. User Management - Auto-Detect Role
**URL:** http://localhost:3000/admin/users

**Expected Behavior:**
- ✅ Existing Supabase CRUD works
- ✅ New "Auto-Detect Role" button for each user
- ✅ Bulk sync button at top
- ✅ Queries BigQuery S0_TMX.tmx_employee for job title
- ✅ Maps job titles to roles:
  - "Account Executive" → rep
  - "Branch Manager" → manager
  - "Regional Director" → region_director
  - "VP" → market_vp
  - "Executive" → exec

**Test Cases:**
- [ ] Click "Auto-Detect Role" for a single user
- [ ] Verify job title is fetched from Workday
- [ ] Role is correctly mapped and saved
- [ ] User profile shows auto_detected_role
- [ ] Click "Bulk Sync" button
- [ ] Progress shows how many users processed

**API Endpoint:** POST /api/admin/auto-detect-role
```json
{
  "email": "user@rentokil.com"
}
```

---

### 6. Lead Import - Persistence
**URL:** http://localhost:3000/ae/import

**Expected Behavior:**
- ✅ PDF upload and parsing still works (client-side)
- ✅ After parsing, "Submit" saves to Supabase
- ✅ Redirects to /ae/tracker with success toast
- ✅ Data persists to:
  - proposals table
  - sales table
  - new_starts table
- ✅ Created by current user

**Test Cases:**
- [ ] Upload a PDF quote
- [ ] Data is parsed (account name, service type, pricing)
- [ ] Click "Submit as Proposal"
- [ ] Success toast appears
- [ ] Redirected to /ae/tracker?tab=proposals
- [ ] New proposal appears in tracker
- [ ] Check Supabase proposals table has new row

**API Endpoint:** POST /api/ae/import/submit
```json
{
  "type": "proposal",
  "data": {
    "account_name": "Acme Corp",
    "service_type": "Commercial",
    "pricing": 1250.00
  }
}
```

---

### 7. Automation Rules - CRUD
**URL:** http://localhost:3000/lead-service-engine/automation

**Expected Behavior:**
- ✅ ROI calculator page is informational (no form)
- ✅ Backend API supports creating automation rules
- ✅ Rules stored in Supabase automation_rules table
- ✅ Full CRUD operations (GET, POST, PATCH, DELETE)
- ✅ Logs events to ops_events table

**Test Cases:**
- [ ] Visit automation page (informational content)
- [ ] Test API with curl or Postman
- [ ] Create a rule via API
- [ ] List all rules
- [ ] Update a rule
- [ ] Delete a rule
- [ ] Verify ops_events logs creation/update/deletion

**API Endpoints:**
- GET /api/automation-rules (list)
- POST /api/automation-rules (create)
- PATCH /api/automation-rules (update)
- DELETE /api/automation-rules?id=xxx (delete)

**Example Rule:**
```json
{
  "rule_name": "High Value Lead Alert",
  "description": "Notify manager for leads >$10k",
  "trigger_type": "lead_received",
  "conditions": {
    "estimated_value": { "gt": 10000 }
  },
  "actions": [
    {
      "type": "send_email",
      "to": "manager@rentokil.com",
      "subject": "High Value Lead Alert"
    }
  ],
  "priority": 10,
  "is_active": true
}
```

---

### 8. Integration Status - Real-Time Monitoring
**URL:** http://localhost:3000/lead-service-engine/integration

**Expected Behavior:**
- ✅ Field mapping table still works (static data)
- ✅ Sync status cards show real-time ETL job status
- ✅ Queries BigQuery INFORMATION_SCHEMA for recent jobs
- ✅ Status per source system:
  - Salesforce
  - PestPac
  - ServiceMaster
  - Workday
  - Google Analytics
  - Customer Portal

**Test Cases:**
- [ ] Visit integration page
- [ ] Sync status section shows 6 source systems
- [ ] Each card shows:
  - Source system name
  - Status badge (healthy/degraded/critical)
  - Last sync time
  - Error message (if failed)
- [ ] Status is determined by ETL job success/failure
- [ ] SLA thresholds enforced (2h for Salesforce, 24h for PestPac, etc.)

**API Endpoint:** GET /api/integration-status

---

## Supabase Tables Verification

### Check Tables Exist
Run in Supabase SQL Editor:
```sql
-- List all new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('proposals', 'sales', 'new_starts', 'automation_rules');

-- Check table structures
SELECT * FROM proposals LIMIT 1;
SELECT * FROM sales LIMIT 1;
SELECT * FROM new_starts LIMIT 1;
SELECT * FROM automation_rules LIMIT 1;
```

### Check RLS Policies
```sql
-- List all policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('proposals', 'sales', 'new_starts', 'automation_rules');
```

---

## Console Checks

### Browser Console
- [ ] No TypeScript errors
- [ ] No React hydration warnings
- [ ] useBigQueryData hooks log query times
- [ ] Data source indicators show "bigquery" or "bigquery-cached"

### Network Tab
- [ ] POST /api/bigquery/query returns 200
- [ ] Response times <5s for queries
- [ ] No 500 errors
- [ ] Authentication headers present

### BigQuery Console
Check query history at https://console.cloud.google.com/bigquery
- [ ] Queries from INFORMATION_SCHEMA visible
- [ ] Queries from S0_TMX.tmx_employee visible
- [ ] No quota exceeded errors
- [ ] Query costs reasonable (<$1 per query)

---

## Known Limitations & Expected States

### User Adoption Page
- **May show partial data** if ops_events lacks page_view tracking
- **Disclaimer badge** will appear: "Partial data - Dashboard tracking not yet instrumented"
- **Workaround:** Add tracking instrumentation or accept partial data

### Anomalies Page
- **May show "No Anomalies"** if all KPIs within normal ranges (this is good!)
- **Statistical detection** only runs on 90-day rolling window
- **First run** may show info-level anomalies due to baseline establishment

### Integration Status
- **Requires ETL jobs to exist** in BigQuery project
- **Job name patterns** must match regex in API (e.g., "salesforce|sf_|rtxsf")
- **If no jobs found:** Will show "No recent syncs" for that source

---

## Rollback Plan (if issues found)

### Revert BigQuery Pages
```bash
# Restore previous versions from git
git checkout HEAD~1 -- src/app/\(dashboard\)/platform-health/page.tsx
git checkout HEAD~1 -- src/app/\(dashboard\)/user-adoption/page.tsx
git checkout HEAD~1 -- src/app/\(dashboard\)/anomalies/page.tsx
git checkout HEAD~1 -- src/app/\(dashboard\)/admin/page.tsx
```

### Remove Supabase Tables
```sql
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS new_starts CASCADE;
DROP TABLE IF EXISTS automation_rules CASCADE;
```

### Remove API Routes
```bash
rm -rf src/app/api/admin/auto-detect-role
rm -rf src/app/api/ae/import/submit
rm -rf src/app/api/automation-rules
rm -rf src/app/api/integration-status
```

---

## Success Criteria

- [x] All files created successfully
- [x] Dev server running without errors
- [x] Supabase migration applied
- [ ] All 4 admin pages load real BigQuery data
- [ ] No calls to mock data functions
- [ ] Empty states show informative messages (not errors)
- [ ] User management auto-detects roles from Workday
- [ ] Lead import persists to database
- [ ] Integration status shows real ETL job status
- [ ] Page load times <3s
- [ ] Error states provide retry mechanism

---

## Next Steps After Testing

1. **If all tests pass:**
   - Mark tasks #14 and #15 as complete
   - Document any limitations found
   - Add usage instructions to README

2. **If issues found:**
   - Document specific errors with screenshots
   - Check browser console for error details
   - Check BigQuery console for query errors
   - Provide error details for debugging

3. **Optional enhancements:**
   - Add ops_events page_view tracking instrumentation
   - Create Grafana dashboard for ops_events monitoring
   - Add anomaly acknowledgment feature
   - Implement email alerts for critical anomalies

---

## Contact for Issues

If you encounter any issues during testing:
1. Check browser console for error messages
2. Check Network tab for failed API calls
3. Check BigQuery console for query errors
4. Provide error details with:
   - Page URL
   - Error message
   - Console output
   - Network response (if API error)
