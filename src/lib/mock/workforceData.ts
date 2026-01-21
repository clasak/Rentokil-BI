import seedrandom from 'seedrandom'
import type {
  WorkforceSchedule,
  WorkforceAbsence,
  OvertimeRecord,
  WorkforceCapacity,
  WorkforceMetrics,
  AttendanceTrend,
  ProductivityMetrics,
  BranchStaffing,
  ScheduleCompliance,
  WorkforceDashboard,
  ShiftType,
  ScheduleStatus,
  AbsenceType,
  OvertimeType,
} from '@/types/workforce'

let rng: () => number

export function initializeWorkforceSeed(seed: number = 12345) {
  rng = seedrandom(`workforce-${seed}`)
}

initializeWorkforceSeed()

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + rng() * (end.getTime() - start.getTime()))
}

const SHIFT_TYPES: ShiftType[] = ['morning', 'afternoon', 'evening', 'overnight', 'split']
const SCHEDULE_STATUSES: ScheduleStatus[] = ['scheduled', 'confirmed', 'in_progress', 'completed', 'absent', 'excused']
const ABSENCE_TYPES: AbsenceType[] = ['vacation', 'sick', 'personal', 'fmla', 'jury_duty', 'bereavement', 'no_call_no_show']
const OVERTIME_TYPES: OvertimeType[] = ['voluntary', 'mandatory', 'emergency']
const ROLES = ['Technician', 'Senior Technician', 'Lead Technician', 'Supervisor']

const FIRST_NAMES = ['James', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Daniel']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']

const REGIONS = [
  { id: 'R16', name: 'Arkansas/Missouri' },
  { id: 'R23', name: 'Oklahoma/Kansas' },
  { id: 'R52', name: 'Texas East' },
  { id: 'R54', name: 'Texas Central' },
  { id: 'R75', name: 'Atlantic' },
]

export function generateWorkforceSchedules(count: number = 500): WorkforceSchedule[] {
  const schedules: WorkforceSchedule[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getTime() + (randomInt(-14, 14)) * 24 * 60 * 60 * 1000)
    const shiftType = randomChoice(SHIFT_TYPES)
    const status = date < now ? randomChoice(['completed', 'absent', 'excused'] as ScheduleStatus[]) : randomChoice(SCHEDULE_STATUSES)

    let shiftStart: Date
    let scheduledHours: number

    switch (shiftType) {
      case 'morning':
        shiftStart = new Date(date.setHours(6, 0, 0, 0))
        scheduledHours = 8
        break
      case 'afternoon':
        shiftStart = new Date(date.setHours(14, 0, 0, 0))
        scheduledHours = 8
        break
      case 'evening':
        shiftStart = new Date(date.setHours(16, 0, 0, 0))
        scheduledHours = 6
        break
      case 'overnight':
        shiftStart = new Date(date.setHours(22, 0, 0, 0))
        scheduledHours = 8
        break
      case 'split':
        shiftStart = new Date(date.setHours(7, 0, 0, 0))
        scheduledHours = 10
        break
      default:
        shiftStart = new Date(date.setHours(8, 0, 0, 0))
        scheduledHours = 8
    }

    const shiftEnd = new Date(shiftStart.getTime() + scheduledHours * 60 * 60 * 1000)

    const schedule: WorkforceSchedule = {
      id: `SCH-${String(i + 1).padStart(6, '0')}`,
      employeeId: `EMP-${String(randomInt(1, 200)).padStart(6, '0')}`,
      employeeName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      date,
      shiftType,
      shiftStart,
      shiftEnd,
      scheduledHours,
      status,
      actualStart: status === 'completed' ? new Date(shiftStart.getTime() + randomInt(-15, 30) * 60 * 1000) : undefined,
      actualEnd: status === 'completed' ? new Date(shiftEnd.getTime() + randomInt(-30, 60) * 60 * 1000) : undefined,
      actualHours: status === 'completed' ? scheduledHours + randomFloat(-1, 2) : undefined,
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
      routeId: rng() > 0.2 ? `RTE-${String(randomInt(1, 100)).padStart(4, '0')}` : undefined,
      notes: rng() > 0.8 ? 'Special route assignment' : undefined,
    }

    schedules.push(schedule)
  }

  return schedules
}

export function generateWorkforceAbsences(count: number = 50): WorkforceAbsence[] {
  const absences: WorkforceAbsence[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const startDate = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
    const absenceType = randomChoice(ABSENCE_TYPES)
    const totalDays = absenceType === 'vacation' ? randomInt(1, 10) : absenceType === 'fmla' ? randomInt(5, 30) : randomInt(1, 3)
    const endDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000)

    const absence: WorkforceAbsence = {
      id: `ABS-${String(i + 1).padStart(5, '0')}`,
      employeeId: `EMP-${String(randomInt(1, 200)).padStart(6, '0')}`,
      employeeName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      startDate,
      endDate,
      absenceType,
      totalDays,
      totalHours: totalDays * 8,
      approved: rng() > 0.1,
      approvedBy: rng() > 0.1 ? `Manager ${randomInt(1, 20)}` : undefined,
      approvedDate: rng() > 0.1 ? new Date(startDate.getTime() - randomInt(1, 14) * 24 * 60 * 60 * 1000) : undefined,
      reason: absenceType === 'vacation' ? 'Personal time off' : absenceType === 'sick' ? 'Illness' : 'Personal matter',
      documentationProvided: absenceType === 'fmla' || absenceType === 'jury_duty' || rng() > 0.7,
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
    }

    absences.push(absence)
  }

  return absences.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
}

export function generateOvertimeRecords(count: number = 100): OvertimeRecord[] {
  const records: OvertimeRecord[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const date = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now)
    const scheduledHours = 8
    const overtimeHours = randomFloat(1, 4)

    const record: OvertimeRecord = {
      id: `OT-${String(i + 1).padStart(5, '0')}`,
      employeeId: `EMP-${String(randomInt(1, 200)).padStart(6, '0')}`,
      employeeName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      date,
      overtimeType: randomChoice(OVERTIME_TYPES),
      scheduledHours,
      overtimeHours,
      totalHours: scheduledHours + overtimeHours,
      approved: rng() > 0.15,
      approvedBy: rng() > 0.15 ? `Manager ${randomInt(1, 20)}` : undefined,
      reason: randomChoice(['Customer emergency', 'Route coverage', 'Training', 'Inventory', 'Special project']),
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
    }

    records.push(record)
  }

  return records.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function generateWorkforceCapacity(days: number = 14): WorkforceCapacity[] {
  const capacities: WorkforceCapacity[] = []
  const now = new Date()

  for (let d = 0; d < days; d++) {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

    for (let b = 1; b <= 10; b++) {
      const totalPositions = randomInt(8, 20)
      const filledPositions = Math.floor(totalPositions * randomFloat(0.8, 1.0))
      const scheduledHours = filledPositions * 8
      const plannedServiceHours = randomInt(50, 150)
      const plannedAbsences = randomInt(0, 3)
      const unplannedAbsences = randomInt(0, 2)

      capacities.push({
        date,
        branchId: `BR-${String(b).padStart(3, '0')}`,
        branchName: `Branch ${b}`,
        totalPositions,
        filledPositions,
        openPositions: totalPositions - filledPositions,
        fillRate: (filledPositions / totalPositions) * 100,
        scheduledHours,
        availableHours: scheduledHours - (plannedAbsences + unplannedAbsences) * 8,
        plannedServiceHours,
        capacityUtilization: (plannedServiceHours / scheduledHours) * 100,
        plannedAbsences,
        unplannedAbsences,
        isUnderstaffed: filledPositions < totalPositions * 0.85,
        coverageGap: Math.max(0, plannedServiceHours - (scheduledHours - (plannedAbsences + unplannedAbsences) * 8)),
      })
    }
  }

  return capacities
}

export function calculateWorkforceMetrics(schedules: WorkforceSchedule[]): WorkforceMetrics {
  const completed = schedules.filter(s => s.status === 'completed')
  const absent = schedules.filter(s => s.status === 'absent' || s.status === 'excused')
  const totalScheduled = schedules.length
  const totalWorking = completed.length
  const totalScheduledHours = schedules.reduce((sum, s) => sum + s.scheduledHours, 0)
  const totalWorkedHours = completed.reduce((sum, s) => sum + (s.actualHours || s.scheduledHours), 0)
  const totalOvertimeHours = completed.reduce((sum, s) => sum + Math.max(0, (s.actualHours || 0) - s.scheduledHours), 0)

  const byShift = SHIFT_TYPES.reduce((acc, shift) => {
    acc[shift] = schedules.filter(s => s.shiftType === shift).length
    return acc
  }, {} as Record<ShiftType, number>)

  const byAbsenceType = ABSENCE_TYPES.reduce((acc, type) => {
    acc[type] = randomInt(1, 10)
    return acc
  }, {} as Record<AbsenceType, number>)

  return {
    totalScheduled,
    totalWorking,
    totalAbsent: absent.length,
    absenteeismRate: (absent.length / totalScheduled) * 100,
    totalScheduledHours,
    totalWorkedHours,
    totalOvertimeHours,
    overtimeRate: (totalOvertimeHours / totalWorkedHours) * 100,
    capacityUtilization: randomFloat(75, 95),
    productivityScore: randomFloat(80, 100),
    avgHoursPerEmployee: totalWorkedHours / totalWorking,
    attendanceRate: (totalWorking / totalScheduled) * 100,
    punctualityRate: randomFloat(88, 98),
    noCallNoShowRate: randomFloat(0.5, 3),
    byShift,
    byAbsenceType,
  }
}

export function generateAttendanceTrends(days: number = 30): AttendanceTrend[] {
  const trends: AttendanceTrend[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const scheduled = randomInt(150, 250)
    const present = Math.floor(scheduled * randomFloat(0.9, 0.98))

    trends.push({
      date,
      scheduled,
      present,
      absent: scheduled - present,
      attendanceRate: (present / scheduled) * 100,
      overtimeHours: randomInt(20, 100),
    })
  }

  return trends
}

export function generateProductivityMetrics(count: number = 50): ProductivityMetrics[] {
  const metrics: ProductivityMetrics[] = []

  for (let i = 0; i < count; i++) {
    const hoursWorked = randomInt(140, 200)
    const serviceCallsCompleted = randomInt(80, 200)
    const revenueGenerated = serviceCallsCompleted * randomInt(100, 300)

    metrics.push({
      employeeId: `EMP-${String(i + 1).padStart(6, '0')}`,
      employeeName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      role: randomChoice(ROLES),
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      hoursWorked,
      serviceCallsCompleted,
      revenueGenerated,
      avgServiceTime: randomFloat(30, 60),
      callsPerHour: serviceCallsCompleted / hoursWorked,
      revenuePerHour: revenueGenerated / hoursWorked,
      attendanceRate: randomFloat(90, 100),
      punctualityRate: randomFloat(85, 100),
      overtimeHours: randomInt(0, 20),
      productivityScore: randomFloat(70, 100),
      rank: 0,
    })
  }

  return metrics
    .sort((a, b) => b.productivityScore - a.productivityScore)
    .map((m, i) => ({ ...m, rank: i + 1 }))
}

export function generateBranchStaffing(): BranchStaffing[] {
  const staffing: BranchStaffing[] = []

  for (let i = 1; i <= 20; i++) {
    const targetHeadcount = randomInt(10, 30)
    const currentHeadcount = Math.floor(targetHeadcount * randomFloat(0.8, 1.05))

    staffing.push({
      branchId: `BR-${String(i).padStart(3, '0')}`,
      branchName: `Branch ${i}`,
      regionId: randomChoice(REGIONS).id,
      currentHeadcount,
      targetHeadcount,
      variance: currentHeadcount - targetHeadcount,
      technicians: Math.floor(currentHeadcount * 0.7),
      salesReps: Math.floor(currentHeadcount * 0.15),
      managers: Math.floor(currentHeadcount * 0.1),
      admin: Math.floor(currentHeadcount * 0.05),
      absenteeismRate: randomFloat(3, 8),
      overtimeRate: randomFloat(5, 15),
      capacityUtilization: randomFloat(75, 95),
      openPositions: Math.max(0, targetHeadcount - currentHeadcount),
    })
  }

  return staffing.sort((a, b) => b.currentHeadcount - a.currentHeadcount)
}

export function generateScheduleCompliance(): ScheduleCompliance {
  const scheduledShifts = randomInt(1000, 2000)
  const completedShifts = Math.floor(scheduledShifts * randomFloat(0.92, 0.98))
  const scheduledHours = scheduledShifts * 8
  const workedHours = completedShifts * 8 + randomInt(-200, 400)

  return {
    period: 'MTD',
    scheduledShifts,
    completedShifts,
    missedShifts: scheduledShifts - completedShifts,
    scheduledHours,
    workedHours,
    variance: workedHours - scheduledHours,
    complianceRate: (completedShifts / scheduledShifts) * 100,
    avgLateness: randomFloat(3, 12),
  }
}

export function generateWorkforceDashboard(): WorkforceDashboard {
  const schedules = generateWorkforceSchedules(500)
  const absences = generateWorkforceAbsences(50)
  const overtime = generateOvertimeRecords(100)
  const now = new Date()

  const upcomingAbsences = absences.filter(a => a.startDate > now && a.startDate < new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000))
  const pendingOvertime = overtime.filter(o => !o.approved)

  return {
    asOfDate: now,
    metrics: calculateWorkforceMetrics(schedules),
    attendance: generateAttendanceTrends(30),
    capacity: generateWorkforceCapacity(14),
    topPerformers: generateProductivityMetrics(20).slice(0, 10),
    byBranch: generateBranchStaffing(),
    scheduleCompliance: generateScheduleCompliance(),
    upcomingAbsences,
    pendingOvertime,
  }
}
