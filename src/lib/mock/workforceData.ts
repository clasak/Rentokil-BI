/**
 * Mock Workforce Data
 *
 * Synthetic data for workforce management and technician productivity.
 */

import seedrandom from 'seedrandom'
import type {
  Technician,
  TechProductivity,
  DailySchedule,
  ScheduleSlot,
  CapacityPlan,
  RouteEfficiency,
} from '@/types/workforce'

let rng = seedrandom('workforce-42')

function resetRng(seed = 'workforce-42') {
  rng = seedrandom(seed)
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

const CERTIFICATIONS = ['general_pest', 'termite', 'wildlife', 'fumigation', 'commercial', 'bed_bug', 'mosquito'] as const
const SERVICE_TYPES = ['general_pest', 'termite', 'wildlife', 'commercial', 'bed_bug', 'mosquito', 'rodent'] as const
const MARKETS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
const FIRST_NAMES = ['John', 'Mike', 'David', 'James', 'Robert', 'Chris', 'Daniel', 'Matt', 'Steve', 'Tom']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Wilson', 'Martinez', 'Anderson', 'Taylor']

// =============================================================================
// TECHNICIAN DATA
// =============================================================================

export function generateMockTechnicians(count: number = 50, seed?: string): Technician[] {
  if (seed) resetRng(seed)
  else resetRng()

  const technicians: Technician[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const startDaysAgo = randomInt(90, 2000)
    const tenureMonths = Math.floor(startDaysAgo / 30)

    technicians.push({
      id: `TECH-${String(i + 1).padStart(4, '0')}`,
      employeeId: `EMP-${String(randomInt(10000, 99999))}`,
      firstName: randomChoice(FIRST_NAMES),
      lastName: randomChoice(LAST_NAMES),
      fullName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      email: `tech${i}@company.com`,
      phone: `555-${randomInt(1000, 9999)}`,
      branchId: `BR-${randomInt(100, 500)}`,
      branchName: `Branch ${randomInt(100, 500)}`,
      regionId: `REG-${randomInt(1, 12)}`,
      market: randomChoice(MARKETS),
      routeId: `RT-${randomInt(1000, 9999)}`,
      certifications: Array.from({ length: randomInt(2, 5) }, () => randomChoice(CERTIFICATIONS)),
      serviceTypes: Array.from({ length: randomInt(2, 4) }, () => randomChoice(SERVICE_TYPES)),
      skillLevel: tenureMonths < 6 ? 'trainee' : tenureMonths < 18 ? 'junior' : tenureMonths < 48 ? 'senior' : 'lead',
      status: rng() > 0.95 ? 'on_leave' : 'active',
      startDate: new Date(now - startDaysAgo * 24 * 60 * 60 * 1000),
      tenureMonths,
      vehicleId: `VH-${randomInt(1000, 9999)}`,
      vehicleType: randomChoice(['Van', 'Truck', 'SUV']),
      avgProductivity: randomFloat(85, 115),
      avgRating: randomFloat(4.2, 5.0),
      completionRate: randomFloat(0.92, 0.99),
    })
  }

  return technicians
}

// =============================================================================
// PRODUCTIVITY DATA
// =============================================================================

export function generateMockTechProductivity(
  technicians: Technician[],
  period: string = 'MTD',
  seed?: string
): TechProductivity[] {
  if (seed) resetRng(seed)
  else resetRng()

  return technicians.map((tech, i) => {
    const stopsScheduled = randomInt(80, 150)
    const stopsCompleted = randomInt(Math.floor(stopsScheduled * 0.9), stopsScheduled)
    const revenueGenerated = stopsCompleted * randomInt(80, 200)
    const totalHoursWorked = randomInt(140, 180)
    const productiveHours = totalHoursWorked * randomFloat(0.7, 0.85)

    return {
      technicianId: tech.id,
      technicianName: tech.fullName,
      branchId: tech.branchId,
      branchName: tech.branchName,
      period,
      stopsCompleted,
      stopsScheduled,
      completionRate: stopsCompleted / stopsScheduled,
      revenueGenerated,
      avgRevenuePerStop: revenueGenerated / stopsCompleted,
      upsellRevenue: randomInt(500, 3000),
      upsellCount: randomInt(2, 15),
      totalHoursWorked,
      productiveHours,
      driveTime: totalHoursWorked - productiveHours,
      avgTimePerStop: (productiveHours * 60) / stopsCompleted,
      utilization: productiveHours / totalHoursWorked,
      callbackRate: randomFloat(0.01, 0.08),
      customerRating: randomFloat(4.2, 5.0),
      firstTimeFixRate: randomFloat(0.88, 0.98),
      reworkCount: randomInt(0, 5),
      vsTarget: randomFloat(-15, 20),
      vsBranchAvg: randomFloat(-10, 15),
      vsCompanyAvg: randomFloat(-12, 18),
      rank: i + 1,
      percentile: 100 - (i * 100 / technicians.length),
    }
  }).sort((a, b) => b.revenueGenerated - a.revenueGenerated)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

// =============================================================================
// SCHEDULE DATA
// =============================================================================

export function generateMockDailySchedule(
  technicianId: string,
  technicianName: string,
  date: Date,
  seed?: string
): DailySchedule {
  if (seed) resetRng(seed)
  else resetRng()

  const slotCount = randomInt(8, 14)
  const slots: ScheduleSlot[] = []
  let currentTime = 8 * 60 // 8:00 AM in minutes

  for (let i = 0; i < slotCount; i++) {
    const duration = randomInt(20, 60)
    const driveTime = randomInt(5, 25)
    const startHour = Math.floor(currentTime / 60)
    const startMin = currentTime % 60
    const endTime = currentTime + duration
    const endHour = Math.floor(endTime / 60)
    const endMin = endTime % 60

    const status = rng() > 0.15 ? 'completed' : rng() > 0.5 ? 'scheduled' : 'canceled'

    slots.push({
      id: `SLT-${technicianId}-${i}`,
      technicianId,
      date,
      startTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      endTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
      status: status as ScheduleSlot['status'],
      serviceOrderId: `SO-${randomInt(10000, 99999)}`,
      accountId: `ACC-${randomInt(1000, 9999)}`,
      accountName: `Customer ${randomInt(1, 500)}`,
      serviceType: randomChoice(SERVICE_TYPES),
      address: `${randomInt(100, 9999)} ${randomChoice(['Oak', 'Main', 'Elm'])} St`,
      estimatedDuration: duration,
      estimatedDriveTime: driveTime,
      priority: randomChoice(['high', 'medium', 'low', 'routine']),
    })

    currentTime = endTime + driveTime
    if (currentTime > 17 * 60) break // Don't go past 5 PM
  }

  const completedSlots = slots.filter(s => s.status === 'completed').length
  const scheduledRevenue = slots.length * randomInt(80, 180)

  return {
    date,
    technicianId,
    technicianName,
    branchId: `BR-${randomInt(100, 500)}`,
    totalSlots: slots.length,
    scheduledSlots: slots.filter(s => s.status === 'scheduled' || s.status === 'completed').length,
    completedSlots,
    availableSlots: 0,
    startTime: '08:00',
    endTime: '17:00',
    breakTime: 60,
    driveTimeEstimate: slots.reduce((sum, s) => sum + (s.estimatedDriveTime || 0), 0),
    slots,
    scheduledRevenue,
    completedRevenue: (completedSlots / slots.length) * scheduledRevenue,
    estimatedMiles: randomInt(40, 120),
  }
}

// =============================================================================
// CAPACITY PLANNING
// =============================================================================

export function generateMockCapacityPlan(
  branchId: string,
  branchName: string,
  period: string = 'Next Week',
  seed?: string
): CapacityPlan {
  if (seed) resetRng(seed)
  else resetRng()

  const totalTechnicians = randomInt(8, 20)
  const availableTechnicians = randomInt(Math.floor(totalTechnicians * 0.85), totalTechnicians)
  const hoursPerTech = 40
  const totalCapacityHours = totalTechnicians * hoursPerTech
  const availableCapacityHours = availableTechnicians * hoursPerTech * randomFloat(0.85, 0.95)

  const scheduledStops = randomInt(300, 600)
  const avgTimePerStop = 0.5 // hours
  const estimatedDemandHours = scheduledStops * avgTimePerStop
  const backlogStops = randomInt(20, 80)
  const backlogHours = backlogStops * avgTimePerStop

  const capacityGap = estimatedDemandHours - availableCapacityHours

  return {
    period,
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    branchId,
    branchName,
    totalTechnicians,
    availableTechnicians,
    totalCapacityHours,
    availableCapacityHours,
    scheduledStops,
    estimatedDemandHours,
    backlogStops,
    backlogHours,
    capacityGap,
    gapPercent: capacityGap / availableCapacityHours * 100,
    overtimeRequired: Math.max(0, capacityGap),
    hiringNeeded: capacityGap > availableCapacityHours * 0.15,
    routeOptimizationPotential: randomFloat(5, 15),
  }
}

// =============================================================================
// ROUTE EFFICIENCY
// =============================================================================

export function generateMockRouteEfficiency(
  routeId: string,
  branchId: string,
  date: Date,
  seed?: string
): RouteEfficiency {
  if (seed) resetRng(seed)
  else resetRng()

  const totalStops = randomInt(8, 15)
  const totalMiles = randomInt(40, 120)
  const totalDriveTime = randomInt(60, 180) // minutes
  const optimalMiles = totalMiles * randomFloat(0.75, 0.90)
  const efficiency = optimalMiles / totalMiles

  return {
    routeId,
    branchId,
    date,
    totalStops,
    totalMiles,
    totalDriveTime,
    avgMilesPerStop: totalMiles / totalStops,
    avgDriveTimePerStop: totalDriveTime / totalStops,
    efficiency,
    wastedMiles: totalMiles - optimalMiles,
    wastedTime: totalDriveTime * (1 - efficiency),
    potentialSavings: (totalMiles - optimalMiles) * 0.58, // $0.58 per mile
    vsBranchAvg: randomFloat(-10, 15),
    vsOptimal: (1 - efficiency) * 100,
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const mockWorkforceData = {
  generateTechnicians: generateMockTechnicians,
  generateTechProductivity: generateMockTechProductivity,
  generateDailySchedule: generateMockDailySchedule,
  generateCapacityPlan: generateMockCapacityPlan,
  generateRouteEfficiency: generateMockRouteEfficiency,
}
