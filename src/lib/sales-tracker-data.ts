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

    // Commercial vs residential pricing - commercial contracts are typically $5K-$50K
    const isCommercial = service === 'Commercial' || rng() > 0.6 // 40% are commercial

    if (service === 'Termite') {
      // Termite treatments: residential $800-3500, commercial $3000-12000
      termitePrice = isCommercial ? randomPrice(3000, 12000) : randomPrice(800, 3500)
    } else if (jobType === 'Contract' || jobType === 'Recurring') {
      // Contract pricing (monthly): residential $75-250, commercial $300-1500
      contractPrice = isCommercial ? randomPrice(300, 1500) : randomPrice(75, 250)
    } else {
      // One-time jobs: residential $150-800, commercial $500-3500
      jobWorkPrice = isCommercial ? randomPrice(500, 3500) : randomPrice(150, 800)
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
    branch: 'Houston - Midwest',
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
  // Use the consistent monthly goal from proposal summary (the actual revenue target)
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

// Store for all AE data (multi-AE support)
const aeDataStore: Map<string, AccountExecutive> = new Map()
let currentAEId: string | null = null

// List of available Account Executives
export const AVAILABLE_AES = [
  { id: 'cody-lytle', name: 'Cody Lytle', branch: 'Houston - Midwest' },
  { id: 'sarah-johnson', name: 'Sarah Johnson', branch: 'Dallas - Central' },
  { id: 'mike-williams', name: 'Mike Williams', branch: 'Austin - South' },
  { id: 'jennifer-davis', name: 'Jennifer Davis', branch: 'San Antonio - West' },
  { id: 'robert-martinez', name: 'Robert Martinez', branch: 'Fort Worth - North' },
]

export function initializeAEData(name: string = 'Cody Lytle'): AccountExecutive {
  const ae = AVAILABLE_AES.find(a => a.name === name) || AVAILABLE_AES[0]
  const aeId = ae.id

  if (!aeDataStore.has(aeId)) {
    const data = generateAccountExecutiveData(ae.name, `ae-${aeId}-2026`)
    data.branch = ae.branch
    aeDataStore.set(aeId, data)
  }

  currentAEId = aeId
  return aeDataStore.get(aeId)!
}

export function getAEData(): AccountExecutive | null {
  if (!currentAEId) return null
  return aeDataStore.get(currentAEId) || null
}

export function switchAE(aeId: string): AccountExecutive | null {
  const ae = AVAILABLE_AES.find(a => a.id === aeId)
  if (!ae) return null

  if (!aeDataStore.has(aeId)) {
    const data = generateAccountExecutiveData(ae.name, `ae-${aeId}-2026`)
    data.branch = ae.branch
    aeDataStore.set(aeId, data)
  }

  currentAEId = aeId
  return aeDataStore.get(aeId)!
}

export function getCurrentAEId(): string | null {
  return currentAEId
}

export function getAvailableAEs() {
  return AVAILABLE_AES
}

export function addProposal(monthIndex: number, proposal: Omit<Proposal, 'id'>): Proposal {
  const aeData = getAEData()
  if (!aeData) {
    throw new Error('AE data not initialized')
  }

  const newProposal: Proposal = {
    ...proposal,
    id: generateId(),
  }

  aeData.monthlyData[monthIndex].proposals.push(newProposal)

  // Recalculate summary
  const monthData = aeData.monthlyData[monthIndex]
  monthData.proposalSummary = calculateProposalSummary(
    monthData.proposals,
    monthData.proposalSummary.proposalGoal
  )

  return newProposal
}

export function addSale(monthIndex: number, sale: Omit<Sale, 'id'>): Sale {
  const aeData = getAEData()
  if (!aeData) {
    throw new Error('AE data not initialized')
  }

  const newSale: Sale = {
    ...sale,
    id: generateId(),
  }

  aeData.monthlyData[monthIndex].sales.push(newSale)

  // Recalculate summary
  const monthData = aeData.monthlyData[monthIndex]
  monthData.salesSummary = calculateSalesSummary(
    monthData.sales,
    monthData.salesSummary.monthISQ
  )

  return newSale
}

export function markProposalSold(monthIndex: number, proposalId: string): void {
  const aeData = getAEData()
  if (!aeData) return

  const proposal = aeData.monthlyData[monthIndex].proposals.find((p: Proposal) => p.id === proposalId)
  if (proposal) {
    proposal.sold = true
    proposal.dead = false
  }
}

export function markProposalDead(monthIndex: number, proposalId: string): void {
  const aeData = getAEData()
  if (!aeData) return

  const proposal = aeData.monthlyData[monthIndex].proposals.find((p: Proposal) => p.id === proposalId)
  if (proposal) {
    proposal.sold = false
    proposal.dead = true
  }
}

// Convert a proposal to a sale (auto-migration when "Sold" is checked)
export function convertProposalToSale(
  monthIndex: number,
  proposalId: string,
  additionalData?: { pestPacId?: string; started?: boolean; paid?: boolean }
): Sale | null {
  const aeData = getAEData()
  if (!aeData) return null

  const proposal = aeData.monthlyData[monthIndex].proposals.find((p: Proposal) => p.id === proposalId)
  if (!proposal) return null

  // Mark the proposal as sold
  proposal.sold = true
  proposal.dead = false

  // Create the sale from the proposal
  const newSale: Sale = {
    id: generateId(),
    date: proposal.date,
    companyName: proposal.companyName,
    leadType: proposal.leadType,
    service: proposal.service,
    jobType: proposal.jobType,
    jobWorkPrice: proposal.jobWorkPrice,
    termitePrice: proposal.termitePrice,
    contractPrice: proposal.contractPrice,
    started: additionalData?.started ?? false,
    paid: additionalData?.paid ?? false,
    pestPacId: additionalData?.pestPacId ?? '',
  }

  // Add to sales
  aeData.monthlyData[monthIndex].sales.push(newSale)

  // Recalculate summaries
  const monthData = aeData.monthlyData[monthIndex]
  monthData.proposalSummary = calculateProposalSummary(
    monthData.proposals,
    monthData.proposalSummary.proposalGoal
  )
  monthData.salesSummary = calculateSalesSummary(
    monthData.sales,
    monthData.salesSummary.monthISQ
  )

  return newSale
}

// Update a proposal
export function updateProposal(monthIndex: number, proposalId: string, updates: Partial<Proposal>): Proposal | null {
  const aeData = getAEData()
  if (!aeData) return null

  const proposal = aeData.monthlyData[monthIndex].proposals.find((p: Proposal) => p.id === proposalId)
  if (!proposal) return null

  Object.assign(proposal, updates)

  // Recalculate summary
  const monthData = aeData.monthlyData[monthIndex]
  monthData.proposalSummary = calculateProposalSummary(
    monthData.proposals,
    monthData.proposalSummary.proposalGoal
  )

  return proposal
}

// Update a sale
export function updateSale(monthIndex: number, saleId: string, updates: Partial<Sale>): Sale | null {
  const aeData = getAEData()
  if (!aeData) return null

  const sale = aeData.monthlyData[monthIndex].sales.find((s: Sale) => s.id === saleId)
  if (!sale) return null

  Object.assign(sale, updates)

  // Recalculate summary
  const monthData = aeData.monthlyData[monthIndex]
  monthData.salesSummary = calculateSalesSummary(
    monthData.sales,
    monthData.salesSummary.monthISQ
  )

  return sale
}

// Delete a proposal
export function deleteProposal(monthIndex: number, proposalId: string): boolean {
  const aeData = getAEData()
  if (!aeData) return false

  const monthData = aeData.monthlyData[monthIndex]
  const idx = monthData.proposals.findIndex((p: Proposal) => p.id === proposalId)
  if (idx === -1) return false

  monthData.proposals.splice(idx, 1)
  monthData.proposalSummary = calculateProposalSummary(
    monthData.proposals,
    monthData.proposalSummary.proposalGoal
  )

  return true
}

// Delete a sale
export function deleteSale(monthIndex: number, saleId: string): boolean {
  const aeData = getAEData()
  if (!aeData) return false

  const monthData = aeData.monthlyData[monthIndex]
  const idx = monthData.sales.findIndex((s: Sale) => s.id === saleId)
  if (idx === -1) return false

  monthData.sales.splice(idx, 1)
  monthData.salesSummary = calculateSalesSummary(
    monthData.sales,
    monthData.salesSummary.monthISQ
  )

  return true
}

// Update monthly ISQ (Individual Sales Quota)
export function updateMonthlyISQ(monthIndex: number, isq: number): void {
  const aeData = getAEData()
  if (!aeData) return

  const monthData = aeData.monthlyData[monthIndex]
  monthData.salesSummary.monthISQ = isq
}

// Store for monthly personal goals (separate from ISQ)
const monthlyPersonalGoals: Record<number, number> = {}

// Update monthly personal goal
export function updateMonthlyPersonalGoal(monthIndex: number, goal: number): void {
  monthlyPersonalGoals[monthIndex] = goal
}

// Get monthly personal goal
export function getMonthlyPersonalGoal(monthIndex: number): number {
  if (monthlyPersonalGoals[monthIndex] !== undefined) {
    return monthlyPersonalGoals[monthIndex]
  }
  // Default to yearly goal / 12
  const aeData = getAEData()
  return aeData ? Math.round(aeData.yearlyGoal / 12) : 0
}

// Update yearly goal
export function updateYearlyGoal(goal: number): void {
  const aeData = getAEData()
  if (!aeData) return
  aeData.yearlyGoal = goal
  aeData.yearlyTotals.goal = goal
}

// Get category metrics for totals dashboard
export function getCategoryBreakdown(): import('@/types/sales-tracker').CategoryMetrics[] {
  const aeData = getAEData()
  if (!aeData) return []

  const categories: import('@/types/sales-tracker').ServiceCategory[] = ['Termite', 'Pest Control', 'Rodent', 'Exclusion', 'Insulation']

  return categories.map(category => {
    let proposalTotal = 0
    let proposalCount = 0
    let salesTotal = 0
    let salesCount = 0

    aeData.monthlyData.forEach((m: MonthlyData) => {
      m.proposals.forEach((p: Proposal) => {
        const matchesCategory = matchServiceToCategory(p.service, category)
        if (matchesCategory) {
          proposalCount++
          proposalTotal += p.jobWorkPrice + p.termitePrice + (p.contractPrice * 12)
        }
      })
      m.sales.forEach((s: Sale) => {
        const matchesCategory = matchServiceToCategory(s.service, category)
        if (matchesCategory) {
          salesCount++
          salesTotal += s.jobWorkPrice + s.termitePrice + (s.contractPrice * 12)
        }
      })
    })

    return { category, proposalTotal, proposalCount, salesTotal, salesCount }
  })
}

// Helper to match service type to category
function matchServiceToCategory(service: string, category: import('@/types/sales-tracker').ServiceCategory): boolean {
  switch (category) {
    case 'Termite':
      return service.toLowerCase().includes('termite')
    case 'Pest Control':
      return service === 'Pest Control' || service === 'Gen Pest' || service === 'Mosquito' || service === 'Bed Bug'
    case 'Rodent':
      return service.toLowerCase().includes('rodent') || service === 'Wildlife'
    case 'Exclusion':
      return service.toLowerCase().includes('exclusion')
    case 'Insulation':
      return service.toLowerCase().includes('insulation')
    default:
      return false
  }
}

// Get monthly progression data for totals dashboard
export function getMonthlyProgression(): import('@/types/sales-tracker').MonthlyProgression[] {
  const aeData = getAEData()
  if (!aeData) return []

  return aeData.monthlyData.map((m: MonthlyData, index: number) => ({
    month: m.month,
    totalProposals: m.proposalSummary.totalProposals,
    totalSales: m.salesSummary.totalSales,
    totalStartedSales: m.sales.filter((s: Sale) => s.started).reduce((sum: number, s: Sale) =>
      sum + s.jobWorkPrice + s.termitePrice + (s.contractPrice * 12), 0
    ),
    isq: m.salesSummary.monthISQ,
    personalGoal: getMonthlyPersonalGoal(index),
  }))
}

// Get totals dashboard data
export function getTotalsDashboard(): import('@/types/sales-tracker').TotalsDashboard | null {
  const aeData = getAEData()
  if (!aeData) return null

  const yearlyActual = aeData.monthlyData.reduce(
    (sum: number, m: MonthlyData) => sum + m.salesSummary.grandTotal, 0
  )
  const yearlyISQ = aeData.monthlyData.reduce(
    (sum: number, m: MonthlyData) => sum + m.salesSummary.monthISQ, 0
  )

  return {
    year: aeData.yearlyTotals.year,
    yearlyGoal: aeData.yearlyGoal,
    yearlyActual,
    yearlyISQ,
    categoryBreakdown: getCategoryBreakdown(),
    monthlyProgression: getMonthlyProgression(),
  }
}

// Get open proposals (not sold, not dead) for a month
export function getOpenProposals(monthIndex: number): Proposal[] {
  const aeData = getAEData()
  if (!aeData) return []
  return aeData.monthlyData[monthIndex]?.proposals.filter((p: Proposal) => !p.sold && !p.dead) || []
}

// Get all proposals for a month
export function getMonthProposals(monthIndex: number): Proposal[] {
  const aeData = getAEData()
  if (!aeData) return []
  return aeData.monthlyData[monthIndex]?.proposals || []
}

// Get all sales for a month
export function getMonthSales(monthIndex: number): Sale[] {
  const aeData = getAEData()
  if (!aeData) return []
  return aeData.monthlyData[monthIndex]?.sales || []
}

// CSV Export utilities
export function exportProposalsToCSV(monthIndex: number): string {
  const aeData = getAEData()
  if (!aeData) return ''

  const proposals = aeData.monthlyData[monthIndex]?.proposals || []
  const headers = ['Date', 'Company Name', 'Lead Type', 'Service', 'Job Type', 'Job Work $', 'Termite $', 'Contract $', 'Sold', 'Dead']
  const rows = proposals.map((p: Proposal) => [
    p.date,
    `"${p.companyName}"`,
    p.leadType,
    p.service,
    p.jobType,
    p.jobWorkPrice.toFixed(2),
    p.termitePrice.toFixed(2),
    p.contractPrice.toFixed(2),
    p.sold ? 'Yes' : 'No',
    p.dead ? 'Yes' : 'No'
  ].join(','))

  return [headers.join(','), ...rows].join('\n')
}

export function exportSalesToCSV(monthIndex: number): string {
  const aeData = getAEData()
  if (!aeData) return ''

  const sales = aeData.monthlyData[monthIndex]?.sales || []
  const headers = ['Date', 'Company Name', 'Lead Type', 'Service', 'Job Type', 'Job Work $', 'Termite $', 'Contract $', 'Started', 'Paid', 'PestPac ID']
  const rows = sales.map((s: Sale) => [
    s.date,
    `"${s.companyName}"`,
    s.leadType,
    s.service,
    s.jobType,
    s.jobWorkPrice.toFixed(2),
    s.termitePrice.toFixed(2),
    s.contractPrice.toFixed(2),
    s.started ? 'Yes' : 'No',
    s.paid ? 'Yes' : 'No',
    s.pestPacId
  ].join(','))

  return [headers.join(','), ...rows].join('\n')
}

export function exportYearlyTotalsToCSV(): string {
  const aeData = getAEData()
  if (!aeData) return ''

  const progression = getMonthlyProgression()
  const headers = ['Month', 'Total Proposals', 'Total Sales', 'Started Sales $', 'ISQ $', 'Personal Goal $']
  const rows = progression.map(m => [
    m.month,
    m.totalProposals,
    m.totalSales,
    m.totalStartedSales.toFixed(2),
    m.isq.toFixed(2),
    m.personalGoal.toFixed(2)
  ].join(','))

  return [headers.join(','), ...rows].join('\n')
}
