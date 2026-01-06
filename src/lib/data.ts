import seedrandom from 'seedrandom'
import {
  Market, Branch, Team, Route, User, Account, Opportunity,
  Activity, ServiceEvent, Complaint, Invoice, TechnicianCapacity,
  KPIValue, DataSource, DataQualityMetric, ReconciliationItem,
  ActionItem, VarianceDriver, ForecastPoint, ForecastAssumption,
  BacktestResult, Role
} from '@/types'
import { KPI_DICTIONARY, getKPIBySlug } from './kpis'

// Deterministic random number generator
let rng: () => number

export function initializeSeed(seed: number = 12345) {
  rng = seedrandom(seed.toString())
}

// Initialize with default seed
initializeSeed()

// Helper functions
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

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Data storage
let markets: Market[] = []
let branches: Branch[] = []
let teams: Team[] = []
let routes: Route[] = []
let users: User[] = []
let accounts: Account[] = []
let opportunities: Opportunity[] = []
let activities: Activity[] = []
let serviceEvents: ServiceEvent[] = []
let complaints: Complaint[] = []
let invoices: Invoice[] = []
let technicianCapacity: TechnicianCapacity[] = []
let dataSources: DataSource[] = []
let dataQualityMetrics: DataQualityMetric[] = []

// Data quality injection settings
let dataQualityIssuesEnabled = false

export function setDataQualityIssues(enabled: boolean) {
  dataQualityIssuesEnabled = enabled
}

// Generate base data
function generateMarkets(): Market[] {
  const marketData = [
    { name: 'Northeast', region: 'East' },
    { name: 'Southeast', region: 'East' },
    { name: 'Midwest', region: 'Central' },
    { name: 'Southwest', region: 'West' },
    { name: 'West Coast', region: 'West' },
    { name: 'Mid-Atlantic', region: 'East' },
  ]

  return marketData.map((m, i) => ({
    id: `MKT-${String(i + 1).padStart(3, '0')}`,
    name: m.name,
    region: m.region,
  }))
}

function generateBranches(markets: Market[]): Branch[] {
  const branchNames = [
    'Downtown', 'Northside', 'Southside', 'Industrial', 'Metro',
    'Suburban', 'Central', 'Eastside', 'Westside', 'Commercial'
  ]

  const result: Branch[] = []
  let branchId = 1

  markets.forEach(market => {
    const numBranches = randomInt(3, 5)
    const shuffledNames = shuffleArray(branchNames)

    for (let i = 0; i < numBranches; i++) {
      result.push({
        id: `BR-${String(branchId++).padStart(4, '0')}`,
        name: `${market.name} - ${shuffledNames[i]}`,
        marketId: market.id,
        address: `${randomInt(100, 9999)} ${randomChoice(['Main St', 'Oak Ave', 'Commerce Blvd', 'Industrial Dr', 'Park Way'])}`,
      })
    }
  })

  return result
}

function generateTeams(branches: Branch[]): Team[] {
  const result: Team[] = []
  let teamId = 1

  branches.forEach(branch => {
    const numTeams = randomInt(2, 4)
    for (let i = 0; i < numTeams; i++) {
      result.push({
        id: `TM-${String(teamId++).padStart(4, '0')}`,
        name: `Team ${String.fromCharCode(65 + i)}`,
        branchId: branch.id,
        managerId: '', // Will be filled later
      })
    }
  })

  return result
}

function generateRoutes(branches: Branch[]): Route[] {
  const result: Route[] = []
  let routeId = 1

  branches.forEach(branch => {
    const numRoutes = randomInt(5, 10)
    for (let i = 0; i < numRoutes; i++) {
      result.push({
        id: `RT-${String(routeId++).padStart(4, '0')}`,
        name: `Route ${branch.id.slice(-4)}-${String(i + 1).padStart(2, '0')}`,
        branchId: branch.id,
        technicianId: '', // Will be filled later
      })
    }
  })

  return result
}

function generateUsers(markets: Market[], branches: Branch[], teams: Team[]): User[] {
  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Amanda', 'William', 'Jennifer',
    'James', 'Lisa', 'Christopher', 'Michelle', 'Daniel', 'Ashley', 'Matthew', 'Nicole', 'Andrew', 'Stephanie',
    'Susan', 'Jason', 'Karen', 'Brian', 'Nancy', 'Kevin', 'Betty', 'Mark', 'Dorothy', 'Steven']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris']

  const result: User[] = []
  let userId = 1

  // Create executives (2-3)
  for (let i = 0; i < 3; i++) {
    const firstName = randomChoice(firstNames)
    const lastName = randomChoice(lastNames)
    result.push({
      id: `USR-${String(userId++).padStart(5, '0')}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@rentokil.com`,
      role: 'exec',
      title: randomChoice(['VP Business Intelligence', 'VP Operations', 'VP Sales']),
      assignedMarkets: markets.map(m => m.id),
      assignedBranches: [],
      assignedTeams: [],
    })
  }

  // Create VP/Directors (1-2 per market)
  markets.forEach(market => {
    const numDirectors = randomInt(1, 2)
    for (let i = 0; i < numDirectors; i++) {
      const firstName = randomChoice(firstNames)
      const lastName = randomChoice(lastNames)
      result.push({
        id: `USR-${String(userId++).padStart(5, '0')}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@rentokil.com`,
        role: 'vp_director',
        title: randomChoice(['Director Sales Ops', 'Director Operations', 'Regional Director']),
        assignedMarkets: [market.id],
        assignedBranches: branches.filter(b => b.marketId === market.id).map(b => b.id),
        assignedTeams: [],
      })
    }
  })

  // Create Managers (1-2 per branch)
  branches.forEach(branch => {
    const numManagers = randomInt(1, 2)
    for (let i = 0; i < numManagers; i++) {
      const firstName = randomChoice(firstNames)
      const lastName = randomChoice(lastNames)
      const branchTeams = teams.filter(t => t.branchId === branch.id)
      result.push({
        id: `USR-${String(userId++).padStart(5, '0')}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@rentokil.com`,
        role: 'manager',
        title: 'Branch Manager',
        assignedMarkets: [branches.find(b => b.id === branch.id)?.marketId || ''],
        assignedBranches: [branch.id],
        assignedTeams: branchTeams.slice(0, Math.ceil(branchTeams.length / numManagers)).map(t => t.id),
      })
    }
  })

  // Create Reps (3-8 per branch)
  branches.forEach(branch => {
    const numReps = randomInt(3, 8)
    for (let i = 0; i < numReps; i++) {
      const firstName = randomChoice(firstNames)
      const lastName = randomChoice(lastNames)
      result.push({
        id: `USR-${String(userId++).padStart(5, '0')}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@rentokil.com`,
        role: 'rep',
        title: randomChoice(['Sales Rep', 'Account Executive', 'Service Technician', 'Field Specialist']),
        assignedMarkets: [branches.find(b => b.id === branch.id)?.marketId || ''],
        assignedBranches: [branch.id],
        assignedTeams: [randomChoice(teams.filter(t => t.branchId === branch.id))?.id || ''],
      })
    }
  })

  return result
}

function generateAccounts(markets: Market[], branches: Branch[], users: User[]): Account[] {
  const companyPrefixes = ['Acme', 'Global', 'Premier', 'Elite', 'First', 'National', 'Metro', 'United', 'Pacific', 'Atlantic']
  const companySuffixes = ['Industries', 'Services', 'Group', 'Corp', 'LLC', 'Holdings', 'Partners', 'Solutions', 'Systems', 'Enterprises']
  const verticals: Account['vertical'][] = ['Commercial', 'Residential', 'Government', 'Healthcare', 'Food Service']

  const result: Account[] = []
  const numAccounts = 1500
  const reps = users.filter(u => u.role === 'rep')

  for (let i = 0; i < numAccounts; i++) {
    const branch = randomChoice(branches)
    const market = markets.find(m => m.id === branch.marketId)!
    const branchReps = reps.filter(r => r.assignedBranches.includes(branch.id))
    const owner = branchReps.length > 0 ? randomChoice(branchReps) : randomChoice(reps)

    const vertical = randomChoice(verticals)
    const baseValue = vertical === 'Commercial' ? randomInt(5000, 50000) :
                      vertical === 'Healthcare' ? randomInt(10000, 100000) :
                      vertical === 'Government' ? randomInt(20000, 200000) :
                      vertical === 'Food Service' ? randomInt(8000, 40000) :
                      randomInt(500, 5000)

    const retentionRisk: Account['retentionRisk'] = rng() < 0.15 ? 'high' : rng() < 0.35 ? 'medium' : 'low'

    result.push({
      id: `ACC-${String(i + 1).padStart(6, '0')}`,
      name: `${randomChoice(companyPrefixes)} ${randomChoice(companySuffixes)}`,
      vertical,
      contractValue: baseValue,
      retentionRisk,
      lastServiceDate: randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
      openIssues: retentionRisk === 'high' ? randomInt(2, 5) : retentionRisk === 'medium' ? randomInt(0, 2) : 0,
      marketId: market.id,
      branchId: branch.id,
      ownerId: owner.id,
      createdAt: randomDate(new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000), new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      arBalance: rng() < 0.3 ? randomInt(100, 10000) : 0,
      serviceFrequency: randomChoice(['monthly', 'quarterly', 'annual']),
      complaints: retentionRisk === 'high' ? randomInt(2, 6) : retentionRisk === 'medium' ? randomInt(0, 2) : randomInt(0, 1),
    })
  }

  return result
}

function generateOpportunities(accounts: Account[], users: User[]): Opportunity[] {
  const stages: Opportunity['stage'][] = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
  const stageProbabilities: Record<string, number> = {
    'prospect': 0.1,
    'qualified': 0.25,
    'proposal': 0.5,
    'negotiation': 0.75,
    'closed_won': 1.0,
    'closed_lost': 0,
  }

  const result: Opportunity[] = []
  const numOpps = 2500
  const reps = users.filter(u => u.role === 'rep' || u.role === 'manager')

  for (let i = 0; i < numOpps; i++) {
    const account = randomChoice(accounts)
    const branchReps = reps.filter(r => r.assignedBranches.includes(account.branchId))
    const owner = branchReps.length > 0 ? randomChoice(branchReps) : randomChoice(reps)

    const stage = randomChoice(stages)
    const createdDate = randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date())
    const stageLastChanged = randomDate(createdDate, new Date())
    const daysInStage = Math.floor((Date.now() - stageLastChanged.getTime()) / (24 * 60 * 60 * 1000))

    let closeDate: Date
    if (stage === 'closed_won' || stage === 'closed_lost') {
      closeDate = randomDate(stageLastChanged, new Date())
    } else {
      closeDate = randomDate(new Date(), new Date(Date.now() + 120 * 24 * 60 * 60 * 1000))
    }

    const isStalled = (stage !== 'closed_won' && stage !== 'closed_lost') && (daysInStage > 14 || rng() < 0.2)

    // Inject data quality issues if enabled
    let nextStepDate: Date | null = null
    if (!dataQualityIssuesEnabled || rng() > 0.1) {
      if (stage !== 'closed_won' && stage !== 'closed_lost') {
        nextStepDate = randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      }
    }

    result.push({
      id: `OPP-${String(i + 1).padStart(6, '0')}`,
      accountId: account.id,
      accountName: account.name,
      name: `${account.name} - ${randomChoice(['Expansion', 'New Contract', 'Renewal', 'Upsell', 'Cross-sell'])}`,
      stage,
      amount: randomInt(5000, 150000),
      probability: stageProbabilities[stage],
      createdDate,
      closeDate,
      nextStepDate,
      stageLastChanged,
      ownerId: owner.id,
      ownerName: owner.name,
      marketId: account.marketId,
      branchId: account.branchId,
      daysInStage,
      isStalled,
      nextStep: isStalled ? 'Follow up required - stalled' : randomChoice([
        'Send proposal', 'Schedule demo', 'Follow up call', 'Site visit', 'Contract review', 'Negotiate terms'
      ]),
      lostReason: stage === 'closed_lost' ? randomChoice(['Price', 'Competitor', 'No decision', 'Budget', 'Timing']) : undefined,
    })
  }

  return result
}

function generateActivities(accounts: Account[], opportunities: Opportunity[], users: User[]): Activity[] {
  const result: Activity[] = []
  const activityTypes: Activity['type'][] = ['call', 'email', 'visit', 'meeting']

  let activityId = 1

  // Generate activities for opportunities
  opportunities.forEach(opp => {
    const numActivities = randomInt(1, 8)
    for (let i = 0; i < numActivities; i++) {
      result.push({
        id: `ACT-${String(activityId++).padStart(6, '0')}`,
        type: randomChoice(activityTypes),
        opportunityId: opp.id,
        accountId: opp.accountId,
        userId: opp.ownerId,
        timestamp: randomDate(opp.createdDate, new Date()),
        notes: randomChoice([
          'Discussed requirements and timeline',
          'Sent follow-up materials',
          'Confirmed next steps',
          'Addressed concerns about pricing',
          'Demo completed successfully',
          'Left voicemail, will retry',
        ]),
        outcome: randomChoice(['Positive', 'Neutral', 'Needs follow-up', undefined]),
      })
    }
  })

  // Generate account-level activities
  accounts.slice(0, 500).forEach(acc => {
    const numActivities = randomInt(0, 3)
    const owner = users.find(u => u.id === acc.ownerId)
    if (!owner) return

    for (let i = 0; i < numActivities; i++) {
      result.push({
        id: `ACT-${String(activityId++).padStart(6, '0')}`,
        type: randomChoice(activityTypes),
        accountId: acc.id,
        userId: owner.id,
        timestamp: randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        notes: randomChoice([
          'Quarterly check-in call',
          'Service review meeting',
          'Contract renewal discussion',
          'Issue resolution follow-up',
        ]),
      })
    }
  })

  return result
}

function generateServiceEvents(accounts: Account[], routes: Route[], users: User[]): ServiceEvent[] {
  const result: ServiceEvent[] = []
  const techs = users.filter(u => u.title?.includes('Technician') || u.title?.includes('Specialist'))

  let eventId = 1
  const numEvents = 12000

  for (let i = 0; i < numEvents; i++) {
    const account = randomChoice(accounts)
    const branchRoutes = routes.filter(r => r.branchId === account.branchId)
    const route = branchRoutes.length > 0 ? randomChoice(branchRoutes) : randomChoice(routes)
    const tech = techs.length > 0 ? randomChoice(techs) : randomChoice(users.filter(u => u.role === 'rep'))

    const scheduledDate = randomDate(new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    const isPast = scheduledDate < new Date()

    let status: ServiceEvent['status'] = 'scheduled'
    let completedDate: Date | undefined

    if (isPast) {
      const statusRoll = rng()
      if (statusRoll < 0.85) {
        status = 'completed'
        completedDate = new Date(scheduledDate.getTime() + randomInt(0, 4) * 60 * 60 * 1000)
      } else if (statusRoll < 0.92) {
        status = 'callback'
        completedDate = new Date(scheduledDate.getTime() + randomInt(1, 14) * 24 * 60 * 60 * 1000)
      } else {
        status = 'missed'
      }
    }

    result.push({
      id: `SVC-${String(eventId++).padStart(7, '0')}`,
      accountId: account.id,
      technicianId: tech.id,
      routeId: route.id,
      scheduledDate,
      completedDate,
      status,
      timeOnSite: status === 'completed' || status === 'callback' ? randomInt(15, 120) : 0,
      serviceType: randomChoice(['Regular Service', 'Initial Treatment', 'Follow-up', 'Emergency', 'Inspection']),
      notes: status === 'callback' ? 'Customer reported continued issue' : status === 'missed' ? 'Access issue' : undefined,
    })
  }

  return result
}

function generateComplaints(accounts: Account[]): Complaint[] {
  const result: Complaint[] = []
  let complaintId = 1

  // Generate complaints for high-risk and some medium-risk accounts
  accounts.filter(a => a.retentionRisk !== 'low').forEach(account => {
    const numComplaints = account.retentionRisk === 'high' ? randomInt(1, 4) : randomInt(0, 2)

    for (let i = 0; i < numComplaints; i++) {
      const createdAt = randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date())
      const isResolved = rng() < 0.6

      result.push({
        id: `CMP-${String(complaintId++).padStart(5, '0')}`,
        accountId: account.id,
        type: randomChoice(['service_quality', 'billing', 'scheduling', 'technician', 'other']),
        severity: randomChoice(['low', 'medium', 'high', 'critical']),
        description: randomChoice([
          'Service did not resolve pest issue',
          'Technician arrived late',
          'Billing discrepancy',
          'Missed scheduled appointment',
          'Property damage during service',
          'Poor communication',
        ]),
        createdAt,
        resolvedAt: isResolved ? randomDate(createdAt, new Date()) : undefined,
        status: isResolved ? 'resolved' : randomChoice(['open', 'in_progress', 'escalated']),
      })
    }
  })

  return result
}

function generateInvoices(accounts: Account[]): Invoice[] {
  const result: Invoice[] = []
  let invoiceId = 1

  accounts.forEach(account => {
    // Generate 1-6 invoices per account
    const numInvoices = randomInt(1, 6)

    for (let i = 0; i < numInvoices; i++) {
      const invoiceDate = randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date())
      const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      const daysPastDue = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000)))

      let status: Invoice['status']
      let paidDate: Date | undefined

      if (daysPastDue === 0 && dueDate > new Date()) {
        status = rng() < 0.3 ? 'paid' : 'open'
      } else if (daysPastDue <= 30) {
        status = rng() < 0.7 ? 'paid' : rng() < 0.9 ? 'open' : 'overdue'
      } else if (daysPastDue <= 60) {
        status = rng() < 0.5 ? 'paid' : rng() < 0.7 ? 'overdue' : 'open'
      } else {
        status = rng() < 0.3 ? 'paid' : rng() < 0.8 ? 'overdue' : rng() < 0.95 ? 'disputed' : 'void'
      }

      if (status === 'paid') {
        paidDate = randomDate(invoiceDate, new Date())
      }

      let agingBucket: Invoice['agingBucket'] = '0-30'
      if (status !== 'paid' && status !== 'void') {
        if (daysPastDue <= 30) agingBucket = '0-30'
        else if (daysPastDue <= 60) agingBucket = '31-60'
        else if (daysPastDue <= 90) agingBucket = '61-90'
        else agingBucket = '90+'
      }

      result.push({
        id: `INV-${String(invoiceId++).padStart(7, '0')}`,
        accountId: account.id,
        accountName: account.name,
        amount: Math.round(account.contractValue / (account.serviceFrequency === 'monthly' ? 1 : account.serviceFrequency === 'quarterly' ? 3 : 12) * (0.8 + rng() * 0.4)),
        invoiceDate,
        dueDate,
        status,
        paidDate,
        agingBucket,
      })
    }
  })

  return result
}

function generateTechnicianCapacity(branches: Branch[], routes: Route[], users: User[]): TechnicianCapacity[] {
  const result: TechnicianCapacity[] = []
  const techs = users.filter(u => u.title?.includes('Technician') || u.title?.includes('Specialist'))

  let capId = 1
  const today = new Date()

  // Generate capacity for last 30 days and next 14 days
  for (let dayOffset = -30; dayOffset <= 14; dayOffset++) {
    const date = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000)

    branches.forEach(branch => {
      const branchRoutes = routes.filter(r => r.branchId === branch.id)
      const branchTechs = techs.filter(t => t.assignedBranches.includes(branch.id))

      branchRoutes.forEach((route, idx) => {
        const tech = branchTechs[idx % branchTechs.length] || randomChoice(techs)
        const availableHours = 8
        const usedHours = randomFloat(4, 10)

        result.push({
          id: `CAP-${String(capId++).padStart(6, '0')}`,
          technicianId: tech?.id || 'USR-00001',
          technicianName: tech?.name || 'Unknown',
          branchId: branch.id,
          routeId: route.id,
          availableHours,
          usedHours: Math.min(usedHours, 12),
          utilization: Math.min(usedHours / availableHours, 1.5),
          date,
        })
      })
    })
  }

  return result
}

function generateDataSources(): DataSource[] {
  const now = new Date()
  const sources: DataSource[] = [
    {
      name: 'CRM (Salesforce)',
      system: 'Salesforce',
      lastRefresh: new Date(now.getTime() - randomInt(30, 120) * 60 * 1000),
      status: dataQualityIssuesEnabled && rng() < 0.2 ? 'stale' : 'fresh',
      recordCount: opportunities.length + accounts.length,
      knownIssues: dataQualityIssuesEnabled ? ['Some opportunities missing close dates'] : [],
    },
    {
      name: 'Billing/ERP',
      system: 'SAP',
      lastRefresh: new Date(now.getTime() - randomInt(60, 240) * 60 * 1000),
      status: 'fresh',
      recordCount: invoices.length,
      knownIssues: dataQualityIssuesEnabled ? ['3 duplicate invoices detected'] : [],
    },
    {
      name: 'PestPac/Field Service',
      system: 'PestPac',
      lastRefresh: new Date(now.getTime() - randomInt(15, 90) * 60 * 1000),
      status: 'fresh',
      recordCount: serviceEvents.length,
      knownIssues: [],
    },
    {
      name: 'Workforce/HR',
      system: 'Workday',
      lastRefresh: new Date(now.getTime() - randomInt(120, 360) * 60 * 1000),
      status: dataQualityIssuesEnabled && rng() < 0.3 ? 'stale' : 'fresh',
      recordCount: users.length + technicianCapacity.length,
      knownIssues: dataQualityIssuesEnabled ? ['Capacity data 6+ hours old'] : [],
    },
  ]

  return sources
}

function generateDataQualityMetrics(): DataQualityMetric[] {
  const metrics: DataQualityMetric[] = []

  // CRM metrics
  const missingCloseDates = dataQualityIssuesEnabled ? randomInt(20, 50) : randomInt(0, 5)
  const oppsWithoutOwner = dataQualityIssuesEnabled ? randomInt(10, 30) : 0

  metrics.push({
    source: 'CRM',
    metric: 'Opportunities missing close date',
    value: missingCloseDates,
    threshold: 10,
    status: missingCloseDates > 20 ? 'critical' : missingCloseDates > 10 ? 'warning' : 'good',
    details: `${missingCloseDates} open opportunities without expected close date`,
  })

  metrics.push({
    source: 'CRM',
    metric: 'Opportunities without owner',
    value: oppsWithoutOwner,
    threshold: 0,
    status: oppsWithoutOwner > 0 ? 'critical' : 'good',
    details: `${oppsWithoutOwner} opportunities unassigned`,
  })

  // Billing metrics
  const duplicateInvoices = dataQualityIssuesEnabled ? randomInt(2, 8) : 0

  metrics.push({
    source: 'Billing/ERP',
    metric: 'Duplicate invoices',
    value: duplicateInvoices,
    threshold: 0,
    status: duplicateInvoices > 0 ? 'critical' : 'good',
    details: duplicateInvoices > 0 ? `${duplicateInvoices} potential duplicate invoices detected` : 'No duplicates',
  })

  // Service metrics
  const staleServiceRecords = dataQualityIssuesEnabled ? randomInt(50, 200) : randomInt(0, 20)

  metrics.push({
    source: 'PestPac',
    metric: 'Stale service records (>48h)',
    value: staleServiceRecords,
    threshold: 50,
    status: staleServiceRecords > 100 ? 'critical' : staleServiceRecords > 50 ? 'warning' : 'good',
    details: `${staleServiceRecords} records not updated in 48+ hours`,
  })

  // Freshness metrics
  dataSources.forEach(source => {
    const hoursOld = (Date.now() - source.lastRefresh.getTime()) / (60 * 60 * 1000)
    metrics.push({
      source: source.name,
      metric: 'Data freshness',
      value: Math.round(hoursOld * 10) / 10,
      threshold: source.name.includes('CRM') ? 2 : source.name.includes('Workforce') ? 4 : 6,
      status: source.status === 'stale' ? 'critical' : source.status === 'error' ? 'critical' : 'good',
      details: `Last refresh: ${source.lastRefresh.toLocaleString()}`,
    })
  })

  return metrics
}

// Initialize all data
export function regenerateData(seed?: number) {
  if (seed !== undefined) {
    initializeSeed(seed)
  }

  markets = generateMarkets()
  branches = generateBranches(markets)
  teams = generateTeams(branches)
  routes = generateRoutes(branches)
  users = generateUsers(markets, branches, teams)
  accounts = generateAccounts(markets, branches, users)
  opportunities = generateOpportunities(accounts, users)
  activities = generateActivities(accounts, opportunities, users)
  serviceEvents = generateServiceEvents(accounts, routes, users)
  complaints = generateComplaints(accounts)
  invoices = generateInvoices(accounts)
  technicianCapacity = generateTechnicianCapacity(branches, routes, users)
  dataSources = generateDataSources()
  dataQualityMetrics = generateDataQualityMetrics()
}

// Initialize on module load
regenerateData()

// Export getters
export const getMarkets = () => markets
export const getBranches = () => branches
export const getTeams = () => teams
export const getRoutes = () => routes
export const getUsers = () => users
export const getAccounts = () => accounts
export const getOpportunities = () => opportunities
export const getActivities = () => activities
export const getServiceEvents = () => serviceEvents
export const getComplaints = () => complaints
export const getInvoices = () => invoices
export const getTechnicianCapacity = () => technicianCapacity
export const getDataSources = () => dataSources
export const getDataQualityMetrics = () => dataQualityMetrics

// Query functions
export function getAccountById(id: string): Account | undefined {
  return accounts.find(a => a.id === id)
}

export function getOpportunityById(id: string): Opportunity | undefined {
  return opportunities.find(o => o.id === id)
}

export function getInvoiceById(id: string): Invoice | undefined {
  return invoices.find(i => i.id === id)
}

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}

export function getOpportunitiesByAccount(accountId: string): Opportunity[] {
  return opportunities.filter(o => o.accountId === accountId)
}

export function getActivitiesByOpportunity(opportunityId: string): Activity[] {
  return activities.filter(a => a.opportunityId === opportunityId)
}

export function getActivitiesByAccount(accountId: string): Activity[] {
  return activities.filter(a => a.accountId === accountId)
}

export function getServiceEventsByAccount(accountId: string): ServiceEvent[] {
  return serviceEvents.filter(s => s.accountId === accountId)
}

export function getComplaintsByAccount(accountId: string): Complaint[] {
  return complaints.filter(c => c.accountId === accountId)
}

export function getInvoicesByAccount(accountId: string): Invoice[] {
  return invoices.filter(i => i.accountId === accountId)
}

// RLS filtering
export function filterByRole(data: any[], role: Role, userId: string, marketIds: string[]): any[] {
  if (role === 'exec') return data

  const user = getUserById(userId)
  if (!user) return data

  return data.filter(item => {
    if (item.marketId && !user.assignedMarkets.includes(item.marketId)) return false
    if (item.branchId && user.assignedBranches.length > 0 && !user.assignedBranches.includes(item.branchId)) return false
    if (role === 'rep' && item.ownerId && item.ownerId !== userId) return false
    return true
  })
}

// Export KPI calculation functions - these will be in a separate file
export * from './kpi-calculations'
