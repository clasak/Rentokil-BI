/**
 * PDF Extraction Patterns
 *
 * Regular expressions and patterns for extracting data from Start Packet PDFs.
 * These patterns are based on common Start Packet formats used in the field.
 */

// Customer name patterns
export const CUSTOMER_NAME_PATTERNS = [
  /Customer(?:\s+Name)?[:\s]+([^\n]+)/i,
  /Client(?:\s+Name)?[:\s]+([^\n]+)/i,
  /Account(?:\s+Name)?[:\s]+([^\n]+)/i,
  /Company(?:\s+Name)?[:\s]+([^\n]+)/i,
  /Business(?:\s+Name)?[:\s]+([^\n]+)/i,
  /Bill(?:ing)?\s+To[:\s]+([^\n]+)/i
]

// Address patterns
export const ADDRESS_PATTERNS = {
  street: [
    /(?:Service\s+)?Address[:\s]+([^\n]+)/i,
    /Street[:\s]+([^\n]+)/i,
    /Location[:\s]+([^\n]+)/i,
    /(\d+\s+[A-Za-z0-9\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Cir|Circle)[.,]?)/i
  ],
  city: [
    /City[:\s]+([A-Za-z\s]+)/i,
    /([A-Za-z\s]+),\s*[A-Z]{2}\s+\d{5}/
  ],
  state: [
    /State[:\s]+([A-Z]{2})/i,
    /([A-Z]{2})\s+\d{5}/
  ],
  zip: [
    /Zip(?:\s+Code)?[:\s]+(\d{5}(?:-\d{4})?)/i,
    /(\d{5}(?:-\d{4})?)$/m
  ]
}

// Equipment count patterns
export const EQUIPMENT_PATTERNS = {
  exteriorRBS: [
    /Exterior\s+RBS[:\s]*(\d+)/i,
    /Exterior\s+(?:Rodent\s+)?(?:Bait\s+)?Stations?[:\s]*(\d+)/i,
    /Perimeter\s+(?:Rodent\s+)?(?:Bait\s+)?Stations?[:\s]*(\d+)/i,
    /Outdoor\s+RBS[:\s]*(\d+)/i,
    /(?:Ext|Exterior)\s*[:\s]*(\d+)\s*RBS/i
  ],
  interiorRBS: [
    /Interior\s+RBS[:\s]*(\d+)/i,
    /Interior\s+(?:Rodent\s+)?(?:Bait\s+)?Stations?[:\s]*(\d+)/i,
    /Indoor\s+(?:Rodent\s+)?(?:Bait\s+)?Stations?[:\s]*(\d+)/i,
    /Inside\s+RBS[:\s]*(\d+)/i,
    /(?:Int|Interior)\s*[:\s]*(\d+)\s*RBS/i
  ],
  flyLights: [
    /Fly\s+Lights?[:\s]*(\d+)/i,
    /ILT[:\s]*(\d+)/i,
    /Insect\s+Light\s+Traps?[:\s]*(\d+)/i
  ],
  baitBoxes: [
    /Bait\s+(?:Boxes?|Stations?)[:\s]*(\d+)/i,
    /Rodent\s+(?:Boxes?|Stations?)[:\s]*(\d+)/i
  ],
  glueBoards: [
    /Glue\s+Boards?[:\s]*(\d+)/i,
    /Sticky\s+Traps?[:\s]*(\d+)/i
  ]
}

// Service type patterns
export const SERVICE_TYPE_PATTERNS = {
  general: [
    /General\s+Pest/i,
    /GPL/i,
    /Commercial\s+Pest/i,
    /Residential\s+Pest/i
  ],
  termite: [
    /Termite/i,
    /TMT/i,
    /Wood\s+Destroying/i,
    /Sentricon/i,
    /Trelona/i
  ],
  rodent: [
    /Rodent/i,
    /Mouse/i,
    /Mice/i,
    /Rat/i
  ],
  mosquito: [
    /Mosquito/i,
    /MSQ/i
  ],
  bed_bug: [
    /Bed\s*Bug/i,
    /BB/i
  ],
  wildlife: [
    /Wildlife/i,
    /Animal/i,
    /Exclusion/i
  ],
  fumigation: [
    /Fumigation/i,
    /Tent/i,
    /FUM/i
  ]
}

// Service frequency patterns
export const FREQUENCY_PATTERNS = {
  weekly: [
    /Weekly/i,
    /Every\s+Week/i,
    /52\s*x/i,
    /1x\s*Week/i
  ],
  'bi-weekly': [
    /Bi[\s-]?Weekly/i,
    /Every\s+(?:2|Two)\s+Weeks?/i,
    /26\s*x/i,
    /2x\s*Month/i
  ],
  monthly: [
    /Monthly/i,
    /Every\s+Month/i,
    /12\s*x/i,
    /1x\s*Month/i
  ],
  quarterly: [
    /Quarterly/i,
    /Every\s+(?:3|Three)\s+Months?/i,
    /4\s*x/i,
    /1x\s*Quarter/i
  ],
  'on-demand': [
    /On[\s-]?Demand/i,
    /As[\s-]?Needed/i,
    /Call[\s-]?Out/i
  ]
}

// Pricing patterns
export const PRICING_PATTERNS = {
  monthlyContract: [
    /Monthly\s+(?:Contract|Amount|Fee|Price|Service)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /Per\s+Month[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /\/Mo(?:nth)?[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /MRC[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
  ],
  setupFee: [
    /Setup\s+Fee[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /Installation[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /Initial\s+Setup[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
  ],
  initialTreatment: [
    /Initial\s+(?:Treatment|Service)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /First\s+(?:Treatment|Service)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /IT[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
  ],
  termiteInspection: [
    /Termite\s+Inspection[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /WDO\s+(?:Inspection|Report)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
  ],
  annualRenewal: [
    /Annual\s+(?:Renewal|Fee)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /Yearly\s+(?:Renewal|Fee)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /Renewal[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
  ]
}

// Contact information patterns
export const CONTACT_PATTERNS = {
  phone: [
    /(?:Phone|Tel(?:ephone)?|Contact)[:\s]*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i,
    /(\d{3}[\s.-]\d{3}[\s.-]\d{4})/
  ],
  email: [
    /(?:Email|E-mail)[:\s]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i,
    /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/
  ],
  contactName: [
    /Contact(?:\s+Name)?[:\s]+([A-Za-z\s]+)/i,
    /Attention[:\s]+([A-Za-z\s]+)/i,
    /POC[:\s]+([A-Za-z\s]+)/i
  ]
}

// Date patterns
export const DATE_PATTERNS = [
  /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
  /(\d{1,2}-\d{1,2}-\d{2,4})/,
  /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  /(\d{4}-\d{2}-\d{2})/
]

// Sales rep patterns
export const SALES_REP_PATTERNS = [
  /(?:Sales\s+)?Rep(?:resentative)?[:\s]+([A-Za-z\s]+)/i,
  /Account\s+Executive[:\s]+([A-Za-z\s]+)/i,
  /AE[:\s]+([A-Za-z\s]+)/i,
  /Sold\s+By[:\s]+([A-Za-z\s]+)/i
]

// Vertical/Industry patterns
export const VERTICAL_PATTERNS = {
  Commercial: [
    /Commercial/i,
    /Business/i,
    /Office/i,
    /Industrial/i,
    /Warehouse/i,
    /Manufacturing/i
  ],
  Residential: [
    /Residential/i,
    /Home/i,
    /House/i,
    /Apartment/i,
    /Condo/i
  ],
  Government: [
    /Government/i,
    /Federal/i,
    /State/i,
    /Municipal/i,
    /Public/i,
    /School/i
  ],
  Healthcare: [
    /Healthcare/i,
    /Hospital/i,
    /Medical/i,
    /Clinic/i,
    /Nursing/i,
    /Dental/i
  ],
  'Food Service': [
    /Food\s+Service/i,
    /Restaurant/i,
    /Kitchen/i,
    /Cafeteria/i,
    /Food\s+Processing/i,
    /Hospitality/i,
    /Hotel/i
  ]
}

// Helper function to find first match from array of patterns
export function findFirstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return null
}

// Helper to extract numeric value
export function extractNumber(text: string, patterns: RegExp[]): number | null {
  const match = findFirstMatch(text, patterns)
  if (match) {
    const num = parseFloat(match.replace(/,/g, ''))
    return isNaN(num) ? null : num
  }
  return null
}

// Helper to determine which category matches
export function findCategory<T extends string>(
  text: string,
  categories: Record<T, RegExp[]>
): T | null {
  for (const [category, patterns] of Object.entries(categories) as [T, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return category
      }
    }
  }
  return null
}
