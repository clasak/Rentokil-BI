# BigQuery Column Registry

Comprehensive column-level documentation for BigQuery tables used in the Rentokil BI platform.

## Overview

This directory contains detailed metadata for 50+ BigQuery columns across the most frequently-queried tables. Each column is documented with:

- **Technical specs**: Data type, nullability, precision
- **Business context**: Purpose, ownership, domain
- **Usage patterns**: Common filters, joins, aggregations
- **Data quality**: Sample values, validation rules, enum options
- **Governance**: PII flags, sensitivity classification
- **Lineage**: Source systems, transformations

## Quick Start

```typescript
import { getColumnMetadata, searchColumns, getTableColumns } from '@/lib/bigquery/columns'

// Get specific column metadata
const sellDate = getColumnMetadata('W3_Contract_Checker', 'T0_unf_Contract_All', 'SellDate')
console.log(sellDate?.description)
// "Date when the contract was sold/closed"

console.log(sellDate?.commonFilters)
// ["SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)", ...]

// Search for all date columns
const dateCols = searchColumns('date')

// Get all columns for a table
const contractTable = getTableColumns('W3_Contract_Checker', 'T0_unf_Contract_All')
console.log(Object.keys(contractTable.columns))
// ["SellDate", "StartDate", "ContractValue", ...]
```

## Documented Tables

| Priority | Dataset | Table | Columns | Status |
|----------|---------|-------|---------|--------|
| 1 | W3_Contract_Checker | T0_unf_Contract_All | 18 | ✅ Complete |
| 2 | S4 | Fact_Leads_Acc_Daily_Dtls_Snp | 17 | ✅ Complete |
| 3 | S0_TMX | tmx_lead | 17 | ✅ Complete |
| 4 | Reports | VwUnf_dim_ar_detail | 12 | ✅ Complete |
| 5 | S2 | VwUnf_Branch | 10 | ✅ Complete |
| 6 | BCG_RTD_DB | DR_ContractSales | 12 | ✅ Complete |
| 7 | BCG_RTD_DB | DR_Leads | 9 | ✅ Complete |
| 8 | S0 | raw_RNA_PNIDetails_Daily | 10 | ✅ Complete |
| 9 | S0_TMX | Inspections | 8 | ✅ Complete |

**Current Coverage**: 113 columns across 9 tables ✅ **PHASE 1 COMPLETE**

## File Structure

```
src/lib/bigquery/columns/
├── types.ts                    # TypeScript interfaces (ColumnMetadata, TableColumns, etc.)
├── index.ts                    # Utility functions & registry
├── w3-contract-columns.ts      # Contract Checker sales data
├── s4-columns.ts               # S4 leads funnel
├── s0-tmx-columns.ts           # TMX lead pipeline
└── README.md                   # This file
```

## Column Metadata Structure

Each column includes comprehensive metadata:

```typescript
interface ColumnMetadata {
  // Identity
  columnName: string              // Exact BigQuery name
  displayName: string             // Human-readable label
  aliases?: string[]              // Historical/alternative names

  // Technical Schema
  bigQueryType: BigQueryType      // STRING, INT64, DATE, TIMESTAMP, etc.
  nullable: boolean
  mode?: ColumnMode               // NULLABLE, REQUIRED, REPEATED
  precision?: number              // For NUMERIC types
  maxLength?: number              // For STRING types

  // Business Context
  description: string             // What the column represents
  businessPurpose: string         // Why it exists
  businessOwner: string           // Team responsible
  domain?: BusinessDomain         // sales, finance, operations, etc.

  // Usage Patterns
  commonFilters?: string[]        // WHERE clause examples
  joinKeys?: string[]             // JOIN patterns
  aggregationExamples?: string[]  // SUM, COUNT, AVG examples
  calculationFormulas?: string[]  // Derived metrics

  // Data Quality
  sampleValues?: string[]         // Example values (sanitized)
  valueFormat?: string            // Format pattern
  validationRules?: string[]      // Business rules
  enumValues?: EnumValue[]        // For categorical columns
  typicalRange?: { min, max }     // For numeric columns

  // Data Governance
  sensitivity: DataSensitivity    // public, internal, confidential, restricted
  piiFlag: boolean                // Contains PII?
  encryptionRequired?: boolean
  retentionPolicy?: string

  // Lineage
  relatedBusinessField?: string   // Link to data-dictionary.ts
  sourceSystem?: string           // Origin system
  sourceFieldName?: string        // Original column name
  transformationApplied?: string  // ETL logic

  // Lifecycle
  deprecated?: boolean
  deprecatedDate?: string
  replacedBy?: string
  notes?: string
  lastVerified?: string           // ISO date
}
```

## Utility Functions

### Core Lookups

```typescript
// Get column metadata
getColumnMetadata(dataset: string, table: string, column: string): ColumnMetadata | undefined

// Get all columns for a table
getTableColumns(dataset: string, table: string): TableColumns | undefined

// Get all tables for a dataset
getDatasetColumns(dataset: string): DatasetColumns | undefined
```

### Search & Discovery

```typescript
// Search across all columns
searchColumns(query: string, options?: { dataset?, table? }): ColumnLookupResult[]

// Find columns by business field
getColumnsByBusinessField(fieldId: string): ColumnLookupResult[]

// Find deprecated columns
getDeprecatedColumns(): ColumnLookupResult[]
```

### Validation

```typescript
// Validate column exists
validateColumnExists(dataset: string, table: string, column: string): boolean

// Get documented datasets
getDocumentedDatasets(): string[]

// Get documented tables for a dataset
getDocumentedTables(dataset: string): string[]

// Get registry statistics
getRegistrySummary(): { totalDatasets, totalTables, totalColumns }
```

## Adding New Tables

To document a new table:

1. **Create table file** (e.g., `my-dataset-columns.ts`):

```typescript
import type { TableColumns } from './types'
import { registerTable } from './index'

export const MY_TABLE: TableColumns = {
  datasetId: 'MyDataset',
  tableId: 'my_table',
  tableName: 'My Table Name',
  description: 'Brief table description',

  columns: {
    my_column: {
      columnName: 'my_column',
      displayName: 'My Column',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Column description',
      businessPurpose: 'Why this column exists',
      businessOwner: 'Team Name',
      // ... additional metadata
      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
    // ... more columns
  },
}

registerTable(MY_TABLE)
export default MY_TABLE
```

2. **Import in index.ts**:

```typescript
import './my-dataset-columns' // MyDataset.my_table
```

3. **Verify**: Use `getTableColumns('MyDataset', 'my_table')` to test

## Best Practices

### Documentation Quality

- **Be specific**: "Date when contract was sold" > "Sale date"
- **Include context**: Explain business rules, not just technical facts
- **Add examples**: Provide real SQL patterns from actual queries
- **Keep current**: Update `lastVerified` when reviewing/updating

### Sample Values

- **Sanitize PII**: Never include real customer names, emails, phone numbers
- **Show variety**: Include different data types/patterns
- **Mark NULL**: Explicitly show when NULL is expected

### Enum Values

For categorical columns, always include enum definitions:

```typescript
enumValues: [
  { value: 'Y', label: 'Yes', description: 'Service has been installed' },
  { value: 'N', label: 'No', description: 'Sold but not yet installed' },
]
```

### Common Filters

Include actual SQL patterns from queries:

```typescript
commonFilters: [
  "SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)",
  "SellDate = CURRENT_DATE('America/New_York')",
]
```

## Related Documentation

- **Dataset metadata**: `/src/lib/data-dictionary-bigquery.ts` - High-level dataset info
- **Business fields**: `/src/lib/data-dictionary.ts` - Business concept definitions
- **Query modules**: `/src/lib/bigquery/queries/*.ts` - SQL query implementations
- **Integration status**: `/docs/bigquery-integration-status.md` - Table/page mapping

## Validation

Run validation scripts to ensure accuracy:

```bash
# Compare docs vs actual BigQuery schema
npm run validate-columns

# Find undocumented columns in queries
npm run analyze-column-usage
```

## Support

For questions or issues:
1. Check existing column documentation in this directory
2. Review query files in `/src/lib/bigquery/queries/`
3. Consult CLAUDE.md for integration patterns
