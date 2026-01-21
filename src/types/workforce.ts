/**
 * Workforce Types
 *
 * Type definitions for workforce management and technician productivity.
 * Covers scheduling, productivity, route optimization, and capacity planning.
 */

// =============================================================================
// TECHNICIAN TYPES
// =============================================================================

export interface Technician {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string

  // Assignment
  branchId: string
  branchName: string
  regionId: string
  market: string
  routeId?: string

  // Skills
  certifications: Certification[]
  serviceTypes: ServiceType[]
  skillLevel: 'trainee' | 'junior' | 'senior' | 'lead'

  // Status
  status: TechnicianStatus
  startDate: Date
  tenureMonths: number

  // Vehicle
  vehicleId?: string
  vehicleType?: string

  // Performance (summary)
  avgProductivity?: number
  avgRating?: number
  completionRate?: number
}

export type Certification =
  | 'general_pest'
  | 'termite'
  | 'wildlife'
  | 'fumigation'
  | 'commercial'
  | 'bed_bug'
  | 'mosquito'
  | 'tap_insulation'

export type ServiceType =
  | 'general_pest'
  | 'termite'
  | 'wildlife'
  | 'fumigation'
  | 'bed_bug'
  | 'mosquito'
  | 'commercial'
  | 'rodent'
  | 'lawn_care'

export type TechnicianStatus =
  | 'active'
  | 'on_leave'
  | 'training'
  | 'inactive'
  | 'terminated'

// =============================================================================
// PRODUCTIVITY TYPES
// =============================================================================

export interface TechProductivity {
  technicianId: string
  technicianName: string
  branchId: string
  branchName: string
  period: string

  // Volume
  stopsCompleted: number
  stopsScheduled: number
  completionRate: number

  // Revenue
  revenueGenerated: number
  avgRevenuePerStop: number
  upsellRevenue: number
  upsellCount: number

  // Time
  totalHoursWorked: number
  productiveHours: number
  driveTime: number
  avgTimePerStop: number
  utilization: number

  // Quality
  callbackRate: number
  customerRating: number
  firstTimeFixRate: number
  reworkCount: number

  // Comparison
  vsTarget: number
  vsBranchAvg: number
  vsCompanyAvg: number
  rank: number
  percentile: number
}

export interface ProductivityTrend {
  period: string
  date: Date
  stopsCompleted: number
  revenueGenerated: number
  avgTimePerStop: number
  completionRate: number
  customerRating: number
}

export interface ProductivityBenchmark {
  metric: string
  techValue: number
  branchAvg: number
  regionAvg: number
  companyAvg: number
  topPerformer: number
  target: number
}

// =============================================================================
// SCHEDULING TYPES
// =============================================================================

export interface ScheduleSlot {
  id: string
  technicianId: string
  date: Date
  startTime: string
  endTime: string
  status: SlotStatus

  // Assignment
  serviceOrderId?: string
  accountId?: string
  accountName?: string
  serviceType?: ServiceType
  address?: string
  lat?: number
  lng?: number

  // Estimated
  estimatedDuration: number
  estimatedDriveTime?: number
  priority: 'high' | 'medium' | 'low' | 'routine'
}

export type SlotStatus =
  | 'available'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'no_show'
  | 'blocked'

export interface DailySchedule {
  date: Date
  technicianId: string
  technicianName: string
  branchId: string

  // Summary
  totalSlots: number
  scheduledSlots: number
  completedSlots: number
  availableSlots: number

  // Time
  startTime: string
  endTime: string
  breakTime: number
  driveTimeEstimate: number

  // Stops
  slots: ScheduleSlot[]
  optimizedRoute?: OptimizedRoute

  // Metrics
  scheduledRevenue: number
  completedRevenue: number
  estimatedMiles: number
}

export interface OptimizedRoute {
  technicianId: string
  date: Date
  stops: Array<{
    order: number
    slotId: string
    address: string
    lat: number
    lng: number
    arrivalTime: string
    departureTime: string
    driveTimeFromPrevious: number
  }>
  totalDistance: number
  totalDriveTime: number
  efficiency: number
}

// =============================================================================
// CAPACITY PLANNING TYPES
// =============================================================================

export interface CapacityPlan {
  period: string
  periodStart: Date
  periodEnd: Date
  branchId: string
  branchName: string

  // Supply
  totalTechnicians: number
  availableTechnicians: number
  totalCapacityHours: number
  availableCapacityHours: number

  // Demand
  scheduledStops: number
  estimatedDemandHours: number
  backlogStops: number
  backlogHours: number

  // Gap
  capacityGap: number
  gapPercent: number
  overtimeRequired: number

  // Actions
  hiringNeeded: boolean
  routeOptimizationPotential: number
}

export interface CapacityByServiceType {
  serviceType: ServiceType
  demand: number
  capacity: number
  gap: number
  qualifiedTechs: number
}

export interface CapacityTrend {
  period: string
  demand: number
  capacity: number
  utilization: number
  overtime: number
  backlog: number
}

// =============================================================================
// ROUTE OPTIMIZATION TYPES
// =============================================================================

export interface RouteEfficiency {
  routeId: string
  branchId: string
  date: Date

  // Metrics
  totalStops: number
  totalMiles: number
  totalDriveTime: number
  avgMilesPerStop: number
  avgDriveTimePerStop: number

  // Efficiency
  efficiency: number // % of theoretical optimal
  wastedMiles: number
  wastedTime: number
  potentialSavings: number

  // Comparison
  vsBranchAvg: number
  vsOptimal: number
}

export interface RouteOptimizationSuggestion {
  routeId: string
  date: Date
  suggestionType: 'reorder' | 'reassign' | 'combine' | 'split'
  description: string
  currentMiles: number
  optimizedMiles: number
  milesReduction: number
  timeReduction: number
  confidence: 'high' | 'medium' | 'low'
}

// =============================================================================
// WORKFORCE DASHBOARD TYPES
// =============================================================================

export interface WorkforceDashboardCard {
  metric: string
  metricLabel: string
  value: number
  formattedValue: string
  target?: number
  variance?: number
  trend: {
    direction: 'up' | 'down' | 'flat'
    value: number
    isPositive: boolean
  }
  status: 'good' | 'warning' | 'critical'
}

export interface WorkforceDashboardState {
  selectedPeriod: 'today' | 'wtd' | 'mtd' | 'qtd'
  selectedBranch?: string
  selectedRegion?: string
  selectedTechnician?: string
  viewMode: 'productivity' | 'scheduling' | 'capacity' | 'routes'
}

// =============================================================================
// WORKFORCE KPI TYPES
// =============================================================================

export interface WorkforceKPI {
  name: string
  slug: string
  value: number
  formattedValue: string
  unit: 'number' | 'percent' | 'currency' | 'time' | 'rating'
  target?: number
  variance?: number
  trend: {
    direction: 'up' | 'down' | 'flat'
    value: number
    isPositive: boolean
  }
  status: 'good' | 'warning' | 'critical'
  breakdown?: Array<{
    label: string
    value: number
  }>
}
