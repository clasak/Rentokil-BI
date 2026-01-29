# Admin Page Fixes - Complete

**Date:** 2026-01-27
**Issues Fixed:** Data Freshness SLA Errors + Data Quality NaN
**Status:** ✅ FIXED

---

## Issues Fixed

### 1. Data Freshness SLA Tracker Errors

**Before:**
- Contract Checker: Error
- BCG Contract Sales: Error
- Qualtrics Surveys: Error
- Five9 Call Center: Error

**Root Causes:**
1. **Wrong column names** - Using `SellDate` instead of `sell_date` in BCG
2. **Wrong data types** - Using `timestamp` for DATE columns
3. **Missing datetime string parser** - Qualtrics uses "YYYY-MM-DD HH:MM:SS" format
4. **Missing table** - Five9 table doesn't exist in production

**Fixes Applied:**

#### Contract Checker (W3_Contract_Checker.T0_unf_Contract_All)
```typescript
// Before:
timestampColumn: 'SellDate'
timestampType: 'timestamp'  // ❌ WRONG

// After:
timestampColumn: 'SellDate'
timestampType: 'date'  // ✅ CORRECT (SellDate is DATE type)
```

#### BCG Contract Sales (BCG_RTD_DB.DR_ContractSales)
```typescript
// Before:
timestampColumn: 'SellDate'  // ❌ WRONG - column doesn't exist
timestampType: 'timestamp'   // ❌ WRONG

// After:
timestampColumn: 'sell_date'  // ✅ CORRECT (lowercase in this table)
timestampType: 'date'         // ✅ CORRECT (sell_date is DATE type)
```

#### Qualtrics Surveys (S0_TMX.tmx_survey_Qualtrics_V5)
```typescript
// Before:
timestampColumn: 'RecordedDate'  // ❌ WRONG - column is lowercase
timestampType: 'timestamp'       // ❌ WRONG - it's a STRING

// After:
timestampColumn: 'recordeddate'     // ✅ CORRECT (lowercase)
timestampType: 'string_datetime'   // ✅ NEW TYPE for "YYYY-MM-DD HH:MM:SS" format
```

**New Timestamp Type Added:**
```typescript
case 'string_datetime':
  // For "YYYY-MM-DD HH:MM:SS" string format (like Qualtrics recordeddate)
  return `
    SELECT
      TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
        PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', MAX(${sla.timestampColumn})),
        MINUTE) as freshness_minutes
    FROM ${fqTable}
    WHERE ${sla.timestampColumn} IS NOT NULL
  `
```

#### Five9 Call Center
```typescript
// Disabled - table does not exist in production
// Commented out to prevent errors
```

**Files Modified:**
- `src/lib/bigquery/queries/data-freshness.ts`

---

### 2. Enterprise Data Quality Scorecard - NaN%

**Before:**
```
NaN%
0/6 targets met
```

**Root Cause:**
Division by zero when dimensions array is empty:
```typescript
const overallScore = dimensions.reduce((acc, d) => acc + d.currentScore, 0) / dimensions.length
// When dimensions.length = 0 → NaN
```

**Fix:**
```typescript
// Handle empty or loading state
if (!dimensions || dimensions.length === 0) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Enterprise Data Quality Scorecard
        </CardTitle>
        <CardDescription>6 dimensions of data quality health</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8 text-gray-500">
          Loading quality dimensions...
        </div>
      </CardContent>
    </Card>
  )
}

// Safe division
const overallScore = dimensions.length > 0
  ? dimensions.reduce((acc, d) => acc + d.currentScore, 0) / dimensions.length
  : 0
```

**Files Modified:**
- `src/app/(dashboard)/admin/components/DataQualityScorecard.tsx`

---

### 3. Platform Health Component - null crash

**Before:**
```
Cannot read properties of null (reading 'etlJobsSuccess')
```

**Fix:**
Added null check with loading state:
```typescript
if (!metrics) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Platform Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8 text-gray-500">
          Loading platform metrics...
        </div>
      </CardContent>
    </Card>
  )
}
```

**Files Modified:**
- `src/app/(dashboard)/admin/components/PlatformHealth.tsx`

---

### 4. User Adoption Component - null crash

**Fix:**
Added same null check pattern as PlatformHealth.

**Files Modified:**
- `src/app/(dashboard)/admin/components/UserAdoption.tsx`

---

## Expected Results

### Data Freshness SLA Tracker
After refresh, should show:

✅ **Contract Checker** - Real freshness time (not "Error")
✅ **BCG Contract Sales** - Real freshness time (not "Error")
✅ **Qualtrics Surveys** - Real freshness time (not "Error")
✅ **Five9 Call Center** - Removed from list (table doesn't exist)

### Data Quality Scorecard
After refresh, should show:

✅ **"Loading quality dimensions..."** instead of "NaN%"
✅ **Proper percentage** when data loads (e.g., "85.5%")
✅ **Accurate count** of targets met (e.g., "5/6 targets met")

### Platform Health
✅ **"Loading platform metrics..."** instead of crash
✅ **Proper metrics** when data loads

---

## Testing Instructions

1. **Hard refresh the admin page** (Cmd+Shift+R / Ctrl+Shift+R)
2. **Check Data Freshness SLA Tracker:**
   - Should see actual freshness times for Contract Checker, BCG, Qualtrics
   - No more "Error" messages for these sources
   - Five9 removed from list

3. **Check Data Quality Scorecard:**
   - Should show "Loading..." or a real percentage
   - No more "NaN%"

4. **Check Platform Health:**
   - Should show "Loading..." or real metrics
   - No crash

---

## Schema Verification

### W3_Contract_Checker.T0_unf_Contract_All
```
SellDate: DATE
```

### BCG_RTD_DB.DR_ContractSales
```
sell_date: DATE
```

### S0_TMX.tmx_survey_Qualtrics_V5
```
recordeddate: STRING
Format: "YYYY-MM-DD HH:MM:SS"
Example: "2025-03-28 17:51:17"
```

---

## Summary of All Files Changed

1. ✅ `src/lib/bigquery/queries/data-freshness.ts` - Fixed column names and types
2. ✅ `src/app/(dashboard)/admin/components/DataQualityScorecard.tsx` - Fixed NaN division
3. ✅ `src/app/(dashboard)/admin/components/PlatformHealth.tsx` - Added null check
4. ✅ `src/app/(dashboard)/admin/components/UserAdoption.tsx` - Added null check

---

## Related to Earlier Fixes

These admin page errors were **NOT** caused by the pricing fixes. They were pre-existing bugs that were exposed when navigating to the admin page.

**Earlier fixes in this session:**
- ✅ React rendering error (DataFreshnessIndicator) - Fixed by formatting DATE as string
- ✅ New Starts pricing (missing equipment/correctives) - Fixed by including job_non_ini_value
- ✅ Sales Tracker pricing (missing equipment/correctives) - Fixed by including job_non_ini_value

---

**Fix Completed:** 2026-01-27
**Build Status:** Compiled successfully
**Ready for Testing:** YES

**Next Step:** Hard refresh browser to load fixed components
