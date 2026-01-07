// Sales Tracker Data - simulates CSV data from Google Sheets
import seedrandom from 'seedrandom'
import {
  Proposal,
  Sale,
  ProposalSummary,
  SalesSummary,
  MonthlyData,
  YearlyTotals,
  AccountExecutive,
  LeadType,
  ServiceType,
  JobType,
  AEDashboardStats,
} from '@/types/sales-tracker'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
const LEAD_TYPES: LeadType[] = ['Inbound', 'Outbound', 'Referral', 'Self-Gen', 'Canvass']
const SERVICE_TYPES: ServiceType[] = ['Pest Control', 'Termite', 'Wildlife', 'Mosquito', 'Bed Bug', 'Commercial']
const JOB_TYPES: JobType[] = ['One-Time', 'Contract', 'Recurring']

const COMPANY_NAMES = [
  'ABC Manufacturing', 'Downtown Diner', 'Sunrise Apartments', 'Oak Tree Condos',
  'Metro Office Park', 'Riverside Restaurant', 'Green Valley HOA', 'Summit Business Center',
  'Lakeside Marina', 'Central Storage', 'Park View Estates', 'Harbor Seafood',
  'Mountain Lodge', 'City Center Mall', 'Westside Warehouse', 'Northgate Apartments',
  'Silver Creek Office', 'Golden Eagle Resort', 'Blue Water Marina', 'Redwood Plaza',
  'Smith Residence', 'Johnson Family', 'Williams Home', 'Brown Property',
  'Davis Estate', 'Miller Residence', 'Wilson Home', 'Anderson Property'
]

let rng = seedrandom('ae-tracker-2026')

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randomPrice(min: number, max: number): number {
  return Math.round((min + rng() * (max - min)) * 100) / 100
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

// Generate proposals for a month
function generateMonthlyProposals(month: string, year: number, count: number): Proposal[] {
  const monthIndex = MONTHS.indexOf(month)
  const proposals: Proposal[] = []

  for (let i = 0; i < count; i++) {
    const day = Math.floor(rng() * 28) + 1
    const service = randomFromArray(SERVICE_TYPES)
    const jobType = randomFromArray(JOB_TYPES)
    const sold = rng() > 0.6 // 40% close rate
    const dead = !sold && rng() > 0.5

    let jobWorkPrice = 0
    let termitePrice = 0
    let contractPrice = 0

    if (service === 'Termite') {
      termitePrice = randomPrice(800, 3500)
    } else if (jobType === 'Contract' || jobType === 'Recurring') {
      contractPrice = randomPrice(50, 200) // Monthly contract price
    } else {
      jobWorkPrice = randomPrice(150, 800)
    }

    proposals.push({
      id: generateId(),
      date: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      companyName: randomFromArray(COMPANY_NAMES),
      leadType: randomFromArray(LEAD_TYPES),
      service,
      jobType,
      sold,
      dead,
      jobWorkPrice,
      termitePrice,
      contractPrice,
    })
  }

  return proposals.sort((a, b) => a.date.localeCompare(b.date))
}

// Generate sales for a month (based on sold proposals)
function generateMonthlySales(proposals: Proposal[]): Sale[] {
  return proposals
    .filter(p => p.sold)
    .map(p => ({
      id: generateId(),
      date: p.date,
      companyName: p.companyName,
      leadType: p.leadType,
      service: p.service,
      jobType: p.jobType,
      jobWorkPrice: p.jobWorkPrice,
      termitePrice: p.termitePrice,
      contractPrice: p.contractPrice,
      started: rng() > 0.2, // 80% started
      paid: rng() > 0.3, // 70% paid
      pestPacId: `PP${Math.floor(rng() * 900000 + 100000)}`,
    }))
}

// Calculate proposal summary
function calculateProposalSummary(proposals: Proposal[], goal: number): ProposalSummary {
  const jobWorkTotal = proposals.reduce((sum, p) => sum + p.jobWorkPrice, 0)
  const termiteTotal = proposals.reduce((sum, p) => sum + p.termitePrice, 0)
  const contractTotal = proposals.reduce((sum, p) => sum + p.contractPrice * 12, 0) // Annualized

  return {
    proposalGoal: goal,
    jobWorkTotal,
    termiteTotal,
    contractTotal,
    grandTotal: jobWorkTotal + termiteTotal + contractTotal,
    totalProposals: proposals.length,
  }
}

// Calculate sales summary
function calculateSalesSummary(sales: Sale[], isq: number): SalesSummary {
  const jobWorkTotal = sales.reduce((sum, s) => sum + s.jobWorkPrice, 0)
  const termiteTotal = sales.reduce((sum, s) => sum + s.termitePrice, 0)
  const contractTotal = sales.reduce((sum, s) => sum + s.contractPrice * 12, 0) // Annualized

  return {
    monthISQ: isq,
    jobWorkTotal,
    termiteTotal,
    contractTotal,
    grandTotal: jobWorkTotal + termiteTotal + contractTotal,
    totalSales: sales.length,
    totalStartedSales: sales.filter(s => s.started).length,
  }
}

// Generate all monthly data
function generateMonthlyData(year: number): MonthlyData[] {
  const currentMonth = new Date().getMonth()

  return MONTHS.map((month, index) => {
    // Only generate data for past and current months
    const proposalCount = index <= currentMonth ? Math.floor(rng() * 15) + 8 : 0
    const proposals = generateMonthlyProposals(month, year, proposalCount)
    const sales = generateMonthlySales(proposals)

    const monthlyGoal = 15000 + Math.floor(rng() * 5000)
    const monthlyISQ = 12000 + Math.floor(rng() * 8000)

    return {
      month,
      year,
      proposals,
      proposalSummary: calculateProposalSummary(proposals, monthlyGoal),
      sales,
      salesSummary: calculateSalesSummary(sales, monthlyISQ),
    }
  })
}

// Generate yearly totals
function generateYearlyTotals(monthlyData: MonthlyData[], year: number): YearlyTotals {
  const monthlyBreakdown = monthlyData.map(m => ({
    month: m.month,
    proposalCount: m.proposalSummary.totalProposals,
    proposalTotal: m.proposalSummary.grandTotal,
    salesCount: m.salesSummary.totalSales,
    salesTotal: m.salesSummary.grandTotal,
    termiteProposals: m.proposals.filter(p => p.service === 'Termite').reduce((sum, p) => sum + p.termitePrice, 0),
    termiteSales: m.sales.filter(s => s.service === 'Termite').reduce((sum, s) => sum + s.termitePrice, 0),
  }))

  const actual = monthlyBreakdown.reduce((sum, m) => sum + m.salesTotal, 0)

  return {
    year,
    isq: 180000,
    goal: 200000,
    actual,
    monthlyBreakdown,
  }
}

// Main function to generate Account Executive data
export function generateAccountExecutiveData(name: string, seed?: string): AccountExecutive {
  if (seed) {
    rng = seedrandom(seed)
  }

  const year = 2026
  const monthlyData = generateMonthlyData(year)
  const yearlyTotals = generateYearlyTotals(monthlyData, year)

  return {
    id: generateId(),
    name,
    branch: 'Phoenix - Central',
    areaManager: 'Mike Thompson',
    yearlyGoal: 200000,
    monthlyData,
    yearlyTotals,
  }
}

// Get dashboard stats for current month
export function getAEDashboardStats(ae: AccountExecutive): AEDashboardStats {
  const currentMonth = new Date().getMonth()
  const currentMonthData = ae.monthlyData[currentMonth]

  if (!currentMonthData) {
    return {
      mtdProposals: 0,
      mtdSales: 0,
      mtdRevenue: 0,
      proposalToSaleRate: 0,
      avgDealSize: 0,
      pipelineValue: 0,
      goalProgress: 0,
      monthlyGoal: 0,
    }
  }

  const mtdProposals = currentMonthData.proposalSummary.totalProposals
  const mtdSales = currentMonthData.salesSummary.totalSales
  const mtdRevenue = currentMonthData.salesSummary.grandTotal
  const monthlyGoal = currentMonthData.proposalSummary.proposalGoal

  // Pipeline = unsold, non-dead proposals
  const pipeline = currentMonthData.proposals.filter(p => !p.sold && !p.dead)
  const pipelineValue = pipeline.reduce((sum, p) => sum + p.jobWorkPrice + p.termitePrice + (p.contractPrice * 12), 0)

  return {
    mtdProposals,
    mtdSales,
    mtdRevenue,
    proposalToSaleRate: mtdProposals > 0 ? (mtdSales / mtdProposals) * 100 : 0,
    avgDealSize: mtdSales > 0 ? mtdRevenue / mtdSales : 0,
    pipelineValue,
    goalProgress: (mtdRevenue / monthlyGoal) * 100,
    monthlyGoal,
  }
}

// Get recent activity
export function getRecentActivity(ae: AccountExecutive, limit: number = 10): (Proposal | Sale)[] {
  const allItems: (Proposal & { type: 'proposal' } | Sale & { type: 'sale' })[] = []

  ae.monthlyData.forEach(m => {
    m.proposals.forEach(p => allItems.push({ ...p, type: 'proposal' }))
    m.sales.forEach(s => allItems.push({ ...s, type: 'sale' }))
  })

  return allItems
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}

// Store for current user's data (in-memory for demo)
let currentAEData: AccountExecutive | null = null

export function initializeAEData(name: string = 'Cody Lytle'): AccountExecutive {
  currentAEData = generateAccountExecutiveData(name, `ae-${name}-2026`)
  return currentAEData
}

export function getAEData(): AccountExecutive | null {
  return currentAEData
}

export function addProposal(monthIndex: number, proposal: Omit<Proposal, 'id'>): Proposal {
  if (!currentAEData) {
    throw new Error('AE data not initialized')
  }

  const newProposal: Proposal = {
    ...proposal,
    id: generateId(),
  }

  currentAEData.monthlyData[monthIndex].proposals.push(newProposal)

  // Recalculate summary
  const monthData = currentAEData.monthlyData[monthIndex]
  monthData.proposalSummary = calculateProposalSummary(
    monthData.proposals,
    monthData.proposalSummary.proposalGoal
  )

  return newProposal
}

export function addSale(monthIndex: number, sale: Omit<Sale, 'id'>): Sale {
  if (!currentAEData) {
    throw new Error('AE data not initialized')
  }

  const newSale: Sale = {
    ...sale,
    id: generateId(),
  }

  currentAEData.monthlyData[monthIndex].sales.push(newSale)

  // Recalculate summary
  const monthData = currentAEData.monthlyData[monthIndex]
  monthData.salesSummary = calculateSalesSummary(
    monthData.sales,
    monthData.salesSummary.monthISQ
  )

  return newSale
}

export function markProposalSold(monthIndex: number, proposalId: string): void {
  if (!currentAEData) return

  const proposal = currentAEData.monthlyData[monthIndex].proposals.find(p => p.id === proposalId)
  if (proposal) {
    proposal.sold = true
    proposal.dead = false
  }
}

export function markProposalDead(monthIndex: number, proposalId: string): void {
  if (!currentAEData) return

  const proposal = currentAEData.monthlyData[monthIndex].proposals.find(p => p.id === proposalId)
  if (proposal) {
    proposal.sold = false
    proposal.dead = true
  }
}
