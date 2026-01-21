// RTX Power BI HR Types

export type EmployeeStatus = 'active' | 'on_leave' | 'terminated' | 'retired'

export type EmployeeType = 'full_time' | 'part_time' | 'contractor' | 'seasonal' | 'intern'

export type Department = 'sales' | 'operations' | 'finance' | 'hr' | 'marketing' | 'it' | 'executive'

export type JobFamily = 'technician' | 'sales_rep' | 'manager' | 'director' | 'executive' | 'admin' | 'specialist'

export type TerminationType = 'voluntary' | 'involuntary' | 'retirement' | 'layoff'

export interface Employee {
  id: string
  employeeNumber: string

  // Personal
  firstName: string
  lastName: string
  email: string
  phone: string

  // Employment
  status: EmployeeStatus
  employeeType: EmployeeType
  department: Department
  jobFamily: JobFamily
  jobTitle: string

  // Location
  branchId: string
  regionId: string
  workLocation: string

  // Dates
  hireDate: Date
  terminationDate?: Date
  lastReviewDate?: Date

  // Manager
  managerId?: string
  managerName?: string

  // Compensation (if authorized)
  salaryBand?: string
  performanceRating?: number
}

export interface HeadcountMetrics {
  // Current headcount
  totalHeadcount: number
  activeEmployees: number
  onLeave: number

  // By type
  byType: Record<EmployeeType, number>
  byDepartment: Record<Department, number>
  byJobFamily: Record<JobFamily, number>

  // Changes
  newHires: number
  terminations: number
  netChange: number

  // Rates
  turnoverRate: number
  voluntaryTurnover: number
  involuntaryTurnover: number

  // Tenure
  avgTenure: number
  medianTenure: number
}

export interface TurnoverAnalysis {
  period: string

  totalTerminations: number
  voluntaryTerminations: number
  involuntaryTerminations: number
  retirements: number

  turnoverRate: number
  voluntaryRate: number
  involuntaryRate: number
  retirementRate: number

  topReasons: { reason: string; count: number; percent: number }[]

  byDepartment: Record<Department, number>
  byTenureBucket: {
    bucket: string
    count: number
    percent: number
  }[]
}

export interface HiringMetrics {
  openPositions: number
  applicationsReceived: number
  interviewsScheduled: number
  offersExtended: number
  offerAcceptances: number

  timeToFill: number // days
  costPerHire: number
  offerAcceptanceRate: number

  byDepartment: Record<Department, {
    openings: number
    filled: number
    avgTimeToFill: number
  }>
}

export interface TenureDistribution {
  bucket: string // e.g., '0-1 years', '1-2 years', etc.
  count: number
  percent: number
  avgPerformance?: number
}

export interface PerformanceDistribution {
  rating: number // 1-5
  count: number
  percent: number
  label: string // e.g., 'Exceeds Expectations'
}

export interface DepartmentMetrics {
  department: Department
  headcount: number
  newHires: number
  terminations: number
  turnoverRate: number
  avgTenure: number
  avgPerformance?: number
  openPositions: number
}

export interface HRTrend {
  date: Date
  headcount: number
  newHires: number
  terminations: number
  turnoverRate: number
}

export interface HRDashboard {
  asOfDate: Date
  headcount: HeadcountMetrics
  turnover: TurnoverAnalysis
  hiring: HiringMetrics
  tenureDistribution: TenureDistribution[]
  performanceDistribution: PerformanceDistribution[]
  byDepartment: DepartmentMetrics[]
  trend: HRTrend[]
}
