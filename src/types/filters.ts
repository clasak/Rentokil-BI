/**
 * Filter Types
 *
 * Common filter interfaces used across dashboards and components.
 */

// =============================================================================
// TIME PERIOD FILTERS
// =============================================================================

export type TimePeriod = 'today' | 'yesterday' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'last7' | 'last30' | 'last90' | 'custom'

export interface DateRange {
  start: Date
  end: Date
}

export interface TimePeriodFilter {
  period: TimePeriod
  customRange?: DateRange
}

// =============================================================================
// HIERARCHY FILTERS
// =============================================================================

export interface HierarchyFilter {
  market?: string
  region?: string
  branch?: string
}

export interface HierarchyOption {
  id: string
  name: string
  parentId?: string
  level: 'market' | 'region' | 'branch'
}

// =============================================================================
// COMMON FILTERS
// =============================================================================

export interface CommonFilters extends TimePeriodFilter, HierarchyFilter {
  // Search
  searchQuery?: string

  // Pagination
  page?: number
  pageSize?: number

  // Sorting
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

// =============================================================================
// LEAD FILTERS
// =============================================================================

export interface LeadFilters extends CommonFilters {
  source?: string[]
  stage?: string[]
  disposition?: string[]
  assignedTo?: string
  pestType?: string[]
  flowId?: number[]
  traceabilityStatus?: 'all' | 'traceable' | 'lost'
  matchConfidence?: 'all' | 'high' | 'medium' | 'low' | 'none'
}

// =============================================================================
// SALES FILTERS
// =============================================================================

export interface SalesFilters extends CommonFilters {
  stage?: string[]
  ownerId?: string
  ownerName?: string
  serviceType?: string[]
  minAmount?: number
  maxAmount?: number
  probabilityRange?: [number, number]
}

// =============================================================================
// FINANCE FILTERS
// =============================================================================

export interface FinanceFilters extends CommonFilters {
  agingBucket?: string[]
  status?: string[]
  minAmount?: number
  maxAmount?: number
  overdueOnly?: boolean
}

// =============================================================================
// SALTI FILTERS
// =============================================================================

export interface SaltiFilters extends CommonFilters {
  repId?: string
  repName?: string
  activityType?: string[]
  proposalStatus?: string[]
  minProductivity?: number
}

// =============================================================================
// HR FILTERS
// =============================================================================

export interface HRFilters extends CommonFilters {
  department?: string[]
  role?: string[]
  status?: 'active' | 'inactive' | 'all'
  tenureRange?: [number, number]
}

// =============================================================================
// OPS FILTERS
// =============================================================================

export interface OpsFilters extends CommonFilters {
  technicianId?: string
  routeId?: string
  serviceType?: string[]
  status?: string[]
  priority?: string[]
}

// =============================================================================
// FILTER STATE
// =============================================================================

export interface FilterState<T extends CommonFilters = CommonFilters> {
  filters: T
  isLoading: boolean
  error?: string
}

// =============================================================================
// FILTER PRESETS
// =============================================================================

export interface FilterPreset<T extends CommonFilters = CommonFilters> {
  id: string
  name: string
  description?: string
  filters: Partial<T>
  isDefault?: boolean
  isBuiltIn?: boolean
  createdBy?: string
  createdAt?: Date
}

// =============================================================================
// FILTER ACTIONS
// =============================================================================

export type FilterAction<T extends CommonFilters = CommonFilters> =
  | { type: 'SET_FILTER'; key: keyof T; value: T[keyof T] }
  | { type: 'SET_FILTERS'; filters: Partial<T> }
  | { type: 'RESET_FILTERS' }
  | { type: 'APPLY_PRESET'; preset: FilterPreset<T> }
  | { type: 'SET_PERIOD'; period: TimePeriod; customRange?: DateRange }
  | { type: 'SET_HIERARCHY'; hierarchy: HierarchyFilter }

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getDateRangeForPeriod(period: TimePeriod, customRange?: DateRange): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today':
      return { start: today, end: now }

    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: yesterday, end: today }

    case 'wtd':
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      return { start: weekStart, end: now }

    case 'mtd':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: monthStart, end: now }

    case 'qtd':
      const quarter = Math.floor(today.getMonth() / 3)
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1)
      return { start: quarterStart, end: now }

    case 'ytd':
      const yearStart = new Date(today.getFullYear(), 0, 1)
      return { start: yearStart, end: now }

    case 'last7':
      const last7 = new Date(today)
      last7.setDate(last7.getDate() - 7)
      return { start: last7, end: now }

    case 'last30':
      const last30 = new Date(today)
      last30.setDate(last30.getDate() - 30)
      return { start: last30, end: now }

    case 'last90':
      const last90 = new Date(today)
      last90.setDate(last90.getDate() - 90)
      return { start: last90, end: now }

    case 'custom':
      return customRange || { start: today, end: now }

    default:
      return { start: today, end: now }
  }
}

export function formatDateRange(range: DateRange): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = range.start.toLocaleDateString('en-US', options)
  const endStr = range.end.toLocaleDateString('en-US', options)
  return `${startStr} - ${endStr}`
}

export function getPeriodLabel(period: TimePeriod): string {
  const labels: Record<TimePeriod, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    wtd: 'Week to Date',
    mtd: 'Month to Date',
    qtd: 'Quarter to Date',
    ytd: 'Year to Date',
    last7: 'Last 7 Days',
    last30: 'Last 30 Days',
    last90: 'Last 90 Days',
    custom: 'Custom Range',
  }
  return labels[period]
}
