/**
 * Lead Source Classifications
 *
 * Standardized definitions for lead source categories.
 * Answers: "What does Field Generated mean vs Inbound Call vs Marketing Campaign?"
 *
 * This ensures consistent classification across all entry points and enables
 * accurate marketing attribution and CAC calculations.
 */

export type LeadChannel = 'inbound' | 'outbound' | 'partner' | 'marketing';

export type LeadSourceType =
  | 'inbound_call'
  | 'field_generated'
  | 'marketing_campaign'
  | 'referral_customer'
  | 'referral_partner'
  | 'web_form'
  | 'web_chat'
  | 'door_knock'
  | 'trade_show'
  | 'commercial_prospecting';

export interface LeadSourceClassification {
  sourceId: string;
  sourceName: string;
  sourceType: LeadSourceType;
  channel: LeadChannel;
  definition: string;
  examples: string[];
  qualificationCriteria: string[];
  typicalConversionRate: { low: number; mid: number; high: number };
  averageValueRange: { min: number; max: number };
  costPerLead: { low: number; mid: number; high: number };
  attributionRules: string;
  requiredFields: string[];
  salesProcess: string;
  bestPractices: string[];
  commonMistakes: string[];
}

export const LEAD_SOURCE_CLASSIFICATIONS: LeadSourceClassification[] = [
  {
    sourceId: 'LS_001',
    sourceName: 'Inbound Call',
    sourceType: 'inbound_call',
    channel: 'inbound',
    definition: 'Customer initiated contact via phone to the sales or customer service line. The customer has actively sought out Rentokil for service.',
    examples: [
      'Customer calls 1-800 number after seeing truck in neighborhood',
      'Business owner calls after finding website',
      'Referral who was given our phone number',
      'Customer calling back after receiving direct mail'
    ],
    qualificationCriteria: [
      'Caller expresses intent to receive service quote',
      'Caller is decision-maker or can connect to decision-maker',
      'Service address is in serviceable territory',
      'Pest problem is within our service capabilities'
    ],
    typicalConversionRate: { low: 0.25, mid: 0.35, high: 0.45 },
    averageValueRange: { min: 500, max: 3000 },
    costPerLead: { low: 15, mid: 35, high: 75 },
    attributionRules: '100% credit to marketing/advertising that drove the call. If caller mentions specific ad, campaign gets credit.',
    requiredFields: ['customer_name', 'contact_phone', 'service_address', 'pest_types', 'urgency_level'],
    salesProcess: 'Immediate phone qualification. If qualified, schedule same-day or next-day inspection. Speed to contact is critical.',
    bestPractices: [
      'Answer within 3 rings during business hours',
      'Complete lead intake form during call',
      'Offer to schedule inspection before ending call',
      'Send confirmation text/email within 5 minutes'
    ],
    commonMistakes: [
      'Not capturing how caller heard about us',
      'Letting call go to voicemail during business hours',
      'Not scheduling appointment during the call',
      'Failing to get decision-maker contact info'
    ]
  },
  {
    sourceId: 'LS_002',
    sourceName: 'Field Generated',
    sourceType: 'field_generated',
    channel: 'outbound',
    definition: 'Lead identified by a sales representative or technician while in the field. This includes leads spotted during route driving, referrals collected at service stops, or businesses identified during territory canvassing.',
    examples: [
      'Technician notices new restaurant opening while on route',
      'Sales rep identifies commercial prospect during territory drive',
      'Customer at service stop mentions neighbor needs service',
      'AE spots "Now Open" signs in territory'
    ],
    qualificationCriteria: [
      'Business/property in assigned territory',
      'Matches ideal customer profile for service type',
      'No existing Rentokil service (verified in system)',
      'Sales rep has reasonable confidence in opportunity'
    ],
    typicalConversionRate: { low: 0.15, mid: 0.22, high: 0.30 },
    averageValueRange: { min: 1500, max: 10000 },
    costPerLead: { low: 5, mid: 15, high: 30 },
    attributionRules: '100% credit to the sales rep or technician who identified the lead. If technician finds lead, split credit with servicing AE.',
    requiredFields: ['customer_name', 'service_address', 'property_type', 'lead_source', 'discovery_method'],
    salesProcess: 'Research business before contact. Initial outreach within 48 hours of identification. Offer free inspection or assessment.',
    bestPractices: [
      'Take photo of location for CRM notes',
      'Research business online before first contact',
      'Time cold call for when decision-maker likely present',
      'Bring relevant case studies for industry vertical'
    ],
    commonMistakes: [
      'Waiting too long after identifying lead to make contact',
      'Not researching business before cold call',
      'Poor territory planning leading to scattered prospects',
      'Not logging lead in CRM same day identified'
    ]
  },
  {
    sourceId: 'LS_003',
    sourceName: 'Marketing Campaign',
    sourceType: 'marketing_campaign',
    channel: 'marketing',
    definition: 'Lead generated from a specific marketing initiative with trackable campaign ID. Includes digital ads, direct mail, email campaigns, and targeted promotions.',
    examples: [
      'Google Ads click leading to form submission',
      'Direct mail recipient calling with offer code',
      'Email campaign click-through to landing page',
      'Social media ad response'
    ],
    qualificationCriteria: [
      'Responded to specific campaign with valid campaign ID',
      'Provided required contact information',
      'Interest aligns with campaign service offering',
      'Geographic targeting criteria met'
    ],
    typicalConversionRate: { low: 0.08, mid: 0.15, high: 0.25 },
    averageValueRange: { min: 400, max: 2500 },
    costPerLead: { low: 50, mid: 100, high: 200 },
    attributionRules: 'Campaign ID required for attribution. If multi-touch, use first-touch attribution for campaign credit. Cost per lead tracked by campaign.',
    requiredFields: ['customer_name', 'contact_phone', 'contact_email', 'campaign_id', 'service_address'],
    salesProcess: 'Marketing automation for initial nurture. Sales follow-up within 24 hours of lead scoring threshold. Reference specific campaign in outreach.',
    bestPractices: [
      'Respond within 4 hours of form submission',
      'Reference the specific offer/campaign in follow-up',
      'Use campaign-specific landing pages',
      'Track campaign ID through entire sales cycle'
    ],
    commonMistakes: [
      'Losing campaign ID attribution in handoff',
      'Generic follow-up that ignores campaign context',
      'Slow response time on hot leads',
      'Not A/B testing campaign variations'
    ]
  },
  {
    sourceId: 'LS_004',
    sourceName: 'Referral - Customer',
    sourceType: 'referral_customer',
    channel: 'inbound',
    definition: 'Lead referred by an existing satisfied customer. The referring customer has directly recommended Rentokil to the prospect.',
    examples: [
      'Existing customer gives neighbor our contact info',
      'Business owner recommends us to vendor',
      'Customer referral through formal referral program',
      'Customer provides referral during service visit'
    ],
    qualificationCriteria: [
      'Referring customer is in good standing',
      'Referred prospect has confirmed interest',
      'Contact information provided is valid',
      'Service need within our capabilities'
    ],
    typicalConversionRate: { low: 0.35, mid: 0.45, high: 0.55 },
    averageValueRange: { min: 600, max: 4000 },
    costPerLead: { low: 0, mid: 25, high: 50 },
    attributionRules: 'Credit split: 50% to referring customer (for referral bonus), 50% to AE servicing referred account. Track referring customer ID.',
    requiredFields: ['customer_name', 'contact_phone', 'referral_source_name', 'referral_account_id', 'service_address'],
    salesProcess: 'Mention referrer by name in initial contact. Priority response within 4 hours. Thank referring customer regardless of outcome.',
    bestPractices: [
      'Always mention who referred them',
      'Thank referring customer within 24 hours',
      'Process referral bonus promptly upon close',
      'Ask new customers for referrals after first service'
    ],
    commonMistakes: [
      'Not tracking who the referrer was',
      'Forgetting to process referral bonus',
      'Treating referral as cold lead',
      'Not thanking the referrer'
    ]
  },
  {
    sourceId: 'LS_005',
    sourceName: 'Referral - Partner',
    sourceType: 'referral_partner',
    channel: 'partner',
    definition: 'Lead provided by a business partner such as property management company, real estate agent, general contractor, or industry affiliate.',
    examples: [
      'Property management company refers new building',
      'Real estate agent refers buyer needing inspection',
      'Restaurant supplier refers customer',
      'HVAC contractor refers customer with pest issue'
    ],
    qualificationCriteria: [
      'Referring partner is in active partner program',
      'Lead meets partner agreement criteria',
      'Contact information verified',
      'Service type within partner agreement scope'
    ],
    typicalConversionRate: { low: 0.30, mid: 0.40, high: 0.50 },
    averageValueRange: { min: 2000, max: 15000 },
    costPerLead: { low: 0, mid: 50, high: 150 },
    attributionRules: 'Partner receives commission per agreement. Track partner ID and agreement type. Report to partner monthly.',
    requiredFields: ['customer_name', 'contact_phone', 'partner_id', 'partner_name', 'service_address', 'partner_agreement_type'],
    salesProcess: 'Partner introduction warm handoff preferred. Acknowledge partner in all communications. Keep partner informed of status.',
    bestPractices: [
      'Set up warm handoff calls with partner present',
      'Keep partner updated on lead status monthly',
      'Process partner commissions on time',
      'Annual partner business reviews'
    ],
    commonMistakes: [
      'Losing partner attribution after handoff',
      'Not keeping partner informed of outcome',
      'Late commission payments',
      'Ignoring partner communication preferences'
    ]
  },
  {
    sourceId: 'LS_006',
    sourceName: 'Web Form',
    sourceType: 'web_form',
    channel: 'marketing',
    definition: 'Lead submitted through website contact form, quote request form, or other online form submission.',
    examples: [
      'Quote request form on rentokil.com',
      'Contact us form submission',
      'Free inspection request form',
      'Service-specific landing page form'
    ],
    qualificationCriteria: [
      'Valid email address provided',
      'Service address in territory',
      'Complete required form fields',
      'Not duplicate of existing lead/customer'
    ],
    typicalConversionRate: { low: 0.10, mid: 0.18, high: 0.28 },
    averageValueRange: { min: 400, max: 2500 },
    costPerLead: { low: 25, mid: 60, high: 120 },
    attributionRules: 'Attribute to traffic source (SEO, paid, referral). If campaign tracking, attribute to campaign. Track form ID.',
    requiredFields: ['customer_name', 'contact_email', 'contact_phone', 'service_address', 'pest_types'],
    salesProcess: 'Automated confirmation email immediately. Phone follow-up within 4 hours during business hours. Text option for after hours.',
    bestPractices: [
      'Send automated confirmation within 1 minute',
      'Call within 4 hours, ideally within 1 hour',
      'Use progressive profiling on forms',
      'Mobile-optimize all forms'
    ],
    commonMistakes: [
      'Slow response time',
      'Too many required fields causing abandonment',
      'Not having mobile-friendly forms',
      'No automated confirmation message'
    ]
  },
  {
    sourceId: 'LS_007',
    sourceName: 'Web Chat',
    sourceType: 'web_chat',
    channel: 'inbound',
    definition: 'Lead initiated through website live chat or chatbot that was converted to a sales opportunity.',
    examples: [
      'Live chat inquiry about commercial services',
      'Chatbot qualification leading to human handoff',
      'After-hours chatbot capturing lead info',
      'Chat during website browse session'
    ],
    qualificationCriteria: [
      'Expressed interest in service during chat',
      'Provided valid contact information',
      'Service need within capabilities',
      'Agreed to follow-up contact'
    ],
    typicalConversionRate: { low: 0.15, mid: 0.25, high: 0.35 },
    averageValueRange: { min: 400, max: 2000 },
    costPerLead: { low: 20, mid: 45, high: 80 },
    attributionRules: 'Credit to digital marketing for driving chat session. Track chat ID and transcript.',
    requiredFields: ['customer_name', 'contact_phone', 'service_address', 'chat_transcript_id'],
    salesProcess: 'Immediate handoff to sales if qualified during chat. Same-day callback if chat ended without scheduling.',
    bestPractices: [
      'Respond to chat within 30 seconds',
      'Collect phone number early in chat',
      'Offer to schedule directly in chat',
      'Save transcript for sales follow-up context'
    ],
    commonMistakes: [
      'Slow initial response losing visitor',
      'Not transitioning chat to phone/appointment',
      'Losing chat context in handoff',
      'Chatbot too aggressive, pushes visitor away'
    ]
  },
  {
    sourceId: 'LS_008',
    sourceName: 'Door Knock',
    sourceType: 'door_knock',
    channel: 'outbound',
    definition: 'Lead generated through door-to-door canvassing, typically in residential neighborhoods or commercial districts.',
    examples: [
      'Residential door-to-door canvassing campaign',
      'Commercial building walk-ins',
      'Neighborhood blitz after pest sighting reports',
      'New development community outreach'
    ],
    qualificationCriteria: [
      'Homeowner/decision-maker present during knock',
      'Expressed interest in learning more',
      'Property in target service area',
      'No existing Rentokil service'
    ],
    typicalConversionRate: { low: 0.08, mid: 0.15, high: 0.22 },
    averageValueRange: { min: 300, max: 1500 },
    costPerLead: { low: 10, mid: 25, high: 50 },
    attributionRules: '100% credit to canvassing sales rep. Track canvassing campaign ID for aggregate ROI.',
    requiredFields: ['customer_name', 'contact_phone', 'service_address', 'canvass_campaign_id', 'sales_rep_id'],
    salesProcess: 'Aim for on-the-spot quote if possible. Schedule same-day or next-day follow-up. Leave door hanger if not home.',
    bestPractices: [
      'Target neighborhoods with known pest activity',
      'Canvas during times decision-makers are home',
      'Have special door knock offer available',
      'Follow local solicitation regulations'
    ],
    commonMistakes: [
      'Canvassing at wrong times (midday weekdays)',
      'Not following up with scheduled appointments',
      'Aggressive approach creating negative impression',
      'Not tracking canvassing routes/results'
    ]
  },
  {
    sourceId: 'LS_009',
    sourceName: 'Trade Show',
    sourceType: 'trade_show',
    channel: 'marketing',
    definition: 'Lead collected at industry trade show, conference, or local business expo.',
    examples: [
      'Restaurant industry trade show lead',
      'Property management conference booth visit',
      'Local chamber of commerce expo',
      'Food safety conference attendee'
    ],
    qualificationCriteria: [
      'Expressed interest at booth or session',
      'Provided complete contact information',
      'Business type matches our target market',
      'Agreed to post-show follow-up'
    ],
    typicalConversionRate: { low: 0.05, mid: 0.12, high: 0.20 },
    averageValueRange: { min: 2000, max: 20000 },
    costPerLead: { low: 100, mid: 250, high: 500 },
    attributionRules: 'Credit to trade show event. Track event ID and lead source within event (booth visit, session, networking).',
    requiredFields: ['customer_name', 'contact_email', 'company_name', 'event_id', 'interest_area'],
    salesProcess: 'Priority follow-up within 48 hours of show end. Reference specific conversation or interest. Send promised materials.',
    bestPractices: [
      'Follow up within 48 hours while fresh',
      'Reference specific conversation from show',
      'Have show-specific offer/incentive',
      'Segment leads by interest level before follow-up'
    ],
    commonMistakes: [
      'Waiting too long to follow up',
      'Generic follow-up not referencing show',
      'Not capturing quality notes during show',
      'Treating all leads equally vs prioritizing'
    ]
  },
  {
    sourceId: 'LS_010',
    sourceName: 'Commercial Prospecting',
    sourceType: 'commercial_prospecting',
    channel: 'outbound',
    definition: 'Proactive outbound prospecting to commercial accounts through cold calling, email outreach, or targeted campaigns.',
    examples: [
      'Cold call campaign to restaurants in territory',
      'Outbound email to new businesses from D&B list',
      'LinkedIn outreach to facility managers',
      'Account-based marketing to target accounts'
    ],
    qualificationCriteria: [
      'Business matches ideal customer profile',
      'In assigned territory',
      'No existing Rentokil relationship',
      'Reached decision-maker or influencer'
    ],
    typicalConversionRate: { low: 0.03, mid: 0.08, high: 0.15 },
    averageValueRange: { min: 3000, max: 25000 },
    costPerLead: { low: 75, mid: 150, high: 300 },
    attributionRules: '100% credit to sales rep conducting prospecting. Track prospecting list source and campaign.',
    requiredFields: ['customer_name', 'contact_name', 'contact_title', 'contact_phone', 'service_address', 'prospecting_list_source'],
    salesProcess: 'Multi-touch campaign: call, email, LinkedIn. Persistence with value-add at each touch. Target 8-12 touches.',
    bestPractices: [
      'Research account before first outreach',
      'Personalize messaging to industry vertical',
      'Use multi-channel approach',
      'Track all touches in CRM'
    ],
    commonMistakes: [
      'Generic spray and pray approach',
      'Giving up after 2-3 touches',
      'Not researching prospect before call',
      'No clear value proposition in outreach'
    ]
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getSourceByType(sourceType: LeadSourceType): LeadSourceClassification | undefined {
  return LEAD_SOURCE_CLASSIFICATIONS.find(s => s.sourceType === sourceType);
}

export function getSourcesByChannel(channel: LeadChannel): LeadSourceClassification[] {
  return LEAD_SOURCE_CLASSIFICATIONS.filter(s => s.channel === channel);
}

export function getHighConversionSources(): LeadSourceClassification[] {
  return LEAD_SOURCE_CLASSIFICATIONS
    .filter(s => s.typicalConversionRate.mid >= 0.30)
    .sort((a, b) => b.typicalConversionRate.mid - a.typicalConversionRate.mid);
}

export function getLowCostSources(): LeadSourceClassification[] {
  return LEAD_SOURCE_CLASSIFICATIONS
    .filter(s => s.costPerLead.mid <= 50)
    .sort((a, b) => a.costPerLead.mid - b.costPerLead.mid);
}

export function getChannelDisplayName(channel: LeadChannel): string {
  const names: Record<LeadChannel, string> = {
    inbound: 'Inbound',
    outbound: 'Outbound',
    partner: 'Partner',
    marketing: 'Marketing'
  };
  return names[channel];
}

export function getLeadSourceStats() {
  const total = LEAD_SOURCE_CLASSIFICATIONS.length;

  const byChannel = LEAD_SOURCE_CLASSIFICATIONS.reduce((acc, s) => {
    acc[s.channel] = (acc[s.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgConversionRates = LEAD_SOURCE_CLASSIFICATIONS.reduce((acc, s) => {
    acc[s.sourceType] = s.typicalConversionRate.mid;
    return acc;
  }, {} as Record<string, number>);

  const avgCostPerLead = LEAD_SOURCE_CLASSIFICATIONS.reduce((acc, s) => {
    acc[s.sourceType] = s.costPerLead.mid;
    return acc;
  }, {} as Record<string, number>);

  return { total, byChannel, avgConversionRates, avgCostPerLead };
}

export function getAllChannels(): LeadChannel[] {
  return ['inbound', 'outbound', 'partner', 'marketing'];
}

export function getSourceById(sourceId: string): LeadSourceClassification | undefined {
  return LEAD_SOURCE_CLASSIFICATIONS.find(s => s.sourceId === sourceId);
}

export function getAttributionRulesForSource(sourceType: LeadSourceType): string {
  const source = getSourceByType(sourceType);
  return source?.attributionRules ?? 'Standard attribution rules apply';
}
