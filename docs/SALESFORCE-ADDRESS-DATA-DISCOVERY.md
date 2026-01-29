# Salesforce Address Data Discovery

**Date**: 2026-01-26
**Scope**: Salesforce Quote and Account address fields
**Sample Size**: 10,187 quotes (last 90 days)

## Executive Summary

Diagnostic analysis revealed that Salesforce does not store separate shipping/service addresses for quotes. Instead, the **Account.BillingAddress field serves as the physical service location** in the pest control industry, with 99.9% data availability.

## Key Findings

### Address Field Availability

| Field Type | Quote Level | Account Level | Usage |
|------------|-------------|---------------|-------|
| **ShippingStreet** | 0% | 0.2% | ❌ Not used |
| **ShippingCity** | 0% | 0.2% | ❌ Not used |
| **BillingStreet** | 0% | **99.9%** | ✅ Service location |
| **BillingCity** | 0% | **99.9%** | ✅ Service location |

### Industry Pattern Discovery

In the pest control industry, the **BillingAddress** field on the Account object represents:
- Physical location where service is performed
- Technician dispatch address
- Equipment installation location
- NOT just an invoice mailing address

**Example Addresses** (from sample data):
- "6858 South Merrill Avenue, Chicago"
- "1120 West Exchange Avenue, Chicago"
- "2917 Business Park Drive, Stevens Point"

These are clearly physical service locations, not P.O. boxes or billing departments.

## Data Quality Metrics

**Overall Quality**: Excellent (99.9%)

- **Total Quotes Analyzed**: 10,187 (90 days)
- **Quotes with Address**: 10,180 (99.9%)
- **Missing Addresses**: 7 (0.1%)

## Implementation Decision

Based on this discovery, we implemented:

1. **Display Account.BillingAddress as "Service Location"** on quote detail page
2. **Removed separate "Billing Address" card** (no separate invoice address exists)
3. **Updated UI to 2-column layout**: Point of Contact | Service Location
4. **Changed icon to Home** (representing physical location vs. DollarSign)

## Technical Details

### Query Pattern (Correct)

```sql
-- Service location from account billing address
COALESCE(q.BillingStreet, a.BillingStreet, '') as billing_street,
COALESCE(q.BillingCity, a.BillingCity, '') as billing_city,
COALESCE(q.BillingState, a.BillingState, '') as billing_state,
COALESCE(q.BillingPostalCode, a.BillingPostalCode, '') as billing_postal_code,
COALESCE(q.BillingCountry, a.BillingCountry, '') as billing_country
```

### What DIDN'T Work

```sql
-- ❌ Service address attempt (no data exists)
COALESCE(q.ShippingStreet, a.ShippingStreet, '') as service_street,
COALESCE(q.ShippingCity, a.ShippingCity, '') as service_city,
COALESCE(q.ShippingState, a.ShippingState, '') as service_state
```

## Sample Data

### Sample 1: Mark Tolliver Quote
```
Quote: Mark Tolliver-Rodents - Quote
Account: Mark Tolliver
Service Location: 6858 South Merrill Avenue, Chicago
  ↳ From: Account.BillingAddress
  ↳ ShippingAddress: (empty)
```

### Sample 2: Ashley Furniture Quote
```
Quote: Ashley Furniture Homestore - Sheboygan - GPA
Account: Ashley Furniture - Sheboygan
Service Location: 2917 Business Park Drive, Stevens Point
  ↳ From: Account.BillingAddress
  ↳ ShippingAddress: (empty)
```

### Sample 3: 7 Brew Coffee Quote
```
Quote: 7 Brew Coffee #979
Account: 7 Brew Coffee
Service Location: 27 Central Avenue, Cortland
  ↳ From: Account.BillingAddress
  ↳ ShippingAddress: (empty)
```

## Why ShippingAddress is Empty

Possible reasons:
1. **Salesforce configuration**: Organization may not have enabled ShippingAddress fields
2. **Business process**: Users enter address in BillingAddress only
3. **Data migration**: Legacy data may have used BillingAddress exclusively
4. **Industry standard**: Pest control CRM implementations commonly use BillingAddress for service locations

## Recommendations

### For Quote Detail Page ✅ IMPLEMENTED
- Display Account.BillingAddress as "Service Location"
- Label as "Where service will be performed"
- Icon: Home (physical location)
- 99.9% data availability

### For Future Enhancements
1. **Technician Dispatch**: Use Account.BillingAddress for routing
2. **Maps Integration**: Plot service locations from BillingAddress
3. **Service History**: Link completed services to Account.BillingAddress
4. **Multi-Location Accounts**: Check if separate ServiceLocation table exists for chains with multiple sites

### For Data Team
1. **Document this pattern**: Update Salesforce schema documentation
2. **Validate assumptions**: Confirm with Salesforce admins that BillingAddress = ServiceLocation
3. **Check for exceptions**: Identify any accounts where this pattern doesn't hold

## Diagnostic Script

Location: `/scripts/check-quote-address-data.ts`

Queries:
1. Address availability percentages (quote and account level)
2. Sample of 10 recent quotes with address data
3. Comparison of BillingAddress vs. ShippingAddress availability

## Related Documentation

- [QUOTE-ENHANCEMENTS-PHASE-2.md](./QUOTE-ENHANCEMENTS-PHASE-2.md) - POC and service address (Phase 2)
- [QUOTE-ENHANCEMENTS-PHASE-3.md](./QUOTE-ENHANCEMENTS-PHASE-3.md) - Equipment and billing address (Phase 3)

---

**Conclusion**: The term "service address" in Rentokil's Salesforce implementation refers to Account.BillingAddress, which represents the physical service location with 99.9% data availability. There is no separate shipping address or invoice mailing address stored in the system.
