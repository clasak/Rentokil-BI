import seedrandom from 'seedrandom'
import type {
  Employee,
  HeadcountMetrics,
  TurnoverAnalysis,
  HiringMetrics,
  TenureDistribution,
  PerformanceDistribution,
  DepartmentMetrics,
  HRTrend,
  HRDashboard,
  EmployeeStatus,
  EmployeeType,
  Department,
  JobFamily,
  TerminationType,
} from '@/types/hr'

let rng: () => number

export function initializeHRSeed(seed: number = 12345) {
  rng = seedrandom(`hr-${seed}`)
}

initializeHRSeed()

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

const EMPLOYEE_STATUSES: EmployeeStatus[] = ['active', 'on_leave', 'terminated', 'retired']
const EMPLOYEE_TYPES: EmployeeType[] = ['full_time', 'part_time', 'contractor', 'seasonal', 'intern']
const DEPARTMENTS: Department[] = ['sales', 'operations', 'finance', 'hr', 'marketing', 'it', 'executive']
const JOB_FAMILIES: JobFamily[] = ['technician', 'sales_rep', 'manager', 'director', 'executive', 'admin', 'specialist']
const TERMINATION_TYPES: TerminationType[] = ['voluntary', 'involuntary', 'retirement', 'layoff']

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'White']

const JOB_TITLES: Record<JobFamily, string[]> = {
  technician: ['Service Technician', 'Senior Technician', 'Lead Technician', 'Termite Specialist'],
  sales_rep: ['Account Executive', 'Sales Representative', 'Business Development Rep', 'Inside Sales Rep'],
  manager: ['Branch Manager', 'Area Manager', 'Operations Manager', 'Sales Manager'],
  director: ['Regional Director', 'Director of Operations', 'Director of Sales', 'Market Director'],
  executive: ['VP Operations', 'VP Sales', 'Chief Operating Officer', 'President'],
  admin: ['Office Administrator', 'Customer Service Rep', 'Scheduling Coordinator', 'Office Manager'],
  specialist: ['Training Specialist', 'Quality Specialist', 'Safety Specialist', 'HR Specialist'],
}

const SALARY_BANDS = ['Band 1', 'Band 2', 'Band 3', 'Band 4', 'Band 5', 'Band 6', 'Band 7']

const REGIONS = [
  { id: 'R16', name: 'Arkansas/Missouri' },
  { id: 'R23', name: 'Oklahoma/Kansas' },
  { id: 'R52', name: 'Texas East' },
  { id: 'R54', name: 'Texas Central' },
  { id: 'R75', name: 'Atlantic' },
]

export function generateEmployees(count: number = 500): Employee[] {
  const employees: Employee[] = []
  const now = new Date()
  const tenYearsAgo = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const status = rng() < 0.9 ? 'active' : randomChoice(EMPLOYEE_STATUSES)
    const employeeType = rng() < 0.85 ? 'full_time' : randomChoice(EMPLOYEE_TYPES)
    const department = randomChoice(DEPARTMENTS)
    const jobFamily = randomChoice(JOB_FAMILIES)
    const hireDate = randomDate(tenYearsAgo, now)

    const employee: Employee = {
      id: `EMP-${String(i + 1).padStart(6, '0')}`,
      employeeNumber: `${randomInt(10000, 99999)}`,
      firstName: randomChoice(FIRST_NAMES),
      lastName: randomChoice(LAST_NAMES),
      email: `employee${i}@rentokil.com`,
      phone: `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
      status,
      employeeType,
      department,
      jobFamily,
      jobTitle: randomChoice(JOB_TITLES[jobFamily]),
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
      workLocation: `Branch ${randomInt(1, 50)}`,
      hireDate,
      terminationDate: status === 'terminated' ? randomDate(hireDate, now) : undefined,
      lastReviewDate: rng() > 0.3 ? randomDate(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), now) : undefined,
      managerId: rng() > 0.1 ? `EMP-${String(randomInt(1, 100)).padStart(6, '0')}` : undefined,
      managerName: rng() > 0.1 ? `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}` : undefined,
      salaryBand: randomChoice(SALARY_BANDS),
      performanceRating: randomChoice([1, 2, 3, 3, 3, 4, 4, 5]),
    }

    employees.push(employee)
  }

  return employees
}

export function calculateHeadcountMetrics(employees: Employee[]): HeadcountMetrics {
  const active = employees.filter(e => e.status === 'active')
  const onLeave = employees.filter(e => e.status === 'on_leave')
  const terminated = employees.filter(e => e.status === 'terminated')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const newHires = employees.filter(e => e.hireDate > thirtyDaysAgo).length
  const recentTerminations = terminated.filter(e => e.terminationDate && e.terminationDate > thirtyDaysAgo).length

  const byType = EMPLOYEE_TYPES.reduce((acc, type) => {
    acc[type] = employees.filter(e => e.employeeType === type && e.status === 'active').length
    return acc
  }, {} as Record<EmployeeType, number>)

  const byDepartment = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = employees.filter(e => e.department === dept && e.status === 'active').length
    return acc
  }, {} as Record<Department, number>)

  const byJobFamily = JOB_FAMILIES.reduce((acc, family) => {
    acc[family] = employees.filter(e => e.jobFamily === family && e.status === 'active').length
    return acc
  }, {} as Record<JobFamily, number>)

  const tenures = active.map(e => (now.getTime() - e.hireDate.getTime()) / (365 * 24 * 60 * 60 * 1000))
  const avgTenure = tenures.reduce((sum, t) => sum + t, 0) / tenures.length
  const sortedTenures = tenures.sort((a, b) => a - b)
  const medianTenure = sortedTenures[Math.floor(sortedTenures.length / 2)]

  return {
    totalHeadcount: employees.length,
    activeEmployees: active.length,
    onLeave: onLeave.length,
    byType,
    byDepartment,
    byJobFamily,
    newHires,
    terminations: recentTerminations,
    netChange: newHires - recentTerminations,
    turnoverRate: (recentTerminations / active.length) * 100 * 12,
    voluntaryTurnover: randomFloat(8, 15),
    involuntaryTurnover: randomFloat(2, 5),
    avgTenure,
    medianTenure,
  }
}

export function generateTurnoverAnalysis(): TurnoverAnalysis {
  const totalTerminations = randomInt(20, 50)
  const voluntaryTerminations = Math.floor(totalTerminations * randomFloat(0.6, 0.8))
  const involuntaryTerminations = Math.floor(totalTerminations * randomFloat(0.1, 0.25))
  const retirements = totalTerminations - voluntaryTerminations - involuntaryTerminations

  const byDepartment = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = randomInt(1, 10)
    return acc
  }, {} as Record<Department, number>)

  return {
    period: 'YTD',
    totalTerminations,
    voluntaryTerminations,
    involuntaryTerminations,
    retirements,
    turnoverRate: randomFloat(10, 18),
    voluntaryRate: randomFloat(8, 14),
    involuntaryRate: randomFloat(2, 5),
    retirementRate: randomFloat(1, 3),
    topReasons: [
      { reason: 'Better opportunity', count: randomInt(5, 15), percent: randomFloat(20, 35) },
      { reason: 'Compensation', count: randomInt(3, 10), percent: randomFloat(15, 25) },
      { reason: 'Work-life balance', count: randomInt(2, 8), percent: randomFloat(10, 20) },
      { reason: 'Career growth', count: randomInt(2, 7), percent: randomFloat(8, 15) },
      { reason: 'Relocation', count: randomInt(1, 5), percent: randomFloat(5, 12) },
    ],
    byDepartment,
    byTenureBucket: [
      { bucket: '0-1 years', count: randomInt(5, 15), percent: randomFloat(20, 35) },
      { bucket: '1-2 years', count: randomInt(3, 10), percent: randomFloat(15, 25) },
      { bucket: '2-5 years', count: randomInt(2, 8), percent: randomFloat(15, 25) },
      { bucket: '5-10 years', count: randomInt(1, 5), percent: randomFloat(10, 15) },
      { bucket: '10+ years', count: randomInt(1, 3), percent: randomFloat(5, 10) },
    ],
  }
}

export function generateHiringMetrics(): HiringMetrics {
  const byDepartment = DEPARTMENTS.reduce((acc, dept) => {
    const openings = randomInt(0, 10)
    acc[dept] = {
      openings,
      filled: randomInt(0, openings),
      avgTimeToFill: randomInt(20, 60),
    }
    return acc
  }, {} as Record<Department, { openings: number; filled: number; avgTimeToFill: number }>)

  const openPositions = Object.values(byDepartment).reduce((sum, d) => sum + d.openings, 0)
  const offersExtended = randomInt(10, 30)
  const offerAcceptances = Math.floor(offersExtended * randomFloat(0.7, 0.9))

  return {
    openPositions,
    applicationsReceived: randomInt(200, 500),
    interviewsScheduled: randomInt(50, 150),
    offersExtended,
    offerAcceptances,
    timeToFill: randomInt(30, 50),
    costPerHire: randomInt(3000, 8000),
    offerAcceptanceRate: (offerAcceptances / offersExtended) * 100,
    byDepartment,
  }
}

export function generateTenureDistribution(): TenureDistribution[] {
  return [
    { bucket: '0-1 years', count: randomInt(50, 100), percent: randomFloat(15, 25), avgPerformance: randomFloat(3.0, 3.5) },
    { bucket: '1-2 years', count: randomInt(40, 80), percent: randomFloat(12, 20), avgPerformance: randomFloat(3.2, 3.8) },
    { bucket: '2-5 years', count: randomInt(60, 120), percent: randomFloat(20, 30), avgPerformance: randomFloat(3.5, 4.0) },
    { bucket: '5-10 years', count: randomInt(40, 80), percent: randomFloat(15, 25), avgPerformance: randomFloat(3.7, 4.2) },
    { bucket: '10+ years', count: randomInt(20, 50), percent: randomFloat(8, 15), avgPerformance: randomFloat(3.8, 4.3) },
  ]
}

export function generatePerformanceDistribution(): PerformanceDistribution[] {
  return [
    { rating: 1, count: randomInt(5, 15), percent: randomFloat(2, 5), label: 'Needs Improvement' },
    { rating: 2, count: randomInt(15, 35), percent: randomFloat(5, 10), label: 'Below Expectations' },
    { rating: 3, count: randomInt(150, 250), percent: randomFloat(45, 55), label: 'Meets Expectations' },
    { rating: 4, count: randomInt(80, 150), percent: randomFloat(25, 35), label: 'Exceeds Expectations' },
    { rating: 5, count: randomInt(20, 50), percent: randomFloat(5, 12), label: 'Outstanding' },
  ]
}

export function generateDepartmentMetrics(): DepartmentMetrics[] {
  return DEPARTMENTS.map(department => ({
    department,
    headcount: randomInt(20, 150),
    newHires: randomInt(1, 15),
    terminations: randomInt(0, 10),
    turnoverRate: randomFloat(8, 20),
    avgTenure: randomFloat(2, 6),
    avgPerformance: randomFloat(3.2, 4.0),
    openPositions: randomInt(0, 10),
  }))
}

export function generateHRTrends(months: number = 12): HRTrend[] {
  const trends: HRTrend[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const headcount = randomInt(400, 500)
    const newHires = randomInt(10, 30)
    const terminations = randomInt(5, 20)

    trends.push({
      date,
      headcount,
      newHires,
      terminations,
      turnoverRate: (terminations / headcount) * 100 * 12,
    })
  }

  return trends
}

export function generateHRDashboard(): HRDashboard {
  const employees = generateEmployees(500)

  return {
    asOfDate: new Date(),
    headcount: calculateHeadcountMetrics(employees),
    turnover: generateTurnoverAnalysis(),
    hiring: generateHiringMetrics(),
    tenureDistribution: generateTenureDistribution(),
    performanceDistribution: generatePerformanceDistribution(),
    byDepartment: generateDepartmentMetrics(),
    trend: generateHRTrends(12),
  }
}
