# Salesforce Role Filter Implementation Guide

**Status:** Pending Implementation
**Priority:** Medium (affects AE/Manager data visibility)
**Effort:** 2-4 hours (requires BigQuery schema verification + testing)

---

## Overview

Salesforce tables in BigQuery currently have `includeRoleFilters: false` because they use a different organizational structure than native Rentokil tables.

**Current State:**
- Native tables: Have direct `BranchID`, `RegionCode`, `MarketCode` columns
- Salesforce tables: Use `OwnerId` → JOIN to `Raw_RTXSF_Employee__c_Daily` → get org codes

**Impact:**
- AE Accounts page shows all accounts (not filtered to user's branch)
- AE Quotes page shows all quotes (not filtered to user's branch)
- Account/Contact detail pages show all records

---

## Implementation Steps

### Step 1: Verify Employee Table Schema

First, verify the `Raw_RTXSF_Employee__c_Daily` table has organizational fields:

```sql
SELECT
  User__c,
  Name,
  Market__c,
  Region__c,
  Branch__c,
  BranchID__c,
  Active__c
FROM `bidata-sharedus-production.S0.Raw_RTXSF_Employee__c_Daily`
WHERE Active__c = true
LIMIT 10
```

**Expected fields** (confirm these exist):
- `Market__c` or `Market_Code__c` → maps to role filter `marketCode`
- `Region__c` or `Region_Code__c` → maps to role filter `regionCode`
- `Branch__c` or `Branch_Code__c` or `BranchID__c` → maps to role filter `branchCode`

### Step 2: Update Salesforce Queries

For each Salesforce query that needs role filtering, add org fields to the SELECT and WHERE clauses.

**Example:** `getSalesforceAccounts` in `/src/lib/bigquery/queries/salesforce.ts`

#### Current Query (lines 235-280)
```typescript
const sql = `
  SELECT
    Id as id,
    Name as name,
    // ... other account fields ...
    OwnerId as owner_id,
  FROM \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\`
  WHERE IsDeleted = false
`
```

#### Updated Query (with role filters)
```typescript
const sql = `
  SELECT
    a.Id as id,
    a.Name as name,
    // ... other account fields ...
    a.OwnerId as owner_id,
    e.Name as owner_name,
    COALESCE(e.Market__c, '') as market_code,
    COALESCE(e.Region__c, '') as region_code,
    COALESCE(e.BranchID__c, '') as branch_code
  FROM \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a
  LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e
    ON a.OwnerId = e.User__c
  WHERE a.IsDeleted = false
    ${roleFilters?.branchCode ? `AND e.BranchID__c = @branchCode` : ''}
    ${roleFilters?.regionCode ? `AND e.Region__c = @regionCode` : ''}
    ${roleFilters?.marketCode ? `AND e.Market__c = @marketCode` : ''}
`
```

### Step 3: Update Query Functions to Accept Role Filters

#### Before:
```typescript
export async function getSalesforceAccounts(
  options: QueryOptions = {}
): Promise<SalesforceAccount[]> {
  // ... no role filter handling ...
}
```

#### After:
```typescript
export async function getSalesforceAccounts(
  options: QueryOptions = {}
): Promise<SalesforceAccount[]> {
  const { roleFilters } = options

  // Build query with role filter WHERE clauses
  const sql = `
    SELECT ...
    WHERE ...
      ${roleFilters?.branchCode ? `AND e.BranchID__c = @branchCode` : ''}
  `

  // Add role filter params
  const params: Record<string, string> = {}
  if (roleFilters?.branchCode) params.branchCode = roleFilters.branchCode
  if (roleFilters?.regionCode) params.regionCode = roleFilters.regionCode
  if (roleFilters?.marketCode) params.marketCode = roleFilters.marketCode

  const result = await bigQueryClient.queryWithParams<SalesforceAccount>(sql, params)
  return result.rows
}
```

### Step 4: Enable Role Filters in Components

Update each component to set `includeRoleFilters: true`:

```typescript
// src/app/(dashboard)/ae/accounts/page.tsx
const { data: accounts } = useBigQueryData<SalesforceAccount[], SalesforceAccount[]>({
  queryName: 'salesforce-accounts',
  filters: {
    searchTerm,
  },
  defaultData: EMPTY_ACCOUNTS,
  transformBigQueryData: (data) => data,
  includeRoleFilters: true, // ✅ NOW ENABLED
})
```

---

## Files to Update

| File | Line | Query Function | Status |
|------|------|----------------|--------|
| `src/lib/bigquery/queries/salesforce.ts` | 235 | `getSalesforceAccounts` | Needs JOIN + WHERE |
| `src/lib/bigquery/queries/salesforce.ts` | 350 | `getSalesforceAccountDetail` | Needs JOIN + WHERE |
| `src/lib/bigquery/queries/salesforce.ts` | 380 | `getSalesforceContacts` | Needs JOIN + WHERE |
| `src/lib/bigquery/queries/salesforce.ts` | 650 | `getSalesforceQuoteDetail` | Already has Employee JOIN |
| `src/lib/bigquery/queries/salesforce.ts` | 890 | `getSalesforceOpportunity` | Already has Employee JOIN |
| `src/app/(dashboard)/ae/accounts/page.tsx` | 50 | Component | Set `includeRoleFilters: true` |
| `src/app/(dashboard)/ae/accounts/[id]/page.tsx` | 66, 81 | Component | Set `includeRoleFilters: true` |
| `src/app/(dashboard)/ae/quote/[quoteId]/page.tsx` | 81 | Component | Set `includeRoleFilters: true` |

---

## Testing Checklist

After implementation, test these scenarios:

### As Account Executive (rep role)
- [ ] Can see only accounts owned by me
- [ ] Can see only contacts from my accounts
- [ ] Can see only quotes where I'm the owner
- [ ] Search filters work correctly

### As Branch Manager (manager role)
- [ ] Can see all accounts in my branch
- [ ] Can see all contacts from my branch's accounts
- [ ] Can see all quotes from my branch
- [ ] Role preview mode works

### As Region Director (region_director role)
- [ ] Can see all accounts in my region(s)
- [ ] Can see all contacts from region's accounts
- [ ] Can see all quotes from region
- [ ] Multi-region assignment works

### As Exec (exec role)
- [ ] Can see all accounts (no filtering by default)
- [ ] Can search for specific reps' accounts
- [ ] Admin role preview works correctly

---

## Alternative Approach: Pre-Computed View

If the Employee table doesn't have clean org fields, create a BigQuery view:

```sql
CREATE OR REPLACE VIEW `bidata-sharedus-production.S0.Vw_Salesforce_Account_With_Org` AS
SELECT
  a.*,
  e.Market__c as market_code,
  e.Region__c as region_code,
  e.BranchID__c as branch_code,
  e.Name as owner_name
FROM `bidata-sharedus-production.S0.Raw_RTXSF_Account_Daily` a
LEFT JOIN `bidata-sharedus-production.S0.Raw_RTXSF_Employee__c_Daily` e
  ON a.OwnerId = e.User__c
WHERE a.IsDeleted = false
```

Then query the view instead of the raw table:
```typescript
FROM \`${PROJECT}.S0.Vw_Salesforce_Account_With_Org\`
WHERE market_code = @marketCode
```

**Pros:**
- Simplifies queries
- Improves performance (pre-computed JOIN)
- Easier to maintain

**Cons:**
- Requires DBA/data engineering support
- Need to create views for Account, Contact, Opportunity, Quote, Lead tables

---

## Field Mapping Reference

| Salesforce Field | Rentokil Standard | Role Filter Key | Example Value |
|------------------|-------------------|-----------------|---------------|
| `OwnerId` | `EmployeeID` | N/A | `005...` (User ID) |
| `Employee.Market__c` | `MarketCode` | `marketCode` | `NE`, `SE`, `MW` |
| `Employee.Region__c` | `RegionCode` | `regionCode` | `BOS`, `NYC`, `PHI` |
| `Employee.BranchID__c` | `BranchID` | `branchCode` | `2937`, `2941` |
| `Employee.Name` | `EmployeeName` | `salesPerson` | `John Smith` |

---

## Priority Ranking

1. **HIGH** - `getSalesforceAccounts` (most used, AE dashboard depends on it)
2. **MEDIUM** - `getSalesforceAccountDetail` (account drill-down page)
3. **MEDIUM** - `getSalesforceContacts` (contact lists)
4. **LOW** - `getSalesforceQuoteDetail` (already has Employee JOIN, just needs WHERE clause)
5. **LOW** - `getSalesforceOpportunity` (already has Employee JOIN, just needs WHERE clause)

---

## Estimated Effort

| Task | Time | Difficulty |
|------|------|------------|
| Verify Employee table schema | 30 min | Easy |
| Update 3 query functions | 1 hour | Medium |
| Enable role filters in components | 15 min | Easy |
| Test all scenarios | 1-2 hours | Medium |
| **Total** | **2-4 hours** | **Medium** |

---

## Next Steps

1. Run schema verification query against production BigQuery
2. Confirm Employee table has Market/Region/Branch fields
3. If yes → Update queries as documented above
4. If no → Create pre-computed views with data engineering team
5. Test with real user accounts across all roles
6. Remove TODO comments and update documentation

---

## Related Documentation

- Role-Based Filters: `/src/lib/bigquery/role-filters.ts`
- BigQuery Client: `/src/lib/bigquery/client.ts`
- Query Options: `/src/lib/bigquery/queries/types.ts`
- Salesforce Queries: `/src/lib/bigquery/queries/salesforce.ts`
- CLAUDE.md: BigQuery Integration section
