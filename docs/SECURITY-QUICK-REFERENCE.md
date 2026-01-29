# Security Quick Reference Guide

## For Developers Working with the BigQuery API

---

## Adding a New Query

### Step 1: Create Query Function
```typescript
// src/lib/bigquery/queries/your-module.ts
export async function getYourData(options: QueryOptions): Promise<YourType[]> {
  const sql = `SELECT ... FROM ...`
  const result = await bigQueryClient.query<YourType>(sql)
  return result.rows
}
```

### Step 2: Register in API Route
```typescript
// src/app/api/bigquery/query/route.ts
const QUERY_REGISTRY = {
  'your-query-name': getYourData,
  // ...
}
```

### Step 3: **ADD PERMISSIONS** ⚠️ (NEW REQUIREMENT)
```typescript
// src/lib/bigquery/permissions.ts
export const QUERY_PERMISSIONS = {
  'your-query-name': ['exec', 'market_vp', 'region_director'],  // Allowed roles
  // ...
}
```

**⚠️ CRITICAL:** If you forget Step 3, the query will be **DENIED BY DEFAULT** (secure fallback).

---

## Permission Examples

### Executive/Director Only
```typescript
'executive-kpis': ['exec', 'market_vp', 'market_sales_director']
```

### Management and Above
```typescript
'branch-summary': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager']
```

### Including Reps (with own-data filtering)
```typescript
'sales-pipeline': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager', 'rep']
// Note: Rep will only see their own data (server enforced)
```

### Everyone (Organization Hierarchy Queries)
```typescript
'organization-markets': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician']
```

---

## Role-Based Filtering

Filters are **automatically applied** based on user role. You don't need to do anything in your query function.

### How It Works

```typescript
// User makes request
fetch('/api/bigquery/query', {
  body: JSON.stringify({
    query: 'ae-tracker',
    filters: { daysBack: 30 }  // User provides only daysBack
  })
})

// Server automatically injects role filters
// For rep "John Doe":
const serverFilters = {
  daysBack: 30,
  salesPerson: 'John Doe'  // ← Injected by server
}

// For technician with ID "tech-123":
const serverFilters = {
  daysBack: 30,
  technicianId: 'tech-123',  // ← Injected by server
  employeeId: 'tech-123'
}

// For manager assigned to branch ATL001:
const serverFilters = {
  daysBack: 30,
  branchCode: 'ATL001'  // ← Injected by server
}

// For exec:
const serverFilters = {
  daysBack: 30
  // No additional filters (sees all data)
}
```

### Filter Injection Logic

| Role | Filters Injected |
|------|------------------|
| **rep** | `salesPerson` (user's name) |
| **technician** | `technicianId`, `employeeId` |
| **manager** | `branchCode` (first assigned branch) |
| **sales_manager** | `branchCode` |
| **ops_manager** | `branchCode` |
| **region_director** | `regionCode` (first assigned region) |
| **region_sales_manager** | `regionCode` |
| **market_vp** | `marketCode` (first assigned market) |
| **market_sales_director** | `marketCode` |
| **exec** | None (sees all) |

---

## Common Scenarios

### Scenario 1: Query for All Roles
```typescript
// permissions.ts
'organization-hierarchy': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician']

// Query function doesn't need special handling
export async function getOrganizationHierarchy() {
  return bigQueryClient.query('SELECT * FROM organization')
}
```

### Scenario 2: Query for Reps (Own Data)
```typescript
// permissions.ts
'ae-pipeline': ['exec', 'market_vp', 'region_director', 'manager', 'sales_manager', 'rep']

// Query function uses salesPerson filter (automatically injected for reps)
export async function getAEPipeline(options: QueryOptions) {
  const { salesPerson, daysBack = 30 } = options
  const sql = `
    SELECT * FROM sales
    WHERE 1=1
    ${salesPerson ? `AND sales_person = @salesPerson` : ''}
    AND created_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
  `
  return bigQueryClient.query(sql, { salesPerson, daysBack })
}
```

### Scenario 3: Query for Management (Org Scope)
```typescript
// permissions.ts
'branch-metrics': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager']

// Query function uses branchCode, regionCode, marketCode filters
export async function getBranchMetrics(options: QueryOptions) {
  const { branchCode, regionCode, marketCode } = options
  const sql = `
    SELECT * FROM metrics
    WHERE 1=1
    ${branchCode ? `AND branch_code = @branchCode` : ''}
    ${regionCode ? `AND region_code = @regionCode` : ''}
    ${marketCode ? `AND market_code = @marketCode` : ''}
  `
  return bigQueryClient.query(sql, { branchCode, regionCode, marketCode })
}
```

### Scenario 4: Exec-Only Query (No Filtering)
```typescript
// permissions.ts
'executive-dashboard': ['exec']

// Query doesn't need any filters (exec sees everything)
export async function getExecutiveDashboard() {
  return bigQueryClient.query('SELECT * FROM executive_summary')
}
```

---

## Error Handling in Components

### Handle 401 (Session Expired)
```typescript
const { data, error, errorType } = useBigQueryData({
  queryName: 'ae-tracker',
  // ...
})

if (errorType === 'auth' && error?.includes('expired')) {
  // User will be auto-redirected to /login
  return <div>Session expired. Redirecting...</div>
}
```

### Handle 403 (Access Denied)
```typescript
if (errorType === 'auth' && error?.includes('Access denied')) {
  return (
    <div className="error">
      <h3>Access Denied</h3>
      <p>{error}</p>
      <Link href="/">Return to Dashboard</Link>
    </div>
  )
}
```

---

## Testing Your Changes

### Test 1: Verify Permission Check
```bash
# Try accessing query as rep that should be forbidden
curl -X POST http://localhost:3000/api/bigquery/query \
  -H "Cookie: sb-auth-token=<rep-token>" \
  -d '{"query":"executive-dashboard"}'

# Expected: 403 Forbidden
```

### Test 2: Verify Role Filtering
```bash
# Try accessing query as rep (should work but filtered)
curl -X POST http://localhost:3000/api/bigquery/query \
  -H "Cookie: sb-auth-token=<rep-token>" \
  -d '{"query":"ae-tracker","filters":{"daysBack":30}}'

# Expected: 200 OK with only that rep's data
# Check server logs to see injected filter: {"salesPerson":"Rep Name"}
```

### Test 3: Check Audit Logs
```bash
# Access any query and check terminal output
# Expected to see:
# ✅ [Audit] User: Your Name (your-role) | Action: query_access | Query: query-name | Result: success
```

---

## Troubleshooting

### "Access denied" error for valid query
**Problem:** Forgot to add query to `QUERY_PERMISSIONS`

**Solution:**
```typescript
// Add to src/lib/bigquery/permissions.ts
export const QUERY_PERMISSIONS = {
  'your-query-name': ['exec', 'market_vp', ...],  // ← Add this
}
```

### Rep seeing all data instead of own data
**Problem:** Query function not using `salesPerson` filter

**Solution:**
```typescript
export async function getRepData(options: QueryOptions) {
  const { salesPerson } = options  // ← Extract filter
  const sql = `
    SELECT * FROM data
    WHERE sales_person = @salesPerson  -- ← Use in WHERE clause
  `
  return bigQueryClient.query(sql, { salesPerson })
}
```

### 401 errors in production
**Problem:** Supabase not configured

**Check:**
```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Solution:** Set in `.env.local` or Vercel environment variables

---

## Security Checklist

When adding a new query:

- [ ] Query function created
- [ ] Query registered in `QUERY_REGISTRY`
- [ ] **Permissions added to `QUERY_PERMISSIONS`** ⚠️
- [ ] Query uses appropriate filters (salesPerson, branchCode, etc.)
- [ ] Tested with different roles
- [ ] Checked audit logs

---

## Common Roles and Their Access

### exec (Executive)
- ✅ All queries
- ✅ All data
- ✅ No filtering

### market_vp (Market Vice President)
- ✅ Market-level and below
- ✅ Executive dashboards
- ❌ Other markets (unless assigned)

### region_director (Region Director)
- ✅ Region-level and below
- ❌ Market-level
- ❌ Executive dashboards

### manager (Branch Manager)
- ✅ Branch-level only
- ✅ Team data
- ❌ Region/Market data

### rep (Account Executive)
- ✅ Own data only (sales, pipeline)
- ✅ Branch-level reports (if allowed)
- ❌ Other reps' data
- ❌ Management dashboards

### technician
- ✅ Own routes/tickets
- ❌ Other technicians' data
- ❌ Sales data

---

## Questions?

**Where are permissions defined?**
→ `/src/lib/bigquery/permissions.ts`

**Where are role filters injected?**
→ `/src/lib/bigquery/role-filters.ts`

**Where is auth enforced?**
→ `/src/app/api/bigquery/query/route.ts`

**Where are errors handled?**
→ `/src/hooks/useBigQueryData.ts`

**Where are audit logs?**
→ Server console (terminal output)
→ Future: Sentry, DataDog, Supabase

---

## Key Takeaways

1. **Always add permissions** when creating a new query
2. **Trust server filters** - they override client filters
3. **Test with different roles** before deploying
4. **Check audit logs** for security monitoring
5. **Handle 401/403 errors** in components

**Security is now ENFORCED SERVER-SIDE. No client manipulation can bypass it.**
