/**
 * Dev Role Mappings - Manual Override
 *
 * MANUALLY EDITED to correct organizational codes
 * All employees assigned to Midwest market (2941) per user specifications
 *
 * Last updated: 2026-01-26T15:00:00.000Z
 * Source: BigQuery S0_TMX.Employees_Main (manually corrected)
 */

import type { Role } from '@/types'

// =============================================================================
// Types
// =============================================================================

export interface DevRoleMapping {
  role: Role
  name: string
  assignedMarkets: string[]
  assignedRegions: string[]
  assignedBranches: string[]
}

// =============================================================================
// Dev Role Mappings (BigQuery-sourced)
// =============================================================================

/**
 * Email-to-role mappings for local development
 *
 * These mappings use REAL BigQuery organizational codes so dev users
 * see actual data for their market/region/branch and all subordinates.
 *
 * Hierarchical data access:
 * - Market VP sees ALL regions and branches under their market
 * - Region Director sees ALL branches under their region
 * - Branch Manager sees their branch data
 *
 * Only activated when NODE_ENV !== 'production'
 */
export const DEV_ROLE_MAPPINGS: Record<string, DevRoleMapping> = {
  // ✓ Susan Michael: Found in BigQuery (Market: N/A, Region: N/A, Branch: 8750)
  'susan.michael@rentokil.com': {
    role: 'exec',
    name: 'Susan Michael',
    assignedMarkets: [],
    assignedRegions: [],
    assignedBranches: [],
  },

  // ✓ Kenneth Diotte: Market VP - Midwest (Manual override)
  'kenneth.diotte@rentokil.com': {
    role: 'market_vp',
    name: 'Kenneth Diotte',
    assignedMarkets: ['2941'], // Midwest - sees all subordinate regions/branches
    assignedRegions: [],
    assignedBranches: [],
  },

  // ✓ Adam Grier: Market Sales Director - Midwest (Manual override)
  'adam.grier@rentokil.com': {
    role: 'market_sales_director',
    name: 'Adam Grier',
    assignedMarkets: ['2941'], // Midwest - sees all subordinate regions/branches
    assignedRegions: [],
    assignedBranches: [],
  },

  // ✓ Hal Johnson: Region Director - Region 54 (Manual override)
  'hal.johnson@rentokil.com': {
    role: 'region_director',
    name: 'Hal Johnson',
    assignedMarkets: [],
    assignedRegions: ['54'], // Region 54 - sees all subordinate branches
    assignedBranches: [],
  },

  // ✓ Andrew Kasel: Region Sales Manager - Region 54 (Manual override)
  'andrew.kasel@rentokil.com': {
    role: 'region_sales_manager',
    name: 'Andrew Kasel',
    assignedMarkets: [],
    assignedRegions: ['54'], // Region 54 - sees all subordinate branches
    assignedBranches: [],
  },

  // ✓ Joaquin Barrera: Manager - Branch 98 (BigQuery verified)
  'joaquin.barrera@prestox.com': {
    role: 'manager',
    name: 'Joaquin Barrera',
    assignedMarkets: [],
    assignedRegions: [],
    assignedBranches: ['98'], // Midwest Market 2941, Region R52, Branch 98
  },

  // ✓ Jacob Bernal (goes by Adam): Sales Manager - Branch 098 (Manual override)
  'jacob.bernal@prestox.com': {
    role: 'sales_manager',
    name: 'Adam Bernal',
    assignedMarkets: [],
    assignedRegions: [],
    assignedBranches: ['098'], // Midwest Market 2941, Region R52, Branch 098
  },

  // ✓ Bruce Hockless: Ops Manager - Branch 98 (BigQuery verified)
  'bruce.hockless@prestox.com': {
    role: 'ops_manager',
    name: 'Bruce Hockless',
    assignedMarkets: [],
    assignedRegions: [],
    assignedBranches: ['98'], // Midwest Market 2941, Region R52, Branch 98
  },

  // ✓ Cody Lytle: Account Executive - Branch 098 (Manual override)
  'cody.lytle@prestox.com': {
    role: 'rep',
    name: 'Cody Lytle',
    assignedMarkets: [],
    assignedRegions: [],
    assignedBranches: ['098'], // Midwest Market 2941, Region R52, Branch 098
  },

  // ✓ Jesus Corral: Technician - Branch 98 context (Filtered by employeeId)
  'jesus.corral@prestox.com': {
    role: 'technician',
    name: 'Jesus Corral',
    assignedMarkets: [], // Technicians filtered by employeeId, not org codes
    assignedRegions: [],
    assignedBranches: [], // Branch 98 context: Midwest Market 2941, Region R52
  },
}

// =============================================================================
// Lookup Function
// =============================================================================

/**
 * Get dev role override for an email address
 *
 * Returns null if:
 * - Running in production (NODE_ENV === 'production')
 * - Email not in dev mappings
 *
 * @param email - User's email address
 * @returns Dev role mapping or null
 */
export function getDevRoleOverride(email: string): DevRoleMapping | null {
  // Safety check: Never activate in production
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const normalized = email.toLowerCase().trim()
  const mapping = DEV_ROLE_MAPPINGS[normalized]

  return mapping || null
}
