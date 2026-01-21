import seedrandom from 'seedrandom'
import type {
  TermiteService,
  TermiteContract,
  TermiteMetrics,
  TermiteTrend,
  TermiteByRegion,
  TermiteByTechnician,
  TermiteSeasonality,
  TermiteDashboard,
  TermiteServiceType,
  TermiteStatus,
  InspectionResult,
  TreatmentMethod,
} from '@/types/termite'

let rng: () => number

export function initializeTermiteSeed(seed: number = 12345) {
  rng = seedrandom(`termite-${seed}`)
}

initializeTermiteSeed()

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

const SERVICE_TYPES: TermiteServiceType[] = [
  'inspection', 'treatment_liquid', 'treatment_bait', 'treatment_fumigation',
  'renewal', 'retreatment', 'damage_repair', 'warranty_claim'
]

const STATUS_OPTIONS: TermiteStatus[] = [
  'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'warranty_pending'
]

const INSPECTION_RESULTS: InspectionResult[] = [
  'no_activity', 'activity_found', 'evidence_found', 'damage_found', 'treatment_recommended'
]

const TREATMENT_METHODS: TreatmentMethod[] = [
  'liquid_barrier', 'bait_system', 'fumigation', 'spot_treatment', 'combination'
]

const PRODUCTS = ['Termidor', 'Altriset', 'Premise', 'Sentricon', 'Trelona', 'Advance']

const FIRST_NAMES = ['James', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
const COMPANY_NAMES = ['Homeowner', 'Property Management Co', 'Real Estate LLC', 'Investment Group']

const REGIONS = [
  { id: 'R16', name: 'Arkansas/Missouri' },
  { id: 'R23', name: 'Oklahoma/Kansas' },
  { id: 'R52', name: 'Texas East' },
  { id: 'R54', name: 'Texas Central' },
  { id: 'R75', name: 'Atlantic' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function generateTermiteServices(count: number = 500): TermiteService[] {
  const services: TermiteService[] = []
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const scheduledDate = randomDate(sixMonthsAgo, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
    const serviceType = randomChoice(SERVICE_TYPES)
    const status = scheduledDate < now ? randomChoice(['completed', 'cancelled'] as TermiteStatus[]) : randomChoice(STATUS_OPTIONS)
    const isInspection = serviceType === 'inspection'
    const serviceRevenue = isInspection ? randomInt(50, 150) : randomInt(500, 5000)
    const materialCost = isInspection ? 0 : randomInt(100, 500)
    const laborCost = randomInt(50, 300)

    const service: TermiteService = {
      id: `TRM-${String(i + 1).padStart(6, '0')}`,
      accountId: `ACC-${String(randomInt(1, 500)).padStart(5, '0')}`,
      accountName: rng() > 0.7 ? `${randomChoice(COMPANY_NAMES)} ${randomInt(1, 99)}` : `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      propertyAddress: `${randomInt(100, 9999)} ${randomChoice(['Oak', 'Main', 'Elm', 'Pine', 'Cedar'])} ${randomChoice(['St', 'Ave', 'Dr', 'Ln', 'Ct'])}`,
      serviceType,
      status,
      scheduledDate,
      completedDate: status === 'completed' ? new Date(scheduledDate.getTime() + randomInt(0, 4) * 60 * 60 * 1000) : undefined,
      followUpDate: rng() > 0.7 ? new Date(scheduledDate.getTime() + randomInt(30, 90) * 24 * 60 * 60 * 1000) : undefined,
      inspectionResult: isInspection ? randomChoice(INSPECTION_RESULTS) : undefined,
      activityLocation: isInspection && rng() > 0.7 ? randomChoice(['Foundation', 'Crawlspace', 'Garage', 'Attic', 'Exterior']) : undefined,
      damageEstimate: isInspection && rng() > 0.8 ? randomInt(500, 10000) : undefined,
      treatmentMethod: !isInspection ? randomChoice(TREATMENT_METHODS) : undefined,
      productUsed: !isInspection ? randomChoice(PRODUCTS) : undefined,
      linearFeet: !isInspection ? randomInt(100, 500) : undefined,
      baitsInstalled: serviceType === 'treatment_bait' ? randomInt(10, 40) : undefined,
      technicianId: `TECH-${String(randomInt(1, 50)).padStart(3, '0')}`,
      technicianName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
      serviceRevenue,
      materialCost,
      laborCost,
      margin: serviceRevenue - materialCost - laborCost,
      warrantyId: rng() > 0.6 ? `WAR-${String(randomInt(1, 1000)).padStart(5, '0')}` : undefined,
      warrantyExpiration: rng() > 0.6 ? new Date(now.getTime() + randomInt(365, 1825) * 24 * 60 * 60 * 1000) : undefined,
      isWarrantyWork: serviceType === 'warranty_claim' || (rng() > 0.9),
      notes: `${serviceType.replace(/_/g, ' ')} service`,
    }

    services.push(service)
  }

  return services
}

export function generateTermiteContracts(count: number = 200): TermiteContract[] {
  const contracts: TermiteContract[] = []
  const now = new Date()
  const fiveYearsAgo = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const startDate = randomDate(fiveYearsAgo, now)
    const yearsWithCompany = Math.floor((now.getTime() - startDate.getTime()) / (365 * 24 * 60 * 60 * 1000))
    const annualRenewalAmount = randomInt(200, 600)

    const contract: TermiteContract = {
      id: `CON-${String(i + 1).padStart(5, '0')}`,
      accountId: `ACC-${String(randomInt(1, 500)).padStart(5, '0')}`,
      accountName: rng() > 0.7 ? `${randomChoice(COMPANY_NAMES)} ${randomInt(1, 99)}` : `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      propertyAddress: `${randomInt(100, 9999)} ${randomChoice(['Oak', 'Main', 'Elm', 'Pine', 'Cedar'])} ${randomChoice(['St', 'Ave', 'Dr', 'Ln', 'Ct'])}`,
      contractType: randomChoice(['new', 'renewal', 'transfer']),
      startDate,
      expirationDate: new Date(now.getTime() + randomInt(30, 365) * 24 * 60 * 60 * 1000),
      renewalDate: rng() > 0.5 ? new Date(now.getTime() + randomInt(1, 60) * 24 * 60 * 60 * 1000) : undefined,
      coverageType: randomChoice(['retreatment_only', 'damage_repair', 'full_coverage']),
      linearFeetCovered: randomInt(100, 500),
      contractValue: randomInt(800, 3000),
      annualRenewalAmount,
      paymentFrequency: randomChoice(['monthly', 'quarterly', 'annual']),
      yearsWithCompany,
      claimsCount: randomInt(0, 3),
      claimsAmount: randomInt(0, 5000),
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
    }

    contracts.push(contract)
  }

  return contracts
}

export function calculateTermiteMetrics(services: TermiteService[], contracts: TermiteContract[]): TermiteMetrics {
  const completedServices = services.filter(s => s.status === 'completed')
  const inspections = completedServices.filter(s => s.serviceType === 'inspection')
  const treatments = completedServices.filter(s => s.serviceType.startsWith('treatment'))
  const renewals = completedServices.filter(s => s.serviceType === 'renewal')
  const retreatments = completedServices.filter(s => s.serviceType === 'retreatment')

  const totalRevenue = completedServices.reduce((sum, s) => sum + s.serviceRevenue, 0)
  const warrantyClaimsCount = completedServices.filter(s => s.isWarrantyWork).length
  const warrantyClaimsAmount = completedServices.filter(s => s.isWarrantyWork).reduce((sum, s) => sum + s.serviceRevenue, 0)

  const newContracts = contracts.filter(c => c.contractType === 'new').length
  const renewedContracts = contracts.filter(c => c.contractType === 'renewal').length

  return {
    totalServices: completedServices.length,
    inspections: inspections.length,
    treatments: treatments.length,
    renewals: renewals.length,
    retreatments: retreatments.length,
    totalRevenue,
    newContractRevenue: randomInt(50000, 150000),
    renewalRevenue: randomInt(100000, 300000),
    serviceRevenue: totalRevenue,
    avgJobValue: completedServices.length > 0 ? totalRevenue / completedServices.length : 0,
    activeContracts: contracts.length,
    newContracts,
    renewedContracts,
    cancelledContracts: randomInt(5, 20),
    renewalRate: randomFloat(85, 95),
    warrantyClaimsCount,
    warrantyClaimsAmount,
    claimsRate: (warrantyClaimsCount / completedServices.length) * 100,
    avgLinearFeetPerJob: randomInt(150, 300),
    avgJobDuration: randomFloat(2, 5),
    conversionRate: randomFloat(40, 70),
  }
}

export function generateTermiteTrends(days: number = 30): TermiteTrend[] {
  const trends: TermiteTrend[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const inspections = randomInt(5, 20)
    const treatments = randomInt(3, 15)

    trends.push({
      date,
      inspections,
      treatments,
      revenue: randomInt(5000, 25000),
      newContracts: randomInt(0, 5),
      renewals: randomInt(1, 8),
      cancellations: randomInt(0, 2),
    })
  }

  return trends
}

export function generateTermiteByRegion(): TermiteByRegion[] {
  return REGIONS.map(region => ({
    regionId: region.id,
    regionName: region.name,
    activeContracts: randomInt(200, 800),
    revenue: randomInt(100000, 500000),
    newContracts: randomInt(20, 80),
    renewalRate: randomFloat(80, 95),
    claimsRate: randomFloat(1, 5),
    avgContractValue: randomInt(300, 600),
  })).sort((a, b) => b.revenue - a.revenue)
}

export function generateTermiteByTechnician(count: number = 20): TermiteByTechnician[] {
  const technicians: TermiteByTechnician[] = []

  for (let i = 0; i < count; i++) {
    const servicesCompleted = randomInt(30, 150)
    const revenue = servicesCompleted * randomInt(200, 500)
    const inspections = Math.floor(servicesCompleted * randomFloat(0.3, 0.5))
    const treatments = Math.floor(servicesCompleted * randomFloat(0.4, 0.6))
    const retreatments = servicesCompleted - inspections - treatments

    technicians.push({
      technicianId: `TECH-${String(i + 1).padStart(3, '0')}`,
      technicianName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      servicesCompleted,
      revenue,
      avgJobValue: revenue / servicesCompleted,
      conversionRate: randomFloat(40, 80),
      productivityScore: randomFloat(70, 100),
      inspections,
      treatments,
      retreatments: Math.max(0, retreatments),
    })
  }

  return technicians.sort((a, b) => b.revenue - a.revenue)
}

export function generateTermiteSeasonality(): TermiteSeasonality[] {
  return MONTHS.map(month => {
    const isSwarmSeason = ['Mar', 'Apr', 'May', 'Jun'].includes(month)
    const baseMultiplier = isSwarmSeason ? randomFloat(1.3, 1.8) : randomFloat(0.7, 1.1)

    return {
      month,
      inspections: Math.floor(randomInt(50, 100) * baseMultiplier),
      treatments: Math.floor(randomInt(30, 70) * baseMultiplier),
      newContracts: Math.floor(randomInt(10, 30) * baseMultiplier),
      revenue: Math.floor(randomInt(50000, 120000) * baseMultiplier),
      historicalAvg: randomInt(60000, 100000),
    }
  })
}

export function generateTermiteDashboard(): TermiteDashboard {
  const services = generateTermiteServices(500)
  const contracts = generateTermiteContracts(200)
  const now = new Date()

  const upcomingRenewals = contracts.filter(c =>
    c.renewalDate && c.renewalDate > now && c.renewalDate < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  )

  const recentServices = services
    .filter(s => s.completedDate && s.completedDate > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
    .slice(0, 20)

  return {
    period: 'MTD',
    metrics: calculateTermiteMetrics(services, contracts),
    trend: generateTermiteTrends(30),
    byRegion: generateTermiteByRegion(),
    byTechnician: generateTermiteByTechnician(20),
    seasonality: generateTermiteSeasonality(),
    upcomingRenewals,
    recentServices,
  }
}
