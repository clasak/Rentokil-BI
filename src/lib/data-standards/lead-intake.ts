/**
 * Lead Intake Data Standards
 *
 * Defines required fields, validation rules, and business justifications
 * for lead intake across all sales channels. This is the framework for
 * "what level of detail" data must be collected when a lead enters the system.
 *
 * Addresses: "How do we build that framework of you must send and receive
 * data at this level of detail" - Susan Williams
 */

export type CollectionSource =
  | 'Sales Rep'
  | 'Marketing Form'
  | 'Phone Call'
  | 'Start Packet PDF'
  | 'Partner Portal'
  | 'Web Chat'
  | 'Customer Service';

export type ValidationRuleType =
  | 'required'
  | 'format'
  | 'range'
  | 'lookup'
  | 'conditional'
  | 'cross_field';

export interface ValidationRule {
  type: ValidationRuleType;
  rule: string;
  errorMessage: string;
}

export interface LeadIntakeStandard {
  fieldId: string;
  fieldName: string;
  displayName: string;
  required: boolean;
  conditionallyRequired?: {
    dependsOn: string;
    condition: string;
  };
  dataType: 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'phone' | 'email' | 'address' | 'currency';
  validValues?: string[];
  validationRules: ValidationRule[];
  collectionSource: CollectionSource[];
  whyNeeded: string;
  downstreamSystems: string[];
  exampleValue?: string;
  category: 'contact' | 'property' | 'service_needs' | 'qualification' | 'source_tracking' | 'scheduling';
}

export const LEAD_INTAKE_STANDARDS: LeadIntakeStandard[] = [
  // =============================================================================
  // SOURCE TRACKING FIELDS
  // =============================================================================
  {
    fieldId: 'LEAD_001',
    fieldName: 'lead_source',
    displayName: 'Lead Source',
    required: true,
    dataType: 'enum',
    validValues: [
      'Inbound Call',
      'Field Generated',
      'Marketing Campaign',
      'Referral - Customer',
      'Referral - Partner',
      'Web Form',
      'Web Chat',
      'Door Knock',
      'Trade Show',
      'Commercial Prospecting'
    ],
    validationRules: [
      {
        type: 'required',
        rule: 'value !== null && value !== ""',
        errorMessage: 'Lead Source is required for all leads'
      },
      {
        type: 'lookup',
        rule: 'validValues.includes(value)',
        errorMessage: 'Lead Source must be one of the predefined values'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Web Chat'],
    whyNeeded: 'Required for Customer Acquisition Cost (CAC) calculation, channel ROI analysis, and marketing attribution. Without this, we cannot measure marketing effectiveness.',
    downstreamSystems: ['Salesforce', 'RTX Data Hub', 'Marketing Analytics'],
    exampleValue: 'Field Generated',
    category: 'source_tracking'
  },
  {
    fieldId: 'LEAD_002',
    fieldName: 'campaign_id',
    displayName: 'Campaign ID',
    required: false,
    conditionallyRequired: {
      dependsOn: 'lead_source',
      condition: "value === 'Marketing Campaign'"
    },
    dataType: 'string',
    validationRules: [
      {
        type: 'conditional',
        rule: "lead_source !== 'Marketing Campaign' || (campaign_id && campaign_id.length > 0)",
        errorMessage: 'Campaign ID required when Lead Source is Marketing Campaign'
      },
      {
        type: 'format',
        rule: '/^CAMP-\\d{6}$/.test(value)',
        errorMessage: 'Campaign ID must be in format CAMP-XXXXXX'
      }
    ],
    collectionSource: ['Marketing Form', 'Phone Call'],
    whyNeeded: 'Links lead to specific marketing campaign for cost per lead and conversion rate tracking.',
    downstreamSystems: ['Salesforce', 'Marketing Analytics', 'Finance'],
    exampleValue: 'CAMP-202401',
    category: 'source_tracking'
  },
  {
    fieldId: 'LEAD_003',
    fieldName: 'referral_source_name',
    displayName: 'Referral Source Name',
    required: false,
    conditionallyRequired: {
      dependsOn: 'lead_source',
      condition: "value.startsWith('Referral')"
    },
    dataType: 'string',
    validationRules: [
      {
        type: 'conditional',
        rule: "!lead_source.startsWith('Referral') || (referral_source_name && referral_source_name.length >= 2)",
        errorMessage: 'Referral source name required when Lead Source is a Referral type'
      }
    ],
    collectionSource: ['Sales Rep', 'Phone Call'],
    whyNeeded: 'Tracks referral sources for referral incentive programs and partner relationship management.',
    downstreamSystems: ['Salesforce', 'Partner Portal', 'Finance'],
    exampleValue: 'ABC Property Management',
    category: 'source_tracking'
  },

  // =============================================================================
  // CONTACT INFORMATION FIELDS
  // =============================================================================
  {
    fieldId: 'LEAD_010',
    fieldName: 'customer_name',
    displayName: 'Customer/Business Name',
    required: true,
    dataType: 'string',
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length >= 2',
        errorMessage: 'Customer name is required (minimum 2 characters)'
      },
      {
        type: 'format',
        rule: "/^[a-zA-Z0-9\\s\\-\\'&.,]+$/.test(value)",
        errorMessage: 'Customer name contains invalid characters'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF', 'Web Chat'],
    whyNeeded: 'Primary identifier for account creation. Used in contracts, invoicing, and all customer communications.',
    downstreamSystems: ['Salesforce', 'RTX Data Hub', 'Billing', 'PestPac'],
    exampleValue: 'ABC Restaurant Supply',
    category: 'contact'
  },
  {
    fieldId: 'LEAD_011',
    fieldName: 'contact_first_name',
    displayName: 'Contact First Name',
    required: true,
    dataType: 'string',
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length >= 1',
        errorMessage: 'Contact first name is required'
      },
      {
        type: 'format',
        rule: "/^[a-zA-Z\\-\\']+$/.test(value)",
        errorMessage: 'First name contains invalid characters'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF', 'Web Chat'],
    whyNeeded: 'Required for personalized communications, contract signatures, and CRM contact records.',
    downstreamSystems: ['Salesforce', 'RTX Data Hub', 'Service Notifications'],
    exampleValue: 'John',
    category: 'contact'
  },
  {
    fieldId: 'LEAD_012',
    fieldName: 'contact_last_name',
    displayName: 'Contact Last Name',
    required: true,
    dataType: 'string',
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length >= 1',
        errorMessage: 'Contact last name is required'
      },
      {
        type: 'format',
        rule: "/^[a-zA-Z\\-\\']+$/.test(value)",
        errorMessage: 'Last name contains invalid characters'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF', 'Web Chat'],
    whyNeeded: 'Required for personalized communications, contract signatures, and CRM contact records.',
    downstreamSystems: ['Salesforce', 'RTX Data Hub', 'Service Notifications'],
    exampleValue: 'Smith',
    category: 'contact'
  },
  {
    fieldId: 'LEAD_013',
    fieldName: 'contact_title',
    displayName: 'Contact Title/Role',
    required: false,
    dataType: 'string',
    validationRules: [],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call'],
    whyNeeded: 'Helps identify decision-maker status and appropriate communication level.',
    downstreamSystems: ['Salesforce'],
    exampleValue: 'Facility Manager',
    category: 'contact'
  },
  {
    fieldId: 'LEAD_014',
    fieldName: 'primary_phone',
    displayName: 'Primary Phone Number',
    required: true,
    dataType: 'phone',
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length >= 10',
        errorMessage: 'Primary phone number is required'
      },
      {
        type: 'format',
        rule: '/^\\+?1?[\\s.-]?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$/.test(value)',
        errorMessage: 'Phone number must be valid US format (10 digits)'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF', 'Web Chat'],
    whyNeeded: 'Primary communication channel for scheduling, service notifications, and sales follow-up.',
    downstreamSystems: ['Salesforce', 'PestPac', 'Service Notifications', 'SMS Platform'],
    exampleValue: '(555) 123-4567',
    category: 'contact'
  },
  {
    fieldId: 'LEAD_015',
    fieldName: 'email_address',
    displayName: 'Email Address',
    required: true,
    dataType: 'email',
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length >= 5',
        errorMessage: 'Email address is required'
      },
      {
        type: 'format',
        rule: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)',
        errorMessage: 'Email address must be in valid format'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF', 'Web Chat'],
    whyNeeded: 'Required for digital communications, service confirmations, invoicing, and marketing.',
    downstreamSystems: ['Salesforce', 'Billing', 'Email Platform', 'Customer Portal'],
    exampleValue: 'jsmith@abcsupply.com',
    category: 'contact'
  },

  // =============================================================================
  // PROPERTY/SERVICE ADDRESS FIELDS
  // =============================================================================
  {
    fieldId: 'LEAD_020',
    fieldName: 'service_address_street',
    displayName: 'Service Address - Street',
    required: true,
    dataType: 'string',
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length >= 5',
        errorMessage: 'Service street address is required'
      },
      {
        type: 'format',
        rule: '/\\d+/.test(value)',
        errorMessage: 'Street address should include a street number'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF'],
    whyNeeded: 'Required for technician routing, service territory assignment, and service delivery.',
    downstreamSystems: ['Salesforce', 'PestPac', 'Routing System', 'RTX Data Hub'],
    exampleValue: '123 Main Street',
    category: 'property'
  },
  {
    fieldId: 'LEAD_021',
    fieldName: 'service_address_city',
    displayName: 'Service Address - City',
    required: true,
    dataType: 'string',
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length >= 2',
        errorMessage: 'City is required'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF'],
    whyNeeded: 'Required for service territory assignment and route optimization.',
    downstreamSystems: ['Salesforce', 'PestPac', 'Routing System', 'RTX Data Hub'],
    exampleValue: 'Memphis',
    category: 'property'
  },
  {
    fieldId: 'LEAD_022',
    fieldName: 'service_address_state',
    displayName: 'Service Address - State',
    required: true,
    dataType: 'enum',
    validValues: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'],
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length === 2',
        errorMessage: 'State is required (2-letter code)'
      },
      {
        type: 'lookup',
        rule: 'validValues.includes(value.toUpperCase())',
        errorMessage: 'State must be valid US state code'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF'],
    whyNeeded: 'Required for service territory assignment and regulatory compliance.',
    downstreamSystems: ['Salesforce', 'PestPac', 'Routing System', 'RTX Data Hub', 'Compliance'],
    exampleValue: 'TN',
    category: 'property'
  },
  {
    fieldId: 'LEAD_023',
    fieldName: 'service_address_zip',
    displayName: 'Service Address - ZIP',
    required: true,
    dataType: 'string',
    validationRules: [
      {
        type: 'required',
        rule: 'value && value.length >= 5',
        errorMessage: 'ZIP code is required'
      },
      {
        type: 'format',
        rule: '/^\\d{5}(-\\d{4})?$/.test(value)',
        errorMessage: 'ZIP code must be 5 digits or ZIP+4 format'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF'],
    whyNeeded: 'Required for service territory assignment, route optimization, and market analysis.',
    downstreamSystems: ['Salesforce', 'PestPac', 'Routing System', 'RTX Data Hub', 'Geo Analytics'],
    exampleValue: '38103',
    category: 'property'
  },
  {
    fieldId: 'LEAD_024',
    fieldName: 'property_type',
    displayName: 'Property Type',
    required: true,
    dataType: 'enum',
    validValues: [
      'Single Family Residential',
      'Multi-Family Residential',
      'Commercial - Office',
      'Commercial - Retail',
      'Commercial - Restaurant/Food Service',
      'Commercial - Healthcare',
      'Commercial - Education',
      'Commercial - Industrial',
      'Commercial - Hospitality',
      'Commercial - Property Management',
      'Government/Municipal'
    ],
    validationRules: [
      {
        type: 'required',
        rule: 'value !== null && value !== ""',
        errorMessage: 'Property type is required'
      },
      {
        type: 'lookup',
        rule: 'validValues.includes(value)',
        errorMessage: 'Property type must be one of the predefined values'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Start Packet PDF'],
    whyNeeded: 'Determines service protocols, pricing tiers, compliance requirements, and technician specialization needs.',
    downstreamSystems: ['Salesforce', 'PestPac', 'Pricing Engine', 'Compliance'],
    exampleValue: 'Commercial - Restaurant/Food Service',
    category: 'property'
  },
  {
    fieldId: 'LEAD_025',
    fieldName: 'square_footage',
    displayName: 'Property Square Footage',
    required: false,
    dataType: 'number',
    validationRules: [
      {
        type: 'range',
        rule: 'value >= 100 && value <= 10000000',
        errorMessage: 'Square footage must be between 100 and 10,000,000'
      }
    ],
    collectionSource: ['Sales Rep', 'Start Packet PDF'],
    whyNeeded: 'Used for pricing calculations, equipment requirements, and service time estimates.',
    downstreamSystems: ['Salesforce', 'Pricing Engine', 'Service Scheduling'],
    exampleValue: '5000',
    category: 'property'
  },

  // =============================================================================
  // SERVICE NEEDS FIELDS
  // =============================================================================
  {
    fieldId: 'LEAD_030',
    fieldName: 'pest_types',
    displayName: 'Pest Types (Primary Concern)',
    required: true,
    dataType: 'enum',
    validValues: [
      'General Pest',
      'Rodents',
      'Termites',
      'Bed Bugs',
      'Cockroaches',
      'Ants',
      'Wildlife',
      'Mosquitoes',
      'Flies',
      'Birds',
      'Stored Product Pests',
      'Multiple/Unknown'
    ],
    validationRules: [
      {
        type: 'required',
        rule: 'value !== null && value !== ""',
        errorMessage: 'Primary pest concern is required'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Web Chat'],
    whyNeeded: 'Determines service type, technician assignment, equipment needs, and pricing.',
    downstreamSystems: ['Salesforce', 'PestPac', 'Technician Dispatch', 'Pricing Engine'],
    exampleValue: 'Rodents',
    category: 'service_needs'
  },
  {
    fieldId: 'LEAD_031',
    fieldName: 'urgency_level',
    displayName: 'Service Urgency',
    required: true,
    dataType: 'enum',
    validValues: [
      'Emergency (Same Day)',
      'Urgent (Within 48 Hours)',
      'Standard (Within Week)',
      'Quote Only (No Rush)'
    ],
    validationRules: [
      {
        type: 'required',
        rule: 'value !== null && value !== ""',
        errorMessage: 'Urgency level is required'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Web Chat'],
    whyNeeded: 'Drives scheduling priority, pricing (emergency fees), and SLA commitments.',
    downstreamSystems: ['Salesforce', 'Service Scheduling', 'Pricing Engine'],
    exampleValue: 'Standard (Within Week)',
    category: 'service_needs'
  },
  {
    fieldId: 'LEAD_032',
    fieldName: 'service_frequency_preference',
    displayName: 'Preferred Service Frequency',
    required: false,
    dataType: 'enum',
    validValues: [
      'One-Time',
      'Monthly',
      'Bi-Monthly',
      'Quarterly',
      'Annual',
      'On-Demand/As Needed',
      'Not Sure - Need Consultation'
    ],
    validationRules: [],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call'],
    whyNeeded: 'Helps with initial quoting and contract structure recommendations.',
    downstreamSystems: ['Salesforce', 'Pricing Engine'],
    exampleValue: 'Monthly',
    category: 'service_needs'
  },
  {
    fieldId: 'LEAD_033',
    fieldName: 'current_pest_control_provider',
    displayName: 'Current Pest Control Provider',
    required: false,
    dataType: 'string',
    validationRules: [],
    collectionSource: ['Sales Rep', 'Phone Call'],
    whyNeeded: 'Competitive intelligence, helps understand switching motivations and contract timing.',
    downstreamSystems: ['Salesforce', 'Competitive Analysis'],
    exampleValue: 'Terminix',
    category: 'service_needs'
  },
  {
    fieldId: 'LEAD_034',
    fieldName: 'problem_description',
    displayName: 'Problem Description',
    required: false,
    dataType: 'string',
    validationRules: [
      {
        type: 'format',
        rule: 'value.length <= 2000',
        errorMessage: 'Problem description cannot exceed 2000 characters'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Web Chat'],
    whyNeeded: 'Provides context for initial service approach and technician preparation.',
    downstreamSystems: ['Salesforce', 'Service Notes'],
    exampleValue: 'Seeing mouse droppings in kitchen area, customer concerned about health inspection',
    category: 'service_needs'
  },

  // =============================================================================
  // QUALIFICATION FIELDS
  // =============================================================================
  {
    fieldId: 'LEAD_040',
    fieldName: 'decision_maker',
    displayName: 'Is Decision Maker',
    required: true,
    dataType: 'boolean',
    validationRules: [
      {
        type: 'required',
        rule: 'value !== null && value !== undefined',
        errorMessage: 'Decision maker status is required'
      }
    ],
    collectionSource: ['Sales Rep', 'Phone Call'],
    whyNeeded: 'Critical for sales qualification - determines if additional stakeholders need to be engaged.',
    downstreamSystems: ['Salesforce'],
    exampleValue: 'true',
    category: 'qualification'
  },
  {
    fieldId: 'LEAD_041',
    fieldName: 'budget_authority',
    displayName: 'Has Budget Authority',
    required: false,
    dataType: 'boolean',
    validationRules: [],
    collectionSource: ['Sales Rep', 'Phone Call'],
    whyNeeded: 'Helps qualify lead and determine appropriate pricing discussion approach.',
    downstreamSystems: ['Salesforce'],
    exampleValue: 'true',
    category: 'qualification'
  },
  {
    fieldId: 'LEAD_042',
    fieldName: 'estimated_contract_value',
    displayName: 'Estimated Annual Contract Value',
    required: false,
    dataType: 'currency',
    validationRules: [
      {
        type: 'range',
        rule: 'value >= 0 && value <= 10000000',
        errorMessage: 'Contract value must be between $0 and $10,000,000'
      }
    ],
    collectionSource: ['Sales Rep'],
    whyNeeded: 'Pipeline forecasting and sales prioritization.',
    downstreamSystems: ['Salesforce', 'Sales Analytics', 'Forecasting'],
    exampleValue: '12000',
    category: 'qualification'
  },
  {
    fieldId: 'LEAD_043',
    fieldName: 'timeline_to_decision',
    displayName: 'Timeline to Decision',
    required: false,
    dataType: 'enum',
    validValues: [
      'Immediate (This Week)',
      'Short Term (1-2 Weeks)',
      'Medium Term (1 Month)',
      'Long Term (2-3 Months)',
      'Exploring Options (3+ Months)'
    ],
    validationRules: [],
    collectionSource: ['Sales Rep', 'Phone Call'],
    whyNeeded: 'Sales prioritization and follow-up cadence planning.',
    downstreamSystems: ['Salesforce', 'Sales Analytics'],
    exampleValue: 'Short Term (1-2 Weeks)',
    category: 'qualification'
  },

  // =============================================================================
  // SCHEDULING FIELDS
  // =============================================================================
  {
    fieldId: 'LEAD_050',
    fieldName: 'preferred_contact_method',
    displayName: 'Preferred Contact Method',
    required: true,
    dataType: 'enum',
    validValues: ['Phone', 'Email', 'Text/SMS', 'No Preference'],
    validationRules: [
      {
        type: 'required',
        rule: 'value !== null && value !== ""',
        errorMessage: 'Preferred contact method is required'
      }
    ],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Web Chat'],
    whyNeeded: 'Ensures effective follow-up and customer satisfaction.',
    downstreamSystems: ['Salesforce', 'Communication Platform'],
    exampleValue: 'Phone',
    category: 'scheduling'
  },
  {
    fieldId: 'LEAD_051',
    fieldName: 'preferred_contact_time',
    displayName: 'Preferred Contact Time',
    required: false,
    dataType: 'enum',
    validValues: [
      'Morning (8am-12pm)',
      'Afternoon (12pm-5pm)',
      'Evening (5pm-8pm)',
      'Any Time'
    ],
    validationRules: [],
    collectionSource: ['Sales Rep', 'Marketing Form', 'Phone Call', 'Web Chat'],
    whyNeeded: 'Improves contact success rate and customer experience.',
    downstreamSystems: ['Salesforce', 'Communication Platform'],
    exampleValue: 'Morning (8am-12pm)',
    category: 'scheduling'
  },
  {
    fieldId: 'LEAD_052',
    fieldName: 'appointment_scheduled_date',
    displayName: 'Initial Appointment Date',
    required: false,
    dataType: 'date',
    validationRules: [
      {
        type: 'range',
        rule: 'new Date(value) >= new Date()',
        errorMessage: 'Appointment date must be in the future'
      }
    ],
    collectionSource: ['Sales Rep', 'Phone Call', 'Web Chat'],
    whyNeeded: 'Tracks scheduling status and enables appointment management.',
    downstreamSystems: ['Salesforce', 'Service Scheduling', 'Calendar'],
    exampleValue: '2024-02-15',
    category: 'scheduling'
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getRequiredFields(): LeadIntakeStandard[] {
  return LEAD_INTAKE_STANDARDS.filter(f => f.required);
}

export function getFieldsByCategory(category: LeadIntakeStandard['category']): LeadIntakeStandard[] {
  return LEAD_INTAKE_STANDARDS.filter(f => f.category === category);
}

export function getFieldsByCollectionSource(source: CollectionSource): LeadIntakeStandard[] {
  return LEAD_INTAKE_STANDARDS.filter(f => f.collectionSource.includes(source));
}

export function validateLeadData(data: Record<string, unknown>): { valid: boolean; errors: { field: string; error: string }[] } {
  const errors: { field: string; error: string }[] = [];

  for (const standard of LEAD_INTAKE_STANDARDS) {
    const value = data[standard.fieldName];

    // Check required fields
    if (standard.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: standard.displayName,
        error: `${standard.displayName} is required`
      });
      continue;
    }

    // Check conditional requirements
    if (standard.conditionallyRequired && value === '') {
      const dependsOnValue = data[standard.conditionallyRequired.dependsOn];
      // Simple check - in production would use proper condition evaluation
      if (dependsOnValue) {
        errors.push({
          field: standard.displayName,
          error: `${standard.displayName} is required based on ${standard.conditionallyRequired.dependsOn}`
        });
      }
    }

    // Check enum values
    if (value && standard.validValues && !standard.validValues.includes(String(value))) {
      errors.push({
        field: standard.displayName,
        error: `Invalid value for ${standard.displayName}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function getLeadIntakeStats() {
  const total = LEAD_INTAKE_STANDARDS.length;
  const required = LEAD_INTAKE_STANDARDS.filter(f => f.required).length;
  const byCategory = LEAD_INTAKE_STANDARDS.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return { total, required, optional: total - required, byCategory };
}
