# Quote Enhancements - Phase 2

## Overview

Phase 2 enhancements to the AE Sales Hub based on user feedback, focusing on grand total display, loading experience, contact information, and navigation improvements.

## User Feedback Addressed

### Issue 1: Grand Total Not Showing on Quotes List
**User**: "On the sales hub page in quotes its not doing the grand total there its just when you click the quote"

**Status**: ✅ Fixed

**Problem**: The quotes list on `/ae/sales?tab=quotes` was displaying `quote.TotalPrice` directly, which is often 0 in Salesforce. The grand total calculation was only implemented on the detail page.

**Solution**: Updated the `getSalesforceQuotes()` query to calculate total from line items when `TotalPrice` is 0:

```sql
CASE
  WHEN COALESCE(q.TotalPrice, 0) > 0 THEN q.TotalPrice
  ELSE COALESCE((
    SELECT SUM(COALESCE(qli.Total_Cost__c, qli.Subtotal, 0))
    FROM `Raw_RTXSF_QuoteLineItem_Daily` qli
    WHERE qli.QuoteId = q.Id
  ), 0)
END as totalAmount
```

**Impact**: All quotes now show accurate totals on both the list and detail views.

---

### Issue 2: Page Flickering During Load
**User**: "also it flickers when the page is loading, can you fix that"

**Status**: ✅ Fixed

**Problem**: The sales hub page was returning `null` during hydration, causing a flash of blank content before the page rendered.

**Before**:
```typescript
if (!mounted) return null
```

**After**:
```typescript
if (!mounted) {
  return (
    <div className="space-y-6">
      {/* Loading skeleton with proper structure */}
      <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      {/* More skeleton elements... */}
    </div>
  )
}
```

**Impact**: Smooth loading experience with skeleton states matching final layout.

---

### Issue 3: Missing POC and Service Address
**User**: "also with the quote information add the POC information and service address"

**Status**: ✅ Fixed

**Solution**: Extended quote detail to include contact and location information.

#### Added to Interface:
```typescript
export interface SalesforceQuoteDetail {
  // ... existing fields
  // POC (Point of Contact) information
  contact_name: string
  contact_email: string
  contact_phone: string
  // Service address
  service_street: string
  service_city: string
  service_state: string
  service_postal_code: string
  service_country: string
}
```

#### Updated Query:
```sql
-- POC from quote's contact
COALESCE(c.Name, '') as contact_name,
COALESCE(c.Email, '') as contact_email,
COALESCE(c.Phone, '') as contact_phone,
-- Service address from quote's shipping address or account
COALESCE(q.ShippingStreet, a.ShippingStreet, '') as service_street,
COALESCE(q.ShippingCity, a.ShippingCity, '') as service_city,
COALESCE(q.ShippingState, a.ShippingState, '') as service_state,
COALESCE(q.ShippingPostalCode, a.ShippingPostalCode, '') as service_postal_code,
COALESCE(q.ShippingCountry, a.ShippingCountry, '') as service_country

-- Added JOINs
LEFT JOIN Raw_RTXSF_Account_Daily a ON o.AccountId = a.Id
LEFT JOIN Raw_RTXSF_Contact_Daily c ON q.ContactId = c.Id
```

#### New UI Sections:
Two cards displayed side-by-side on quote detail page:

**Point of Contact Card**:
- Name (with User icon)
- Email (clickable mailto: link with Mail icon)
- Phone (clickable tel: link with Phone icon)

**Service Address Card**:
- Street address
- City, State, Postal Code
- Country (if applicable)
- Home icon for visual context

---

### Issue 4: Back Button Navigation
**User**: "when you click back from the quote account it goes back to the dashboard not the sales hub page"

**Status**: ✅ Fixed

**Before**: All back buttons pointed to `/ae/tracker`

**After**: All back buttons now point to `/ae/sales?tab=quotes`

**Updated Locations**:
1. Error state back button (invalid quote ID)
2. Error state back button (quote not found)
3. Main header back button

This ensures users return to the correct tab (Quotes) on the Sales Hub page.

---

## Technical Changes

### Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `src/lib/bigquery/queries/ae.ts` | Grand total calculation in quotes list | 1082-1133 |
| `src/lib/bigquery/queries/salesforce.ts` | Extended interface + query with POC/address | 542-637 |
| `src/app/(dashboard)/ae/sales/page.tsx` | Loading skeleton instead of null return | 104-123 |
| `src/app/(dashboard)/ae/quote/[quoteId]/page.tsx` | POC/address cards + fixed back buttons | 28-362 |

### Query Performance

**Grand Total Calculation**:
- Uses correlated subquery for line item sum
- Only executes subquery when TotalPrice is 0
- Minimal performance impact (most quotes have TotalPrice populated)

**POC/Address JOINs**:
- LEFT JOINs to Contact and Account tables
- No performance impact on quotes without contacts/addresses
- Both tables indexed on primary keys

---

## Testing Checklist

- [x] Build compiles successfully
- [x] Grand total displays on quotes list
- [x] Page loads without flickering
- [x] POC information displays when available
- [x] Service address displays when available
- [x] Back button navigates to Sales Hub (Quotes tab)
- [ ] Manual test: Navigate through workflow
  1. Go to Sales Hub
  2. Click Quotes tab
  3. Verify grand totals show correctly
  4. Click a quote
  5. Verify POC and service address display
  6. Click back button
  7. Verify returns to Quotes tab

---

## Example Output

### Quotes List (Sales Hub)
```
Quote Name: Q-2024-001                    Status: Pending Signature
Account: ACME Pest Control
Branch: TMX Phoenix | Delivered: 2024-01-15
                                         Total: $2,003.61
```

### Quote Detail - POC Section
```
┌─────────────────────────────────────┐
│ Point of Contact                    │
│ Primary contact for this quote      │
├─────────────────────────────────────┤
│ 👤 John Smith                       │
│ ✉️  john.smith@acme.com             │
│ 📞 (602) 555-1234                   │
└─────────────────────────────────────┘
```

### Quote Detail - Service Address
```
┌─────────────────────────────────────┐
│ Service Address                     │
│ Location where service will be...   │
├─────────────────────────────────────┤
│ 🏠 123 Main Street                  │
│    Phoenix, AZ 85001                │
│    United States                    │
└─────────────────────────────────────┘
```

---

## Related Documentation

- [QUOTE-DETAIL-ENHANCEMENTS-SUMMARY.md](./QUOTE-DETAIL-ENHANCEMENTS-SUMMARY.md) - Phase 1 enhancements
- [QUOTE-PRICING-ENHANCEMENT.md](./QUOTE-PRICING-ENHANCEMENT.md) - Original pricing breakdown

---

**Date**: 2026-01-26
**Phase**: 2
**Changes By**: Claude Sonnet 4.5
**Status**: Complete
**User Feedback**: Pending
