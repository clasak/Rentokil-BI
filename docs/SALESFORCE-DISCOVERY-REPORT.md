# Salesforce Table Discovery Report

**Date**: 2026-01-26
**Project**: AE Dashboard - Salesforce Replacement Module
**Phase**: Phase 1 Discovery

---

## Executive Summary

Successfully discovered **73 Salesforce-related tables** in BigQuery production dataset (`bidata-sharedus-production`), including **17 RTXSF (Salesforce sync) tables** that contain daily snapshots of Salesforce data.

**Key Findings**:
- ✅ 17 RTXSF tables with daily Salesforce data (updated 2026-01-26 12:30)
- ✅ 14 new RTXSF tables beyond the 3 currently integrated
- ✅ 196K opportunities, 109K accounts, 112K contacts, 79K leads available
- ✅ 2.9M support cases, 458K opportunity history records
- ✅ Total dataset size: 765 GB across 2.4 billion rows

**High-Value Tables Identified for Phase 2A**:
1. `Raw_RTXSF_Account_Daily` - Account management (109K accounts)
2. `Raw_RTXSF_Contact_Daily` - Contact management (112K contacts)
3. `Raw_RTXSF_Lead_Daily` - Lead tracking (79K leads)
4. `Raw_RTXSF_OpportunityHistory_Daily` - Stage progression (458K records)
5. `Raw_RTXSF_Case_Daily` - Support cases (2.9M cases)
6. `Raw_RTXSF_Employee__c_Daily` - Sales rep directory (1.8K employees)
7. `Raw_RTXSF_Product2_Daily` - Service catalog (742 products)
8. `Raw_RTXSF_Location_Daily` - Service locations (33K locations)

---

## Discovery Methodology

### Search Patterns Used
```
%salesforce%, %RTXSF%, %lead%, %opportunity%, %quote%,
%account%, %contact%, %contract%, %proposal%
```

### Datasets Searched
- ✅ S0 (37 tables found)
- ✅ S0_TMX (23 tables found)
- ✅ S4 (2 tables found)
- ✅ W3_Contract_Checker (1 table found)
- ✅ BCG_RTD_DB (10 tables found)
- ✅ Reports (0 tables found)

### Query Method
Used BigQuery `__TABLES__` metadata to retrieve table metadata including row counts, size, and last modified timestamps.

---

## RTXSF Tables (17) - Salesforce Daily Snapshots

### 1. Support & Service Management

| Table | Rows | Size | Last Updated | Purpose |
|-------|------|------|--------------|---------|
| `Raw_RTXSF_Case_Daily` | 2,953,194 | 7,234 MB | 2026-01-26 12:30 | Support cases and service tickets |
| `Raw_RTXSF_Location_Daily` | 33,489 | 9 MB | 2026-01-26 12:30 | Service locations |
| `Raw_RTXSF_AssociatedLocation_Daily` | 33,491 | 5 MB | 2026-01-26 12:30 | Location associations |

### 2. Opportunity Management ⭐

| Table | Rows | Size | Last Updated | Purpose | Status |
|-------|------|------|--------------|---------|--------|
| **`Raw_RTXSF_Opportunity_Daily`** | **196,416** | **263 MB** | **2026-01-26 12:30** | **Opportunities/pipeline** | **✅ Integrated** |
| `Raw_RTXSF_OpportunityHistory_Daily` | 458,772 | 51 MB | 2026-01-26 12:30 | Stage change tracking | 🎯 High Value |
| `Raw_RTXSF_Opportunity_Location__c_Daily` | 76,185 | 26 MB | 2026-01-26 12:30 | Opportunity locations | - |

### 3. Quote Management ⭐

| Table | Rows | Size | Last Updated | Purpose | Status |
|-------|------|------|--------------|---------|--------|
| **`Raw_RTXSF_Quote_Daily`** | **65,148** | **51 MB** | **2026-01-26 12:30** | **Quotes/proposals** | **✅ Integrated** |
| **`Raw_RTXSF_QuoteLineItem_Daily`** | **91,336** | **1,955 MB** | **2026-01-26 12:30** | **Quote line items** | **✅ Integrated** |
| `Raw_RTXSF_Quote_Line_Equipments__Daily` | 38,522 | 9 MB | 2026-01-26 12:30 | Equipment line items | - |
| `Raw_RTXSF_Quote_Line_Equipments__c_Daily` | 12,410 | 3 MB | 2025-02-17 06:19 | Equipment (old format) | ⚠️ Stale |

### 4. Account & Contact Management ⭐

| Table | Rows | Size | Last Updated | Purpose | Status |
|-------|------|------|--------------|---------|--------|
| `Raw_RTXSF_Account_Daily` | 109,074 | 57 MB | 2026-01-26 12:30 | Customer accounts | 🎯 High Value |
| `Raw_RTXSF_Contact_Daily` | 112,562 | 43 MB | 2026-01-26 12:30 | Contacts | 🎯 High Value |
| `Raw_RTXSF_Lead_Daily` | 79,207 | 51 MB | 2026-01-26 12:30 | Lead tracking | 🎯 High Value |

### 5. Configuration & Metadata

| Table | Rows | Size | Last Updated | Purpose | Status |
|-------|------|------|--------------|---------|--------|
| `Raw_RTXSF_Employee__c_Daily` | 1,817 | 0.3 MB | 2026-01-26 12:30 | Sales rep directory | 🎯 High Value |
| `Raw_RTXSF_Product2_Daily` | 742 | 0.3 MB | 2026-01-26 12:30 | Service catalog | 🎯 High Value |
| `Raw_RTXSF_Business_Unit__c_Daily` | 1,417 | 0.3 MB | 2026-01-26 12:30 | Business units | - |
| `Raw_RTXSF_RecordType_Daily` | 15 | 0.0 MB | 2026-01-26 12:30 | Record type metadata | - |

---

## Currently Integrated Tables (3)

✅ **S0.Raw_RTXSF_Opportunity_Daily**
- Rows: 196,416
- Size: 262.82 MB
- Last Modified: 2026-01-26 12:30:18
- Usage: Pipeline tracking in `/ae` dashboard
- Query: `getSalesforceOpportunities()`

✅ **S0.Raw_RTXSF_Quote_Daily**
- Rows: 65,148
- Size: 50.65 MB
- Last Modified: 2026-01-26 12:30:08
- Usage: Quote/proposal tracking in `/ae` dashboard
- Query: `getSalesforceQuotes()`

✅ **S0.Raw_RTXSF_QuoteLineItem_Daily**
- Rows: 91,336
- Size: 1,955.32 MB
- Last Modified: 2026-01-26 12:30:14
- Usage: Referenced in queries but not directly displayed
- Query: Not directly queried yet

---

## High-Value Candidates for Phase 2A (8 tables)

### Priority 1: Account Management (3 tables)

#### 1. Raw_RTXSF_Account_Daily ⭐⭐⭐
- **Rows**: 109,074 accounts
- **Size**: 57 MB
- **Purpose**: Full customer account details
- **Use Cases**:
  - Account search and management page (`/ae/accounts`)
  - Account detail view with service history
  - Account timeline and relationship tracking
- **Key Fields** (expected):
  - Id, Name, Industry, BillingCity, BillingState
  - Phone, Website, OwnerName
  - PestPac_Bill_To_Id__c (link to PestPac contracts)
  - CreatedDate, LastActivityDate

#### 2. Raw_RTXSF_Contact_Daily ⭐⭐⭐
- **Rows**: 112,562 contacts
- **Size**: 43 MB
- **Purpose**: Contact information for accounts
- **Use Cases**:
  - Contact list in account detail page
  - Primary contact display on opportunity cards
  - Communication history tracking
- **Key Fields** (expected):
  - Id, AccountId, FirstName, LastName, Email, Phone
  - Title, OwnerName, CreatedDate

#### 3. Raw_RTXSF_Lead_Daily ⭐⭐
- **Rows**: 79,207 leads
- **Size**: 51 MB
- **Purpose**: Pre-opportunity lead tracking
- **Use Cases**:
  - Lead funnel visualization
  - Lead qualification pipeline
  - Lead-to-opportunity conversion tracking
- **Key Fields** (expected):
  - Id, Name, Company, Status, Rating
  - Email, Phone, Industry, LeadSource
  - ConvertedOpportunityId, ConvertedDate

### Priority 2: Enhanced Pipeline Tracking (2 tables)

#### 4. Raw_RTXSF_OpportunityHistory_Daily ⭐⭐⭐
- **Rows**: 458,772 history records
- **Size**: 51 MB
- **Purpose**: Stage change tracking for opportunities
- **Use Cases**:
  - Stage progression timeline on opportunity detail page
  - Pipeline velocity analytics (days in each stage)
  - Win/loss analysis (why opportunities were lost)
- **Key Fields** (expected):
  - OpportunityId, StageName, CreatedDate
  - FieldName (e.g., "StageName"), OldValue, NewValue

#### 5. Raw_RTXSF_Case_Daily ⭐⭐
- **Rows**: 2,953,194 cases
- **Size**: 7,234 MB
- **Purpose**: Support cases and service tickets
- **Use Cases**:
  - Service issue tracking on account detail page
  - Customer health indicators (case volume, severity)
  - Cross-sell opportunities (issues → upsell)
- **Key Fields** (expected):
  - Id, AccountId, ContactId, Status, Priority
  - Subject, Description, Type, Reason
  - CreatedDate, ClosedDate

### Priority 3: Configuration & Metadata (3 tables)

#### 6. Raw_RTXSF_Employee__c_Daily ⭐⭐
- **Rows**: 1,817 employees
- **Size**: 0.3 MB
- **Purpose**: Sales rep directory and org structure
- **Use Cases**:
  - Sales rep lookup for assignment
  - Territory management
  - Manager hierarchy visualization
- **Key Fields** (expected):
  - Id, Name, Email, Title, Department
  - ManagerId, Territory, IsActive

#### 7. Raw_RTXSF_Product2_Daily ⭐⭐
- **Rows**: 742 products
- **Size**: 0.3 MB
- **Purpose**: Service catalog (pest control services, products)
- **Use Cases**:
  - Service type dropdown in quote builder
  - Product recommendations
  - Pricing reference
- **Key Fields** (expected):
  - Id, Name, ProductCode, Family
  - Description, IsActive, ListPrice

#### 8. Raw_RTXSF_Location_Daily ⭐
- **Rows**: 33,489 locations
- **Size**: 9 MB
- **Purpose**: Service location tracking
- **Use Cases**:
  - Multi-location account management
  - Geographic service area analysis
  - Location-specific pricing/service
- **Key Fields** (expected):
  - Id, AccountId, Name, Street, City, State, PostalCode
  - ServiceType, IsActive

---

## Other Notable Tables (Not RTXSF)

### TMX Lead Tables (S0_TMX, S0)
- `tmx_lead` - 74M rows, 44 GB (already used in dashboard)
- `tmx_lead_activity_fact` - 205M rows, 85 GB (lead tracking details)
- `tmx_lead_prospect` - 26M rows, 5 GB (prospect conversion)

### BCG Analytics Tables (BCG_RTD_DB)
- `DR_Leads` - 3.3M rows, 1.8 GB (already used in dashboard)
- `DR_ContractSales` - 3.2M rows, 2.2 GB (Xactly compensation data)
- `DR_LeadsWO` - 4.8M rows, 2.5 GB (leads with work orders)

### PestPac Contract Table (W3_Contract_Checker)
- `T0_unf_Contract_All` - 7.9M rows, 6.2 GB (already used in dashboard)

---

## Schema Analysis (Sample Tables)

### Raw_RTXSF_Opportunity_Daily

Run schema query to see columns:
```bash
npx tsx scripts/run-salesforce-discovery.ts --schema
```

Expected columns based on Salesforce Opportunity object:
- `Id` - Salesforce opportunity ID (primary key)
- `Name` - Opportunity name
- `AccountId` - Related account ID
- `Account_Name__c` - Account name (denormalized)
- `StageName` - Current stage (Prospect, Qualified, Proposal, etc.)
- `Amount` - Expected revenue
- `Probability` - Win probability %
- `CloseDate` - Expected close date
- `CreatedDate` - When opportunity was created
- `Owner_Name__c` - Sales rep name
- `IsWon` - Boolean flag for closed won
- `IsClosed` - Boolean flag for closed (won or lost)
- `Brand__c` - Rentokil brand (PCO, Terminix, etc.)
- `Assigned_Business_Unit__c` - Business unit
- `PestPac_Bill_To_Id__c` - Link to PestPac customer ID
- `NextStep` - Next action to take
- `LeadSource` - How lead was generated

### Raw_RTXSF_Quote_Daily

Expected columns:
- `Id` - Salesforce quote ID
- `Name` - Quote number/name
- `OpportunityId` - Related opportunity ID
- `Account_Name__c` - Account name
- `Owner_Name__c` - Sales rep name
- `Servicing_Branch__c` - Branch code
- `Status` - Quote status (Draft, Pending, Approved, Rejected, Won)
- `Total_Price__c` - Total quote amount
- `Date_of_Sale__c` - Sale date
- `Proposal_Delivered_Date__c` - When proposal was sent
- `Direct_Manager_Approved__c` - Approval flag
- `CreatedDate` - When quote was created

### Raw_RTXSF_QuoteLineItem_Daily

Expected columns:
- `Id` - Line item ID
- `QuoteId` - Parent quote ID
- `Product2Id` - Product/service ID
- `Product_Name__c` - Product/service name
- `Quantity` - Quantity
- `UnitPrice` - Unit price
- `TotalPrice` - Line total (Quantity * UnitPrice)
- `Description` - Line item description
- `ServiceType` - Pest control service type

---

## Data Quality Assessment

### Freshness ✅
- All RTXSF tables updated today (2026-01-26 12:30 UTC)
- Daily refresh cadence confirmed
- 0-24 hour lag acceptable for Phase 2A read-only interface

### Completeness
- **Opportunity data**: 196K opportunities (comprehensive)
- **Account data**: 109K accounts (good coverage)
- **Contact data**: 112K contacts (good coverage)
- **Quote data**: 65K quotes, 91K line items (comprehensive)
- **Case data**: 2.9M cases (extensive service history)

### Data Relationships
- **Account → Opportunities**: `AccountId` foreign key
- **Opportunity → Quotes**: `OpportunityId` foreign key
- **Quote → QuoteLineItems**: `QuoteId` foreign key
- **Account → Contacts**: `AccountId` foreign key
- **Account → Cases**: `AccountId` foreign key
- **Account → PestPac**: `PestPac_Bill_To_Id__c` link

### Known Issues
- ⚠️ `Raw_RTXSF_Quote_Line_Equipments__c_Daily` stale (last updated 2025-02-17)
- ⚠️ Duplicate equipment tables (two versions)
- ⚠️ No real-time updates (daily snapshot only)

---

## Recommendations for Phase 2A Integration

### Tier 1: Essential for AE Interface (4 tables)
1. **`Raw_RTXSF_Account_Daily`** - Account search and management
2. **`Raw_RTXSF_Contact_Daily`** - Contact management
3. **`Raw_RTXSF_OpportunityHistory_Daily`** - Stage progression timeline
4. **`Raw_RTXSF_Employee__c_Daily`** - Sales rep directory

**Rationale**: These 4 tables address the core pain points (account search, contact management, pipeline tracking) with minimal implementation effort.

### Tier 2: Enhanced Analytics (2 tables)
5. **`Raw_RTXSF_Lead_Daily`** - Lead funnel tracking
6. **`Raw_RTXSF_Product2_Daily`** - Service catalog

**Rationale**: Adds lead qualification and product/service reference data for comprehensive sales workflow.

### Tier 3: Service Management (2 tables)
7. **`Raw_RTXSF_Case_Daily`** - Service issue tracking
8. **`Raw_RTXSF_Location_Daily`** - Multi-location accounts

**Rationale**: Provides customer health indicators and multi-location account management for enterprise accounts.

---

## Phase 2A Implementation Plan

### Week 1-2: Core Account Management
- Implement queries for Account, Contact, Employee tables
- Build `/ae/accounts` search page
- Build `/ae/accounts/[id]` detail page
- Add contact list to account detail

### Week 3-4: Enhanced Pipeline Tracking
- Implement OpportunityHistory query
- Add stage progression timeline to opportunity detail page
- Add pipeline velocity analytics
- Integrate Lead table for funnel visualization

### Week 5-6: Service Catalog & Testing
- Implement Product2 query for service catalog
- Add service type selector to quote builder (future)
- Comprehensive testing with real data
- Performance optimization and caching

---

## Next Steps

1. ✅ **Discovery Complete** - 73 tables discovered, 8 high-value candidates identified
2. ⏭️ **Schema Documentation** - Run with `--schema` flag to document column details for top 8 tables
3. ⏭️ **Start Phase 2A** - Begin with Tier 1 tables (Account, Contact, OpportunityHistory, Employee)
4. ⏭️ **Create Query Functions** - Implement 15 new BigQuery query functions in `salesforce.ts`
5. ⏭️ **Build UI Pages** - Create `/ae/accounts` pages with search and detail views

---

## Appendix: Full Table List

### RTXSF Tables (17)
```
S0.Raw_RTXSF_Case_Daily                     (2,953,194 rows, 7.2 GB)
S0.Raw_RTXSF_OpportunityHistory_Daily       (458,772 rows, 51 MB)
S0.Raw_RTXSF_Opportunity_Daily              (196,416 rows, 263 MB) ✅
S0.Raw_RTXSF_Contact_Daily                  (112,562 rows, 43 MB) 🎯
S0.Raw_RTXSF_Account_Daily                  (109,074 rows, 57 MB) 🎯
S0.Raw_RTXSF_QuoteLineItem_Daily            (91,336 rows, 1.9 GB) ✅
S0.Raw_RTXSF_Lead_Daily                     (79,207 rows, 51 MB) 🎯
S0.Raw_RTXSF_Opportunity_Location__c_Daily  (76,185 rows, 26 MB)
S0.Raw_RTXSF_Quote_Daily                    (65,148 rows, 51 MB) ✅
S0.Raw_RTXSF_Quote_Line_Equipments__Daily   (38,522 rows, 9 MB)
S0.Raw_RTXSF_AssociatedLocation_Daily       (33,491 rows, 5 MB)
S0.Raw_RTXSF_Location_Daily                 (33,489 rows, 9 MB) 🎯
S0.Raw_RTXSF_Quote_Line_Equipments__c_Daily (12,410 rows, 3 MB)
S0.Raw_RTXSF_Employee__c_Daily              (1,817 rows, 0.3 MB) 🎯
S0.Raw_RTXSF_Business_Unit__c_Daily         (1,417 rows, 0.3 MB)
S0.Raw_RTXSF_Product2_Daily                 (742 rows, 0.3 MB) 🎯
S0.Raw_RTXSF_RecordType_Daily               (15 rows, 0.0 MB)
```

Legend:
- ✅ Already integrated
- 🎯 High-value candidate for Phase 2A

---

**Report Prepared By**: Claude Code
**Review Status**: Ready for stakeholder review
**Next Review Date**: After Phase 2A Week 1 completion
