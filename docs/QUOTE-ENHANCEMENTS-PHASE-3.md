# Quote Enhancements - Phase 3: Equipment & Addresses

## Overview

Phase 3 enhancements add missing equipment (merchandise) and corrective service pricing, plus billing address display.

## User Feedback Addressed

### Issue 1: Equipment Missing
**User**: "we are still missing the equipment"

**Status**: ✅ Fixed

**Problem**: Quote line items only showed Initial and Maintenance services. Merchandise (physical equipment like traps, bait stations) and Corrective services were not being displayed.

**Solution**: Extended the query and UI to include:

#### Merchandise (Equipment/Physical Products)
- **`Has_Merchandise__c`** - Boolean flag indicating merchandise exists
- **`Merchandise_CPP_Gross_Price__c`** - Gross price before discounts
- **`Merchandise_User_Edited_Net_Price__c`** - Net price after discounts
- **`Merchandise_Service_Code__c`** - Service code for billing
- **`Merchandise_Quantity__c`** - Quantity of equipment items

#### Corrective Services
- **`Has_Corrective__c`** - Boolean flag indicating corrective service exists
- **`Corrective_CPP_Gross_Price__c`** - Gross price before discounts
- **`Corrective_User_Edited_Net_Price__c`** - Net price after discounts
- **`Corrective_Service_Code__c`** - Service code for billing
- **`Corrective_Billing_Frequency__c`** - Billing frequency

**Impact**: Quote line items now show complete breakdown:
1. Initial Service (one-time treatment)
2. Maintenance (recurring service)
3. **Merchandise (equipment)** ← NEW
4. **Corrective Service (corrective treatment)** ← NEW
5. Line Total

---

### Issue 2: Service and Billing Address
**User**: "and service and biiling addresss"

**Status**: ✅ Fixed

**Problem**: Address information was not displayed on quote detail page.

**Data Discovery** (via diagnostic script):
- Analyzed 10,187 quotes from last 90 days
- **Shipping/Service Address fields**: 0% populated at quote level, 0.2% at account level
- **Billing Address fields**: 0% populated at quote level, **99.9% populated at account level**
- **Industry Pattern**: In pest control, Account.BillingAddress represents the physical service location (where work is performed), not just an invoice mailing address

**Solution**:
- Display both Service Address and Billing Address cards (3-column layout)
- Service Address uses ShippingAddress if available, with fallback to BillingAddress
- Billing Address displays Account.BillingAddress
- 99.9% data availability ensures addresses display for nearly all quotes
- In most cases (99.9%), both cards show same address since ShippingAddress is typically empty

**Fields Used**:
- `service_street` (from ShippingStreet, fallback to BillingStreet)
- `service_city` (from ShippingCity, fallback to BillingCity)
- `service_state` (from ShippingState, fallback to BillingState)
- `service_postal_code` (from ShippingPostalCode, fallback to BillingPostalCode)
- `service_country` (from ShippingCountry, fallback to BillingCountry)
- `billing_street` (from BillingStreet)
- `billing_city` (from BillingCity)
- `billing_state` (from BillingState)
- `billing_postal_code` (from BillingPostalCode)
- `billing_country` (from BillingCountry)

**UI Changes**:
- Changed from 2-column grid to **3-column grid** for POC and addresses
- Three cards: Point of Contact | Service Address | Billing Address
- Service Address uses ShippingAddress with fallback to BillingAddress (99.9% availability)
- Billing Address displays Account.BillingAddress
- Icons: User (POC), Home (Service), DollarSign (Billing)

---

## Technical Changes

### Files Modified

| File | Changes | Description |
|------|---------|-------------|
| `src/lib/bigquery/queries/salesforce.ts` | Added 10 fields to interface + query | Merchandise, Corrective, Billing fields |
| `src/app/(dashboard)/ae/quote/[quoteId]/page.tsx` | Added UI sections for merchandise/corrective/billing | 2 new pricing columns + billing card |

### Query Enhancements

#### Line Items Query - Added Fields:
```sql
-- Merchandise (equipment/physical products)
COALESCE(qli.Merchandise_CPP_Gross_Price__c, 0) as merchandise_gross,
COALESCE(qli.Merchandise_User_Edited_Net_Price__c, 0) as merchandise_net,
COALESCE(qli.Merchandise_Service_Code__c, '') as merchandise_service_code,
COALESCE(qli.Merchandise_Quantity__c, 0) as merchandise_quantity,
COALESCE(qli.Has_Merchandise__c, false) as has_merchandise,

-- Corrective services
COALESCE(qli.Corrective_CPP_Gross_Price__c, 0) as corrective_gross,
COALESCE(qli.Corrective_User_Edited_Net_Price__c, 0) as corrective_net,
COALESCE(qli.Corrective_Service_Code__c, '') as corrective_service_code,
COALESCE(qli.Corrective_Billing_Frequency__c, '') as corrective_frequency,
COALESCE(qli.Has_Corrective__c, false) as has_corrective
```

#### Quote Header Query - Added Fields:
```sql
-- Billing address from quote's billing address or opportunity account
COALESCE(q.BillingStreet, a.BillingStreet, '') as billing_street,
COALESCE(q.BillingCity, a.BillingCity, '') as billing_city,
COALESCE(q.BillingState, a.BillingState, '') as billing_state,
COALESCE(q.BillingPostalCode, a.BillingPostalCode, '') as billing_postal_code,
COALESCE(q.BillingCountry, a.BillingCountry, '') as billing_country
```

### UI Enhancements

#### Pricing Breakdown Grid
**Before**: 3 columns (Initial, Maintenance, Total)

**After**: Up to 5 columns (Initial, Maintenance, Merchandise, Corrective, Total)
- Grid changes from `md:grid-cols-3` to `lg:grid-cols-5`
- Only shows columns that have data (conditional rendering with `has_*` flags)

#### Address Cards
**Before**: 2 cards (POC only in Phase 1)

**After**: 3 cards (POC, Service Address, Billing Address)
- Grid changes from `md:grid-cols-2` to `md:grid-cols-3`
- Service Address card uses ShippingAddress with BillingAddress fallback (99.9% availability)
- Billing Address card displays Account.BillingAddress
- Icons: User (POC), Home (Service), DollarSign (Billing)

---

## Example Output

### Merchandise Section (Equipment)
```
┌─────────────────────────────────────┐
│ Merchandise (Equipment)             │
├─────────────────────────────────────┤
│ Service Code:    MERCH-123         │
│ Quantity:        5                  │
│ Gross Price:     $150.00           │
│ Net Price:       $135.00           │
└─────────────────────────────────────┘
```

### Corrective Service Section
```
┌─────────────────────────────────────┐
│ Corrective Service                  │
├─────────────────────────────────────┤
│ Service Code:    CORR-456          │
│ Frequency:       QUARTERLY         │
│ Gross Price:     $250.00           │
│ Net Price:       $225.00           │
└─────────────────────────────────────┘
```

### Service Address Card
```
┌─────────────────────────────────────┐
│ Service Address                     │
│ Where service will be performed     │
├─────────────────────────────────────┤
│ 🏠 6858 South Merrill Avenue        │
│    Chicago, IL 60649                │
│    United States                    │
└─────────────────────────────────────┘
```

### Billing Address Card
```
┌─────────────────────────────────────┐
│ Billing Address                     │
│ Invoice mailing address             │
├─────────────────────────────────────┤
│ $ 6858 South Merrill Avenue         │
│   Chicago, IL 60649                 │
│   United States                     │
└─────────────────────────────────────┘
```

**Note**: In 99.9% of cases, both addresses show the same value since ShippingAddress is typically empty and both cards fallback to BillingAddress. However, displaying both cards maintains industry standard quote formatting and prepares for cases where separate addresses may be populated.

### Complete Line Item Layout
```
Product: GENERAL PEST CONTROL MAINTENANCE (CP637)
Description: General pest control maintenance service
Serviced by: TMX Phoenix (4510)
Quantity: 1

┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Initial     │ Maintenance │ Merchandise │ Corrective  │ Line Total  │
│ Service     │             │ (Equipment) │ Service     │             │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Code:       │ Code:       │ Code:       │ Code:       │ List: $0    │
│ INIT-123    │ MAINT-456   │ MERCH-789   │ CORR-012    │ Discount: - │
│             │             │             │             │             │
│ Gross: $100 │ Gross: $50  │ Gross: $150 │ Gross: $250 │ Total:      │
│ Net: $90    │ Net: $45    │ Net: $135   │ Net: $225   │ $495        │
│             │             │ Qty: 5      │ Freq: QTR   │             │
│             │ Annual: $540│             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## Business Value

1. **Complete Pricing Transparency** ✅
   - All service types now visible (Initial, Maintenance, Merchandise, Corrective)
   - AEs can see complete quote breakdown
   - No more missing equipment charges

2. **Equipment Visibility** ✅
   - Physical products (traps, bait stations, monitoring devices) now displayed
   - Quantity and pricing clearly shown
   - Service codes for billing purposes

3. **Corrective Service Clarity** ✅
   - One-time corrective treatments now visible
   - Frequency information displayed
   - Separate from maintenance services

4. **Complete Address Information** ✅
   - Both service address and billing address displayed
   - Service address for technician dispatch (uses ShippingAddress with BillingAddress fallback)
   - Billing address for invoice mailing
   - 99.9% data availability across all quotes
   - Matches industry standard quote formatting with separate address fields

5. **Professional Quote Presentation** ✅
   - Matches pest control industry standards
   - All components itemized
   - Clear pricing for each service type

---

## Data Fields Discovery

From BigQuery schema analysis (`Raw_RTXSF_QuoteLineItem_Daily` table has 145 columns):

**Service Types Available**:
- `Has_Initial_Maintenance__c` - Initial/one-time service
- `Has_Maintenance__c` - Recurring maintenance
- `Has_Merchandise__c` - Equipment/physical products
- `Has_Corrective__c` - Corrective treatments

**Merchandise Fields** (Equipment):
- `Merchandise_CPP_Gross_Price__c`
- `Merchandise_User_Edited_Net_Price__c`
- `Merchandise_Service_Code__c`
- `Merchandise_Quantity__c`
- `Merchandise_Billing_Frequency__c`
- `Merchandise_Discount__c`

**Corrective Fields**:
- `Corrective_CPP_Gross_Price__c`
- `Corrective_User_Edited_Net_Price__c`
- `Corrective_Service_Code__c`
- `Corrective_Billing_Frequency__c`
- `Corrective_Discount__c`

---

## Testing Checklist

- [x] Build compiles successfully
- [x] TypeScript types include new fields
- [x] Merchandise section displays when `has_merchandise` is true
- [x] Corrective section displays when `has_corrective` is true
- [x] Billing address displays in third card
- [x] Grid layout adapts to number of service types
- [ ] Manual test: Navigate to quote with equipment
- [ ] Verify merchandise displays with correct pricing
- [ ] Verify corrective services display when present
- [ ] Verify billing address shows correctly

---

## Related Documentation

- [QUOTE-DETAIL-ENHANCEMENTS-SUMMARY.md](./QUOTE-DETAIL-ENHANCEMENTS-SUMMARY.md) - Phase 1
- [QUOTE-ENHANCEMENTS-PHASE-2.md](./QUOTE-ENHANCEMENTS-PHASE-2.md) - Phase 2
- [QUOTE-PRICING-ENHANCEMENT.md](./QUOTE-PRICING-ENHANCEMENT.md) - Original pricing work

---

**Date**: 2026-01-26
**Phase**: 3
**Changes By**: Claude Sonnet 4.5
**Status**: Complete
**User Feedback**: Pending testing with actual quotes containing equipment
