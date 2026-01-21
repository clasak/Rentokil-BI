// RTX Power BI Filter Types

export type TimePeriod = 'today' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'

export type ComparisonType = 'prior_period' | 'prior_year' | 'budget' | 'forecast'

export type ViewMode = 'summary' | 'detailed' | 'trending'

export type GranularityLevel = 'region' | 'market' | 'branch' | 'team' | 'individual'

export interface DateRange {
  start: Date
  end: Date
}

export interface PeriodSelection {
  period: TimePeriod
  customRange?: DateRange
  comparisonType: ComparisonType
}

export interface HierarchyFilter {
  regionIds: string[]
  marketIds: string[]
  branchIds: string[]
  teamIds: string[]
  repIds: string[]
  technicianIds: string[]
}

export interface ServiceLineFilter {
  pestControl: boolean
  termite: boolean
  wildlife: boolean
  mosquito: boolean
  bedBug: boolean
  commercial: boolean
  residential: boolean
}

export interface CustomerSegmentFilter {
  segments: ('residential' | 'commercial' | 'government' | 'healthcare' | 'food_service')[]
  contractTypes: ('recurring' | 'one_time' | 'project')[]
  customerTenure: ('new' | 'established' | 'long_term')[]
}

export interface RTXFilters {
  period: PeriodSelection
  hierarchy: HierarchyFilter
  serviceLine: ServiceLineFilter
  customerSegment: CustomerSegmentFilter
  viewMode: ViewMode
  granularity: GranularityLevel
}

export interface FilterPreset {
  id: string
  name: string
  description: string
  filters: RTXFilters
  isDefault: boolean
  createdBy: string
  createdAt: Date
}

export interface FilterState {
  current: RTXFilters
  presets: FilterPreset[]
  lastApplied: Date
}

// Helper to create default filters
export function createDefaultFilters(): RTXFilters {
  return {
    period: {
      period: 'mtd',
      comparisonType: 'prior_year'
    },
    hierarchy: {
      regionIds: [],
      marketIds: [],
      branchIds: [],
      teamIds: [],
      repIds: [],
      technicianIds: []
    },
    serviceLine: {
      pestControl: true,
      termite: true,
      wildlife: true,
      mosquito: true,
      bedBug: true,
      commercial: true,
      residential: true
    },
    customerSegment: {
      segments: [],
      contractTypes: [],
      customerTenure: []
    },
    viewMode: 'summary',
    granularity: 'branch'
  }
}
