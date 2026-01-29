/**
 * Job Title to Dashboard Role Mapping
 *
 * Maps Workday job titles from BigQuery to the 10 dashboard roles.
 * Used during SSO authentication for auto-role detection.
 *
 * Order matters - first pattern match wins.
 */

import { Role } from '@/types'

// Job title patterns mapped to dashboard roles
export const JOB_TITLE_ROLE_MAPPINGS: {
  patterns: RegExp[]
  role: Role
  description: string
}[] = [
  // Executive level (C-suite, SVP)
  {
    patterns: [
      /\bCEO\b/i,
      /\bCFO\b/i,
      /\bCOO\b/i,
      /\bCTO\b/i,
      /\bCMO\b/i,
      /\bChief\b/i,
      /\bPresident\b/i,
      /\bSVP\b/i,
      /\bSenior Vice President\b/i,
      /\bExecutive Vice President\b/i,
      /\bEVP\b/i,
    ],
    role: 'exec',
    description: 'C-Suite / Senior Executive',
  },
  // Market VP
  {
    patterns: [
      /\bVice President\b/i,
      /\bVP\b/i,
      /\bMarket.*President\b/i,
      /\bDivision.*President\b/i,
    ],
    role: 'market_vp',
    description: 'Market Vice President',
  },
  // Market Sales Director
  {
    patterns: [
      /\bMarket.*Sales.*Director\b/i,
      /\bSales.*Director.*Market\b/i,
      /\bDirector.*Sales.*Market\b/i,
      /\bDivision.*Sales.*Director\b/i,
      /\bNational.*Sales.*Director\b/i,
    ],
    role: 'market_sales_director',
    description: 'Market Sales Director',
  },
  // Region Director
  {
    patterns: [
      /\bRegion.*Director\b/i,
      /\bDirector.*Region\b/i,
      /\bArea.*Director\b/i,
      /\bDistrict.*Director\b/i,
      /\bTerritory.*Director\b/i,
      /\bDirector.*Operations\b/i,
      /\bOperations.*Director\b/i,
    ],
    role: 'region_director',
    description: 'Region/Area Director',
  },
  // Region Sales Manager
  {
    patterns: [
      /\bRegion.*Sales.*Manager\b/i,
      /\bSales.*Manager.*Region\b/i,
      /\bArea.*Sales.*Manager\b/i,
      /\bDistrict.*Sales.*Manager\b/i,
      /\bTerritory.*Sales.*Manager\b/i,
    ],
    role: 'region_sales_manager',
    description: 'Region Sales Manager',
  },
  // Branch Manager
  {
    patterns: [
      /\bBranch.*Manager\b/i,
      /\bGeneral.*Manager\b/i,
      /\bGM\b/i,
      /\bLocation.*Manager\b/i,
      /\bOffice.*Manager\b/i,
      /\bSite.*Manager\b/i,
    ],
    role: 'manager',
    description: 'Branch/General Manager',
  },
  // Sales Manager (must come after Region Sales Manager)
  {
    patterns: [
      /\bSales.*Manager\b/i,
      /\bManager.*Sales\b/i,
      /\bSales.*Supervisor\b/i,
      /\bSales.*Lead\b/i,
      /\bSr\.?\s*Sales\b/i,
      /\bSenior.*Sales\b/i,
    ],
    role: 'sales_manager',
    description: 'Sales Manager',
  },
  // Operations Manager
  {
    patterns: [
      /\bOps.*Manager\b/i,
      /\bOperations.*Manager\b/i,
      /\bService.*Manager\b/i,
      /\bRoute.*Manager\b/i,
      /\bField.*Manager\b/i,
      /\bProduction.*Manager\b/i,
      /\bDispatch.*Manager\b/i,
    ],
    role: 'ops_manager',
    description: 'Operations Manager',
  },
  // Account Executive / Sales Rep
  {
    patterns: [
      /\bAccount.*Executive\b/i,
      /\bAE\b/i,
      /\bSales.*Rep\b/i,
      /\bSales.*Representative\b/i,
      /\bSales.*Consultant\b/i,
      /\bSales.*Specialist\b/i,
      /\bInspector\b/i,
      /\bPest.*Inspector\b/i,
      /\bTermite.*Inspector\b/i,
      /\bCommercial.*Sales\b/i,
      /\bResidential.*Sales\b/i,
      /\bOutside.*Sales\b/i,
      /\bInside.*Sales\b/i,
      /\bBusiness.*Development\b/i,
      /\bBDR\b/i,
      /\bSDR\b/i,
    ],
    role: 'rep',
    description: 'Account Executive / Sales Rep',
  },
  // Technician (last resort for field roles)
  {
    patterns: [
      /\bTechnician\b/i,
      /\bTech\b/i,
      /\bPest.*Control\b/i,
      /\bService.*Pro\b/i,
      /\bPCO\b/i,
      /\bTermite\b/i,
      /\bExterminator\b/i,
      /\bField.*Service\b/i,
      /\bRoute.*Tech\b/i,
      /\bService.*Tech\b/i,
      /\bService.*Specialist\b/i,
      /\bWildlife\b/i,
      /\bFumigat/i,
    ],
    role: 'technician',
    description: 'Service Technician',
  },
]

// Default role if no pattern matches
export const DEFAULT_ROLE: Role = 'rep'

/**
 * Map a Workday job title to a dashboard role
 *
 * @param jobTitle - The job title from Workday/BigQuery
 * @returns Object with role, matched pattern, and confidence level
 */
export function mapJobTitleToRole(jobTitle: string | null | undefined): {
  role: Role
  matchedPattern: string | null
  confidence: 'high' | 'medium' | 'low'
} {
  if (!jobTitle || jobTitle.trim() === '') {
    return { role: DEFAULT_ROLE, matchedPattern: null, confidence: 'low' }
  }

  const normalizedTitle = jobTitle.trim()

  for (const mapping of JOB_TITLE_ROLE_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(normalizedTitle)) {
        return {
          role: mapping.role,
          matchedPattern: pattern.source,
          confidence: 'high',
        }
      }
    }
  }

  // No pattern matched - return default with low confidence
  return { role: DEFAULT_ROLE, matchedPattern: null, confidence: 'low' }
}

/**
 * Get all role options for admin UI
 */
export function getRoleMappingDescriptions(): { role: Role; description: string }[] {
  return JOB_TITLE_ROLE_MAPPINGS.map((m) => ({
    role: m.role,
    description: m.description,
  }))
}

/**
 * Test a job title against all patterns (for debugging/admin)
 */
export function testJobTitleMapping(jobTitle: string): {
  role: Role
  matchedMapping: (typeof JOB_TITLE_ROLE_MAPPINGS)[0] | null
  matchedPattern: string | null
  allPotentialMatches: { role: Role; pattern: string }[]
} {
  const allMatches: { role: Role; pattern: string }[] = []

  for (const mapping of JOB_TITLE_ROLE_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(jobTitle)) {
        allMatches.push({ role: mapping.role, pattern: pattern.source })
      }
    }
  }

  const result = mapJobTitleToRole(jobTitle)

  return {
    role: result.role,
    matchedMapping: JOB_TITLE_ROLE_MAPPINGS.find((m) => m.role === result.role) || null,
    matchedPattern: result.matchedPattern,
    allPotentialMatches: allMatches,
  }
}
