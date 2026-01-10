/**
 * Business Units Data Layer
 *
 * Supports multi-brand operations for Rentokil North America:
 * - Rentokil (primary brand)
 * - Ehrlich (eastern US legacy brand)
 * - Western Pest (northeastern US)
 * - ECI (independent/franchise operations)
 * - Presto-X (midwest)
 * - Anderson Pest (Chicago metro)
 *
 * In production, business unit determines:
 * - Data partitioning (RLS)
 * - Branding/theming
 * - Feature availability
 * - Reporting hierarchy
 */

export type BusinessUnitId =
  | 'rentokil'
  | 'ehrlich'
  | 'western'
  | 'eci'
  | 'prestox'
  | 'anderson'
  | 'all' // Consolidated view

export interface BusinessUnit {
  id: BusinessUnitId
  name: string
  shortName: string
  description: string
  region: string
  headquarters: string
  color: string // Brand color for UI theming
  logo?: string
  active: boolean
  features: BusinessUnitFeatures
  metrics: BusinessUnitMetrics
}

export interface BusinessUnitFeatures {
  hasLeadEngine: boolean
  hasForecast: boolean
  hasGovernance: boolean
  hasFieldService: boolean
  hasFinance: boolean
  hasPdfParser: boolean
}

export interface BusinessUnitMetrics {
  branches: number
  technicians: number
  accounts: number
  annualRevenue: number // In millions
  marketShare: number // Percentage of company total
}

export const BUSINESS_UNITS: Record<BusinessUnitId, BusinessUnit> = {
  rentokil: {
    id: 'rentokil',
    name: 'Rentokil Pest Control',
    shortName: 'Rentokil',
    description: 'Primary national brand for commercial and residential pest control',
    region: 'National',
    headquarters: 'Reading, PA',
    color: '#E30613', // Rentokil red
    active: true,
    features: {
      hasLeadEngine: true,
      hasForecast: true,
      hasGovernance: true,
      hasFieldService: true,
      hasFinance: true,
      hasPdfParser: true
    },
    metrics: {
      branches: 245,
      technicians: 4200,
      accounts: 125000,
      annualRevenue: 890,
      marketShare: 52
    }
  },
  ehrlich: {
    id: 'ehrlich',
    name: 'Ehrlich Pest Control',
    shortName: 'Ehrlich',
    description: 'Legacy eastern US brand with strong commercial presence',
    region: 'Eastern US',
    headquarters: 'Reading, PA',
    color: '#1E40AF', // Blue
    active: true,
    features: {
      hasLeadEngine: true,
      hasForecast: true,
      hasGovernance: true,
      hasFieldService: true,
      hasFinance: true,
      hasPdfParser: true
    },
    metrics: {
      branches: 85,
      technicians: 1400,
      accounts: 42000,
      annualRevenue: 285,
      marketShare: 17
    }
  },
  western: {
    id: 'western',
    name: 'Western Pest Services',
    shortName: 'Western',
    description: 'Northeastern US specialist with strong NYC metro presence',
    region: 'Northeast',
    headquarters: 'Parsippany, NJ',
    color: '#15803D', // Green
    active: true,
    features: {
      hasLeadEngine: true,
      hasForecast: true,
      hasGovernance: true,
      hasFieldService: true,
      hasFinance: true,
      hasPdfParser: false
    },
    metrics: {
      branches: 45,
      technicians: 820,
      accounts: 28000,
      annualRevenue: 195,
      marketShare: 11
    }
  },
  eci: {
    id: 'eci',
    name: 'ECI - Ehrlich Commercial & Industrial',
    shortName: 'ECI',
    description: 'Independent commercial-focused operations with franchise model',
    region: 'Multi-Regional',
    headquarters: 'Various',
    color: '#7C3AED', // Purple
    active: true,
    features: {
      hasLeadEngine: false, // Uses separate CRM
      hasForecast: true,
      hasGovernance: false,
      hasFieldService: true,
      hasFinance: true,
      hasPdfParser: false
    },
    metrics: {
      branches: 32,
      technicians: 480,
      accounts: 8500,
      annualRevenue: 95,
      marketShare: 6
    }
  },
  prestox: {
    id: 'prestox',
    name: 'Presto-X Pest Control',
    shortName: 'Presto-X',
    description: 'Midwest regional brand with agricultural pest expertise',
    region: 'Midwest',
    headquarters: 'Omaha, NE',
    color: '#DC2626', // Red variant
    active: true,
    features: {
      hasLeadEngine: true,
      hasForecast: true,
      hasGovernance: true,
      hasFieldService: true,
      hasFinance: true,
      hasPdfParser: true
    },
    metrics: {
      branches: 38,
      technicians: 620,
      accounts: 18000,
      annualRevenue: 125,
      marketShare: 7
    }
  },
  anderson: {
    id: 'anderson',
    name: 'Anderson Pest Solutions',
    shortName: 'Anderson',
    description: 'Chicago metro specialist with strong residential base',
    region: 'Chicago Metro',
    headquarters: 'Elmhurst, IL',
    color: '#0891B2', // Cyan
    active: true,
    features: {
      hasLeadEngine: true,
      hasForecast: true,
      hasGovernance: true,
      hasFieldService: true,
      hasFinance: true,
      hasPdfParser: true
    },
    metrics: {
      branches: 12,
      technicians: 280,
      accounts: 12000,
      annualRevenue: 78,
      marketShare: 5
    }
  },
  all: {
    id: 'all',
    name: 'All Business Units',
    shortName: 'Consolidated',
    description: 'Consolidated view across all Rentokil North America brands',
    region: 'National',
    headquarters: 'Reading, PA',
    color: '#374151', // Gray
    active: true,
    features: {
      hasLeadEngine: true,
      hasForecast: true,
      hasGovernance: true,
      hasFieldService: true,
      hasFinance: true,
      hasPdfParser: true
    },
    metrics: {
      branches: 457,
      technicians: 7800,
      accounts: 233500,
      annualRevenue: 1668,
      marketShare: 100
    }
  }
}

// Get active business units (excluding 'all')
export function getActiveBusinessUnits(): BusinessUnit[] {
  return Object.values(BUSINESS_UNITS).filter(bu => bu.active && bu.id !== 'all')
}

// Get all business units including consolidated view
export function getAllBusinessUnits(): BusinessUnit[] {
  return Object.values(BUSINESS_UNITS).filter(bu => bu.active)
}

// Get business unit by ID
export function getBusinessUnit(id: BusinessUnitId): BusinessUnit | undefined {
  return BUSINESS_UNITS[id]
}

// Check if a feature is available for a business unit
export function hasFeature(
  unitId: BusinessUnitId,
  feature: keyof BusinessUnitFeatures
): boolean {
  const unit = BUSINESS_UNITS[unitId]
  if (!unit) return false
  return unit.features[feature]
}

// Get total metrics across all units
export function getConsolidatedMetrics(): BusinessUnitMetrics {
  const units = getActiveBusinessUnits()
  return {
    branches: units.reduce((sum, u) => sum + u.metrics.branches, 0),
    technicians: units.reduce((sum, u) => sum + u.metrics.technicians, 0),
    accounts: units.reduce((sum, u) => sum + u.metrics.accounts, 0),
    annualRevenue: units.reduce((sum, u) => sum + u.metrics.annualRevenue, 0),
    marketShare: 100
  }
}

// Format revenue for display
export function formatRevenue(millions: number): string {
  if (millions >= 1000) {
    return `$${(millions / 1000).toFixed(1)}B`
  }
  return `$${millions}M`
}
