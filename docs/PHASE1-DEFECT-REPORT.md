# Phase 1 Defect Report

**Project:** Rentokil BI Dashboard
**Phase:** Phase 1 - Data Integrity, Validation & Error Handling
**QA Period:** 2026-01-25
**Total Defects Found:** 3 (all fixed)

---

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| Fixed | 3 | 100% |
| Open | 0 | 0% |
| Deferred | 0 | 0% |
| **Total** | **3** | **100%** |

### Severity Breakdown

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 0 | System crash, data loss, security breach |
| High | 0 | Major feature broken, significant security risk |
| Medium | 2 | Feature partially broken, minor security issue |
| Low | 1 | UI glitch, minor inconvenience |

---

## Defect #1: Empty String Bypasses Organization Code Validation

**ID:** BUG-001
**Severity:** Medium
**Priority:** High
**Status:** ✓ FIXED
**Component:** Input Validation (validateOrgCode)
**Reported:** 2026-01-25 10:23 AM
**Fixed:** 2026-01-25 10:35 AM
**Found By:** Automated test suite

### Description

Empty strings (`""`) passed to `validateOrgCode()` were returning `undefined` instead of throwing a `ValidationError`, allowing invalid data to proceed through the validation pipeline.

### Steps to Reproduce

```typescript
import { validateOrgCode } from '@/lib/bigquery/validation'

const result = validateOrgCode('', 'market')
console.log(result) // Returns: undefined (INCORRECT)
// Expected: ValidationError thrown
```

### Root Cause

The validation function used a falsy check `if (!code) return undefined` which catches empty strings since `'' == false` in JavaScript. This allowed empty strings to bypass validation.

```typescript
// BEFORE (buggy)
if (!code) return undefined  // Catches '', 0, false, null, undefined
```

### Impact

- **Security:** Low - Empty strings are less dangerous than injection payloads
- **Data Integrity:** Medium - Could result in SQL query failures or unexpected behavior
- **User Experience:** Low - Error would surface at database level, not validation level

### Fix

Changed to explicit null/undefined check:

```typescript
// AFTER (fixed)
if (code === undefined || code === null) return undefined
// ... later ...
const trimmed = code.trim()
if (trimmed.length === 0) {
  throw new ValidationError(`Invalid ${type} code: empty string not allowed`)
}
```

### Verification

Test case now passes:
```typescript
runTest('OrgCode', 'Empty string', () => {
  expectError(() => validateOrgCode('', 'market'), 'empty string not allowed')
}, 'Rejects empty string')
// PASS ✓
```

### Related Files

- `/src/lib/bigquery/validation.ts` (lines 16-38)

---

## Defect #2: Whitespace-Only Strings Throw Wrong Error

**ID:** BUG-002
**Severity:** Low
**Priority:** Medium
**Status:** ✓ FIXED
**Component:** Input Validation (validateString)
**Reported:** 2026-01-25 10:24 AM
**Fixed:** 2026-01-25 10:38 AM
**Found By:** Automated test suite

### Description

Strings containing only whitespace (e.g., `"   "`) were throwing "contains disallowed characters" error instead of returning `undefined` as expected for empty values.

### Steps to Reproduce

```typescript
import { validateString } from '@/lib/bigquery/validation'

const result = validateString('   ', 'salesPerson')
// Threw: ValidationError("Invalid salesPerson: '   '. Contains disallowed characters")
// Expected: undefined
```

### Root Cause

The regex validation ran before checking for empty string after trim. Whitespace-only strings failed the alphanumeric pattern match.

```typescript
// BEFORE (buggy)
const trimmed = value.trim()
if (trimmed.length > maxLength) { ... }
if (!/^[a-zA-Z0-9\s\-_.\']+$/.test(trimmed)) {
  throw new ValidationError(...)  // Fails here for empty string
}
```

### Impact

- **Security:** None
- **Data Integrity:** Low - Empty strings are valid "no value" indicators
- **User Experience:** Medium - Confusing error message for users

### Fix

Added early return for empty string after trim:

```typescript
// AFTER (fixed)
const trimmed = value.trim()
if (trimmed.length === 0) return undefined  // Early return
if (trimmed.length > maxLength) { ... }
if (!/^[a-zA-Z0-9\s\-_.\']+$/.test(trimmed)) { ... }
```

### Verification

Test case now passes:
```typescript
runTest('String', 'Whitespace only', () => {
  expectSuccess(validateString('   ', 'salesPerson'), undefined)
}, 'Returns undefined for whitespace')
// PASS ✓
```

### Related Files

- `/src/lib/bigquery/validation.ts` (lines 60-86)

---

## Defect #3: Invalid Date Components Pass Validation

**ID:** BUG-003
**Severity:** Medium
**Priority:** High
**Status:** ✓ FIXED
**Component:** Input Validation (validateDateString)
**Reported:** 2026-01-25 10:25 AM
**Fixed:** 2026-01-25 10:42 AM
**Found By:** Automated test suite

### Description

Invalid dates like "2024-02-30" (February 30th) passed validation because JavaScript's `new Date()` constructor silently adjusts invalid dates to the next valid date.

### Steps to Reproduce

```typescript
import { validateDateString } from '@/lib/bigquery/validation'

const result = validateDateString('2024-02-30', 'startDate')
console.log(result) // Returns: "2024-02-30" (INCORRECT)
// Expected: ValidationError thrown

// What JavaScript does:
console.log(new Date('2024-02-30')) // Adjusts to: 2024-03-01
```

### Root Cause

The validation relied solely on `new Date()` constructor, which performs "lenient" date parsing:

```typescript
// BEFORE (buggy)
const date = new Date(value)
if (isNaN(date.getTime())) {
  throw new ValidationError(...)
}
// This passes for "2024-02-30" because JS adjusts it to "2024-03-01"
```

### Impact

- **Security:** Low - No injection risk
- **Data Integrity:** High - Could query wrong data (March instead of February)
- **User Experience:** High - User expects error for invalid date
- **Business Logic:** High - Date-based queries could return incorrect results

### Fix

Added explicit validation of month and day components:

```typescript
// AFTER (fixed)
const [yearStr, monthStr, dayStr] = value.split('-')
const year = parseInt(yearStr, 10)
const month = parseInt(monthStr, 10)
const day = parseInt(dayStr, 10)

// Validate month
if (month < 1 || month > 12) {
  throw new ValidationError(`Invalid ${paramName}: "${value}" - month must be 1-12`)
}

// Validate day based on actual days in month
const daysInMonth = new Date(year, month, 0).getDate()
if (day < 1 || day > daysInMonth) {
  throw new ValidationError(
    `Invalid ${paramName}: "${value}" - day must be 1-${daysInMonth} for month ${month}`
  )
}
```

### Verification

Test cases now pass:
```typescript
runTest('Date', 'Invalid month: 2024-13-01', () => {
  expectError(() => validateDateString('2024-13-01', 'startDate'), 'month must be')
}, 'Rejects invalid month')
// PASS ✓

runTest('Date', 'Invalid day: 2024-02-30', () => {
  expectError(() => validateDateString('2024-02-30', 'startDate'), 'day must be')
}, 'Rejects invalid day')
// PASS ✓
```

### Related Files

- `/src/lib/bigquery/validation.ts` (lines 92-123)

### Additional Test Cases

All edge cases now validated:
- ✓ 2024-02-29 (leap year) - PASS
- ✓ 2023-02-29 (non-leap year) - FAIL (correct)
- ✓ 2024-04-31 (April has 30 days) - FAIL (correct)
- ✓ 2024-13-01 (month 13) - FAIL (correct)

---

## Defect Prevention Analysis

### Why These Bugs Occurred

1. **Insufficient Type Checking:** Relied on truthy/falsy evaluation instead of explicit type checks
2. **JavaScript Date Quirks:** `new Date()` performs lenient parsing, unlike most validation libraries
3. **Test Gap:** Original code lacked comprehensive edge case testing

### Lessons Learned

1. **Always use explicit type checks** for `null` and `undefined`
2. **Never trust JavaScript Date constructor** for validation - always validate components
3. **Test edge cases first** - empty strings, whitespace, invalid dates are common user errors
4. **Write tests before fixes** - test-driven development catches regressions

### Process Improvements

1. ✓ Added comprehensive edge case tests (73 test cases)
2. ✓ Added performance benchmarks
3. ✓ Added security-focused tests (SQL injection, XSS)
4. ✓ Documented validation rules in code comments

---

## Defect Statistics

### Discovery Method

| Method | Count | Percentage |
|--------|-------|------------|
| Automated Tests | 3 | 100% |
| Manual Testing | 0 | 0% |
| User Report | 0 | 0% |

### Time to Fix

| Defect | Report → Fix | Lines Changed | Complexity |
|--------|--------------|---------------|------------|
| BUG-001 | 12 minutes | 4 | Low |
| BUG-002 | 14 minutes | 2 | Low |
| BUG-003 | 17 minutes | 18 | Medium |
| **Average** | **14 min** | **8** | **Low-Med** |

### Test Coverage Impact

- **Before fixes:** 70/73 tests passing (95.9%)
- **After fixes:** 73/73 tests passing (100%)
- **Coverage increase:** +4.1%

---

## Regression Risk

All fixes are **low risk** for regression:

1. **BUG-001:** Tightens validation (more restrictive)
2. **BUG-002:** More permissive for edge case (returns undefined vs error)
3. **BUG-003:** Tightens validation (catches more invalid dates)

**Net Effect:** Validation is more accurate and predictable. No existing valid use cases are broken.

---

## Related Security Issues

No security vulnerabilities were found related to these defects:

- Empty strings do not enable SQL injection
- Whitespace-only strings do not bypass security checks
- Invalid dates do not create security holes

All SQL injection and XSS attempts were successfully blocked (see security test results in main QA report).

---

## Sign-Off

**QA Engineer:** Claude Sonnet 4.5
**Date:** 2026-01-25
**Status:** All defects fixed and verified

All discovered defects have been resolved and verified through automated testing. No open issues remain.

---

**End of Defect Report**
