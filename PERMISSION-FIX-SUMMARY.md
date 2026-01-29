# Permission and Query Fixes Summary

**Date**: January 27, 2026
**Issue**: Platform Health, User Adoption, and Anomalies pages showing access denied errors

---

## Problems Fixed

### 1. Missing Query Permissions ✅
**Files Modified**: [`src/lib/bigquery/permissions.ts`](src/lib/bigquery/permissions.ts:243-251)

Added missing permissions for 4 admin queries:
```typescript
// Platform Health Monitoring queries - exec only (admin dashboard)
'platform-health-metrics': ['exec'],
'platform-failed-jobs': ['exec'],

// User Adoption queries - exec only (admin dashboard)
'user-adoption-summary': ['exec'],

// Anomaly Detection queries - exec only (admin dashboard)
'anomaly-alerts': ['exec'],
```

### 2. User Adoption SQL Error ✅
**Files Modified**: [`src/lib/bigquery/queries/user-adoption.ts`](src/lib/bigquery/queries/user-adoption.ts:49-68)

**Error**: `Unrecognized name: employee_number`
**Fix**: Updated query to use correct column names and filters:
- Changed `employee_number` → `employee_jde_number`
- Changed `udt_date` logic → `employee_status = 'ACT'` and `hire_date`
- Added proper `curr_ind = 'Y'` filter (standard pattern)

### 3. INFORMATION_SCHEMA Permission Handling ✅
**Files Modified**:
- [`src/lib/bigquery/queries/platform-health.ts`](src/lib/bigquery/queries/platform-health.ts:20-29)
- [`src/app/(dashboard)/platform-health/page.tsx`](src/app/(dashboard)/platform-health/page.tsx:24-35)

**Issue**: `INFORMATION_SCHEMA.JOBS_BY_PROJECT` requires `bigquery.jobs.list` permission

**Solution**: Added restriction tracking and user-facing notification
1. Added `restricted: boolean` and `restrictionReason?: string` to `PlatformHealthMetrics` type
2. Return restriction flag when permission denied (instead of crashing)
3. Display clear warning banner in UI with actionable instructions

---

## UI Improvements

### Platform Health Page
Added restriction warning card that displays when `metrics.restricted === true`:

```typescript
{metrics.restricted && (
  <Card className="border-amber-200 bg-amber-50">
    <CardContent>
      <Shield icon />
      <h3>Data Access Restricted</h3>
      <p>Platform health metrics require additional BigQuery permissions...</p>
      <code>bigquery.jobs.list permission required</code>
      <p>To enable: Request the bigquery.jobs.list permission for your service account</p>
    </CardContent>
  </Card>
)}
```

---

## Testing Checklist

- [x] Platform Health page loads without errors (shows restriction notice if needed)
- [x] User Adoption page loads without SQL errors
- [x] Anomalies page accessible by exec role
- [x] Data Quality page accessible by exec role
- [x] All queries registered in API route match permissions list

---

## Infrastructure Action Required

### BigQuery IAM Permission Needed

To enable **Platform Health** real-time metrics:

1. **Permission**: `bigquery.jobs.list`
2. **Scope**: Project-level (`bidata-sharedus-production`)
3. **Target**: Service account or user running queries
4. **Access Type**: READ-ONLY (metadata only)

**Why needed**: `INFORMATION_SCHEMA.JOBS_BY_PROJECT` is a special BigQuery system table that tracks job execution history. It requires additional permissions beyond standard table read access.

**Current behavior**: Pages display restriction notice with zero values (graceful degradation)

---

## Files Changed

1. [`src/lib/bigquery/permissions.ts`](src/lib/bigquery/permissions.ts) - Added 4 missing query permissions
2. [`src/lib/bigquery/queries/user-adoption.ts`](src/lib/bigquery/queries/user-adoption.ts) - Fixed SQL column names
3. [`src/lib/bigquery/queries/platform-health.ts`](src/lib/bigquery/queries/platform-health.ts) - Added restriction tracking
4. [`src/app/(dashboard)/platform-health/page.tsx`](src/app/(dashboard)/platform-health/page.tsx) - Added restriction UI

---

## Result

All admin pages now load successfully:
- ✅ `/platform-health` - Loads with restriction notice
- ✅ `/user-adoption` - Loads with employee data
- ✅ `/anomalies` - Loads for exec role
- ✅ `/governance/data-quality` - Loads for exec role

No more "Access denied" errors!
