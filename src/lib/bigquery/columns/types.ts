/**
 * BigQuery Column Registry - Type Definitions
 *
 * Comprehensive TypeScript interfaces for documenting BigQuery columns.
 * Provides type-safe access to column metadata including technical specs,
 * business context, usage patterns, and data governance information.
 *
 * @see /docs/bigquery-integration-status.md for table-level documentation
 * @see /src/lib/data-dictionary.ts for business field definitions
 * @see /src/lib/data-dictionary-bigquery.ts for dataset metadata
 */

/**
 * BigQuery native data types
 * @see https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types
 */
export type BigQueryType =
  | 'STRING'
  | 'INT64'
  | 'FLOAT64'
  | 'NUMERIC'
  | 'BIGNUMERIC'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'TIME'
  | 'TIMESTAMP'
  | 'ARRAY'
  | 'STRUCT' // Also called RECORD
  | 'GEOGRAPHY'
  | 'JSON'

/**
 * Column mode indicating nullability and cardinality
 */
export type ColumnMode = 'NULLABLE' | 'REQUIRED' | 'REPEATED'

/**
 * Data sensitivity classification for access control
 */
export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted'

/**
 * Business domain categories
 */
export type BusinessDomain =
  | 'sales'
  | 'finance'
  | 'operations'
  | 'hr'
  | 'customer'
  | 'product'
  | 'geography'
  | 'service'

/**
 * Enum value definition with display label and description
 */
export interface EnumValue {
  value: string
  label: string
  description?: string
}

/**
 * Comprehensive column metadata
 * Contains all information needed to understand and use a BigQuery column
 */
export interface ColumnMetadata {
  // === Identity ===
  columnName: string // Exact BigQuery column name (case-sensitive)
  displayName: string // Human-readable name for UI
  aliases?: string[] // Alternative names used historically

  // === Technical Schema ===
  bigQueryType: BigQueryType
  nullable: boolean
  mode?: ColumnMode // Defaults to NULLABLE if not specified
  precision?: number // For NUMERIC/BIGNUMERIC
  scale?: number // For NUMERIC/BIGNUMERIC
  maxLength?: number // For STRING

  // === Business Context ===
  description: string // What this column represents (1-2 sentences)
  businessPurpose: string // Why it exists, business use case
  businessOwner: string // Team or role responsible
  steward?: string // Individual data steward
  domain?: BusinessDomain

  // === Usage Patterns ===
  commonFilters?: string[] // WHERE clause examples
  joinKeys?: string[] // Tables commonly joined via this column
  aggregationExamples?: string[] // SUM, COUNT, AVG, etc. with SQL
  calculationFormulas?: string[] // Derived metrics using this column

  // === Data Quality ===
  sampleValues?: string[] // 3-5 example values (sanitized)
  valueFormat?: string // Format pattern or regex
  validationRules?: string[] // Business rules for valid data
  enumValues?: EnumValue[] // For categorical/status columns
  typicalRange?: { min?: number; max?: number } // For numeric columns

  // === Data Governance ===
  sensitivity: DataSensitivity // Access control classification
  piiFlag: boolean // Contains personally identifiable info
  encryptionRequired?: boolean
  retentionPolicy?: string // How long data is kept

  // === Lineage & References ===
  relatedBusinessField?: string // fieldId from data-dictionary.ts
  sourceSystem?: string // Origin system (Salesforce, PestPac, etc.)
  sourceFieldName?: string // Original name in source system
  transformationApplied?: string // ETL transformation logic

  // === Lifecycle ===
  deprecated?: boolean
  deprecatedDate?: string // ISO date
  replacedBy?: string // Replacement column reference
  notes?: string // Additional context, caveats
  lastVerified?: string // ISO date of last schema verification
}

/**
 * Table-level column collection
 */
export interface TableColumns {
  datasetId: string
  tableId: string
  tableName: string // Human-readable table name
  description?: string // Table purpose (brief)
  columns: Record<string, ColumnMetadata> // Keyed by columnName
}

/**
 * Dataset-level column collection
 */
export interface DatasetColumns {
  datasetId: string
  tables: Record<string, TableColumns> // Keyed by tableId
}

/**
 * Column lookup result with full context
 */
export interface ColumnLookupResult {
  dataset: string
  table: string
  column: ColumnMetadata
}

/**
 * Table documentation coverage summary
 */
export interface TableColumnSummary {
  datasetId: string
  tableId: string
  totalColumns: number // From actual BigQuery schema
  documentedColumns: number // From column registry
  coveragePercent: number // (documented / total) * 100
  missingColumns: string[] // Columns in schema but not documented
}

/**
 * Column usage example from query files
 */
export interface ColumnUsageExample {
  queryName: string // Registered query name
  filePath: string // Query file path
  sqlSnippet: string // Example SQL using the column
  context: string // Explanation of usage
}
