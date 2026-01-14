/**
 * Data Dictionary & Governance Catalog
 *
 * Comprehensive field-level documentation for all data sources feeding the BI platform.
 * This serves as the single source of truth for data definitions, business rules,
 * transformation logic, and governance ownership.
 *
 * Sources:
 * - RTX Data Hub (primary enterprise data warehouse)
 * - Salesforce (CRM - opportunities, accounts, contacts)
 * - PestPac (Field Service - routes, service events, equipment)
 * - Start Packet PDFs (manual field data - contract details)
 * - Calculated (derived metrics computed in-app)
 */

export type DataSource =
  | 'rtx_data_hub'
  | 'salesforce'
  | 'pestpac'
  | 'start_packet_pdf'
  | 'calculated'
  | 'workday'
  | 'sap';

export type DataType =
  | 'string'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'enum'
  | 'array'
  | 'percentage';

export type DataQualitySeverity = 'critical' | 'warning' | 'info';

export type GovernanceStatus = 'approved' | 'pending_review' | 'deprecated' | 'draft';

export interface TransformationRule {
  sourceSystem: DataSource;
  sourceField: string;
  transformationType: 'direct_map' | 'lookup' | 'calculated' | 'concatenated' | 'parsed' | 'aggregated';
  transformationLogic: string;
  exampleInput?: string;
  exampleOutput?: string;
}

export interface DataQualityRule {
  ruleId: string;
  ruleName: string;
  ruleType: 'required' | 'range' | 'enum' | 'format' | 'referential' | 'uniqueness' | 'freshness' | 'consistency';
  severity: DataQualitySeverity;
  description: string;
  validationLogic: string;
  failureMessage: string;
  remediation: string;
}

export interface FieldDefinition {
  // Core Identity
  fieldId: string;
  fieldName: string;
  displayName: string;

  // Classification
  domain: 'account' | 'opportunity' | 'service' | 'invoice' | 'user' | 'route' | 'equipment' | 'contract' | 'kpi' | 'geography';
  category: 'identifier' | 'attribute' | 'metric' | 'dimension' | 'timestamp' | 'status' | 'relationship';

  // Technical Details
  dataType: DataType;
  format?: string; // e.g., "YYYY-MM-DD", "###-###-####", "$#,###.##"
  length?: number;
  precision?: number;
  nullable: boolean;
  defaultValue?: string | number | boolean;

  // Business Definition
  definition: string;
  businessContext: string;
  validValues?: string[] | { value: string; label: string; description?: string }[];
  valueRanges?: { min?: number; max?: number; typical?: string };

  // Source & Lineage
  primarySource: DataSource;
  secondarySources?: DataSource[];
  sourceFieldName: string; // Original field name in source system
  transformations: TransformationRule[];

  // Governance
  governanceOwner: string;
  steward: string;
  governanceStatus: GovernanceStatus;
  lastReviewedDate: string;
  nextReviewDate: string;
  changeHistory?: { date: string; change: string; changedBy: string }[];

  // Relationships
  kpisUsing: string[]; // KPI slugs that use this field
  relatedFields: string[]; // Other field IDs that relate to this

  // Quality
  dataQualityRules: DataQualityRule[];
  currentQualityScore?: number; // 0-100

  // Usage
  accessLevel: 'public' | 'internal' | 'restricted' | 'pii';
  usageNotes?: string;
  commonFilters?: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  version: string;
  tags: string[];
}

// =============================================================================
// ACCOUNT DOMAIN FIELDS
// =============================================================================

const accountFields: FieldDefinition[] = [
  {
    fieldId: 'ACC_ID',
    fieldName: 'account_id',
    displayName: 'Account ID',
    domain: 'account',
    category: 'identifier',
    dataType: 'string',
    format: 'ACC-XXXXXX',
    length: 10,
    nullable: false,
    definition: 'Unique identifier for each customer account in the Rentokil system.',
    businessContext: 'Primary key used across all systems to link customer data. Generated when a new customer is onboarded.',
    primarySource: 'rtx_data_hub',
    sourceFieldName: 'CUST_ACCT_ID',
    transformations: [
      {
        sourceSystem: 'rtx_data_hub',
        sourceField: 'CUST_ACCT_ID',
        transformationType: 'direct_map',
        transformationLogic: "Prefix 'ACC-' + padded numeric ID",
        exampleInput: '123456',
        exampleOutput: 'ACC-123456'
      },
      {
        sourceSystem: 'salesforce',
        sourceField: 'Account.ExternalId__c',
        transformationType: 'direct_map',
        transformationLogic: 'Direct mapping from Salesforce external ID field',
        exampleInput: 'ACC-123456',
        exampleOutput: 'ACC-123456'
      }
    ],
    governanceOwner: 'Data Platform Team',
    steward: 'Jason Lee',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-15',
    nextReviewDate: '2025-05-15',
    kpisUsing: ['revenue_mtd', 'nrr', 'retention_risk', 'ar_aging'],
    relatedFields: ['ACC_NAME', 'ACC_BRANCH_ID', 'ACC_OWNER_ID'],
    dataQualityRules: [
      {
        ruleId: 'ACC_ID_001',
        ruleName: 'Account ID Required',
        ruleType: 'required',
        severity: 'critical',
        description: 'Account ID must be present for all records',
        validationLogic: 'account_id IS NOT NULL AND account_id != ""',
        failureMessage: 'Missing Account ID',
        remediation: 'Contact Data Platform team to assign Account ID'
      },
      {
        ruleId: 'ACC_ID_002',
        ruleName: 'Account ID Format',
        ruleType: 'format',
        severity: 'critical',
        description: 'Account ID must follow ACC-XXXXXX format',
        validationLogic: "REGEX_MATCH(account_id, '^ACC-[0-9]{6}$')",
        failureMessage: 'Invalid Account ID format',
        remediation: 'Correct the Account ID to follow ACC-XXXXXX format'
      },
      {
        ruleId: 'ACC_ID_003',
        ruleName: 'Account ID Uniqueness',
        ruleType: 'uniqueness',
        severity: 'critical',
        description: 'Account ID must be unique across all accounts',
        validationLogic: 'COUNT(DISTINCT account_id) = COUNT(*)',
        failureMessage: 'Duplicate Account ID found',
        remediation: 'Merge duplicate accounts or correct ID assignment'
      }
    ],
    accessLevel: 'internal',
    usageNotes: 'Use this field as the primary join key when linking account data across systems.',
    commonFilters: ['branch_id', 'market_id', 'vertical'],
    createdAt: '2024-01-01',
    updatedAt: '2024-11-15',
    version: '2.1',
    tags: ['core', 'identifier', 'account', 'master-data']
  },
  {
    fieldId: 'ACC_NAME',
    fieldName: 'account_name',
    displayName: 'Account Name',
    domain: 'account',
    category: 'attribute',
    dataType: 'string',
    length: 255,
    nullable: false,
    definition: 'Official business name of the customer account.',
    businessContext: 'The legal or trading name of the customer. For commercial accounts, this is the company name. For residential, it may be the property name or homeowner name.',
    primarySource: 'salesforce',
    secondarySources: ['rtx_data_hub', 'start_packet_pdf'],
    sourceFieldName: 'Account.Name',
    transformations: [
      {
        sourceSystem: 'salesforce',
        sourceField: 'Account.Name',
        transformationType: 'direct_map',
        transformationLogic: 'Direct mapping, trimmed and title-cased',
        exampleInput: 'acme corporation',
        exampleOutput: 'Acme Corporation'
      },
      {
        sourceSystem: 'start_packet_pdf',
        sourceField: 'Customer Name',
        transformationType: 'parsed',
        transformationLogic: 'OCR extraction from PDF header section, cleaned and validated',
        exampleInput: 'ACME CORP.',
        exampleOutput: 'Acme Corp.'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'Regional Sales Directors',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-10-01',
    nextReviewDate: '2025-04-01',
    kpisUsing: ['pipeline_30_60_90', 'win_rate'],
    relatedFields: ['ACC_ID', 'ACC_VERTICAL', 'ACC_CONTRACT_VALUE'],
    dataQualityRules: [
      {
        ruleId: 'ACC_NAME_001',
        ruleName: 'Account Name Required',
        ruleType: 'required',
        severity: 'critical',
        description: 'Account name must be present',
        validationLogic: 'account_name IS NOT NULL AND LENGTH(TRIM(account_name)) > 0',
        failureMessage: 'Missing Account Name',
        remediation: 'Enter the customer business name from contract documents'
      },
      {
        ruleId: 'ACC_NAME_002',
        ruleName: 'Account Name Length',
        ruleType: 'range',
        severity: 'warning',
        description: 'Account name should be between 2 and 255 characters',
        validationLogic: 'LENGTH(account_name) BETWEEN 2 AND 255',
        failureMessage: 'Account name length out of expected range',
        remediation: 'Review and correct account name to reasonable length'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-15',
    version: '1.3',
    tags: ['core', 'account', 'display']
  },
  {
    fieldId: 'ACC_VERTICAL',
    fieldName: 'vertical',
    displayName: 'Business Vertical',
    domain: 'account',
    category: 'dimension',
    dataType: 'enum',
    nullable: false,
    definition: 'Industry classification of the customer account.',
    businessContext: 'Used for segmentation, pricing strategies, and specialized service offerings. Commercial accounts have different service requirements than residential.',
    validValues: [
      { value: 'Commercial', label: 'Commercial', description: 'Business and office locations' },
      { value: 'Residential', label: 'Residential', description: 'Home and apartment customers' },
      { value: 'Government', label: 'Government', description: 'Federal, state, and local government facilities' },
      { value: 'Healthcare', label: 'Healthcare', description: 'Hospitals, clinics, and medical facilities' },
      { value: 'Food Service', label: 'Food Service', description: 'Restaurants, food processing, and hospitality' }
    ],
    primarySource: 'salesforce',
    secondarySources: ['rtx_data_hub'],
    sourceFieldName: 'Account.Industry__c',
    transformations: [
      {
        sourceSystem: 'salesforce',
        sourceField: 'Account.Industry__c',
        transformationType: 'lookup',
        transformationLogic: 'Map Salesforce industry picklist to standard verticals. Unknown values default to Commercial.',
        exampleInput: 'Manufacturing',
        exampleOutput: 'Commercial'
      }
    ],
    governanceOwner: 'Marketing Analytics',
    steward: 'Susan Chen',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-08-01',
    nextReviewDate: '2025-02-01',
    kpisUsing: ['revenue_mtd', 'margin_proxy', 'retention_risk'],
    relatedFields: ['ACC_ID', 'ACC_CONTRACT_VALUE'],
    dataQualityRules: [
      {
        ruleId: 'ACC_VERT_001',
        ruleName: 'Valid Vertical Value',
        ruleType: 'enum',
        severity: 'critical',
        description: 'Vertical must be one of the approved values',
        validationLogic: "vertical IN ('Commercial', 'Residential', 'Government', 'Healthcare', 'Food Service')",
        failureMessage: 'Invalid vertical classification',
        remediation: 'Update vertical to one of: Commercial, Residential, Government, Healthcare, Food Service'
      }
    ],
    accessLevel: 'public',
    commonFilters: ['market_id', 'branch_id'],
    createdAt: '2024-01-01',
    updatedAt: '2024-08-01',
    version: '1.2',
    tags: ['segmentation', 'account', 'dimension']
  },
  {
    fieldId: 'ACC_CONTRACT_VALUE',
    fieldName: 'contract_value',
    displayName: 'Annual Contract Value',
    domain: 'account',
    category: 'metric',
    dataType: 'currency',
    format: '$#,###.##',
    precision: 2,
    nullable: false,
    defaultValue: 0,
    definition: 'Total annual recurring revenue expected from the customer contract.',
    businessContext: 'Represents the annualized value of the service agreement. Used for revenue forecasting, customer segmentation, and retention prioritization. Includes all recurring service fees but excludes one-time charges.',
    valueRanges: { min: 0, max: 10000000, typical: '$500 - $50,000 for commercial, $200 - $2,000 for residential' },
    primarySource: 'rtx_data_hub',
    secondarySources: ['salesforce', 'start_packet_pdf'],
    sourceFieldName: 'CONTRACT_ACV',
    transformations: [
      {
        sourceSystem: 'rtx_data_hub',
        sourceField: 'CONTRACT_ACV',
        transformationType: 'direct_map',
        transformationLogic: 'Direct mapping, rounded to 2 decimal places',
        exampleInput: '12500.456',
        exampleOutput: '12500.46'
      },
      {
        sourceSystem: 'start_packet_pdf',
        sourceField: 'Monthly Contract Amount',
        transformationType: 'calculated',
        transformationLogic: 'Monthly Amount * 12 months = Annual Contract Value',
        exampleInput: '$1,041.67/month',
        exampleOutput: '$12,500.04'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'CFO Office',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-12-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: ['revenue_mtd', 'variance_to_target_mtd', 'forecast_revenue_8w', 'nrr', 'margin_proxy'],
    relatedFields: ['ACC_ID', 'ACC_SERVICE_FREQUENCY'],
    dataQualityRules: [
      {
        ruleId: 'ACC_CV_001',
        ruleName: 'Contract Value Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'Contract value cannot be negative',
        validationLogic: 'contract_value >= 0',
        failureMessage: 'Negative contract value detected',
        remediation: 'Review contract terms and correct to positive value'
      },
      {
        ruleId: 'ACC_CV_002',
        ruleName: 'Contract Value Reasonableness',
        ruleType: 'range',
        severity: 'warning',
        description: 'Contract value should be within expected range for the vertical',
        validationLogic: "CASE WHEN vertical = 'Residential' THEN contract_value <= 10000 ELSE contract_value <= 1000000 END",
        failureMessage: 'Contract value outside expected range',
        remediation: 'Verify contract value is correct for the customer type'
      },
      {
        ruleId: 'ACC_CV_003',
        ruleName: 'RTX vs Salesforce Variance',
        ruleType: 'consistency',
        severity: 'warning',
        description: 'Contract value should match within 5% between RTX and Salesforce',
        validationLogic: 'ABS(rtx_contract_value - sf_contract_value) / rtx_contract_value <= 0.05',
        failureMessage: 'Contract value variance > 5% between RTX and Salesforce',
        remediation: 'Reconcile contract values between systems and update source of truth'
      }
    ],
    accessLevel: 'restricted',
    usageNotes: 'Primary metric for revenue forecasting. Always use RTX Data Hub as source of truth.',
    commonFilters: ['vertical', 'branch_id', 'market_id'],
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01',
    version: '2.0',
    tags: ['revenue', 'contract', 'metric', 'core', 'financial']
  },
  {
    fieldId: 'ACC_RETENTION_RISK',
    fieldName: 'retention_risk',
    displayName: 'Retention Risk Score',
    domain: 'account',
    category: 'metric',
    dataType: 'enum',
    nullable: false,
    defaultValue: 'low',
    definition: 'Predictive score indicating the likelihood of customer churn.',
    businessContext: 'ML-driven risk score combining service quality metrics, payment history, complaint frequency, and engagement signals. Used to prioritize retention outreach and allocate resources.',
    validValues: [
      { value: 'low', label: 'Low Risk', description: 'Healthy customer with strong engagement' },
      { value: 'medium', label: 'Medium Risk', description: 'Some warning signals present' },
      { value: 'high', label: 'High Risk', description: 'Immediate attention required' }
    ],
    primarySource: 'calculated',
    secondarySources: ['rtx_data_hub'],
    sourceFieldName: 'N/A - Calculated Field',
    transformations: [
      {
        sourceSystem: 'calculated',
        sourceField: 'Multiple',
        transformationType: 'calculated',
        transformationLogic: `
Risk Score =
  (callback_rate * 0.25) +
  (missed_service_rate * 0.25) +
  (ar_aging_bucket >= 60 ? 0.20 : 0) +
  (complaint_count_90d * 0.15) +
  (days_since_last_service > 45 ? 0.15 : 0)

Classification:
  score < 0.3 = low
  score 0.3-0.6 = medium
  score > 0.6 = high`,
        exampleInput: 'callback_rate=0.02, missed=0.01, ar_aging=30, complaints=0, days_since=10',
        exampleOutput: 'low'
      }
    ],
    governanceOwner: 'Customer Success',
    steward: 'Retention Team Lead',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-01',
    nextReviewDate: '2025-02-01',
    kpisUsing: ['retention_risk', 'nrr'],
    relatedFields: ['ACC_ID', 'ACC_CALLBACK_RATE', 'ACC_AR_BALANCE', 'ACC_COMPLAINTS'],
    dataQualityRules: [
      {
        ruleId: 'ACC_RR_001',
        ruleName: 'Valid Risk Level',
        ruleType: 'enum',
        severity: 'critical',
        description: 'Retention risk must be low, medium, or high',
        validationLogic: "retention_risk IN ('low', 'medium', 'high')",
        failureMessage: 'Invalid retention risk value',
        remediation: 'Recalculate retention risk score'
      },
      {
        ruleId: 'ACC_RR_002',
        ruleName: 'Risk Score Freshness',
        ruleType: 'freshness',
        severity: 'warning',
        description: 'Retention risk should be recalculated at least weekly',
        validationLogic: 'DATEDIFF(NOW(), risk_calculated_date) <= 7',
        failureMessage: 'Stale retention risk score',
        remediation: 'Trigger retention risk recalculation job'
      }
    ],
    accessLevel: 'internal',
    usageNotes: 'Score is recalculated nightly. High-risk accounts should be prioritized for manager review.',
    createdAt: '2024-03-01',
    updatedAt: '2024-11-01',
    version: '1.5',
    tags: ['risk', 'retention', 'ml-derived', 'metric']
  },
  {
    fieldId: 'ACC_AR_BALANCE',
    fieldName: 'ar_balance',
    displayName: 'AR Balance',
    domain: 'account',
    category: 'metric',
    dataType: 'currency',
    format: '$#,###.##',
    precision: 2,
    nullable: false,
    defaultValue: 0,
    definition: 'Current accounts receivable balance owed by the customer.',
    businessContext: 'Total outstanding invoices not yet collected. Key indicator for cash flow management and customer credit risk assessment.',
    valueRanges: { min: 0, max: 1000000, typical: '$0 - $10,000 for most accounts' },
    primarySource: 'sap',
    secondarySources: ['rtx_data_hub'],
    sourceFieldName: 'CUST_AR_BAL',
    transformations: [
      {
        sourceSystem: 'sap',
        sourceField: 'CUST_AR_BAL',
        transformationType: 'direct_map',
        transformationLogic: 'Sum of all open invoices for the customer',
        exampleInput: '2500.00',
        exampleOutput: '$2,500.00'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'AR Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-10-15',
    nextReviewDate: '2025-04-15',
    kpisUsing: ['ar_aging', 'dso'],
    relatedFields: ['ACC_ID', 'INV_STATUS', 'INV_AGING_BUCKET'],
    dataQualityRules: [
      {
        ruleId: 'ACC_AR_001',
        ruleName: 'AR Balance Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'AR balance cannot be negative (credits should be separate)',
        validationLogic: 'ar_balance >= 0',
        failureMessage: 'Negative AR balance detected',
        remediation: 'Reclassify credits or correct balance'
      }
    ],
    accessLevel: 'restricted',
    commonFilters: ['aging_bucket', 'branch_id'],
    createdAt: '2024-01-01',
    updatedAt: '2024-10-15',
    version: '1.1',
    tags: ['financial', 'ar', 'metric']
  },
  {
    fieldId: 'ACC_SERVICE_FREQ',
    fieldName: 'service_frequency',
    displayName: 'Service Frequency',
    domain: 'account',
    category: 'attribute',
    dataType: 'enum',
    nullable: false,
    definition: 'Contracted frequency of pest control service visits.',
    businessContext: 'Determines scheduling patterns, technician routing, and billing cycles. Higher frequency typically correlates with larger commercial accounts.',
    validValues: [
      { value: 'weekly', label: 'Weekly', description: '52 visits per year' },
      { value: 'bi-weekly', label: 'Bi-Weekly', description: '26 visits per year' },
      { value: 'monthly', label: 'Monthly', description: '12 visits per year' },
      { value: 'quarterly', label: 'Quarterly', description: '4 visits per year' },
      { value: 'on-demand', label: 'On-Demand', description: 'As-needed basis' }
    ],
    primarySource: 'pestpac',
    secondarySources: ['start_packet_pdf'],
    sourceFieldName: 'SVC_FREQ_CD',
    transformations: [
      {
        sourceSystem: 'pestpac',
        sourceField: 'SVC_FREQ_CD',
        transformationType: 'lookup',
        transformationLogic: 'Map frequency codes: W=weekly, B=bi-weekly, M=monthly, Q=quarterly, O=on-demand',
        exampleInput: 'M',
        exampleOutput: 'monthly'
      },
      {
        sourceSystem: 'start_packet_pdf',
        sourceField: 'Service Schedule',
        transformationType: 'parsed',
        transformationLogic: 'Extract frequency from schedule description via pattern matching',
        exampleInput: 'Monthly Service - 2nd Tuesday',
        exampleOutput: 'monthly'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Scheduling Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-09-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: ['capacity_utilization', 'scheduling_pressure_index'],
    relatedFields: ['ACC_ID', 'ACC_CONTRACT_VALUE', 'SVC_SCHEDULED_DATE'],
    dataQualityRules: [
      {
        ruleId: 'ACC_SF_001',
        ruleName: 'Valid Frequency Value',
        ruleType: 'enum',
        severity: 'critical',
        description: 'Service frequency must be a valid option',
        validationLogic: "service_frequency IN ('weekly', 'bi-weekly', 'monthly', 'quarterly', 'on-demand')",
        failureMessage: 'Invalid service frequency',
        remediation: 'Update frequency to valid value based on contract'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-01',
    version: '1.0',
    tags: ['service', 'scheduling', 'attribute']
  },
  {
    fieldId: 'ACC_BRANCH_ID',
    fieldName: 'branch_id',
    displayName: 'Branch ID',
    domain: 'account',
    category: 'relationship',
    dataType: 'string',
    format: 'BR-XXX',
    nullable: false,
    definition: 'Identifier of the branch responsible for servicing this account.',
    businessContext: 'Determines which local branch handles service delivery, billing inquiries, and customer relationships. Used for P&L attribution and performance reporting.',
    primarySource: 'rtx_data_hub',
    secondarySources: ['pestpac'],
    sourceFieldName: 'SVC_BRANCH_ID',
    transformations: [
      {
        sourceSystem: 'rtx_data_hub',
        sourceField: 'SVC_BRANCH_ID',
        transformationType: 'direct_map',
        transformationLogic: "Prefix 'BR-' + 3-digit branch code",
        exampleInput: '042',
        exampleOutput: 'BR-042'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Regional Directors',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-07-01',
    nextReviewDate: '2025-01-01',
    kpisUsing: ['revenue_mtd', 'service_risk_index', 'capacity_utilization'],
    relatedFields: ['ACC_ID', 'ACC_MARKET_ID', 'ACC_REGION_ID'],
    dataQualityRules: [
      {
        ruleId: 'ACC_BR_001',
        ruleName: 'Valid Branch Reference',
        ruleType: 'referential',
        severity: 'critical',
        description: 'Branch ID must exist in the branch master table',
        validationLogic: 'branch_id IN (SELECT branch_id FROM branches)',
        failureMessage: 'Invalid branch ID reference',
        remediation: 'Assign account to valid branch'
      }
    ],
    accessLevel: 'internal',
    commonFilters: ['region_id', 'market_id'],
    createdAt: '2024-01-01',
    updatedAt: '2024-07-01',
    version: '1.0',
    tags: ['geography', 'relationship', 'core']
  }
];

// =============================================================================
// OPPORTUNITY DOMAIN FIELDS
// =============================================================================

const opportunityFields: FieldDefinition[] = [
  {
    fieldId: 'OPP_ID',
    fieldName: 'opportunity_id',
    displayName: 'Opportunity ID',
    domain: 'opportunity',
    category: 'identifier',
    dataType: 'string',
    format: 'OPP-XXXXXX',
    nullable: false,
    definition: 'Unique identifier for each sales opportunity.',
    businessContext: 'Primary key for tracking sales pipeline from initial contact through close. Created when a qualified lead is converted.',
    primarySource: 'salesforce',
    sourceFieldName: 'Opportunity.Id',
    transformations: [
      {
        sourceSystem: 'salesforce',
        sourceField: 'Opportunity.Id',
        transformationType: 'direct_map',
        transformationLogic: "Salesforce 18-character ID mapped to 'OPP-' prefix format",
        exampleInput: '0061234567890ABCDEF',
        exampleOutput: 'OPP-123456'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'CRM Admin',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-01',
    nextReviewDate: '2025-05-01',
    kpisUsing: ['pipeline_30_60_90', 'win_rate', 'avg_cycle_time_days', 'stalled_opps'],
    relatedFields: ['OPP_ACCOUNT_ID', 'OPP_STAGE', 'OPP_AMOUNT'],
    dataQualityRules: [
      {
        ruleId: 'OPP_ID_001',
        ruleName: 'Opportunity ID Required',
        ruleType: 'required',
        severity: 'critical',
        description: 'Opportunity ID must be present',
        validationLogic: 'opportunity_id IS NOT NULL',
        failureMessage: 'Missing Opportunity ID',
        remediation: 'Sync from Salesforce to obtain ID'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-11-01',
    version: '1.0',
    tags: ['sales', 'identifier', 'core']
  },
  {
    fieldId: 'OPP_STAGE',
    fieldName: 'stage',
    displayName: 'Opportunity Stage',
    domain: 'opportunity',
    category: 'status',
    dataType: 'enum',
    nullable: false,
    definition: 'Current stage of the opportunity in the sales process.',
    businessContext: 'Tracks deal progression through the sales funnel. Each stage has associated probability and expected actions. Used for pipeline reporting and forecasting.',
    validValues: [
      { value: 'prospect', label: 'Prospect', description: 'Initial contact, needs qualification (10% probability)' },
      { value: 'qualified', label: 'Qualified', description: 'Budget, authority, need confirmed (25% probability)' },
      { value: 'proposal', label: 'Proposal', description: 'Formal proposal submitted (50% probability)' },
      { value: 'negotiation', label: 'Negotiation', description: 'Terms being finalized (75% probability)' },
      { value: 'closed_won', label: 'Closed Won', description: 'Deal won, contract signed (100% probability)' },
      { value: 'closed_lost', label: 'Closed Lost', description: 'Deal lost, opportunity ended (0% probability)' }
    ],
    primarySource: 'salesforce',
    sourceFieldName: 'Opportunity.StageName',
    transformations: [
      {
        sourceSystem: 'salesforce',
        sourceField: 'Opportunity.StageName',
        transformationType: 'lookup',
        transformationLogic: `
Map Salesforce stages to internal stages:
  "Prospecting" → prospect
  "Qualification" → qualified
  "Proposal/Price Quote" → proposal
  "Negotiation/Review" → negotiation
  "Closed Won" → closed_won
  "Closed Lost" → closed_lost`,
        exampleInput: 'Proposal/Price Quote',
        exampleOutput: 'proposal'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'VP Sales',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-10-01',
    nextReviewDate: '2025-04-01',
    kpisUsing: ['pipeline_30_60_90', 'win_rate', 'crm_hygiene_score'],
    relatedFields: ['OPP_ID', 'OPP_AMOUNT', 'OPP_DAYS_IN_STAGE'],
    dataQualityRules: [
      {
        ruleId: 'OPP_STAGE_001',
        ruleName: 'Valid Stage Value',
        ruleType: 'enum',
        severity: 'critical',
        description: 'Stage must be one of the defined values',
        validationLogic: "stage IN ('prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')",
        failureMessage: 'Invalid opportunity stage',
        remediation: 'Update stage to valid value in Salesforce'
      },
      {
        ruleId: 'OPP_STAGE_002',
        ruleName: 'Closed Date Required for Closed Stages',
        ruleType: 'consistency',
        severity: 'warning',
        description: 'Closed Won/Lost opportunities must have a close date',
        validationLogic: "stage NOT IN ('closed_won', 'closed_lost') OR close_date IS NOT NULL",
        failureMessage: 'Closed opportunity missing close date',
        remediation: 'Add close date to opportunity record'
      }
    ],
    accessLevel: 'internal',
    usageNotes: 'Stage changes should be logged for sales cycle analysis. Probability values are configurable per sales org.',
    createdAt: '2024-01-01',
    updatedAt: '2024-10-01',
    version: '1.2',
    tags: ['sales', 'pipeline', 'status']
  },
  {
    fieldId: 'OPP_AMOUNT',
    fieldName: 'amount',
    displayName: 'Opportunity Amount',
    domain: 'opportunity',
    category: 'metric',
    dataType: 'currency',
    format: '$#,###.##',
    precision: 2,
    nullable: false,
    defaultValue: 0,
    definition: 'Expected annual contract value of the opportunity.',
    businessContext: 'Projected revenue if the deal is won. Used for pipeline valuation and sales forecasting. Should reflect the full annual value, not monthly.',
    valueRanges: { min: 0, max: 5000000, typical: '$1,000 - $100,000 for most deals' },
    primarySource: 'salesforce',
    sourceFieldName: 'Opportunity.Amount',
    transformations: [
      {
        sourceSystem: 'salesforce',
        sourceField: 'Opportunity.Amount',
        transformationType: 'direct_map',
        transformationLogic: 'Direct mapping, assumed to be annual value',
        exampleInput: '25000.00',
        exampleOutput: '$25,000.00'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'Sales Directors',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-15',
    nextReviewDate: '2025-02-15',
    kpisUsing: ['pipeline_30_60_90', 'forecast_revenue_8w', 'avg_cycle_time_days'],
    relatedFields: ['OPP_ID', 'OPP_STAGE', 'OPP_PROBABILITY'],
    dataQualityRules: [
      {
        ruleId: 'OPP_AMT_001',
        ruleName: 'Amount Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'Opportunity amount cannot be negative',
        validationLogic: 'amount >= 0',
        failureMessage: 'Negative opportunity amount',
        remediation: 'Correct amount to positive value'
      },
      {
        ruleId: 'OPP_AMT_002',
        ruleName: 'Amount Required for Late Stages',
        ruleType: 'required',
        severity: 'warning',
        description: 'Opportunities in proposal or later stages should have an amount',
        validationLogic: "stage IN ('prospect', 'qualified') OR amount > 0",
        failureMessage: 'Missing amount for late-stage opportunity',
        remediation: 'Enter expected deal amount based on proposal'
      },
      {
        ruleId: 'OPP_AMT_003',
        ruleName: 'Amount Reasonableness',
        ruleType: 'range',
        severity: 'info',
        description: 'Very large amounts should be reviewed',
        validationLogic: 'amount <= 500000',
        failureMessage: 'Unusually large opportunity amount',
        remediation: 'Verify amount is correct and not a data entry error'
      }
    ],
    accessLevel: 'restricted',
    usageNotes: 'Pipeline value = SUM(amount * probability) for weighted forecast.',
    createdAt: '2024-01-01',
    updatedAt: '2024-11-15',
    version: '1.1',
    tags: ['sales', 'revenue', 'metric', 'financial']
  },
  {
    fieldId: 'OPP_PROBABILITY',
    fieldName: 'probability',
    displayName: 'Win Probability',
    domain: 'opportunity',
    category: 'metric',
    dataType: 'percentage',
    format: '##%',
    nullable: false,
    definition: 'Likelihood of winning the opportunity, expressed as a percentage.',
    businessContext: 'Used for weighted pipeline calculations and forecasting. Can be auto-set based on stage or manually adjusted by sales reps.',
    valueRanges: { min: 0, max: 100, typical: 'Varies by stage: Prospect 10%, Qualified 25%, Proposal 50%, Negotiation 75%' },
    primarySource: 'salesforce',
    sourceFieldName: 'Opportunity.Probability',
    transformations: [
      {
        sourceSystem: 'salesforce',
        sourceField: 'Opportunity.Probability',
        transformationType: 'direct_map',
        transformationLogic: 'Direct mapping, expected as decimal (0-1) or percentage (0-100)',
        exampleInput: '0.5',
        exampleOutput: '50%'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'VP Sales',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-09-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: ['pipeline_30_60_90', 'forecast_revenue_8w'],
    relatedFields: ['OPP_STAGE', 'OPP_AMOUNT'],
    dataQualityRules: [
      {
        ruleId: 'OPP_PROB_001',
        ruleName: 'Probability Range',
        ruleType: 'range',
        severity: 'critical',
        description: 'Probability must be between 0 and 100',
        validationLogic: 'probability >= 0 AND probability <= 100',
        failureMessage: 'Probability out of valid range',
        remediation: 'Correct probability to 0-100 range'
      },
      {
        ruleId: 'OPP_PROB_002',
        ruleName: 'Probability vs Stage Consistency',
        ruleType: 'consistency',
        severity: 'warning',
        description: 'Probability should align with stage defaults unless manually overridden',
        validationLogic: "ABS(probability - stage_default_probability) <= 25 OR manually_adjusted = true",
        failureMessage: 'Probability significantly differs from stage default',
        remediation: 'Review and confirm probability is intentionally different from stage default'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-01',
    version: '1.0',
    tags: ['sales', 'forecast', 'metric']
  },
  {
    fieldId: 'OPP_DAYS_IN_STAGE',
    fieldName: 'days_in_stage',
    displayName: 'Days in Current Stage',
    domain: 'opportunity',
    category: 'metric',
    dataType: 'number',
    nullable: false,
    defaultValue: 0,
    definition: 'Number of days the opportunity has been in its current stage.',
    businessContext: 'Key indicator for identifying stalled deals. Opportunities exceeding stage duration thresholds are flagged for manager review.',
    valueRanges: { min: 0, max: 365, typical: '< 30 days is healthy for most stages' },
    primarySource: 'calculated',
    sourceFieldName: 'N/A - Calculated Field',
    transformations: [
      {
        sourceSystem: 'calculated',
        sourceField: 'Opportunity.StageName, Opportunity.LastModifiedDate',
        transformationType: 'calculated',
        transformationLogic: 'DATEDIFF(NOW(), last_stage_change_date)',
        exampleInput: 'last_stage_change_date = 2024-12-01',
        exampleOutput: '8 days (if today is 2024-12-09)'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'CRM Admin',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-10-01',
    nextReviewDate: '2025-04-01',
    kpisUsing: ['stalled_opps', 'avg_cycle_time_days', 'crm_hygiene_score'],
    relatedFields: ['OPP_ID', 'OPP_STAGE', 'OPP_IS_STALLED'],
    dataQualityRules: [
      {
        ruleId: 'OPP_DIS_001',
        ruleName: 'Non-Negative Days',
        ruleType: 'range',
        severity: 'critical',
        description: 'Days in stage cannot be negative',
        validationLogic: 'days_in_stage >= 0',
        failureMessage: 'Negative days in stage',
        remediation: 'Recalculate from stage change date'
      }
    ],
    accessLevel: 'internal',
    usageNotes: 'Stalled threshold varies by stage: Prospect 14 days, Qualified 21 days, Proposal 30 days, Negotiation 14 days.',
    createdAt: '2024-01-01',
    updatedAt: '2024-10-01',
    version: '1.0',
    tags: ['sales', 'pipeline', 'metric', 'velocity']
  },
  {
    fieldId: 'OPP_IS_STALLED',
    fieldName: 'is_stalled',
    displayName: 'Stalled Flag',
    domain: 'opportunity',
    category: 'status',
    dataType: 'boolean',
    nullable: false,
    defaultValue: false,
    definition: 'Indicates whether the opportunity has exceeded the expected duration for its current stage.',
    businessContext: 'Used to flag deals requiring attention. Stalled opportunities appear in manager dashboards for review and action.',
    primarySource: 'calculated',
    sourceFieldName: 'N/A - Calculated Field',
    transformations: [
      {
        sourceSystem: 'calculated',
        sourceField: 'days_in_stage, stage',
        transformationType: 'calculated',
        transformationLogic: `
is_stalled = days_in_stage > stage_threshold

Thresholds by stage:
  prospect: 14 days
  qualified: 21 days
  proposal: 30 days
  negotiation: 14 days`,
        exampleInput: 'stage=proposal, days_in_stage=35',
        exampleOutput: 'true'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'Sales Directors',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-10-01',
    nextReviewDate: '2025-04-01',
    kpisUsing: ['stalled_opps', 'crm_hygiene_score'],
    relatedFields: ['OPP_DAYS_IN_STAGE', 'OPP_STAGE'],
    dataQualityRules: [],
    accessLevel: 'internal',
    createdAt: '2024-03-01',
    updatedAt: '2024-10-01',
    version: '1.0',
    tags: ['sales', 'alert', 'derived']
  }
];

// =============================================================================
// SERVICE EVENT DOMAIN FIELDS
// =============================================================================

const serviceEventFields: FieldDefinition[] = [
  {
    fieldId: 'SVC_ID',
    fieldName: 'service_event_id',
    displayName: 'Service Event ID',
    domain: 'service',
    category: 'identifier',
    dataType: 'string',
    format: 'SVC-XXXXXXXX',
    nullable: false,
    definition: 'Unique identifier for each scheduled or completed service visit.',
    businessContext: 'Primary key for tracking all field service activities. Created when a service is scheduled.',
    primarySource: 'pestpac',
    sourceFieldName: 'SVC_ORDER_ID',
    transformations: [
      {
        sourceSystem: 'pestpac',
        sourceField: 'SVC_ORDER_ID',
        transformationType: 'direct_map',
        transformationLogic: "Prefix 'SVC-' + padded numeric ID",
        exampleInput: '12345678',
        exampleOutput: 'SVC-12345678'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Dispatch Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-09-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: ['service_risk_index', 'callback_rate', 'missed_service_rate', 'capacity_utilization'],
    relatedFields: ['SVC_ACCOUNT_ID', 'SVC_TECHNICIAN_ID', 'SVC_STATUS'],
    dataQualityRules: [
      {
        ruleId: 'SVC_ID_001',
        ruleName: 'Service ID Required',
        ruleType: 'required',
        severity: 'critical',
        description: 'Service event ID must be present',
        validationLogic: 'service_event_id IS NOT NULL',
        failureMessage: 'Missing Service Event ID',
        remediation: 'Sync from PestPac to obtain ID'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-01',
    version: '1.0',
    tags: ['service', 'identifier', 'core']
  },
  {
    fieldId: 'SVC_STATUS',
    fieldName: 'status',
    displayName: 'Service Status',
    domain: 'service',
    category: 'status',
    dataType: 'enum',
    nullable: false,
    definition: 'Current status of the service event.',
    businessContext: 'Tracks service lifecycle from scheduling through completion. Used for capacity planning and service delivery metrics.',
    validValues: [
      { value: 'scheduled', label: 'Scheduled', description: 'Service is scheduled but not started' },
      { value: 'in_progress', label: 'In Progress', description: 'Technician is on-site' },
      { value: 'completed', label: 'Completed', description: 'Service finished successfully' },
      { value: 'cancelled', label: 'Cancelled', description: 'Service was cancelled' },
      { value: 'missed', label: 'Missed', description: 'Scheduled service did not occur' },
      { value: 'callback', label: 'Callback', description: 'Follow-up service required' }
    ],
    primarySource: 'pestpac',
    sourceFieldName: 'SVC_STATUS_CD',
    transformations: [
      {
        sourceSystem: 'pestpac',
        sourceField: 'SVC_STATUS_CD',
        transformationType: 'lookup',
        transformationLogic: 'Map status codes: S=scheduled, P=in_progress, C=completed, X=cancelled, M=missed, F=callback',
        exampleInput: 'C',
        exampleOutput: 'completed'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Dispatch Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-08-01',
    nextReviewDate: '2025-02-01',
    kpisUsing: ['service_risk_index', 'callback_rate', 'missed_service_rate'],
    relatedFields: ['SVC_ID', 'SVC_COMPLETED_DATE'],
    dataQualityRules: [
      {
        ruleId: 'SVC_STAT_001',
        ruleName: 'Valid Status Value',
        ruleType: 'enum',
        severity: 'critical',
        description: 'Status must be a valid option',
        validationLogic: "status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'missed', 'callback')",
        failureMessage: 'Invalid service status',
        remediation: 'Update status to valid value'
      },
      {
        ruleId: 'SVC_STAT_002',
        ruleName: 'Completed Date for Completed Status',
        ruleType: 'consistency',
        severity: 'warning',
        description: 'Completed services must have a completion date',
        validationLogic: "status != 'completed' OR completed_date IS NOT NULL",
        failureMessage: 'Completed service missing completion date',
        remediation: 'Add completion date from field records'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-08-01',
    version: '1.1',
    tags: ['service', 'status', 'operations']
  },
  {
    fieldId: 'SVC_TIME_ON_SITE',
    fieldName: 'time_on_site',
    displayName: 'Time on Site (Minutes)',
    domain: 'service',
    category: 'metric',
    dataType: 'number',
    nullable: true,
    definition: 'Duration in minutes spent on-site for the service visit.',
    businessContext: 'Used for productivity analysis, route optimization, and billing verification. Captured via mobile app clock-in/clock-out.',
    valueRanges: { min: 5, max: 480, typical: '15-60 minutes for routine service' },
    primarySource: 'pestpac',
    sourceFieldName: 'SVC_DURATION_MIN',
    transformations: [
      {
        sourceSystem: 'pestpac',
        sourceField: 'SVC_DURATION_MIN',
        transformationType: 'direct_map',
        transformationLogic: 'Direct mapping, rounded to whole minutes',
        exampleInput: '37.5',
        exampleOutput: '38'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Route Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-07-01',
    nextReviewDate: '2025-01-01',
    kpisUsing: ['capacity_utilization', 'avg_response_time'],
    relatedFields: ['SVC_ID', 'SVC_TECHNICIAN_ID'],
    dataQualityRules: [
      {
        ruleId: 'SVC_TOS_001',
        ruleName: 'Time on Site Range',
        ruleType: 'range',
        severity: 'warning',
        description: 'Time on site should be within reasonable bounds',
        validationLogic: 'time_on_site IS NULL OR (time_on_site >= 5 AND time_on_site <= 480)',
        failureMessage: 'Unusual time on site value',
        remediation: 'Verify time entry accuracy with technician'
      },
      {
        ruleId: 'SVC_TOS_002',
        ruleName: 'Time Required for Completed',
        ruleType: 'required',
        severity: 'info',
        description: 'Completed services should have time recorded',
        validationLogic: "status != 'completed' OR time_on_site IS NOT NULL",
        failureMessage: 'Completed service missing time on site',
        remediation: 'Enter time from technician mobile app logs'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-07-01',
    version: '1.0',
    tags: ['service', 'productivity', 'metric']
  },
  {
    fieldId: 'SVC_TECHNICIAN_ID',
    fieldName: 'technician_id',
    displayName: 'Technician ID',
    domain: 'service',
    category: 'relationship',
    dataType: 'string',
    format: 'USR-XXXXXX',
    nullable: false,
    definition: 'Identifier of the technician assigned to perform the service.',
    businessContext: 'Links service events to technician for performance tracking, certification verification, and route assignment.',
    primarySource: 'pestpac',
    secondarySources: ['workday'],
    sourceFieldName: 'TECH_EMP_ID',
    transformations: [
      {
        sourceSystem: 'pestpac',
        sourceField: 'TECH_EMP_ID',
        transformationType: 'direct_map',
        transformationLogic: "Map employee ID to 'USR-' format user ID",
        exampleInput: 'T12345',
        exampleOutput: 'USR-012345'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'HR Operations',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-09-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: ['capacity_utilization', 'callback_rate'],
    relatedFields: ['SVC_ID', 'SVC_ROUTE_ID'],
    dataQualityRules: [
      {
        ruleId: 'SVC_TECH_001',
        ruleName: 'Valid Technician Reference',
        ruleType: 'referential',
        severity: 'critical',
        description: 'Technician ID must exist in the user master table with technician role',
        validationLogic: "technician_id IN (SELECT user_id FROM users WHERE role = 'technician')",
        failureMessage: 'Invalid technician reference',
        remediation: 'Assign valid technician to service event'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-01',
    version: '1.0',
    tags: ['service', 'workforce', 'relationship']
  },
  {
    fieldId: 'SVC_SERVICE_TYPE',
    fieldName: 'service_type',
    displayName: 'Service Type',
    domain: 'service',
    category: 'dimension',
    dataType: 'enum',
    nullable: false,
    definition: 'Type of pest control service performed.',
    businessContext: 'Categorizes services for pricing, scheduling, and compliance. Different service types require different certifications and equipment.',
    validValues: [
      { value: 'general', label: 'General Pest Control', description: 'Standard pest prevention and treatment' },
      { value: 'termite', label: 'Termite', description: 'Termite inspection, treatment, or monitoring' },
      { value: 'rodent', label: 'Rodent Control', description: 'Rodent baiting and exclusion' },
      { value: 'mosquito', label: 'Mosquito Control', description: 'Mosquito misting and treatment' },
      { value: 'bed_bug', label: 'Bed Bug', description: 'Bed bug treatment and heat remediation' },
      { value: 'wildlife', label: 'Wildlife', description: 'Wildlife removal and exclusion' },
      { value: 'fumigation', label: 'Fumigation', description: 'Tent or spot fumigation' }
    ],
    primarySource: 'pestpac',
    secondarySources: ['start_packet_pdf'],
    sourceFieldName: 'SVC_TYPE_CD',
    transformations: [
      {
        sourceSystem: 'pestpac',
        sourceField: 'SVC_TYPE_CD',
        transformationType: 'lookup',
        transformationLogic: 'Map service codes: GP=general, TM=termite, RO=rodent, MQ=mosquito, BB=bed_bug, WL=wildlife, FM=fumigation',
        exampleInput: 'GP',
        exampleOutput: 'general'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Service Excellence Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-06-01',
    nextReviewDate: '2024-12-01',
    kpisUsing: ['revenue_mtd', 'margin_proxy'],
    relatedFields: ['SVC_ID', 'ACC_CONTRACT_VALUE'],
    dataQualityRules: [
      {
        ruleId: 'SVC_TYPE_001',
        ruleName: 'Valid Service Type',
        ruleType: 'enum',
        severity: 'critical',
        description: 'Service type must be a valid option',
        validationLogic: "service_type IN ('general', 'termite', 'rodent', 'mosquito', 'bed_bug', 'wildlife', 'fumigation')",
        failureMessage: 'Invalid service type',
        remediation: 'Update service type to valid value'
      }
    ],
    accessLevel: 'public',
    createdAt: '2024-01-01',
    updatedAt: '2024-06-01',
    version: '1.0',
    tags: ['service', 'dimension', 'product']
  }
];

// =============================================================================
// INVOICE DOMAIN FIELDS
// =============================================================================

const invoiceFields: FieldDefinition[] = [
  {
    fieldId: 'INV_ID',
    fieldName: 'invoice_id',
    displayName: 'Invoice ID',
    domain: 'invoice',
    category: 'identifier',
    dataType: 'string',
    format: 'INV-XXXXXXXX',
    nullable: false,
    definition: 'Unique identifier for each invoice generated.',
    businessContext: 'Primary key for all billing and AR records. Used for payment matching and customer inquiries.',
    primarySource: 'sap',
    sourceFieldName: 'INVOICE_NUM',
    transformations: [
      {
        sourceSystem: 'sap',
        sourceField: 'INVOICE_NUM',
        transformationType: 'direct_map',
        transformationLogic: "Prefix 'INV-' + SAP invoice number",
        exampleInput: '10042567',
        exampleOutput: 'INV-10042567'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'Billing Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-01',
    nextReviewDate: '2025-05-01',
    kpisUsing: ['ar_aging', 'dso'],
    relatedFields: ['INV_ACCOUNT_ID', 'INV_AMOUNT', 'INV_STATUS'],
    dataQualityRules: [
      {
        ruleId: 'INV_ID_001',
        ruleName: 'Invoice ID Required',
        ruleType: 'required',
        severity: 'critical',
        description: 'Invoice ID must be present',
        validationLogic: 'invoice_id IS NOT NULL',
        failureMessage: 'Missing Invoice ID',
        remediation: 'Sync from SAP to obtain ID'
      }
    ],
    accessLevel: 'restricted',
    createdAt: '2024-01-01',
    updatedAt: '2024-11-01',
    version: '1.0',
    tags: ['finance', 'identifier', 'billing']
  },
  {
    fieldId: 'INV_STATUS',
    fieldName: 'invoice_status',
    displayName: 'Invoice Status',
    domain: 'invoice',
    category: 'status',
    dataType: 'enum',
    nullable: false,
    definition: 'Current payment status of the invoice.',
    businessContext: 'Drives AR workflows and collection activities. Status changes trigger automated dunning processes.',
    validValues: [
      { value: 'paid', label: 'Paid', description: 'Payment received in full' },
      { value: 'open', label: 'Open', description: 'Invoice issued, payment pending' },
      { value: 'overdue', label: 'Overdue', description: 'Past due date, unpaid' },
      { value: 'disputed', label: 'Disputed', description: 'Customer has raised a dispute' },
      { value: 'void', label: 'Void', description: 'Invoice cancelled/voided' }
    ],
    primarySource: 'sap',
    sourceFieldName: 'INV_STATUS_CD',
    transformations: [
      {
        sourceSystem: 'sap',
        sourceField: 'INV_STATUS_CD',
        transformationType: 'lookup',
        transformationLogic: 'Map status codes: P=paid, O=open, D=overdue, X=disputed, V=void',
        exampleInput: 'O',
        exampleOutput: 'open'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'AR Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-10-01',
    nextReviewDate: '2025-04-01',
    kpisUsing: ['ar_aging', 'dso'],
    relatedFields: ['INV_ID', 'INV_DUE_DATE', 'INV_AGING_BUCKET'],
    dataQualityRules: [
      {
        ruleId: 'INV_STAT_001',
        ruleName: 'Valid Invoice Status',
        ruleType: 'enum',
        severity: 'critical',
        description: 'Invoice status must be valid',
        validationLogic: "invoice_status IN ('paid', 'open', 'overdue', 'disputed', 'void')",
        failureMessage: 'Invalid invoice status',
        remediation: 'Update status to valid value'
      },
      {
        ruleId: 'INV_STAT_002',
        ruleName: 'Paid Date for Paid Status',
        ruleType: 'consistency',
        severity: 'warning',
        description: 'Paid invoices must have a paid date',
        validationLogic: "invoice_status != 'paid' OR paid_date IS NOT NULL",
        failureMessage: 'Paid invoice missing payment date',
        remediation: 'Add payment date from bank records'
      }
    ],
    accessLevel: 'restricted',
    createdAt: '2024-01-01',
    updatedAt: '2024-10-01',
    version: '1.1',
    tags: ['finance', 'status', 'ar']
  },
  {
    fieldId: 'INV_AGING_BUCKET',
    fieldName: 'aging_bucket',
    displayName: 'Aging Bucket',
    domain: 'invoice',
    category: 'dimension',
    dataType: 'enum',
    nullable: false,
    definition: 'Age category of the invoice based on days past due date.',
    businessContext: 'Standard AR aging categories for collections prioritization and financial reporting.',
    validValues: [
      { value: 'current', label: 'Current', description: 'Not yet due' },
      { value: '1-30', label: '1-30 Days', description: '1 to 30 days past due' },
      { value: '31-60', label: '31-60 Days', description: '31 to 60 days past due' },
      { value: '61-90', label: '61-90 Days', description: '61 to 90 days past due' },
      { value: '90+', label: '90+ Days', description: 'Over 90 days past due' }
    ],
    primarySource: 'calculated',
    sourceFieldName: 'N/A - Calculated Field',
    transformations: [
      {
        sourceSystem: 'calculated',
        sourceField: 'due_date',
        transformationType: 'calculated',
        transformationLogic: `
days_past_due = DATEDIFF(NOW(), due_date)
aging_bucket = CASE
  WHEN days_past_due <= 0 THEN 'current'
  WHEN days_past_due <= 30 THEN '1-30'
  WHEN days_past_due <= 60 THEN '31-60'
  WHEN days_past_due <= 90 THEN '61-90'
  ELSE '90+'
END`,
        exampleInput: 'due_date = 2024-11-01 (45 days ago)',
        exampleOutput: '31-60'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'AR Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-09-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: ['ar_aging', 'dso', 'retention_risk'],
    relatedFields: ['INV_ID', 'INV_DUE_DATE', 'INV_STATUS'],
    dataQualityRules: [],
    accessLevel: 'restricted',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-01',
    version: '1.0',
    tags: ['finance', 'ar', 'derived']
  },
  {
    fieldId: 'INV_AMOUNT',
    fieldName: 'invoice_amount',
    displayName: 'Invoice Amount',
    domain: 'invoice',
    category: 'metric',
    dataType: 'currency',
    format: '$#,###.##',
    precision: 2,
    nullable: false,
    definition: 'Total amount billed on the invoice.',
    businessContext: 'Sum of all line items including taxes and fees. Used for AR balance calculations and revenue recognition.',
    valueRanges: { min: 0, max: 1000000, typical: '$50 - $5,000 for most invoices' },
    primarySource: 'sap',
    sourceFieldName: 'INV_TOTAL_AMT',
    transformations: [
      {
        sourceSystem: 'sap',
        sourceField: 'INV_TOTAL_AMT',
        transformationType: 'direct_map',
        transformationLogic: 'Direct mapping, 2 decimal precision',
        exampleInput: '1250.00',
        exampleOutput: '$1,250.00'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'Billing Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-01',
    nextReviewDate: '2025-05-01',
    kpisUsing: ['ar_aging', 'revenue_mtd'],
    relatedFields: ['INV_ID', 'INV_STATUS'],
    dataQualityRules: [
      {
        ruleId: 'INV_AMT_001',
        ruleName: 'Amount Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'Invoice amount cannot be negative',
        validationLogic: 'invoice_amount >= 0',
        failureMessage: 'Negative invoice amount',
        remediation: 'Issue credit memo separately for refunds'
      }
    ],
    accessLevel: 'restricted',
    createdAt: '2024-01-01',
    updatedAt: '2024-11-01',
    version: '1.0',
    tags: ['finance', 'metric', 'billing']
  }
];

// =============================================================================
// KPI / CALCULATED METRIC FIELDS
// =============================================================================

const kpiFields: FieldDefinition[] = [
  {
    fieldId: 'KPI_REVENUE_MTD',
    fieldName: 'revenue_mtd',
    displayName: 'Revenue MTD',
    domain: 'kpi',
    category: 'metric',
    dataType: 'currency',
    format: '$#,###,###',
    nullable: false,
    definition: 'Total recognized revenue from the first of the current month through today.',
    businessContext: 'Primary revenue metric for monthly performance tracking. Includes all service revenue, excludes credits and refunds.',
    primarySource: 'calculated',
    sourceFieldName: 'N/A - Calculated Field',
    transformations: [
      {
        sourceSystem: 'calculated',
        sourceField: 'invoices (paid/open), accounts (contract_value)',
        transformationType: 'aggregated',
        transformationLogic: `
revenue_mtd = SUM(
  invoices.amount
  WHERE invoice_date >= FIRST_DAY_OF_MONTH
  AND invoice_date <= TODAY
  AND status IN ('paid', 'open')
)

Alternatively for forecasting:
revenue_mtd = SUM(accounts.contract_value / 12 * days_elapsed_ratio)`,
        exampleInput: 'Multiple invoices totaling $1.2M',
        exampleOutput: '$1,200,000'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'CFO Office',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-12-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: [],
    relatedFields: ['INV_AMOUNT', 'INV_STATUS', 'ACC_CONTRACT_VALUE'],
    dataQualityRules: [
      {
        ruleId: 'KPI_REV_001',
        ruleName: 'Revenue Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'Revenue MTD cannot be negative',
        validationLogic: 'revenue_mtd >= 0',
        failureMessage: 'Negative revenue calculated',
        remediation: 'Review invoice data for errors'
      },
      {
        ruleId: 'KPI_REV_002',
        ruleName: 'Revenue Freshness',
        ruleType: 'freshness',
        severity: 'warning',
        description: 'Revenue should be calculated daily',
        validationLogic: 'DATEDIFF(NOW(), last_calculated) <= 1',
        failureMessage: 'Stale revenue calculation',
        remediation: 'Trigger KPI recalculation job'
      }
    ],
    accessLevel: 'restricted',
    usageNotes: 'Primary KPI for executive dashboard. Should match SAP GL within 0.1%.',
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01',
    version: '2.0',
    tags: ['kpi', 'revenue', 'executive', 'financial']
  },
  {
    fieldId: 'KPI_WIN_RATE',
    fieldName: 'win_rate',
    displayName: 'Win Rate',
    domain: 'kpi',
    category: 'metric',
    dataType: 'percentage',
    format: '##.#%',
    nullable: false,
    definition: 'Percentage of opportunities that result in closed-won status.',
    businessContext: 'Key sales effectiveness metric. Calculated over rolling 90-day window to smooth variations.',
    valueRanges: { min: 0, max: 100, typical: '15-35% depending on vertical' },
    primarySource: 'calculated',
    sourceFieldName: 'N/A - Calculated Field',
    transformations: [
      {
        sourceSystem: 'calculated',
        sourceField: 'opportunities',
        transformationType: 'calculated',
        transformationLogic: `
win_rate = (
  COUNT(opportunities WHERE stage = 'closed_won' AND close_date >= NOW() - 90 DAYS)
  /
  COUNT(opportunities WHERE stage IN ('closed_won', 'closed_lost') AND close_date >= NOW() - 90 DAYS)
) * 100`,
        exampleInput: '45 wins / 180 total closed',
        exampleOutput: '25.0%'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'VP Sales',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-01',
    nextReviewDate: '2025-02-01',
    kpisUsing: [],
    relatedFields: ['OPP_STAGE', 'OPP_CLOSE_DATE'],
    dataQualityRules: [
      {
        ruleId: 'KPI_WR_001',
        ruleName: 'Win Rate Range',
        ruleType: 'range',
        severity: 'critical',
        description: 'Win rate must be 0-100%',
        validationLogic: 'win_rate >= 0 AND win_rate <= 100',
        failureMessage: 'Win rate out of valid range',
        remediation: 'Review opportunity stage data'
      },
      {
        ruleId: 'KPI_WR_002',
        ruleName: 'Minimum Sample Size',
        ruleType: 'consistency',
        severity: 'warning',
        description: 'Win rate requires at least 10 closed opportunities for statistical validity',
        validationLogic: 'closed_opportunity_count >= 10',
        failureMessage: 'Insufficient data for reliable win rate',
        remediation: 'Consider expanding date range or segment'
      }
    ],
    accessLevel: 'internal',
    usageNotes: 'Can be sliced by sales rep, branch, or vertical for detailed analysis.',
    createdAt: '2024-01-01',
    updatedAt: '2024-11-01',
    version: '1.3',
    tags: ['kpi', 'sales', 'conversion']
  },
  {
    fieldId: 'KPI_CALLBACK_RATE',
    fieldName: 'callback_rate',
    displayName: 'Callback Rate',
    domain: 'kpi',
    category: 'metric',
    dataType: 'percentage',
    format: '##.##%',
    nullable: false,
    definition: 'Percentage of completed service visits that require a follow-up callback within 14 days.',
    businessContext: 'Service quality indicator. High callback rates indicate incomplete treatment or customer dissatisfaction. Target is < 3%.',
    valueRanges: { min: 0, max: 100, typical: '1-5%' },
    primarySource: 'calculated',
    sourceFieldName: 'N/A - Calculated Field',
    transformations: [
      {
        sourceSystem: 'calculated',
        sourceField: 'service_events',
        transformationType: 'calculated',
        transformationLogic: `
callback_rate = (
  COUNT(service_events WHERE status = 'callback' AND original_service_date >= NOW() - 30 DAYS)
  /
  COUNT(service_events WHERE status = 'completed' AND completed_date >= NOW() - 30 DAYS)
) * 100`,
        exampleInput: '45 callbacks / 1,500 completed',
        exampleOutput: '3.00%'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Service Excellence Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-10-01',
    nextReviewDate: '2025-01-01',
    kpisUsing: ['service_risk_index', 'retention_risk'],
    relatedFields: ['SVC_STATUS', 'SVC_COMPLETED_DATE'],
    dataQualityRules: [
      {
        ruleId: 'KPI_CB_001',
        ruleName: 'Callback Rate Range',
        ruleType: 'range',
        severity: 'critical',
        description: 'Callback rate must be 0-100%',
        validationLogic: 'callback_rate >= 0 AND callback_rate <= 100',
        failureMessage: 'Callback rate out of valid range',
        remediation: 'Review service event linking'
      }
    ],
    accessLevel: 'internal',
    usageNotes: 'Can be analyzed by technician, service type, or customer to identify root causes.',
    createdAt: '2024-01-01',
    updatedAt: '2024-10-01',
    version: '1.2',
    tags: ['kpi', 'service', 'quality']
  },
  {
    fieldId: 'KPI_DSO',
    fieldName: 'dso',
    displayName: 'Days Sales Outstanding',
    domain: 'kpi',
    category: 'metric',
    dataType: 'number',
    format: '##.# days',
    nullable: false,
    definition: 'Average number of days to collect payment after invoicing.',
    businessContext: 'Cash flow efficiency metric. Lower DSO indicates faster collections and healthier cash flow. Industry benchmark is 45-60 days.',
    valueRanges: { min: 0, max: 180, typical: '30-60 days' },
    primarySource: 'calculated',
    sourceFieldName: 'N/A - Calculated Field',
    transformations: [
      {
        sourceSystem: 'calculated',
        sourceField: 'invoices, accounts_receivable',
        transformationType: 'calculated',
        transformationLogic: `
dso = (
  SUM(accounts_receivable.balance)
  /
  (SUM(revenue_last_90_days) / 90)
)

Alternative formula:
dso = AVG(paid_invoices.paid_date - paid_invoices.invoice_date) over last 90 days`,
        exampleInput: 'AR Balance $2.5M, Daily Revenue $60K',
        exampleOutput: '41.7 days'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'CFO Office',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-01',
    nextReviewDate: '2025-02-01',
    kpisUsing: [],
    relatedFields: ['INV_AMOUNT', 'INV_STATUS', 'INV_PAID_DATE', 'ACC_AR_BALANCE'],
    dataQualityRules: [
      {
        ruleId: 'KPI_DSO_001',
        ruleName: 'DSO Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'DSO cannot be negative',
        validationLogic: 'dso >= 0',
        failureMessage: 'Negative DSO calculated',
        remediation: 'Review invoice and payment date data'
      },
      {
        ruleId: 'KPI_DSO_002',
        ruleName: 'DSO Reasonableness',
        ruleType: 'range',
        severity: 'warning',
        description: 'DSO outside normal range may indicate data issues',
        validationLogic: 'dso <= 120',
        failureMessage: 'Unusually high DSO',
        remediation: 'Verify AR balance and revenue figures'
      }
    ],
    accessLevel: 'restricted',
    usageNotes: 'Primary cash flow metric. Should trend downward with improved collection efforts.',
    createdAt: '2024-01-01',
    updatedAt: '2024-11-01',
    version: '1.1',
    tags: ['kpi', 'finance', 'ar', 'cash-flow']
  }
];

// =============================================================================
// USER / WORKFORCE DOMAIN FIELDS
// =============================================================================

const userFields: FieldDefinition[] = [
  {
    fieldId: 'USR_ID',
    fieldName: 'user_id',
    displayName: 'User ID',
    domain: 'user',
    category: 'identifier',
    dataType: 'string',
    format: 'USR-XXXXXX',
    nullable: false,
    definition: 'Unique identifier for each employee in the system.',
    businessContext: 'Primary key for employee records. Links across HR, operations, and sales systems.',
    primarySource: 'workday',
    sourceFieldName: 'EMPLOYEE_ID',
    transformations: [
      {
        sourceSystem: 'workday',
        sourceField: 'EMPLOYEE_ID',
        transformationType: 'direct_map',
        transformationLogic: "Prefix 'USR-' + padded employee number",
        exampleInput: '12345',
        exampleOutput: 'USR-012345'
      }
    ],
    governanceOwner: 'HR',
    steward: 'HRIS Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-08-01',
    nextReviewDate: '2025-02-01',
    kpisUsing: ['capacity_utilization'],
    relatedFields: ['USR_ROLE', 'USR_BRANCH_ID'],
    dataQualityRules: [
      {
        ruleId: 'USR_ID_001',
        ruleName: 'User ID Required',
        ruleType: 'required',
        severity: 'critical',
        description: 'User ID must be present',
        validationLogic: 'user_id IS NOT NULL',
        failureMessage: 'Missing User ID',
        remediation: 'Sync from Workday to obtain ID'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-08-01',
    version: '1.0',
    tags: ['user', 'identifier', 'workforce']
  },
  {
    fieldId: 'USR_ROLE',
    fieldName: 'role',
    displayName: 'User Role',
    domain: 'user',
    category: 'dimension',
    dataType: 'enum',
    nullable: false,
    definition: 'Functional role of the user within the organization.',
    businessContext: 'Determines system access, dashboard visibility, and data scope. Used for role-based access control (RBAC).',
    validValues: [
      { value: 'exec', label: 'Executive', description: 'C-suite and VP level, enterprise view' },
      { value: 'market_director', label: 'Market Director', description: 'Regional P&L ownership' },
      { value: 'market_sales_director', label: 'Market Sales Director', description: 'Market-level sales leadership' },
      { value: 'region_director', label: 'Region Director', description: 'Multi-branch oversight' },
      { value: 'manager', label: 'Branch Manager', description: 'Single branch P&L' },
      { value: 'sales_manager', label: 'Sales Manager', description: 'Sales team leadership' },
      { value: 'ops_manager', label: 'Operations Manager', description: 'Service operations leadership' },
      { value: 'rep', label: 'Sales Rep / AE', description: 'Individual contributor sales' },
      { value: 'technician', label: 'Technician', description: 'Field service technician' }
    ],
    primarySource: 'workday',
    sourceFieldName: 'JOB_FAMILY_CD',
    transformations: [
      {
        sourceSystem: 'workday',
        sourceField: 'JOB_FAMILY_CD',
        transformationType: 'lookup',
        transformationLogic: 'Map job family codes to role enum values based on job level and function',
        exampleInput: 'SALES_IC_L3',
        exampleOutput: 'rep'
      }
    ],
    governanceOwner: 'HR',
    steward: 'HRIS Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-09-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: [],
    relatedFields: ['USR_ID', 'USR_BRANCH_ID'],
    dataQualityRules: [
      {
        ruleId: 'USR_ROLE_001',
        ruleName: 'Valid Role Value',
        ruleType: 'enum',
        severity: 'critical',
        description: 'Role must be one of the defined values',
        validationLogic: "role IN ('exec', 'market_director', 'market_sales_director', 'region_director', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician')",
        failureMessage: 'Invalid user role',
        remediation: 'Update role to valid value based on job family'
      }
    ],
    accessLevel: 'internal',
    usageNotes: 'Role determines data visibility scope and navigation options.',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-01',
    version: '1.2',
    tags: ['user', 'rbac', 'security']
  }
];

// =============================================================================
// START PACKET / CONTRACT DOMAIN FIELDS
// =============================================================================

const contractFields: FieldDefinition[] = [
  {
    fieldId: 'SP_CUSTOMER_NAME',
    fieldName: 'customer_name',
    displayName: 'Customer Name (Start Packet)',
    domain: 'contract',
    category: 'attribute',
    dataType: 'string',
    nullable: false,
    definition: 'Customer name as entered on the Start Packet PDF.',
    businessContext: 'Source of truth for new customer onboarding. Validated against Salesforce account and RTX records.',
    primarySource: 'start_packet_pdf',
    sourceFieldName: 'Customer Name (PDF Header)',
    transformations: [
      {
        sourceSystem: 'start_packet_pdf',
        sourceField: 'Customer Name (PDF Header)',
        transformationType: 'parsed',
        transformationLogic: 'OCR extraction from PDF header, cleaned and normalized',
        exampleInput: 'ACME CORP.',
        exampleOutput: 'Acme Corp.'
      }
    ],
    governanceOwner: 'Sales Operations',
    steward: 'Start Packet Processing Team',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-10-01',
    nextReviewDate: '2025-04-01',
    kpisUsing: [],
    relatedFields: ['ACC_NAME', 'SP_SERVICE_ADDRESS'],
    dataQualityRules: [
      {
        ruleId: 'SP_NAME_001',
        ruleName: 'Customer Name Required',
        ruleType: 'required',
        severity: 'critical',
        description: 'Customer name must be present on start packet',
        validationLogic: 'customer_name IS NOT NULL AND LENGTH(TRIM(customer_name)) > 0',
        failureMessage: 'Missing customer name on start packet',
        remediation: 'Manually enter customer name from contract documents'
      },
      {
        ruleId: 'SP_NAME_002',
        ruleName: 'Name Match Salesforce',
        ruleType: 'consistency',
        severity: 'warning',
        description: 'Start packet name should match Salesforce account name',
        validationLogic: 'SIMILARITY(sp_customer_name, sf_account_name) >= 0.8',
        failureMessage: 'Customer name mismatch between start packet and Salesforce',
        remediation: 'Review and reconcile customer name discrepancy'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-10-01',
    version: '1.0',
    tags: ['contract', 'start-packet', 'pdf']
  },
  {
    fieldId: 'SP_ROAD_STATIONS',
    fieldName: 'road_stations',
    displayName: 'Road Stations Count',
    domain: 'equipment',
    category: 'attribute',
    dataType: 'number',
    nullable: false,
    defaultValue: 0,
    definition: 'Number of rodent bait stations to be placed along roadways/perimeter.',
    businessContext: 'Equipment specification from start packet. Determines materials to order and service duration estimates.',
    valueRanges: { min: 0, max: 200, typical: '10-50 for commercial accounts' },
    primarySource: 'start_packet_pdf',
    sourceFieldName: 'Equipment Section - Road Stations',
    transformations: [
      {
        sourceSystem: 'start_packet_pdf',
        sourceField: 'Equipment Section - Road Stations',
        transformationType: 'parsed',
        transformationLogic: 'Parse numeric value from equipment table, validate is integer >= 0',
        exampleInput: '25 stations',
        exampleOutput: '25'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Equipment Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-09-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: [],
    relatedFields: ['SP_BAY_STATIONS', 'SP_SERVICE_TYPE'],
    dataQualityRules: [
      {
        ruleId: 'SP_RS_001',
        ruleName: 'Road Stations Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'Road stations count cannot be negative',
        validationLogic: 'road_stations >= 0',
        failureMessage: 'Negative road stations count',
        remediation: 'Correct to valid non-negative integer'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-01',
    version: '1.0',
    tags: ['equipment', 'start-packet', 'pdf', 'materials']
  },
  {
    fieldId: 'SP_BAY_STATIONS',
    fieldName: 'bay_stations',
    displayName: 'Bay Stations Count',
    domain: 'equipment',
    category: 'attribute',
    dataType: 'number',
    nullable: false,
    defaultValue: 0,
    definition: 'Number of rodent bait stations to be placed in loading bays/interior areas.',
    businessContext: 'Equipment specification from start packet. Bay stations typically require different mounting hardware.',
    valueRanges: { min: 0, max: 100, typical: '5-20 for commercial accounts' },
    primarySource: 'start_packet_pdf',
    sourceFieldName: 'Equipment Section - Bay Stations',
    transformations: [
      {
        sourceSystem: 'start_packet_pdf',
        sourceField: 'Equipment Section - Bay Stations',
        transformationType: 'parsed',
        transformationLogic: 'Parse numeric value from equipment table, validate is integer >= 0',
        exampleInput: '12 stations',
        exampleOutput: '12'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Equipment Manager',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-09-01',
    nextReviewDate: '2025-03-01',
    kpisUsing: [],
    relatedFields: ['SP_ROAD_STATIONS', 'SP_SERVICE_TYPE'],
    dataQualityRules: [
      {
        ruleId: 'SP_BS_001',
        ruleName: 'Bay Stations Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'Bay stations count cannot be negative',
        validationLogic: 'bay_stations >= 0',
        failureMessage: 'Negative bay stations count',
        remediation: 'Correct to valid non-negative integer'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-09-01',
    version: '1.0',
    tags: ['equipment', 'start-packet', 'pdf', 'materials']
  },
  {
    fieldId: 'SP_MONTHLY_PRICE',
    fieldName: 'monthly_contract_price',
    displayName: 'Monthly Contract Price',
    domain: 'contract',
    category: 'metric',
    dataType: 'currency',
    format: '$#,###.##',
    precision: 2,
    nullable: false,
    definition: 'Recurring monthly service fee from the start packet contract.',
    businessContext: 'Base for annual contract value calculation. May differ from one-time setup fees.',
    valueRanges: { min: 0, max: 100000, typical: '$100 - $5,000/month' },
    primarySource: 'start_packet_pdf',
    sourceFieldName: 'Pricing Section - Monthly Amount',
    transformations: [
      {
        sourceSystem: 'start_packet_pdf',
        sourceField: 'Pricing Section - Monthly Amount',
        transformationType: 'parsed',
        transformationLogic: 'Parse currency value from pricing section, remove $ and commas, convert to decimal',
        exampleInput: '$1,500.00/month',
        exampleOutput: '1500.00'
      }
    ],
    governanceOwner: 'Finance',
    steward: 'Revenue Accounting',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-11-01',
    nextReviewDate: '2025-05-01',
    kpisUsing: ['revenue_mtd', 'forecast_revenue_8w'],
    relatedFields: ['ACC_CONTRACT_VALUE', 'SP_SETUP_FEE'],
    dataQualityRules: [
      {
        ruleId: 'SP_MP_001',
        ruleName: 'Monthly Price Non-Negative',
        ruleType: 'range',
        severity: 'critical',
        description: 'Monthly contract price cannot be negative',
        validationLogic: 'monthly_contract_price >= 0',
        failureMessage: 'Negative monthly contract price',
        remediation: 'Correct price to valid positive amount'
      },
      {
        ruleId: 'SP_MP_002',
        ruleName: 'Monthly Price Consistency',
        ruleType: 'consistency',
        severity: 'warning',
        description: 'Start packet price should match Salesforce opportunity amount / 12',
        validationLogic: 'ABS(monthly_contract_price - (sf_opportunity_amount / 12)) <= 10',
        failureMessage: 'Monthly price mismatch between start packet and Salesforce',
        remediation: 'Reconcile pricing between start packet and Salesforce'
      }
    ],
    accessLevel: 'restricted',
    createdAt: '2024-01-01',
    updatedAt: '2024-11-01',
    version: '1.1',
    tags: ['contract', 'pricing', 'start-packet', 'financial']
  }
];

// =============================================================================
// GEOGRAPHY DOMAIN FIELDS
// =============================================================================

const geographyFields: FieldDefinition[] = [
  {
    fieldId: 'GEO_MARKET_ID',
    fieldName: 'market_id',
    displayName: 'Market ID',
    domain: 'geography',
    category: 'identifier',
    dataType: 'string',
    format: 'MKT-XXX',
    nullable: false,
    definition: 'Unique identifier for each geographic market.',
    businessContext: 'Highest level of geographic hierarchy. Markets contain multiple regions and are used for P&L reporting.',
    primarySource: 'rtx_data_hub',
    sourceFieldName: 'MARKET_CD',
    transformations: [
      {
        sourceSystem: 'rtx_data_hub',
        sourceField: 'MARKET_CD',
        transformationType: 'direct_map',
        transformationLogic: "Prefix 'MKT-' + 3-character market code",
        exampleInput: 'SE',
        exampleOutput: 'MKT-SE'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Territory Planning',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-06-01',
    nextReviewDate: '2024-12-01',
    kpisUsing: ['revenue_mtd', 'variance_to_target_mtd'],
    relatedFields: ['GEO_REGION_ID', 'ACC_BRANCH_ID'],
    dataQualityRules: [
      {
        ruleId: 'GEO_MKT_001',
        ruleName: 'Valid Market Reference',
        ruleType: 'referential',
        severity: 'critical',
        description: 'Market ID must exist in the market master table',
        validationLogic: 'market_id IN (SELECT market_id FROM markets)',
        failureMessage: 'Invalid market ID reference',
        remediation: 'Assign valid market to record'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-06-01',
    version: '1.0',
    tags: ['geography', 'hierarchy', 'identifier']
  },
  {
    fieldId: 'GEO_REGION_ID',
    fieldName: 'region_id',
    displayName: 'Region ID',
    domain: 'geography',
    category: 'identifier',
    dataType: 'string',
    format: 'REG-XXX',
    nullable: false,
    definition: 'Unique identifier for each region within a market.',
    businessContext: 'Middle level of geographic hierarchy. Regions contain multiple branches and report to a Market Director.',
    primarySource: 'rtx_data_hub',
    sourceFieldName: 'REGION_CD',
    transformations: [
      {
        sourceSystem: 'rtx_data_hub',
        sourceField: 'REGION_CD',
        transformationType: 'direct_map',
        transformationLogic: "Prefix 'REG-' + region code (R16, R23, etc.)",
        exampleInput: 'R16',
        exampleOutput: 'REG-R16'
      }
    ],
    governanceOwner: 'Operations',
    steward: 'Territory Planning',
    governanceStatus: 'approved',
    lastReviewedDate: '2024-06-01',
    nextReviewDate: '2024-12-01',
    kpisUsing: ['revenue_mtd', 'service_risk_index'],
    relatedFields: ['GEO_MARKET_ID', 'ACC_BRANCH_ID'],
    dataQualityRules: [
      {
        ruleId: 'GEO_REG_001',
        ruleName: 'Valid Region Reference',
        ruleType: 'referential',
        severity: 'critical',
        description: 'Region ID must exist in the region master table',
        validationLogic: 'region_id IN (SELECT region_id FROM regions)',
        failureMessage: 'Invalid region ID reference',
        remediation: 'Assign valid region to record'
      }
    ],
    accessLevel: 'internal',
    createdAt: '2024-01-01',
    updatedAt: '2024-06-01',
    version: '1.0',
    tags: ['geography', 'hierarchy', 'identifier']
  }
];

// =============================================================================
// COMBINE ALL FIELD DEFINITIONS
// =============================================================================

export const DATA_DICTIONARY: FieldDefinition[] = [
  ...accountFields,
  ...opportunityFields,
  ...serviceEventFields,
  ...invoiceFields,
  ...kpiFields,
  ...userFields,
  ...contractFields,
  ...geographyFields
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getFieldById(fieldId: string): FieldDefinition | undefined {
  return DATA_DICTIONARY.find(f => f.fieldId === fieldId);
}

export function getFieldByName(fieldName: string): FieldDefinition | undefined {
  return DATA_DICTIONARY.find(f => f.fieldName === fieldName);
}

export function getFieldsByDomain(domain: FieldDefinition['domain']): FieldDefinition[] {
  return DATA_DICTIONARY.filter(f => f.domain === domain);
}

export function getFieldsBySource(source: DataSource): FieldDefinition[] {
  return DATA_DICTIONARY.filter(f =>
    f.primarySource === source ||
    (f.secondarySources && f.secondarySources.includes(source))
  );
}

export function getFieldsByKpi(kpiSlug: string): FieldDefinition[] {
  return DATA_DICTIONARY.filter(f => f.kpisUsing.includes(kpiSlug));
}

export function getFieldsWithQualityIssues(): FieldDefinition[] {
  return DATA_DICTIONARY.filter(f =>
    f.dataQualityRules.some(r => r.severity === 'critical' || r.severity === 'warning')
  );
}

export function getAllDataQualityRules(): DataQualityRule[] {
  return DATA_DICTIONARY.flatMap(f => f.dataQualityRules);
}

export function searchFields(query: string): FieldDefinition[] {
  const lowerQuery = query.toLowerCase();
  return DATA_DICTIONARY.filter(f =>
    f.fieldName.toLowerCase().includes(lowerQuery) ||
    f.displayName.toLowerCase().includes(lowerQuery) ||
    f.definition.toLowerCase().includes(lowerQuery) ||
    f.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

// =============================================================================
// SUMMARY STATISTICS
// =============================================================================

export function getDataDictionaryStats() {
  const sourceCount = new Map<DataSource, number>();
  const domainCount = new Map<string, number>();
  const rulesBySeverity = { critical: 0, warning: 0, info: 0 };

  DATA_DICTIONARY.forEach(field => {
    // Count by source
    sourceCount.set(
      field.primarySource,
      (sourceCount.get(field.primarySource) || 0) + 1
    );

    // Count by domain
    domainCount.set(
      field.domain,
      (domainCount.get(field.domain) || 0) + 1
    );

    // Count rules by severity
    field.dataQualityRules.forEach(rule => {
      rulesBySeverity[rule.severity]++;
    });
  });

  return {
    totalFields: DATA_DICTIONARY.length,
    bySource: Object.fromEntries(sourceCount),
    byDomain: Object.fromEntries(domainCount),
    totalRules: Object.values(rulesBySeverity).reduce((a, b) => a + b, 0),
    rulesBySeverity,
    approvedFields: DATA_DICTIONARY.filter(f => f.governanceStatus === 'approved').length,
    pendingReviewFields: DATA_DICTIONARY.filter(f => f.governanceStatus === 'pending_review').length
  };
}

// Source system metadata for display
export const DATA_SOURCES_METADATA: Record<DataSource, {
  name: string;
  description: string;
  type: 'primary' | 'secondary' | 'derived';
  refreshFrequency: string;
  owner: string;
}> = {
  rtx_data_hub: {
    name: 'RTX Data Hub',
    description: 'Enterprise data warehouse - single source of truth for transactional data',
    type: 'primary',
    refreshFrequency: 'Every 15 minutes',
    owner: 'Data Platform Team'
  },
  salesforce: {
    name: 'Salesforce CRM',
    description: 'Customer relationship management - accounts, contacts, opportunities',
    type: 'primary',
    refreshFrequency: 'Real-time',
    owner: 'Sales Operations'
  },
  pestpac: {
    name: 'PestPac Field Service',
    description: 'Field service management - routes, service events, equipment',
    type: 'primary',
    refreshFrequency: 'Every 15 minutes',
    owner: 'Operations'
  },
  start_packet_pdf: {
    name: 'Start Packet PDFs',
    description: 'Manual contract documents - customer onboarding, pricing, equipment specs',
    type: 'secondary',
    refreshFrequency: 'On upload',
    owner: 'Sales Operations'
  },
  calculated: {
    name: 'Calculated Fields',
    description: 'Derived metrics computed in-app from other data sources',
    type: 'derived',
    refreshFrequency: 'On demand',
    owner: 'BI Team'
  },
  workday: {
    name: 'Workday HR',
    description: 'Human resources - employee records, job families, org hierarchy',
    type: 'primary',
    refreshFrequency: 'Daily',
    owner: 'HR Operations'
  },
  sap: {
    name: 'SAP Financials',
    description: 'Enterprise financials - invoices, payments, AR/AP',
    type: 'primary',
    refreshFrequency: 'Hourly',
    owner: 'Finance'
  }
};
