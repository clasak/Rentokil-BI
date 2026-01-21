/**
 * Start Packet Data Requirements
 *
 * Defines what data must be captured in every start packet PDF.
 * This standardizes the handoff from Sales to Operations and ensures
 * all downstream systems receive the data they need.
 *
 * Addresses: "What level of detail" must be in start packets and
 * "These different classifications with these different statuses"
 */

export type StartPacketSection =
  | 'customer_information'
  | 'service_address'
  | 'billing_information'
  | 'service_agreement'
  | 'equipment_details'
  | 'pricing'
  | 'special_instructions'
  | 'signatures';

export interface StartPacketRequirement {
  fieldId: string;
  section: StartPacketSection;
  fieldName: string;
  displayName: string;
  required: boolean;
  dataType: 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'currency' | 'phone' | 'email' | 'address';
  exampleValue: string;
  extractionPattern?: string; // Regex pattern for PDF text extraction
  extractionHints?: string[]; // Common label variations found in PDFs
  downstreamSystems: string[];
  validationRule?: string;
  businessJustification: string;
  salesResponsibility: boolean; // If true, Sales must fill this out
  opsResponsibility: boolean; // If true, Ops reviews/completes this
}

export const START_PACKET_REQUIREMENTS: StartPacketRequirement[] = [
  // =============================================================================
  // CUSTOMER INFORMATION SECTION
  // =============================================================================
  {
    fieldId: 'SP_001',
    section: 'customer_information',
    fieldName: 'customer_business_name',
    displayName: 'Customer/Business Name',
    required: true,
    dataType: 'string',
    exampleValue: 'ABC Restaurant Supply',
    extractionPattern: 'Customer\\s*Name:?\\s*([^\\n]+)|Business\\s*Name:?\\s*([^\\n]+)',
    extractionHints: ['Customer Name', 'Business Name', 'Account Name', 'Company Name'],
    downstreamSystems: ['Salesforce', 'RTX Data Hub', 'Billing', 'PestPac'],
    businessJustification: 'Primary identifier for account creation and all customer communications.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_002',
    section: 'customer_information',
    fieldName: 'contact_name',
    displayName: 'Primary Contact Name',
    required: true,
    dataType: 'string',
    exampleValue: 'John Smith',
    extractionPattern: 'Contact:?\\s*([^\\n]+)|Primary\\s*Contact:?\\s*([^\\n]+)',
    extractionHints: ['Contact Name', 'Primary Contact', 'Site Contact'],
    downstreamSystems: ['Salesforce', 'PestPac', 'Service Notifications'],
    businessJustification: 'Required for service appointment coordination and on-site contact.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_003',
    section: 'customer_information',
    fieldName: 'contact_phone',
    displayName: 'Contact Phone Number',
    required: true,
    dataType: 'phone',
    exampleValue: '(555) 123-4567',
    extractionPattern: 'Phone:?\\s*([\\d\\-\\(\\)\\s\\.]+)',
    extractionHints: ['Phone', 'Phone Number', 'Cell', 'Mobile', 'Contact Phone'],
    downstreamSystems: ['Salesforce', 'PestPac', 'Service Notifications', 'SMS Platform'],
    validationRule: '/^\\+?1?[\\s.-]?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$/',
    businessJustification: 'Critical for service coordination and emergency communications.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_004',
    section: 'customer_information',
    fieldName: 'contact_email',
    displayName: 'Contact Email',
    required: true,
    dataType: 'email',
    exampleValue: 'jsmith@abcsupply.com',
    extractionPattern: 'Email:?\\s*([\\w\\.-]+@[\\w\\.-]+)',
    extractionHints: ['Email', 'Email Address', 'E-mail'],
    downstreamSystems: ['Salesforce', 'Billing', 'Email Platform', 'Customer Portal'],
    validationRule: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/',
    businessJustification: 'Required for digital communications, invoices, and service confirmations.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_005',
    section: 'customer_information',
    fieldName: 'account_type',
    displayName: 'Account Type',
    required: true,
    dataType: 'enum',
    exampleValue: 'Commercial',
    extractionPattern: 'Account\\s*Type:?\\s*(Commercial|Residential|Government)',
    extractionHints: ['Account Type', 'Customer Type', 'Service Type'],
    downstreamSystems: ['Salesforce', 'RTX Data Hub', 'Pricing Engine', 'Compliance'],
    businessJustification: 'Determines pricing tier, compliance requirements, and service protocols.',
    salesResponsibility: true,
    opsResponsibility: false
  },

  // =============================================================================
  // SERVICE ADDRESS SECTION
  // =============================================================================
  {
    fieldId: 'SP_010',
    section: 'service_address',
    fieldName: 'service_street',
    displayName: 'Service Street Address',
    required: true,
    dataType: 'address',
    exampleValue: '123 Main Street, Suite 100',
    extractionPattern: 'Service\\s*Address:?\\s*([^\\n]+)|Property\\s*Address:?\\s*([^\\n]+)',
    extractionHints: ['Service Address', 'Property Address', 'Site Address', 'Location'],
    downstreamSystems: ['Salesforce', 'PestPac', 'Routing System', 'RTX Data Hub'],
    businessJustification: 'Essential for technician dispatch and route optimization.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_011',
    section: 'service_address',
    fieldName: 'service_city',
    displayName: 'Service City',
    required: true,
    dataType: 'string',
    exampleValue: 'Memphis',
    extractionPattern: 'City:?\\s*([A-Za-z\\s]+)',
    extractionHints: ['City'],
    downstreamSystems: ['Salesforce', 'PestPac', 'Routing System', 'RTX Data Hub'],
    businessJustification: 'Required for service territory assignment.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_012',
    section: 'service_address',
    fieldName: 'service_state',
    displayName: 'Service State',
    required: true,
    dataType: 'enum',
    exampleValue: 'TN',
    extractionPattern: 'State:?\\s*([A-Z]{2})',
    extractionHints: ['State', 'ST'],
    downstreamSystems: ['Salesforce', 'PestPac', 'Routing System', 'RTX Data Hub', 'Compliance'],
    validationRule: '/^[A-Z]{2}$/',
    businessJustification: 'Required for territory assignment and regulatory compliance.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_013',
    section: 'service_address',
    fieldName: 'service_zip',
    displayName: 'Service ZIP Code',
    required: true,
    dataType: 'string',
    exampleValue: '38103',
    extractionPattern: 'ZIP:?\\s*(\\d{5}(?:-\\d{4})?)|Zip\\s*Code:?\\s*(\\d{5})',
    extractionHints: ['ZIP', 'Zip Code', 'Postal Code'],
    downstreamSystems: ['Salesforce', 'PestPac', 'Routing System', 'RTX Data Hub', 'Geo Analytics'],
    validationRule: '/^\\d{5}(-\\d{4})?$/',
    businessJustification: 'Critical for route optimization and market analysis.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_014',
    section: 'service_address',
    fieldName: 'access_instructions',
    displayName: 'Site Access Instructions',
    required: false,
    dataType: 'string',
    exampleValue: 'Use side entrance, ask for manager on duty. Gate code: 1234',
    extractionPattern: 'Access:?\\s*([^\\n]+)|Instructions:?\\s*([^\\n]+)',
    extractionHints: ['Access Instructions', 'Site Access', 'Entry Instructions', 'Gate Code'],
    downstreamSystems: ['PestPac', 'Service Notes'],
    businessJustification: 'Ensures technician can access site on first visit, reducing callbacks.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_015',
    section: 'service_address',
    fieldName: 'property_square_footage',
    displayName: 'Property Square Footage',
    required: true,
    dataType: 'number',
    exampleValue: '5000',
    extractionPattern: '(\\d{1,3}(?:,\\d{3})*)\\s*(?:sq\\.?\\s*ft\\.?|square\\s*feet)',
    extractionHints: ['Square Footage', 'Sq Ft', 'SF', 'Square Feet', 'Total Area'],
    downstreamSystems: ['Salesforce', 'Pricing Engine', 'Service Scheduling', 'Capacity Planning'],
    businessJustification: 'Determines service time estimates, pricing, and equipment needs.',
    salesResponsibility: true,
    opsResponsibility: false
  },

  // =============================================================================
  // BILLING INFORMATION SECTION
  // =============================================================================
  {
    fieldId: 'SP_020',
    section: 'billing_information',
    fieldName: 'billing_same_as_service',
    displayName: 'Billing Same as Service',
    required: true,
    dataType: 'boolean',
    exampleValue: 'Yes',
    extractionPattern: 'Billing\\s*(?:Address)?\\s*(?:Same|Identical)\\s*(?:as)?:?\\s*(Yes|No|X)',
    extractionHints: ['Billing Same', 'Same as Service', 'Same Address'],
    downstreamSystems: ['Billing', 'Salesforce'],
    businessJustification: 'Ensures invoices are sent to correct address.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_021',
    section: 'billing_information',
    fieldName: 'billing_street',
    displayName: 'Billing Street Address',
    required: false,
    dataType: 'address',
    exampleValue: '456 Corporate Way',
    extractionPattern: 'Billing\\s*Address:?\\s*([^\\n]+)',
    extractionHints: ['Billing Address', 'Bill To', 'Invoice Address'],
    downstreamSystems: ['Billing', 'Salesforce', 'Finance'],
    businessJustification: 'Required if different from service address for accurate invoicing.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_022',
    section: 'billing_information',
    fieldName: 'billing_contact_name',
    displayName: 'Billing Contact Name',
    required: false,
    dataType: 'string',
    exampleValue: 'Accounts Payable',
    extractionPattern: 'Billing\\s*Contact:?\\s*([^\\n]+)|AP\\s*Contact:?\\s*([^\\n]+)',
    extractionHints: ['Billing Contact', 'AP Contact', 'Accounts Payable'],
    downstreamSystems: ['Billing', 'Salesforce'],
    businessJustification: 'Ensures invoices reach the right person for faster payment.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_023',
    section: 'billing_information',
    fieldName: 'billing_email',
    displayName: 'Billing Email',
    required: true,
    dataType: 'email',
    exampleValue: 'ap@abcsupply.com',
    extractionPattern: 'Billing\\s*Email:?\\s*([\\w\\.-]+@[\\w\\.-]+)',
    extractionHints: ['Billing Email', 'Invoice Email', 'AP Email'],
    downstreamSystems: ['Billing', 'Email Platform', 'Finance'],
    validationRule: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/',
    businessJustification: 'Critical for electronic invoice delivery and payment processing.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_024',
    section: 'billing_information',
    fieldName: 'payment_terms',
    displayName: 'Payment Terms',
    required: true,
    dataType: 'enum',
    exampleValue: 'Net 30',
    extractionPattern: 'Payment\\s*Terms:?\\s*(Net\\s*\\d+|Due\\s*on\\s*Receipt|COD)',
    extractionHints: ['Payment Terms', 'Terms', 'Net Terms'],
    downstreamSystems: ['Billing', 'Finance', 'AR System'],
    businessJustification: 'Determines invoice due dates and collection schedule.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_025',
    section: 'billing_information',
    fieldName: 'po_required',
    displayName: 'PO Required',
    required: true,
    dataType: 'boolean',
    exampleValue: 'No',
    extractionPattern: 'PO\\s*Required:?\\s*(Yes|No|X)',
    extractionHints: ['PO Required', 'Purchase Order Required', 'Requires PO'],
    downstreamSystems: ['Billing', 'Salesforce', 'Finance'],
    businessJustification: 'Ensures proper documentation is obtained before invoicing.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_026',
    section: 'billing_information',
    fieldName: 'po_number',
    displayName: 'PO Number',
    required: false,
    dataType: 'string',
    exampleValue: 'PO-2024-12345',
    extractionPattern: 'PO\\s*(?:#|Number|No\\.?):?\\s*([A-Z0-9\\-]+)',
    extractionHints: ['PO Number', 'PO#', 'Purchase Order'],
    downstreamSystems: ['Billing', 'Finance'],
    businessJustification: 'Required for customers that need PO on invoice for payment.',
    salesResponsibility: true,
    opsResponsibility: false
  },

  // =============================================================================
  // SERVICE AGREEMENT SECTION
  // =============================================================================
  {
    fieldId: 'SP_030',
    section: 'service_agreement',
    fieldName: 'service_type',
    displayName: 'Service Type',
    required: true,
    dataType: 'enum',
    exampleValue: 'Commercial Pest Control',
    extractionPattern: 'Service\\s*Type:?\\s*([^\\n]+)',
    extractionHints: ['Service Type', 'Type of Service', 'Service Category'],
    downstreamSystems: ['Salesforce', 'PestPac', 'Pricing Engine', 'Service Scheduling'],
    businessJustification: 'Determines technician specialization, equipment, and pricing.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_031',
    section: 'service_agreement',
    fieldName: 'service_frequency',
    displayName: 'Service Frequency',
    required: true,
    dataType: 'enum',
    exampleValue: 'Monthly',
    extractionPattern: 'Service\\s*Frequency:?\\s*(Monthly|Weekly|Bi-Weekly|Quarterly|Annual|On-Demand)',
    extractionHints: ['Service Frequency', 'Frequency', 'Visit Frequency'],
    downstreamSystems: ['PestPac', 'Service Scheduling', 'Route Planning', 'Revenue Recognition'],
    businessJustification: 'Critical for scheduling, route planning, and revenue forecasting.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_032',
    section: 'service_agreement',
    fieldName: 'contract_term',
    displayName: 'Contract Term (Months)',
    required: true,
    dataType: 'number',
    exampleValue: '12',
    extractionPattern: '(\\d+)\\s*(?:month|mo|yr|year)',
    extractionHints: ['Contract Term', 'Term', 'Agreement Period', 'Contract Length'],
    downstreamSystems: ['Salesforce', 'Finance', 'Revenue Recognition', 'Renewal Tracking'],
    businessJustification: 'Determines contract value, renewal date, and revenue recognition.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_033',
    section: 'service_agreement',
    fieldName: 'start_date',
    displayName: 'Service Start Date',
    required: true,
    dataType: 'date',
    exampleValue: '2024-02-01',
    extractionPattern: 'Start\\s*Date:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})',
    extractionHints: ['Start Date', 'Service Start', 'Effective Date', 'Begin Date'],
    downstreamSystems: ['Salesforce', 'PestPac', 'Service Scheduling', 'Finance'],
    businessJustification: 'Triggers operational handoff and revenue recognition start.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_034',
    section: 'service_agreement',
    fieldName: 'initial_service_date',
    displayName: 'Initial Service Date',
    required: true,
    dataType: 'date',
    exampleValue: '2024-02-05',
    extractionPattern: 'Initial\\s*Service:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})|First\\s*Service:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})',
    extractionHints: ['Initial Service', 'First Service', 'Setup Date'],
    downstreamSystems: ['PestPac', 'Service Scheduling', 'Technician Dispatch'],
    businessJustification: 'Schedules the initial setup visit which may differ from contract start.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_035',
    section: 'service_agreement',
    fieldName: 'preferred_service_day',
    displayName: 'Preferred Service Day',
    required: false,
    dataType: 'enum',
    exampleValue: 'Tuesday',
    extractionPattern: 'Preferred\\s*(?:Service)?\\s*Day:?\\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)',
    extractionHints: ['Preferred Day', 'Service Day', 'Best Day'],
    downstreamSystems: ['PestPac', 'Route Planning', 'Service Scheduling'],
    businessJustification: 'Improves customer satisfaction and service completion rate.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_036',
    section: 'service_agreement',
    fieldName: 'preferred_service_time',
    displayName: 'Preferred Service Time',
    required: false,
    dataType: 'enum',
    exampleValue: 'Morning',
    extractionPattern: 'Preferred\\s*(?:Service)?\\s*Time:?\\s*(Morning|Afternoon|Evening|Before\\s*Open|After\\s*Close)',
    extractionHints: ['Preferred Time', 'Service Time', 'Best Time', 'Service Window'],
    downstreamSystems: ['PestPac', 'Route Planning', 'Service Scheduling'],
    businessJustification: 'Ensures service does not disrupt customer operations.',
    salesResponsibility: true,
    opsResponsibility: true
  },

  // =============================================================================
  // EQUIPMENT DETAILS SECTION
  // =============================================================================
  {
    fieldId: 'SP_040',
    section: 'equipment_details',
    fieldName: 'exterior_rbs_count',
    displayName: 'Exterior RBS Count',
    required: true,
    dataType: 'number',
    exampleValue: '25',
    extractionPattern: '(\\d+)\\s*(?:exterior|outdoor|perimeter)\\s*(?:RBS|rodent\\s*bait\\s*station)',
    extractionHints: ['Exterior RBS', 'Outdoor RBS', 'Perimeter Stations', '# Exterior RBS'],
    downstreamSystems: ['PestPac', 'Inventory', 'Billing', 'Capacity Planning'],
    businessJustification: 'Determines equipment inventory, service time, and pricing for exterior rodent control.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_041',
    section: 'equipment_details',
    fieldName: 'interior_rbs_count',
    displayName: 'Interior RBS Count',
    required: true,
    dataType: 'number',
    exampleValue: '12',
    extractionPattern: '(\\d+)\\s*(?:interior|indoor|inside)\\s*(?:RBS|rodent\\s*bait\\s*station)',
    extractionHints: ['Interior RBS', 'Indoor RBS', 'Inside Stations', '# Interior RBS'],
    downstreamSystems: ['PestPac', 'Inventory', 'Billing', 'Capacity Planning'],
    businessJustification: 'Determines equipment inventory, service time, and pricing for interior rodent control.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_042',
    section: 'equipment_details',
    fieldName: 'fly_lights_count',
    displayName: 'Fly Light Count',
    required: false,
    dataType: 'number',
    exampleValue: '4',
    extractionPattern: '(\\d+)\\s*(?:fly\\s*light|ILT|insect\\s*light)',
    extractionHints: ['Fly Lights', 'ILT', 'Insect Light Traps', 'Light Traps'],
    downstreamSystems: ['PestPac', 'Inventory', 'Billing'],
    businessJustification: 'Tracks specialized equipment for maintenance scheduling.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_043',
    section: 'equipment_details',
    fieldName: 'glue_boards_count',
    displayName: 'Glue Board Count',
    required: false,
    dataType: 'number',
    exampleValue: '20',
    extractionPattern: '(\\d+)\\s*(?:glue\\s*board|sticky\\s*trap|monitor)',
    extractionHints: ['Glue Boards', 'Sticky Traps', 'Monitors', 'Glue Traps'],
    downstreamSystems: ['PestPac', 'Inventory'],
    businessJustification: 'Determines consumable inventory and replacement schedule.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_044',
    section: 'equipment_details',
    fieldName: 'special_equipment_notes',
    displayName: 'Special Equipment Notes',
    required: false,
    dataType: 'string',
    exampleValue: 'Customer requires locked stations due to food safety. Use tamper-resistant only.',
    extractionPattern: 'Equipment\\s*Notes:?\\s*([^\\n]+)|Special\\s*Requirements:?\\s*([^\\n]+)',
    extractionHints: ['Equipment Notes', 'Special Requirements', 'Equipment Instructions'],
    downstreamSystems: ['PestPac', 'Service Notes', 'Compliance'],
    businessJustification: 'Ensures proper equipment selection for compliance and customer requirements.',
    salesResponsibility: true,
    opsResponsibility: true
  },

  // =============================================================================
  // PRICING SECTION
  // =============================================================================
  {
    fieldId: 'SP_050',
    section: 'pricing',
    fieldName: 'monthly_service_amount',
    displayName: 'Monthly Service Amount',
    required: true,
    dataType: 'currency',
    exampleValue: '350.00',
    extractionPattern: '\\$?([\\d,]+\\.?\\d*)\\s*(?:/|per)?\\s*(?:mo|month)',
    extractionHints: ['Monthly Amount', 'Monthly Fee', 'Monthly Rate', 'Recurring Amount'],
    downstreamSystems: ['Salesforce', 'Billing', 'Finance', 'Revenue Recognition'],
    businessJustification: 'Primary revenue metric for forecasting and commission calculation.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_051',
    section: 'pricing',
    fieldName: 'initial_service_amount',
    displayName: 'Initial Service Amount',
    required: true,
    dataType: 'currency',
    exampleValue: '500.00',
    extractionPattern: 'Initial:?\\s*\\$?([\\d,]+\\.?\\d*)|Setup:?\\s*\\$?([\\d,]+\\.?\\d*)',
    extractionHints: ['Initial Amount', 'Setup Fee', 'Initial Fee', 'One-Time Setup'],
    downstreamSystems: ['Salesforce', 'Billing', 'Finance'],
    businessJustification: 'Captures one-time setup revenue, affects cash flow timing.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_052',
    section: 'pricing',
    fieldName: 'total_contract_value',
    displayName: 'Total Contract Value (ACV)',
    required: true,
    dataType: 'currency',
    exampleValue: '4700.00',
    extractionPattern: 'Total\\s*(?:Contract)?\\s*Value:?\\s*\\$?([\\d,]+\\.?\\d*)|ACV:?\\s*\\$?([\\d,]+\\.?\\d*)',
    extractionHints: ['Total Contract Value', 'TCV', 'Annual Value', 'ACV', 'Contract Amount'],
    downstreamSystems: ['Salesforce', 'Finance', 'Sales Analytics', 'Forecasting'],
    businessJustification: 'Key sales metric for quota attainment and forecasting.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_053',
    section: 'pricing',
    fieldName: 'discount_applied',
    displayName: 'Discount Applied',
    required: false,
    dataType: 'string',
    exampleValue: '10% Multi-Location Discount',
    extractionPattern: 'Discount:?\\s*([^\\n]+)',
    extractionHints: ['Discount', 'Discount Applied', 'Special Pricing'],
    downstreamSystems: ['Salesforce', 'Finance', 'Pricing Analytics'],
    businessJustification: 'Tracks pricing exceptions for margin analysis.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_054',
    section: 'pricing',
    fieldName: 'commission_split',
    displayName: 'Commission Split',
    required: false,
    dataType: 'string',
    exampleValue: 'AE: 70% / Manager: 30%',
    extractionPattern: 'Commission:?\\s*([^\\n]+)|Split:?\\s*([^\\n]+)',
    extractionHints: ['Commission', 'Commission Split', 'Sales Split'],
    downstreamSystems: ['Salesforce', 'Payroll', 'Commission System'],
    businessJustification: 'Ensures proper commission payout for team sales.',
    salesResponsibility: true,
    opsResponsibility: false
  },

  // =============================================================================
  // SPECIAL INSTRUCTIONS SECTION
  // =============================================================================
  {
    fieldId: 'SP_060',
    section: 'special_instructions',
    fieldName: 'service_notes',
    displayName: 'Service Notes',
    required: false,
    dataType: 'string',
    exampleValue: 'High-security facility. Technician must sign in at front desk. No photos allowed.',
    extractionPattern: 'Service\\s*Notes:?\\s*([^\\n]+)|Special\\s*Instructions:?\\s*([^\\n]+)',
    extractionHints: ['Service Notes', 'Special Instructions', 'Notes', 'Comments'],
    downstreamSystems: ['PestPac', 'Service Notes'],
    businessJustification: 'Ensures technician is prepared for unique site requirements.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_061',
    section: 'special_instructions',
    fieldName: 'health_safety_requirements',
    displayName: 'Health & Safety Requirements',
    required: false,
    dataType: 'string',
    exampleValue: 'Food service facility - all treatments must be food-safe. Provide SDS on request.',
    extractionPattern: 'Health\\s*(?:&|and)?\\s*Safety:?\\s*([^\\n]+)|Compliance:?\\s*([^\\n]+)',
    extractionHints: ['Health Safety', 'Compliance', 'Regulatory', 'Food Safety'],
    downstreamSystems: ['PestPac', 'Compliance', 'Service Notes'],
    businessJustification: 'Critical for regulatory compliance and customer safety requirements.',
    salesResponsibility: true,
    opsResponsibility: true
  },
  {
    fieldId: 'SP_062',
    section: 'special_instructions',
    fieldName: 'competitor_takeover',
    displayName: 'Competitor Takeover',
    required: true,
    dataType: 'boolean',
    exampleValue: 'Yes',
    extractionPattern: 'Competitor:?\\s*(Yes|No|X)|Takeover:?\\s*(Yes|No|X)',
    extractionHints: ['Competitor', 'Takeover', 'Previous Provider', 'Switching From'],
    downstreamSystems: ['Salesforce', 'Competitive Analytics'],
    businessJustification: 'Tracks competitive wins for market analysis.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_063',
    section: 'special_instructions',
    fieldName: 'previous_provider',
    displayName: 'Previous Provider',
    required: false,
    dataType: 'string',
    exampleValue: 'Terminix',
    extractionPattern: 'Previous\\s*Provider:?\\s*([^\\n]+)|Current\\s*Provider:?\\s*([^\\n]+)',
    extractionHints: ['Previous Provider', 'Current Provider', 'Competitor Name'],
    downstreamSystems: ['Salesforce', 'Competitive Analytics'],
    businessJustification: 'Competitive intelligence for market share tracking.',
    salesResponsibility: true,
    opsResponsibility: false
  },

  // =============================================================================
  // SIGNATURES SECTION
  // =============================================================================
  {
    fieldId: 'SP_070',
    section: 'signatures',
    fieldName: 'customer_signature',
    displayName: 'Customer Signature',
    required: true,
    dataType: 'boolean',
    exampleValue: 'Signed',
    extractionPattern: 'Customer\\s*Signature:?\\s*(Signed|X|[A-Za-z]+)',
    extractionHints: ['Customer Signature', 'Authorized Signature', 'Client Signature'],
    downstreamSystems: ['Salesforce', 'Contract Management', 'Legal'],
    businessJustification: 'Legal requirement for contract enforcement.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_071',
    section: 'signatures',
    fieldName: 'customer_signature_date',
    displayName: 'Customer Signature Date',
    required: true,
    dataType: 'date',
    exampleValue: '2024-01-28',
    extractionPattern: 'Date:?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})',
    extractionHints: ['Date', 'Signature Date', 'Signed Date'],
    downstreamSystems: ['Salesforce', 'Contract Management'],
    businessJustification: 'Establishes contract effective date for legal purposes.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_072',
    section: 'signatures',
    fieldName: 'sales_rep_name',
    displayName: 'Sales Rep Name',
    required: true,
    dataType: 'string',
    exampleValue: 'Sarah Johnson',
    extractionPattern: 'Sales\\s*Rep:?\\s*([^\\n]+)|Representative:?\\s*([^\\n]+)',
    extractionHints: ['Sales Rep', 'Representative', 'Account Executive', 'AE'],
    downstreamSystems: ['Salesforce', 'Commission System', 'CRM'],
    businessJustification: 'Required for commission attribution and sales tracking.',
    salesResponsibility: true,
    opsResponsibility: false
  },
  {
    fieldId: 'SP_073',
    section: 'signatures',
    fieldName: 'sales_rep_signature',
    displayName: 'Sales Rep Signature',
    required: true,
    dataType: 'boolean',
    exampleValue: 'Signed',
    extractionPattern: 'Rep\\s*Signature:?\\s*(Signed|X|[A-Za-z]+)',
    extractionHints: ['Rep Signature', 'Sales Signature', 'AE Signature'],
    downstreamSystems: ['Salesforce', 'Contract Management'],
    businessJustification: 'Confirms sales rep accountability for contract terms.',
    salesResponsibility: true,
    opsResponsibility: false
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getRequirementsBySection(section: StartPacketSection): StartPacketRequirement[] {
  return START_PACKET_REQUIREMENTS.filter(r => r.section === section);
}

export function getRequiredFields(): StartPacketRequirement[] {
  return START_PACKET_REQUIREMENTS.filter(r => r.required);
}

export function getSalesResponsibilityFields(): StartPacketRequirement[] {
  return START_PACKET_REQUIREMENTS.filter(r => r.salesResponsibility);
}

export function getOpsResponsibilityFields(): StartPacketRequirement[] {
  return START_PACKET_REQUIREMENTS.filter(r => r.opsResponsibility);
}

export function getSectionDisplayName(section: StartPacketSection): string {
  const names: Record<StartPacketSection, string> = {
    customer_information: 'Customer Information',
    service_address: 'Service Address',
    billing_information: 'Billing Information',
    service_agreement: 'Service Agreement',
    equipment_details: 'Equipment Details',
    pricing: 'Pricing',
    special_instructions: 'Special Instructions',
    signatures: 'Signatures & Authorization'
  };
  return names[section];
}

export function getAllSections(): StartPacketSection[] {
  return [
    'customer_information',
    'service_address',
    'billing_information',
    'service_agreement',
    'equipment_details',
    'pricing',
    'special_instructions',
    'signatures'
  ];
}

export function getStartPacketStats() {
  const total = START_PACKET_REQUIREMENTS.length;
  const required = START_PACKET_REQUIREMENTS.filter(r => r.required).length;
  const salesFields = START_PACKET_REQUIREMENTS.filter(r => r.salesResponsibility).length;
  const opsFields = START_PACKET_REQUIREMENTS.filter(r => r.opsResponsibility).length;

  const bySection = getAllSections().reduce((acc, section) => {
    const sectionFields = getRequirementsBySection(section);
    acc[section] = {
      total: sectionFields.length,
      required: sectionFields.filter(f => f.required).length
    };
    return acc;
  }, {} as Record<StartPacketSection, { total: number; required: number }>);

  return { total, required, optional: total - required, salesFields, opsFields, bySection };
}

export function validateStartPacketData(data: Record<string, unknown>): {
  valid: boolean;
  errors: { field: string; error: string }[];
  completeness: number;
} {
  const errors: { field: string; error: string }[] = [];
  let filledRequired = 0;
  const totalRequired = START_PACKET_REQUIREMENTS.filter(r => r.required).length;

  for (const req of START_PACKET_REQUIREMENTS) {
    const value = data[req.fieldName];

    if (req.required) {
      if (value === null || value === undefined || value === '') {
        errors.push({
          field: req.displayName,
          error: `${req.displayName} is required for Start Packet completion`
        });
      } else {
        filledRequired++;
      }
    }

    // Validate patterns if value exists and pattern is defined
    if (value && req.validationRule) {
      try {
        const regex = new RegExp(req.validationRule.slice(1, -1));
        if (!regex.test(String(value))) {
          errors.push({
            field: req.displayName,
            error: `${req.displayName} format is invalid`
          });
        }
      } catch {
        // Skip invalid regex patterns
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    completeness: Math.round((filledRequired / totalRequired) * 100)
  };
}
