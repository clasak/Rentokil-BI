# Security Audit Checklist - Phase 1

**Date:** January 25, 2026
**Status:** 19 findings (3 Critical, 5 High, 7 Medium, 4 Low)

## Critical & High Priority Fixes (Complete by: February 1, 2026)

### Authorization (CRITICAL)
- [ ] **VULN-001** - Add server-side authentication to `/api/bigquery/query`
  - [ ] Create `requireAuth()` middleware
  - [ ] Fetch user profile with role from Supabase
  - [ ] Enforce role-based filters on backend (merge into request)
  - [ ] Add query-to-role permission mapping
  - [ ] Test: Rep cannot access exec queries
  - [ ] Test: Rep cannot remove salesPerson filter
  - **Owner:** Backend API Developer
  - **Effort:** 16 hours

### SQL Injection (HIGH)
- [ ] **VULN-002** - Replace string interpolation with parameterized queries
  - [ ] Refactor `organization.ts` (5 instances)
  - [ ] Refactor `organization-workforce.ts` (15 instances)
  - [ ] Refactor `new-starts.ts` (8 instances)
  - [ ] Remove `sanitizeInput()` and `escapeSqlString()` functions
  - [ ] Test: Unicode escape bypasses are blocked
  - [ ] Test: Null byte bypasses are blocked
  - **Owner:** GAS Developer
  - **Effort:** 8 hours

### Information Disclosure (HIGH)
- [ ] **VULN-003** - Sanitize production error messages
  - [ ] Update `handleBigQueryError()` to filter by environment
  - [ ] Remove project ID, dataset, table names from client errors
  - [ ] Remove stack traces in production
  - [ ] Redact query options in production logs
  - [ ] Update API route error responses
  - [ ] Test: Production errors don't leak table names
  - **Owner:** Security Engineer
  - **Effort:** 4 hours

### ReDoS (HIGH)
- [ ] **VULN-004** - Fix email validation regex
  - [ ] Replace with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` OR
  - [ ] Use `validator.isEmail()` library
  - [ ] Test with 100-character inputs (should complete in <10ms)
  - **Owner:** Security Engineer
  - **Effort:** 1 hour

### CSV Injection (HIGH)
- [ ] **VULN-005** - Add CSV sanitization to exports
  - [ ] Create `sanitizeCsvField()` in `validation.ts`
  - [ ] Update `/ae/tracker/sales/page.tsx` export
  - [ ] Update all other CSV export functions (grep for `handleExportCSV`)
  - [ ] Test: `=1+1` in customer name becomes `'=1+1`
  - **Owner:** Frontend Developer
  - **Effort:** 2 hours

**TOTAL IMMEDIATE EFFORT:** 31 hours

---

## Medium Priority Fixes (Complete by: February 28, 2026)

### Rate Limiting
- [ ] **VULN-006** - Implement API rate limiting
  - [ ] Add Upstash/Redis rate limiter
  - [ ] Configure 100 requests per 15 minutes
  - [ ] Return 429 with retry-after header
  - **Effort:** 4 hours

### Input Validation
- [ ] **VULN-007** - Define field-specific limits
  - [ ] Document database schema limits
  - [ ] Create `FIELD_LIMITS` constant
  - [ ] Update all validation calls
  - **Effort:** 6 hours

### Audit Logging
- [ ] **VULN-008** - Add security event logging
  - [ ] Create audit logger infrastructure
  - [ ] Log validation failures
  - [ ] Log authentication failures
  - [ ] Log suspicious queries
  - **Effort:** 8 hours

### Date Validation
- [ ] **VULN-009** - Enforce date range limits
  - [ ] Add 365-day max range
  - [ ] Prevent dates before 2000
  - **Effort:** 2 hours

### Type Safety
- [ ] **VULN-010** - Add type guards to validation
  - [ ] Check `typeof value === 'number'` in `validateNumeric`
  - [ ] Check `typeof value === 'string'` in `validateString`
  - **Effort:** 2 hours

### CORS
- [ ] **VULN-011** - Document CORS policy
  - [ ] Add explicit CORS headers
  - [ ] Restrict to production domain
  - **Effort:** 2 hours

### Parameter Pollution
- [ ] **VULN-012** - Validate against arrays
  - [ ] Reject array parameters
  - **Effort:** 2 hours

**TOTAL MEDIUM EFFORT:** 26 hours

---

## Low Priority Fixes (Complete by: March 31, 2026)

- [ ] **VULN-013** - Remove apostrophe from validateString regex
- [ ] **VULN-014** - Add Content-Type validation
- [ ] **VULN-015** - (Accepted risk - no action)
- [ ] **VULN-016** - Implement structured logging

**TOTAL LOW EFFORT:** 4 hours

---

## Testing Checklist

### SQL Injection Tests
- [ ] Classic injection: `' OR '1'='1`
- [ ] Comment injection: `'; DROP TABLE --`
- [ ] Union injection: `' UNION SELECT * FROM users --`
- [ ] Null byte: `NE\x00`
- [ ] Backtick: `` `table` ``
- [ ] Unicode escape: `\u0027`
- [ ] LIKE wildcard: `%`

### Authorization Tests
- [ ] Rep cannot access exec queries
- [ ] Rep cannot remove salesPerson filter
- [ ] Rep cannot access other reps' data
- [ ] Tech cannot access other techs' routes
- [ ] Branch manager sees only their branch
- [ ] Exec sees all data

### ReDoS Tests
- [ ] Email validation with 50-char input (<5ms)
- [ ] Email validation with 100-char input (<10ms)

### Information Disclosure Tests
- [ ] Production error doesn't show table names
- [ ] Production error doesn't show project ID
- [ ] Production error doesn't show stack traces

---

## Code Review Checklist (for all new PRs)

### SQL Queries
- [ ] Uses parameterized queries (`@parameter`), NOT string interpolation
- [ ] Validates all user inputs with validation functions
- [ ] Uses validated values in SQL, not original inputs
- [ ] No `sanitizeInput()` or `escapeSqlString()` functions

### API Endpoints
- [ ] Requires authentication (calls `requireAuth()`)
- [ ] Enforces role-based filters on backend
- [ ] Validates query permissions by role
- [ ] Sanitizes error messages for production

### Validation
- [ ] All user inputs validated before use
- [ ] Validation uses strict limits (not default)
- [ ] Type guards present (checks `typeof`)
- [ ] Regex patterns are not vulnerable to ReDoS

### Error Handling
- [ ] Errors logged with appropriate level
- [ ] Production errors don't leak internal details
- [ ] Stack traces only in development
- [ ] Query options redacted in production logs

### Exports
- [ ] CSV fields sanitized for formula injection
- [ ] Fields starting with `=+-@` are prefixed with `'`

---

## Continuous Monitoring

### Weekly
- [ ] Review failed validation attempts in logs
- [ ] Review unusual query patterns (exec queries from reps)
- [ ] Review BigQuery quota usage (detect abuse)

### Monthly
- [ ] Review access logs for authorization anomalies
- [ ] Update dependency versions
- [ ] Re-run security test suite

### Quarterly
- [ ] Full penetration test
- [ ] Security audit of new features
- [ ] Review OWASP Top 10 compliance

---

## Incident Response Contacts

- **Security Team:** [To be added]
- **On-Call Engineer:** [To be added]
- **BigQuery Admin:** [To be added]

## Quick Reference

**Audit Report:** `/docs/SECURITY-AUDIT-PHASE-1.md`
**Validation Framework:** `/src/lib/bigquery/validation.ts`
**Error Handler:** `/src/lib/bigquery/error-handler.ts`
**Role Filters:** `/src/lib/bigquery/role-filters.ts`
**API Route:** `/src/app/api/bigquery/query/route.ts`

---

**Last Updated:** January 25, 2026
**Next Review:** After Phase 2 implementation
