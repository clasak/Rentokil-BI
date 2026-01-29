# Quote Pricing Enhancement

## Overview

Enhanced the Quote Detail page to show comprehensive pricing breakdown for pest control and termite service quotes with human-readable product descriptions and service code explanations.

## Changes Made

### 1. Extended BigQuery Line Items Query
**File**: `src/lib/bigquery/queries/salesforce.ts`

Added fields from `Raw_RTXSF_QuoteLineItem_Daily`:
- `Product_Code__c` - Actual product code (e.g., "CP326")
- `Servicing_Branch__c` - Branch number (e.g., "4510")
- `Servicing_Branch_Name__c` - Branch name (e.g., "TMX Western Phoenix AZ Com")
- `InitialMaint_CPP_Gross_Price__c` - Initial service gross price
- `InitialMaint_User_Edited_Net_Price__c` - Initial service net price
- `InitialMaint_Service_Code__c` - Initial service code
- `Maintenance_CPP_Gross_Price__c` - Maintenance gross price
- `Maintenance_User_Edited_Net_Price__c` - Maintenance net price
- `Maintenance_Service_Code__c` - Maintenance service code
- `Maintenance_Billing_Frequency__c` - Frequency (ANNUALLY, MONTHLY, etc.)
- `Total_Annual_Cost__c` - Annual recurring cost
- `Total_Cost__c` - Total line item cost
- `Has_Initial_Maintenance__c` - Whether line has initial service
- `Has_Maintenance__c` - Whether line has maintenance

### 2. Added Product Descriptions (NEW)
**File**: `src/lib/bigquery/queries/salesforce.ts`

Added Product2 table JOIN to show human-readable product names:
- `product_display_name` - Human-readable name (e.g., "LIQUID RT SUB TERMITE PREVENTIVE ANNUAL LF")
- `product_description` - Full description (e.g., "SUBTERRANEAN TERMITE LIQUID PREVENTIVE RETREAT ANNUAL PAY")

Query enhancement:
```sql
LEFT JOIN `${PROJECT}.S0.Raw_RTXSF_Product2_Daily` p ON qli.Product2Id = p.Id
```

### 3. Updated TypeScript Interface
**File**: `src/lib/bigquery/queries/salesforce.ts`

Extended `SalesforceQuoteLineItem` interface with 16 new fields for detailed pricing and product descriptions.

### 4. Enhanced Quote Detail UI
**File**: `src/app/(dashboard)/ae/quote/[quoteId]/page.tsx`

**Before**: Simple table showing:
- Product name
- Product code
- Quantity
- Unit price
- Discount
- Subtotal

**After**: Card-based layout for each line item showing:

#### Product Header
- Human-readable product name (e.g., "LIQUID RT SUB TERMITE PREVENTIVE ANNUAL LF")
- Product code in smaller font (e.g., "CP326")
- Full product description
- Servicing branch name and number
- Quantity badge

#### Initial Service Section
- Service code (e.g., "TERM-2-6-352")
- Gross price (before discounts)
- Net price (after discounts)

#### Maintenance Section
- Service code (e.g., "TERM-2-2-48")
- Billing frequency (ANNUALLY, etc.)
- Gross price
- Net price
- Annual cost (highlighted in blue)

#### Line Total Section
- List price (if applicable, shown with strikethrough)
- Discount percentage (shown in orange)
- Line total (large, bold)

### 5. Grand Total
- Displayed at bottom in large green text
- Shows quote total price

### 6. Service Code Explanations
- Added helper text explaining service codes are "internal billing identifiers used by operations teams"
- Service codes displayed in smaller monospace font
- Examples: "TERM-2-6-352" (initial treatment), "TERM-2-2-48" (maintenance)

## Example Pricing Display

```
LIQUID RT SUB TERMITE PREVENTIVE ANNUAL LF (CP326)
SUBTERRANEAN TERMITE LIQUID PREVENTIVE RETREAT ANNUAL PAY
Serviced by: TMX Western Phoenix AZ Com (4510)

Initial Service (One-Time) | Maintenance - ANNUALLY   | Line Total
Service Code: TERM-2-6-352 | Service Code: TERM-2-2-48| List Price: -
Gross Price: $1,626.72     | Gross Price: $376.89     | Discount: -
Net Price: $1,626.72       | Net Price: $376.89       | Total: $2,003.61
                           | Annual Recurring: $376.89|

Quote Grand Total: $2,003.61
```

## Business Value

1. **Clarity**: Product codes (like "CP326") now show with human-readable names ("LIQUID RT SUB TERMITE PREVENTIVE ANNUAL LF")
2. **Transparency**: AEs can see exact pricing breakdown for initial vs. recurring services
3. **Service Codes**: Shows actual billing codes with explanatory text for operations team
4. **Branch Assignment**: Displays which branch will service the account
5. **Annual Costs**: Highlights recurring revenue clearly with "Annual Recurring" label
6. **Professional**: Matches pest control industry standards for quote formatting
7. **User-Friendly**: No more confusion about cryptic codes - everything explained

## Testing

Test with quote ID from Salesforce to verify:
- Initial service pricing shows correctly
- Maintenance pricing displays with frequency
- Servicing branch appears in header
- Grand total matches Salesforce

## Related Files

- `src/lib/bigquery/queries/salesforce.ts` - Query logic
- `src/app/(dashboard)/ae/quote/[quoteId]/page.tsx` - UI display
- `src/types/index.ts` - Type definitions (imports from salesforce.ts)
