# Security Fix: Error Message Sanitization (VULN-003)

**Severity**: High (CVSS 7.5)
**Status**: ✅ RESOLVED
**Date**: 2026-01-25

## Vulnerability Summary

**Issue**: Error messages were leaking sensitive system information including:
- BigQuery project IDs (`bidata-sharedus-production`)
- Dataset and table names (`S4.Fact_Leads_Acc_Daily_Dtls_Snp`)
- SQL query structure and syntax details
- Internal file paths (`/Users/developer/Rentokil-BI/...`)
- Permission models and access control details

**Risk**: Information disclosure aids attackers in reconnaissance and enables targeted attacks.

## Solution Implemented

Environment-aware error sanitization that:
- Shows generic user-friendly messages in production
- Preserves detailed debugging information in development
- Redacts PII from all logged data
- Removes stack traces from production responses
- Provides error codes for debugging without exposing internals

## Files Modified

### Created Files

1. **`src/lib/bigquery/error-sanitizer.ts`**
   - Core sanitization functions
   - Sensitive pattern detection and redaction
   - PII sanitization for logs
   - Error code generation

2. **`src/lib/environment.ts`**
   - Environment detection utilities
   - Conditional error detail helpers

3. **`scripts/test-error-sanitization.ts`**
   - Comprehensive test suite
   - 18 test cases covering all scenarios
   - Validates sanitization effectiveness

### Modified Files

1. **`src/lib/bigquery/error-handler.ts`**
   - Integrated sanitization functions
   - Environment-aware logging
   - Safe error option building

2. **`src/app/api/bigquery/query/route.ts`**
   - Sanitized API error responses
   - Type-safe error code extraction
   - Environment-specific details

3. **`src/hooks/useBigQueryData.ts`**
   - Updated error handling
   - Error code logging (safe)
   - User-friendly error display

## Implementation Details

### Error Sanitization Patterns

**Sensitive Patterns Redacted:**
- Project IDs: `bidata-sharedus-(production|staging|dev)`
- Table references: `` `dataset.table.name` ``
- Dataset references: `dataset:project:dataset:`
- File paths: `/Users/...`, `/home/...`, `C:\Users\...`
- Permission details: `Permission [name] denied`

**Generic User Messages:**
| Error Type | Production Message |
|------------|-------------------|
| Table Not Found | "The requested data could not be found. Please contact support if this issue persists." |
| Access Denied | "Access denied. You may not have permission to view this data." |
| Syntax Error | "A query error occurred. Please contact support." |
| Timeout | "The request timed out. Please try reducing the date range or limit." |
| Quota Exceeded | "Resource limit exceeded. Please try again later." |

### Error Codes

Instead of exposing technical details, we return safe error codes:
- `DATA_NOT_FOUND` - Resource not found
- `ACCESS_DENIED` - Permission error
- `INVALID_QUERY` - Syntax or validation error
- `TIMEOUT` - Operation timed out
- `QUOTA_EXCEEDED` - Rate/resource limit hit
- `VALIDATION_ERROR` - Invalid user input
- `QUERY_FAILED` - Generic query failure

### PII Sanitization

The following fields are automatically redacted from logs:
- `email`
- `password`
- `token`
- `ssn` / `social_security`
- `customerName` / `customer_name`
- `employeeName` / `employee_name`
- `salesPerson` / `salesperson_name`

## Testing

### Running Tests

```bash
npx tsx scripts/test-error-sanitization.ts
```

### Test Coverage

**18 test cases** covering:
1. Error message sanitization (5 scenarios)
2. Stack trace removal in production
3. PII redaction (7 fields + nested objects)
4. Error code generation

**All tests passing:**
```
Total Tests: 18
Passed: 18
Failed: 0
✓ All tests passed!
```

### Example Test Cases

#### Test 1: BigQuery Table Not Found
```typescript
Error: "Not found: Table `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Snp`"

Production: "The requested data could not be found. Please contact support if this issue persists."
Development: "Not found: Table `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Snp`"
Error Code: DATA_NOT_FOUND
```

#### Test 2: Access Denied
```typescript
Error: "Access Denied: dataset:bidata-sharedus-production:BCG_RTD_DB: Permission bigquery.tables.get denied"

Production: "Access denied. You may not have permission to view this data."
Development: (full error message)
Error Code: ACCESS_DENIED
```

## Production Behavior

**What Users See:**
- Generic, user-friendly error messages
- No technical details exposed
- No stack traces
- No file paths or project IDs
- Safe error codes for support tickets

**What Gets Logged (Server-Side Only):**
- Full error details (for debugging)
- Sanitized query options (PII removed)
- Error codes and timestamps
- Stack traces (in development)

**Example Production Response:**
```json
{
  "success": false,
  "error": "The requested data could not be found. Please contact support if this issue persists.",
  "errorCode": "DATA_NOT_FOUND",
  "timestamp": "2026-01-25T10:30:00.000Z"
}
```

## Development Behavior

**What Developers See:**
- Full error messages with details
- Complete stack traces
- Query names and parameters
- Debugging suggestions
- Original error context

**Example Development Response:**
```json
{
  "success": false,
  "error": "Not found: Table `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Snp`",
  "errorCode": "DATA_NOT_FOUND",
  "queryName": "leads-by-pest-type",
  "suggestion": "Check query syntax and table permissions",
  "timestamp": "2026-01-25T10:30:00.000Z"
}
```

## Environment Detection

Error sanitization automatically detects environment:
1. `BIGQUERY_ENVIRONMENT` env var (explicit override)
2. `VERCEL_ENV` (`production` → sanitize)
3. `NODE_ENV` (`production` → sanitize)
4. Default: Development (full details)

## Security Benefits

1. **Information Disclosure Prevention**
   - No project structure revealed
   - No table/dataset names exposed
   - No SQL query patterns leaked

2. **Attack Surface Reduction**
   - Attackers can't map database schema
   - Can't probe for table existence
   - Can't deduce permission models

3. **PII Protection**
   - Customer/employee names redacted from logs
   - Email addresses sanitized
   - Tokens and credentials never logged

4. **Audit Trail Preservation**
   - Full errors logged server-side (for legitimate debugging)
   - Error codes provided for support tickets
   - No information lost, just controlled

## Build Verification

```bash
npm run build
```

**Status**: ✅ Build succeeds with no TypeScript errors

**Linting**: Only warnings (pre-existing, unrelated to this fix)

## Deployment Notes

**No configuration required** - sanitization is automatic based on `NODE_ENV`.

**For Vercel deployment:**
- Production: Error sanitization active automatically
- Preview branches: Full errors (set `NODE_ENV=development` if needed)

**For local development:**
- Set `NODE_ENV=development` in `.env.local`
- Full error details will be shown

## Future Enhancements

1. **Monitoring Integration**
   - Send sanitized errors to Sentry/DataDog
   - Alert on critical error codes
   - Track error rate metrics

2. **Enhanced Logging**
   - Structured logging with log levels
   - Separate security audit log
   - Error correlation IDs

3. **User-Facing Improvements**
   - Contextual help links for error codes
   - Smart retry suggestions
   - Error recovery UI components

## Success Criteria

- [x] Error sanitizer utility created
- [x] Production errors are generic and safe
- [x] Development errors show full details
- [x] No project IDs in production errors
- [x] No table names in production errors
- [x] No file paths in production errors
- [x] PII redacted from logs
- [x] Stack traces excluded from production responses
- [x] Error codes provided for debugging
- [x] Build succeeds
- [x] Frontend displays user-friendly messages
- [x] All 18 tests passing

## Vulnerability Status

**VULN-003: CLOSED**

✅ No sensitive information exposed in production error messages
✅ PII sanitized from all logs
✅ Stack traces removed from client responses
✅ Comprehensive test coverage
✅ Production build verified

---

**Reviewed by**: Security Engineer
**Approved for deployment**: 2026-01-25
