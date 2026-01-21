// RTX Power BI Workforce Types

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'overnight' | 'split'

export type ScheduleStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'absent' | 'excused'

export type AbsenceType = 'vacation' | 'sick' | 'personal' | 'fmla' | 'jury_duty' | 'bereavement' | 'no_call_no_show'

export type OvertimeType = 'voluntary' | 'mandatory' | 'emergency'

export interface WorkforceSchedule {
  id: string
  employeeId: string
  employeeName: string

  date: Date
  shiftType: ShiftType
  shiftStart: Date
  shiftEnd: Date
  scheduledHours: number

  status: ScheduleStatus
  actualStart?: Date
  actualEnd?: Date
  actualHours?: number

  branchId: string
  regionId: string
  routeId?: string

  notes?: string
}

export interface WorkforceAbsence {
  id: string
  employeeId: string
  employeeName: string

  startDate: Date
  endDate: Date
  absenceType: AbsenceType
  totalDays: number
  totalHours: number

  approved: boolean
  approvedBy?: string
  approvedDate?: Date

  reason?: string
  documentationProvided: boolean

  branchId: string
  regionId: string
}

export interface OvertimeRecord {
  id: string
  employeeId: string
  employeeName: string

  date: Date
  overtimeType: OvertimeType
  scheduledHours: number
  overtimeHours: number
  totalHours: number

  approved: boolean
  approvedBy?: string
  reason: string

  branchId: string
  regionId: string
}

export interface WorkforceCapacity {
  date: Date
  branchId: string
  branchName: string

  // Capacity
  totalPositions: number
  filledPositions: number
  openPositions: number
  fillRate: number

  // Hours
  scheduledHours: number
  availableHours: number
  plannedServiceHours: number
  capacityUtilization: number

  // Absences
  plannedAbsences: number
  unplannedAbsences: number

  // Status
  isUnderstaffed: boolean
  coverageGap: number
}

export interface WorkforceMetrics {
  // Headcount
  totalScheduled: number
  totalWorking: number
  totalAbsent: number
  absenteeismRate: number

  // Hours
  totalScheduledHours: number
  totalWorkedHours: number
  totalOvertimeHours: number
  overtimeRate: number

  // Utilization
  capacityUtilization: number
  productivityScore: number
  avgHoursPerEmployee: number

  // Attendance
  attendanceRate: number
  punctualityRate: number
  noCallNoShowRate: number

  // By type
  byShift: Record<ShiftType, number>
  byAbsenceType: Record<AbsenceType, number>
}

export interface AttendanceTrend {
  date: Date
  scheduled: number
  present: number
  absent: number
  attendanceRate: number
  overtimeHours: number
}

export interface ProductivityMetrics {
  employeeId: string
  employeeName: string
  role: string
  branchId: string

  hoursWorked: number
  serviceCallsCompleted: number
  revenueGenerated: number

  avgServiceTime: number
  callsPerHour: number
  revenuePerHour: number

  attendanceRate: number
  punctualityRate: number
  overtimeHours: number

  productivityScore: number
  rank: number
}

export interface BranchStaffing {
  branchId: string
  branchName: string
  regionId: string

  // Current state
  currentHeadcount: number
  targetHeadcount: number
  variance: number

  // By role
  technicians: number
  salesReps: number
  managers: number
  admin: number

  // Metrics
  absenteeismRate: number
  overtimeRate: number
  capacityUtilization: number
  openPositions: number
}

export interface ScheduleCompliance {
  period: string
  scheduledShifts: number
  completedShifts: number
  missedShifts: number

  scheduledHours: number
  workedHours: number
  variance: number

  complianceRate: number
  avgLateness: number // minutes
}

export interface WorkforceDashboard {
  asOfDate: Date
  metrics: WorkforceMetrics
  attendance: AttendanceTrend[]
  capacity: WorkforceCapacity[]
  topPerformers: ProductivityMetrics[]
  byBranch: BranchStaffing[]
  scheduleCompliance: ScheduleCompliance
  upcomingAbsences: WorkforceAbsence[]
  pendingOvertime: OvertimeRecord[]
}
