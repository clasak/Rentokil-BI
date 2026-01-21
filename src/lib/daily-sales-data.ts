// Daily Sales Cadence Data - simulates CSV data from Google Sheets
import seedrandom from 'seedrandom'
import {
  Branch,
  RegionCode,
  MarketCode,
  DailySalesEntry,
  DailySalesMetrics,
  WeeklyRollup,
  RegionSummary,
  MarketSummary,
  BranchDashboardStats,
  DEFAULT_DAILY_GOALS,
  MARKET_REGIONS,
  MARKET_NAMES,
} from '@/types/daily-sales-cadence'

// Re-export for convenience
export { DEFAULT_DAILY_GOALS }

let rng = seedrandom('daily-sales-2026')

// Master Branch List - extracted from all Midwest Daily Sales Cadence files
export const MASTER_BRANCH_LIST: Branch[] = [
  // REGION 16
  { region: 'R16', code: '83', name: 'Presto-X Kansas City', branchManager: 'Jody Thomason', phone: '417-268-5031' },
  { region: 'R16', code: '88', name: 'PRESTO-X - LITTLEROCK AR', branchManager: 'Mark McDaniels', phone: '870-310-6774' },
  { region: 'R16', code: '89', name: 'Van Buren', branchManager: 'Clay Graham', phone: '479-561-5997' },
  { region: 'R16', code: '675', name: 'McGhee pest', branchManager: 'Phil Fears', phone: '479-459-2888' },
  { region: 'R16', code: '2177', name: 'TMX Jonesboro', branchManager: 'Steve Williams', phone: '870-450-4777' },
  { region: 'R16', code: '2536', name: 'McCloud St. Louis', branchManager: 'John Henderson', phone: '317-373-9614' },
  { region: 'R16', code: '2538', name: 'McCloud Kansas City', branchManager: 'Garrett Counts', phone: '785-220-4664' },
  { region: 'R16', code: '2553', name: 'TMX Russellville', branchManager: 'Cindy Hallum', phone: '501-762-5708' },
  { region: 'R16', code: '2554', name: 'TMX Forrest City', branchManager: 'James Luck', phone: '901-331-3588' },
  { region: 'R16', code: '2556', name: 'Tmx North Little Rock', branchManager: 'Mark McDaniels', phone: '870-310-6774' },
  { region: 'R16', code: '2559', name: 'TMX Batesville', branchManager: 'Shane Crowe', phone: '870-613-7189' },
  { region: 'R16', code: '2667', name: 'TMX Ft. Smith', branchManager: 'Donald Hesselein', phone: '479-434-7039' },
  { region: 'R16', code: '2670', name: 'TMX Fayetteville', branchManager: 'Phil Fears', phone: '479-459-2888' },
  { region: 'R16', code: '2702', name: 'TMX Benton', branchManager: 'Josh Jones', phone: '501-529-6500' },
  { region: 'R16', code: '2789', name: 'Schendel - Lawrence', branchManager: 'Joseph Davidson', phone: '785-220-4674' },
  { region: 'R16', code: '2790', name: 'Schendel - Wichita', branchManager: 'Danny Baggett', phone: '316-249-2060' },
  { region: 'R16', code: '2794', name: 'Schendel - Kansas City', branchManager: 'Garrett Counts', phone: '785-220-4664' },
  { region: 'R16', code: '3088', name: 'PRESTO-X - LITTLEROCK AR', branchManager: 'Mark McDaniels', phone: '870-310-6774' },
  { region: 'R16', code: '3909', name: 'CITY TERMITE - MALVERN AR', branchManager: 'Britani Skarda', phone: '501-762-1600' },
  { region: 'R16', code: '3947', name: 'ADVANCED - HOT SPRINGS AR', branchManager: 'Sam Elmore', phone: '870-345-8859' },

  // REGION 23
  { region: 'R23', code: '2009', name: 'TMX Tulsa', branchManager: 'Keith Davis', phone: '405-658-2967' },
  { region: 'R23', code: '2039', name: 'TMX Wichita', branchManager: 'Justin Lowery', phone: '316-213-9813' },
  { region: 'R23', code: '2044', name: 'TMX Overland Park', branchManager: 'Bruce Johnson', phone: '' },
  { region: 'R23', code: '2134', name: 'TMX Kansas City', branchManager: 'Scott Simonds', phone: '480-254-3373' },
  { region: 'R23', code: '2152', name: 'TMX Lawton', branchManager: 'Open', phone: '940-224-4688' },
  { region: 'R23', code: '2160', name: 'TMX Topeka', branchManager: 'Matt Bax', phone: '913-415-7107' },
  { region: 'R23', code: '2362', name: 'TMX OKC', branchManager: 'Chad Nye', phone: '479-601-7805' },
  { region: 'R23', code: '2742', name: 'Durant', branchManager: 'Mike Key', phone: '580-579-4766' },
  { region: 'R23', code: '2780', name: 'OKC Commercial', branchManager: 'Ron White', phone: '405-922-7018' },
  { region: 'R23', code: '3077', name: 'Presto-X OKC', branchManager: 'Ron White', phone: '' },
  { region: 'R23', code: '3083', name: 'Presto-X Kansas City', branchManager: 'Jody Thomason', phone: '' },
  { region: 'R23', code: '3224', name: 'Manhattan Pest', branchManager: 'Travis Aggson', phone: '' },
  { region: 'R23', code: '3225', name: 'Kansas City Pest', branchManager: 'Jody Thomason', phone: '' },
  { region: 'R23', code: '3270', name: 'Presto-X Wichita', branchManager: 'Ron White', phone: '405-922-7018' },
  { region: 'R23', code: '3599', name: 'Tulsa', branchManager: 'Roger Graham', phone: '918-851-2855' },
  { region: 'R23', code: '3908', name: 'World Salina Pest', branchManager: 'Travis Aggson', phone: '785-313-2592' },

  // REGION 24
  { region: 'R24', code: '4542', name: 'Carbondale', branchManager: 'Eric Haney', phone: '618-927-8901' },
  { region: 'R24', code: '4543', name: 'TMX Springfield IL', branchManager: 'Kevin Cartwright', phone: '217-441-1197' },
  { region: 'R24', code: '4544', name: 'TMX Peoria', branchManager: 'Zach Ferguson', phone: '309-326-8847' },
  { region: 'R24', code: '4545', name: 'Bug Out Champaign', branchManager: 'Tyler Shoemaker', phone: '309-706-4883' },
  { region: 'R24', code: '4546', name: 'Presto-X Indianapolis', branchManager: 'Brian George', phone: '463-245-5820' },
  { region: 'R24', code: '4547', name: 'TMX Indianapolis', branchManager: 'Josh Berter', phone: '317-503-6854' },
  { region: 'R24', code: '4548', name: 'TMX Fort Wayne', branchManager: 'Dan Mcghiey', phone: '317-522-8230' },

  // REGION 52 (Texas East)
  { region: 'R52', code: '2656', name: 'Tyler', branchManager: 'Mark Singleman', phone: '903-245-4726' },
  { region: 'R52', code: '2657', name: 'Longview', branchManager: 'Curtis Franklin', phone: '903-619-2645' },
  { region: 'R52', code: '2658', name: 'Lufkin', branchManager: 'Harold Causin', phone: '936-676-4522' },
  { region: 'R52', code: '2660', name: 'Palestine', branchManager: 'Matthew Schaeffer', phone: '903-221-5133' },
  { region: 'R52', code: '2639', name: 'TMX Nashville', branchManager: 'Joseph Solida', phone: '903-748-8826' },

  // REGION 54 (Texas Central/West)
  { region: 'R54', code: '195', name: 'San Antonio TX Pest', branchManager: 'Jake Chinelli', phone: '210-238-4526' },
  { region: 'R54', code: '227', name: 'Bug Out El Paso TX Pest', branchManager: 'Rob Tili', phone: '760-799-2787' },
  { region: 'R54', code: '229', name: 'San Angelo TX Pest', branchManager: 'Greg Martin', phone: '325-277-0578' },
  { region: 'R54', code: '588', name: 'BUG OUT LUBBOCK TX PEST', branchManager: 'Rafe Cambron', phone: '806-241-0674' },
  { region: 'R54', code: '2033', name: 'Austin', branchManager: 'Carrie Fine', phone: '817-524-9917' },
  { region: 'R54', code: '2110', name: 'Temple', branchManager: 'Eric Benson', phone: '254-405-5797' },
  { region: 'R54', code: '2192', name: 'Amarillo', branchManager: 'Phil Denniston', phone: '806-654-8584' },
  { region: 'R54', code: '2406', name: 'San Antonio', branchManager: 'Kenton Smith', phone: '210-381-2764' },
  { region: 'R54', code: '2408', name: 'Corpus Christi', branchManager: 'Don Lainer', phone: '346-617-8865' },
  { region: 'R54', code: '2410', name: 'Rio Grande Valley', branchManager: 'Marco Carrete', phone: '956-733-1247' },
  { region: 'R54', code: '2470', name: 'San Antonio Commercial', branchManager: 'David Kasbohm', phone: '210-775-8501' },
  { region: 'R54', code: '2516', name: '855bugs', branchManager: 'Eric Benson', phone: '254-405-5797' },
  { region: 'R54', code: '2526', name: 'Abilene', branchManager: 'Arturo Barojas', phone: '817-751-3287' },
  { region: 'R54', code: '2529', name: 'Midland', branchManager: 'Brendan Steinsiek', phone: '432-741-9874' },
  { region: 'R54', code: '4511', name: 'Albuquerque', branchManager: 'Harold Anaya', phone: '505-221-1841' },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function randomMetrics(pccCount: number, hasTapLeads: boolean): DailySalesMetrics {
  const base: DailySalesMetrics = {
    pccInField: pccCount,
    inspPrp: Math.floor(pccCount * (4 + rng() * 3)),        // 4-7 per PCC
    lobsPrp: Math.floor(pccCount * (8 + rng() * 6)),        // 8-14 per PCC
    lobsSold: Math.floor(pccCount * (1 + rng() * 2)),       // 1-3 per PCC
    dollarsSold: Math.round((1000 + rng() * 4000) * 100) / 100,
    nextDayConf: Math.floor(pccCount * (3 + rng() * 4)),    // 3-7 per PCC
    pcNoTcConversions: rng() > 0.7,
  }

  if (hasTapLeads) {
    base.tapLeads = Math.floor(pccCount * (1 + rng() * 2))
  }

  return base
}

// Generate sample daily entries
let dailyEntries: DailySalesEntry[] = []

export function initializeDailySalesData(): void {
  rng = seedrandom('daily-sales-2026')
  dailyEntries = []

  const today = new Date()
  const hasTapLeads = today.getMonth() >= 3 // TAP Leads added after March

  // Generate entries for the last 14 days for each branch
  MASTER_BRANCH_LIST.forEach(branch => {
    for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
      // Skip weekends
      const date = new Date(today)
      date.setDate(date.getDate() - daysAgo)
      if (date.getDay() === 0 || date.getDay() === 6) continue

      // 85% chance of submission
      if (rng() > 0.85) continue

      const pccCount = Math.floor(2 + rng() * 4) // 2-5 PCCs

      dailyEntries.push({
        id: generateId(),
        branchCode: branch.code,
        date: date.toISOString().split('T')[0],
        metrics: randomMetrics(pccCount, hasTapLeads),
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
        submittedBy: branch.branchManager,
      })
    }
  })

  // Sort by date descending
  dailyEntries.sort((a, b) => b.date.localeCompare(a.date))
}

export function getDailyEntries(): DailySalesEntry[] {
  if (dailyEntries.length === 0) {
    initializeDailySalesData()
  }
  return dailyEntries
}

export function getBranches(): Branch[] {
  return MASTER_BRANCH_LIST
}

export function getBranchesByRegion(region: RegionCode): Branch[] {
  return MASTER_BRANCH_LIST.filter(b => b.region === region)
}

export function getBranchByCode(code: string): Branch | undefined {
  return MASTER_BRANCH_LIST.find(b => b.code === code)
}

export function getBranchByManager(managerName: string): Branch | undefined {
  return MASTER_BRANCH_LIST.find(b =>
    b.branchManager.toLowerCase().includes(managerName.toLowerCase())
  )
}

export function getEntriesForBranch(branchCode: string): DailySalesEntry[] {
  return getDailyEntries().filter(e => e.branchCode === branchCode)
}

export function getEntriesForDate(date: string): DailySalesEntry[] {
  return getDailyEntries().filter(e => e.date === date)
}

export function getEntriesForRegion(region: RegionCode): DailySalesEntry[] {
  const branchCodes = getBranchesByRegion(region).map(b => b.code)
  return getDailyEntries().filter(e => branchCodes.includes(e.branchCode))
}

export function addDailyEntry(branchCode: string, date: string, metrics: DailySalesMetrics, submittedBy: string): DailySalesEntry {
  const entry: DailySalesEntry = {
    id: generateId(),
    branchCode,
    date,
    metrics,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedBy,
  }

  // Remove existing entry for same branch/date if exists
  dailyEntries = dailyEntries.filter(e => !(e.branchCode === branchCode && e.date === date))
  dailyEntries.unshift(entry)

  return entry
}

export function getBranchDashboardStats(branchCode: string): BranchDashboardStats {
  const entries = getEntriesForBranch(branchCode)
  const today = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.date === today)

  // Get week start (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(monday.getDate() - mondayOffset)
  const weekStart = monday.toISOString().split('T')[0]

  const weekEntries = entries.filter(e => e.date >= weekStart)

  const weekToDate = weekEntries.reduce((acc, e) => ({
    inspPrp: acc.inspPrp + e.metrics.inspPrp,
    lobsPrp: acc.lobsPrp + e.metrics.lobsPrp,
    lobsSold: acc.lobsSold + e.metrics.lobsSold,
    dollarsSold: acc.dollarsSold + e.metrics.dollarsSold,
  }), { inspPrp: 0, lobsPrp: 0, lobsSold: 0, dollarsSold: 0 })

  const totalPcc = weekEntries.reduce((sum, e) => sum + e.metrics.pccInField, 0)
  const avgPcc = totalPcc / Math.max(weekEntries.length, 1)

  // Calculate goal progress based on days worked
  const workDays = weekEntries.length
  const goalProgress = {
    inspPrp: workDays > 0 ? (weekToDate.inspPrp / (avgPcc * DEFAULT_DAILY_GOALS.inspPrpPerPcc * workDays)) * 100 : 0,
    lobsPrp: workDays > 0 ? (weekToDate.lobsPrp / (avgPcc * DEFAULT_DAILY_GOALS.lobsPrpPerPcc * workDays)) * 100 : 0,
    lobsSold: workDays > 0 ? (weekToDate.lobsSold / (avgPcc * DEFAULT_DAILY_GOALS.lobsSoldPerPcc * workDays)) * 100 : 0,
  }

  // Calculate streak
  let streak = 0
  const sortedEntries = entries.sort((a, b) => b.date.localeCompare(a.date))
  let checkDate = new Date()
  for (const entry of sortedEntries) {
    const entryDate = new Date(entry.date)
    // Skip weekends
    while (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    if (entry.date === checkDate.toISOString().split('T')[0]) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return {
    todayMetrics: todayEntry?.metrics || null,
    weekToDate,
    goalProgress,
    daysSubmitted: weekEntries.length,
    streak,
  }
}

export function getRegionSummary(region: RegionCode, date?: string): RegionSummary {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const branches = getBranchesByRegion(region)
  const entries = getEntriesForRegion(region).filter(e => e.date === targetDate)

  const totals = entries.reduce((acc, e) => ({
    pccInField: acc.pccInField + e.metrics.pccInField,
    inspPrp: acc.inspPrp + e.metrics.inspPrp,
    lobsPrp: acc.lobsPrp + e.metrics.lobsPrp,
    lobsSold: acc.lobsSold + e.metrics.lobsSold,
    dollarsSold: acc.dollarsSold + e.metrics.dollarsSold,
  }), { pccInField: 0, inspPrp: 0, lobsPrp: 0, lobsSold: 0, dollarsSold: 0 })

  // Calculate goal attainment
  const avgPcc = totals.pccInField / Math.max(entries.length, 1)
  const goalAttainment = entries.length > 0
    ? (totals.inspPrp / (avgPcc * DEFAULT_DAILY_GOALS.inspPrpPerPcc * entries.length)) * 100
    : 0

  // Count branches on/off track
  let onTrack = 0
  let offTrack = 0
  entries.forEach(e => {
    const branchGoal = e.metrics.pccInField * DEFAULT_DAILY_GOALS.inspPrpPerPcc
    if (e.metrics.inspPrp >= branchGoal * 0.8) {
      onTrack++
    } else {
      offTrack++
    }
  })

  return {
    region,
    branchCount: branches.length,
    totalPccInField: totals.pccInField,
    totalInspPrp: totals.inspPrp,
    totalLobsPrp: totals.lobsPrp,
    totalLobsSold: totals.lobsSold,
    totalDollarsSold: totals.dollarsSold,
    avgGoalAttainment: goalAttainment,
    branchesOnTrack: onTrack,
    branchesOffTrack: offTrack,
  }
}

export function getWeeklyRollup(branchCode: string, weekStartDate: string): WeeklyRollup {
  const weekStart = new Date(weekStartDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const entries = getEntriesForBranch(branchCode).filter(e => {
    const entryDate = new Date(e.date)
    return entryDate >= weekStart && entryDate <= weekEnd
  })

  const totals = entries.reduce((acc, e) => ({
    pccInField: acc.pccInField + e.metrics.pccInField,
    tapLeads: (acc.tapLeads || 0) + (e.metrics.tapLeads || 0),
    inspPrp: acc.inspPrp + e.metrics.inspPrp,
    lobsPrp: acc.lobsPrp + e.metrics.lobsPrp,
    lobsSold: acc.lobsSold + e.metrics.lobsSold,
    dollarsSold: acc.dollarsSold + e.metrics.dollarsSold,
    nextDayConf: acc.nextDayConf + e.metrics.nextDayConf,
    pcNoTcConversions: acc.pcNoTcConversions || e.metrics.pcNoTcConversions,
  }), {
    pccInField: 0,
    tapLeads: 0,
    inspPrp: 0,
    lobsPrp: 0,
    lobsSold: 0,
    dollarsSold: 0,
    nextDayConf: 0,
    pcNoTcConversions: false,
  } as DailySalesMetrics)

  const avgPcc = totals.pccInField / Math.max(entries.length, 1)
  const workDays = entries.length

  return {
    branchCode,
    weekStartDate,
    weekEndDate: weekEnd.toISOString().split('T')[0],
    dailyEntries: entries,
    totals,
    goalAttainment: {
      inspPrp: workDays > 0 ? (totals.inspPrp / (avgPcc * DEFAULT_DAILY_GOALS.inspPrpPerPcc * workDays)) * 100 : 0,
      lobsPrp: workDays > 0 ? (totals.lobsPrp / (avgPcc * DEFAULT_DAILY_GOALS.lobsPrpPerPcc * workDays)) * 100 : 0,
      lobsSold: workDays > 0 ? (totals.lobsSold / (avgPcc * DEFAULT_DAILY_GOALS.lobsSoldPerPcc * workDays)) * 100 : 0,
      nextDayConf: workDays > 0 ? (totals.nextDayConf / (avgPcc * DEFAULT_DAILY_GOALS.nextDayConfPerPcc * workDays)) * 100 : 0,
    },
  }
}

export function getAllRegions(): RegionCode[] {
  return ['R16', 'R23', 'R24', 'R52', 'R54']
}

export function getAllMarkets(): MarketCode[] {
  return ['MIDWEST', 'TEXAS']
}

export function getRegionsForMarket(market: MarketCode): RegionCode[] {
  return MARKET_REGIONS[market] || []
}

export function getBranchesByMarket(market: MarketCode): Branch[] {
  const regionCodes = getRegionsForMarket(market)
  return MASTER_BRANCH_LIST.filter(b => regionCodes.includes(b.region))
}

export function getEntriesForMarket(market: MarketCode): DailySalesEntry[] {
  const branchCodes = getBranchesByMarket(market).map(b => b.code)
  return getDailyEntries().filter(e => branchCodes.includes(e.branchCode))
}

export function getMarketSummary(market: MarketCode, date?: string): MarketSummary {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const regions = getRegionsForMarket(market)
  const allBranches = getBranchesByMarket(market)

  // Get region summaries
  const regionBreakdown = regions.map(region => getRegionSummary(region, targetDate))

  // Aggregate totals
  const totals = regionBreakdown.reduce((acc, r) => ({
    pccInField: acc.pccInField + r.totalPccInField,
    inspPrp: acc.inspPrp + r.totalInspPrp,
    lobsPrp: acc.lobsPrp + r.totalLobsPrp,
    lobsSold: acc.lobsSold + r.totalLobsSold,
    dollarsSold: acc.dollarsSold + r.totalDollarsSold,
    branchesOnTrack: acc.branchesOnTrack + r.branchesOnTrack,
    branchesOffTrack: acc.branchesOffTrack + r.branchesOffTrack,
  }), { pccInField: 0, inspPrp: 0, lobsPrp: 0, lobsSold: 0, dollarsSold: 0, branchesOnTrack: 0, branchesOffTrack: 0 })

  // Calculate average goal attainment across regions
  const avgGoalAttainment = regionBreakdown.length > 0
    ? regionBreakdown.reduce((sum, r) => sum + r.avgGoalAttainment, 0) / regionBreakdown.length
    : 0

  // Count regions on/off track (average goal attainment >= 80%)
  const regionsOnTrack = regionBreakdown.filter(r => r.avgGoalAttainment >= 80).length
  const regionsOffTrack = regionBreakdown.filter(r => r.avgGoalAttainment < 80).length

  return {
    market,
    regionCount: regions.length,
    branchCount: allBranches.length,
    totalPccInField: totals.pccInField,
    totalInspPrp: totals.inspPrp,
    totalLobsPrp: totals.lobsPrp,
    totalLobsSold: totals.lobsSold,
    totalDollarsSold: totals.dollarsSold,
    avgGoalAttainment,
    regionsOnTrack,
    regionsOffTrack,
    branchesOnTrack: totals.branchesOnTrack,
    branchesOffTrack: totals.branchesOffTrack,
    regionBreakdown,
  }
}

// Region display names
export const REGION_NAMES: Record<RegionCode, string> = {
  R16: 'Region 16 - Arkansas/Kansas',
  R23: 'Region 23 - Oklahoma/Kansas',
  R24: 'Region 24 - Illinois/Indiana',
  R52: 'Region 52 - Texas East',
  R54: 'Region 54 - Texas Central/West',
  R75: 'Region 75 - Texas (Combined)',
}

// Re-export market names for convenience
export { MARKET_NAMES }
