# Ops/Tech Dashboard Fix Recommendations

**Date:** January 24, 2026
**Status:** UPDATED - BCG queries ARE registered, pages just aren't using them

---

## Summary of Findings

After thorough verification of Part 5 (Ops/Tech Dashboard Audit) from the Comprehensive Data Audit Report:

### ✅ GOOD NEWS:
1. **Operations pages (3/3) use appropriate data**
   - `/ops` - S0_TMX.Inspections ✅
   - `/ops/national` - S0_TMX.Inspections by region ✅
   - `/ops/new-starts` - W3_Contract_Checker contracts ✅

2. **BCG work order queries ARE registered** in query API
   - `bcg-work-orders` → getBCGWorkOrders() ✅
   - `bcg-tech-work-orders` → getBCGTechWorkOrders() ✅
   - Plus 14 more BCG queries available ✅

### ⚠️ ISSUES FOUND:
1. **Tech pages use wrong queries**
   - `/tech` uses `tech-dispatch` (AE query, not tech-specific)
   - `/tech/tickets` uses `tech-tickets` (AE query proxy)
   - Both queries are in `ae.ts` module instead of tech-specific module

2. **Tech productivity missing BCG enhancement**
   - `/workforce/tech-productivity` only uses TMX data
   - Does NOT use `bcg-tech-work-orders` query
   - Missing revenue, hours, and callback data

---

## Detailed Issues & Fixes

### Issue 1: Tech Dispatch Uses AE Query

**Page:** `/src/app/(dashboard)/tech/page.tsx`

**Current State:**
```typescript
// Uses AE query that returns employee numbers as names
const { data } = useBigQueryData<TechProductivity[], ScheduleDisplay>({
  queryName: 'tech-productivity',  // ❌ Wrong - this is for workforce analytics
  filters: { daysBack: 1 },
  transformBigQueryData,
})
```

**Problem:**
- Uses `tech-productivity` query which is designed for workforce analytics page
- Transform function tries to create schedule from productivity data
- Hardcoded times (`${8 + index}:00 AM`)
- No actual dispatch/route data

**Recommended Fix:**
Create a new query `tech-dispatch-schedule` that:
1. Queries `S0_TMX.Inspections` for today's scheduled work
2. JOINs with `Employees_Main` for technician names
3. Groups by technician and time window
4. Returns actual appointment times, not synthetic data

**Alternative:** Use `bcg-tech-work-orders` if BCG has today's dispatch schedule

---

### Issue 2: Tech Tickets Uses Inspection Proxy

**Page:** `/src/app/(dashboard)/tech/tickets/page.tsx`

**Current State:**
```typescript
// ae.ts → getTechTickets()
SELECT
  InspectionId as ticket_id,
  CustomerNumber as customer_name,  // ❌ Numeric ID, not name
  'Inspection' as issue_type,  // ❌ Always 'Inspection'
FROM S0_TMX.Inspections
```

**Problem:**
- Returns inspection records, not actual service tickets
- `customer_name` is actually a numeric ID
- `issue_type` is always 'Inspection' (should be callback, complaint, follow_up, etc.)
- Priority logic is oversimplified (Pending = High, else Normal)

**Recommended Fix Option A: Use BCG Work Orders**
```typescript
const { data } = useBigQueryData<BCGTechWorkOrder[], TicketsDisplay>({
  queryName: 'bcg-tech-work-orders',  // ✅ Use BCG data
  filters: { daysBack: 30 },
  transformBigQueryData: (bqData) => {
    // Transform work orders to ticket format
    return {
      tickets: bqData.map(wo => ({
        id: wo.technician_id,
        accountName: wo.technician_name,
        type: deriveTicketType(wo),
        priority: derivePriority(wo),
        status: wo.completion_rate > 0.8 ? 'completed' : 'open',
        // ... etc
      })),
      openCount: bqData.filter(/* open logic */).length,
      // ... etc
    }
  },
})
```

**Recommended Fix Option B: Create Dedicated Ticket Query**
If BCG doesn't have ticket-level data, create `getTechTickets()` in a new `tech.ts` module:
```typescript
// /src/lib/bigquery/queries/tech.ts
export async function getTechTickets(options: TechQueryOptions): Promise<TechTicket[]> {
  const sql = `
    SELECT
      CAST(i.InspectionId AS STRING) as ticket_id,
      COALESCE(c.CustomerName, 'Unknown') as customer_name,  -- ✅ Actual name
      CASE
        WHEN i.Status = 'Callback' THEN 'callback'
        WHEN i.Notes LIKE '%complaint%' THEN 'complaint'
        WHEN i.Status = 'Follow Up' THEN 'follow_up'
        ELSE 'new_service'
      END as issue_type,  -- ✅ Real issue types
      CASE
        WHEN DATE_DIFF(CURRENT_DATE(), DATE(i.DateInspected), DAY) > 7 THEN 'urgent'
        WHEN i.Status = 'Callback' THEN 'high'
        ELSE 'medium'
      END as priority,  -- ✅ Better logic
      -- ... etc
    FROM \`${PROJECT}.S0_TMX.Inspections\` i
    LEFT JOIN \`${PROJECT}.S0_TMX.Customers\` c  -- If customer table exists
      ON i.CustomerNumber = c.CustomerNumber
    WHERE ...
  `
}
```

---

### Issue 3: Tech Productivity Missing BCG Revenue Data

**Page:** `/src/app/(dashboard)/workforce/tech-productivity/page.tsx`

**Current State:**
```typescript
// workforce.ts → getTechProductivity()
SELECT
  COUNT(stops) as stops_completed,
  0 as total_hours,  // ❌ Hardcoded
  0 as revenue_generated,  // ❌ Hardcoded
  0 as callbacks  // ❌ Hardcoded
FROM S0_TMX.Inspections
```

**Problem:**
- Missing real revenue data (exists in BCG)
- Missing real hours worked (exists in BCG)
- Missing callback metrics (exists in BCG)

**Recommended Fix: Use Parallel Queries**
```typescript
// Option 1: Two separate queries, merge in frontend
const { data: tmxData } = useBigQueryData({
  queryName: 'tech-productivity',  // TMX for employee names, basic metrics
  // ...
})

const { data: bcgData } = useBigQueryData({
  queryName: 'bcg-tech-work-orders',  // BCG for revenue, hours, callbacks
  // ...
})

// Merge by technician_id
const mergedData = tmxData.map(tmx => {
  const bcg = bcgData.find(b => b.technician_id === tmx.technician_id)
  return {
    ...tmx,
    revenueGenerated: bcg?.total_revenue || 0,  // ✅ Real revenue
    totalHoursWorked: calculateHours(bcg),  // ✅ Real hours
    callbacks: bcg?.callback_count || 0,  // ✅ Real callbacks
  }
})
```

```typescript
// Option 2: Create enhanced query in workforce.ts
export async function getTechProductivityEnhanced(options) {
  // Query 1: Get TMX employee data
  const tmxSql = `SELECT ... FROM S0_TMX.Inspections ...`
  const tmxData = await bigQueryClient.query(tmxSql)

  // Query 2: Get BCG work order metrics
  const bcgSql = `SELECT ... FROM BCG_RTD_DB.DR_TechWorkOrders ...`
  const bcgData = await bigQueryClient.query(bcgSql)

  // Merge in function
  return tmxData.rows.map(tmx => {
    const bcg = bcgData.rows.find(b => b.technician_id === tmx.technician_id)
    return { ...tmx, ...bcg }
  })
}
```

---

## Query Registry Status

### ✅ ALREADY REGISTERED (Ready to Use):

| Query Name | Function | Table | Purpose |
|------------|----------|-------|---------|
| `bcg-work-orders` | getBCGWorkOrders() | BCG_RTD_DB.DR_WorkOrders | Ops work order metrics |
| `bcg-tech-work-orders` | getBCGTechWorkOrders() | BCG_RTD_DB.DR_TechWorkOrders | Tech productivity with revenue |
| `tech-productivity` | getTechProductivity() | S0_TMX.Inspections + Employees_Main | Tech metrics with names |
| `tech-tickets` | getTechTickets() | S0_TMX.Inspections (proxy) | Service tickets ⚠️ |
| `tech-dispatch` | getTechDispatch() | S0_TMX.Inspections | Dispatch schedule ⚠️ |

⚠️ = Query exists but uses wrong/proxy data

### ❌ NOT REGISTERED (Need to Create):

| Query Name | Purpose | Recommended Table |
|------------|---------|-------------------|
| `tech-dispatch-schedule` | Today's route/schedule | S0_TMX.Inspections (today) + Employees_Main |
| `tech-tickets-enhanced` | Real ticket data | BCG_RTD_DB.DR_TechWorkOrders or create ticket view |
| `tech-productivity-enhanced` | TMX + BCG combined | Multi-source |

---

## Implementation Priority

### Priority 1: Fix Tech Tickets (CRITICAL)
**Impact:** Technicians see wrong data (inspections instead of tickets)
**Effort:** Medium
**Steps:**
1. Decide: Use `bcg-tech-work-orders` or create dedicated ticket query?
2. Update `/tech/tickets/page.tsx` to use correct query
3. Fix transform function to handle real ticket types
4. Test with actual data

### Priority 2: Fix Tech Dispatch (HIGH)
**Impact:** Technicians see synthetic schedule instead of real routes
**Effort:** Medium
**Steps:**
1. Create `getTechDispatchSchedule()` in new `/src/lib/bigquery/queries/tech.ts`
2. Query today's inspections with JOIN to Employees_Main
3. Register as `tech-dispatch-schedule` in query API
4. Update `/tech/page.tsx` to use new query
5. Remove hardcoded time generation

### Priority 3: Enhance Tech Productivity (MEDIUM)
**Impact:** Missing revenue and efficiency metrics
**Effort:** Low (queries already exist)
**Steps:**
1. Add second `useBigQueryData` hook for `bcg-tech-work-orders`
2. Merge BCG data with TMX data in component
3. Display real revenue, hours, callbacks instead of 0/placeholders

---

## Summary

**What's Working:**
- ✅ Operations pages use appropriate S0_TMX.Inspections data
- ✅ New Starts page correctly pulls from W3_Contract_Checker
- ✅ All BCG queries are registered and available
- ✅ Workforce query gets real employee names via JOIN

**What Needs Fixing:**
- ❌ Tech Dispatch uses wrong query (`tech-productivity` instead of dispatch-specific)
- ❌ Tech Tickets uses inspection proxy (not real ticket data)
- ⚠️ Tech Productivity missing BCG enhancement (revenue, hours, callbacks)

**Root Cause:**
Pages aren't using the available BCG queries. The infrastructure is there, just not connected.

**Next Steps:**
1. Update `/tech/tickets/page.tsx` to use `bcg-tech-work-orders` query
2. Update `/tech/page.tsx` to create proper dispatch schedule query
3. Enhance `/workforce/tech-productivity/page.tsx` with BCG data

---

**Report Updated:** January 24, 2026
**Status:** Ready for implementation
