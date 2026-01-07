// New Start Log Data - simulates CSV data from Google Sheets
import seedrandom from 'seedrandom'
import {
  NewStartEntry,
  NewStartStatus,
  NewStartSummary,
  NewStartAEFields,
  NewStartOpsFields,
  ServiceType,
  FrequencyType,
  YesNo,
  MonthName,
} from '@/types/new-start-log'

let rng = seedrandom('new-start-2026')

const ACCOUNT_NAMES = [
  'Beshert Steel', 'Metro Manufacturing', 'Downtown Diner', 'Sunrise Apartments',
  'Oak Tree Condos', 'Metro Office Park', 'Riverside Restaurant', 'Green Valley HOA',
  'Summit Business Center', 'Lakeside Marina', 'Central Storage', 'Park View Estates',
  'Harbor Seafood', 'Mountain Lodge', 'City Center Mall', 'Westside Warehouse',
  'Northgate Apartments', 'Silver Creek Office', 'Golden Eagle Resort', 'Blue Water Marina',
]

const ADDRESSES = [
  '15355 Jacintoport, Houston 77015',
  '8901 Westheimer Rd, Houston 77063',
  '2345 Main Street, Houston 77002',
  '4567 Bellaire Blvd, Houston 77401',
  '7890 Memorial Dr, Houston 77024',
  '1234 Kirby Dr, Houston 77019',
  '5678 Richmond Ave, Houston 77057',
  '9012 Fondren Rd, Houston 77074',
]

const SALES_REPS = ['Cody', 'Donna', 'Mike', 'Sarah', 'James', 'Lisa']
const OPS_MANAGERS = ['Mitchell', 'Rodriguez', 'Thompson', 'Anderson']
const SPECIALISTS = ['Daniel Cox', 'Maria Santos', 'John Williams', 'Robert Chen', 'Emily Davis']
const MONTHS: MonthName[] = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December']

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function randomDate(startDays: number, endDays: number): string {
  const now = new Date()
  const offset = Math.floor(rng() * (endDays - startDays)) + startDays
  const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)
  return date.toISOString().split('T')[0]
}

function generateNewStartEntry(daysAgo: number): NewStartEntry {
  const isContract = rng() > 0.3
  const serviceType: ServiceType = isContract ? 'Contract' : 'Job 1x'
  const frequency: FrequencyType = isContract ? (rng() > 0.5 ? '12' : '6') : '1'

  const soldDate = randomDate(daysAgo, daysAgo + 5)
  const status = getRandomStatus(daysAgo)

  const aeFields: NewStartAEFields = {
    soldDate,
    accountName: randomFromArray(ACCOUNT_NAMES),
    serviceAddress: randomFromArray(ADDRESSES),
    salesRepsInvolved: randomFromArray(SALES_REPS),
    initialJobPrice: Math.round((500 + rng() * 3000) * 100) / 100,
    maintenancePrice: isContract ? Math.round((100 + rng() * 400) * 100) / 100 : 0,
    serviceType,
    frequency,
    logBookNeeded: rng() > 0.6 ? 'Y' : 'N',
    tapLeadOrSpecialist: rng() > 0.7 ? randomFromArray(SALES_REPS) : '',
    pestPacLocNumber: `${Math.floor(rng() * 900000000 + 100000000)}`,
    customerRequestedStartMonth: randomFromArray(MONTHS),
  }

  // Ops fields depend on status
  const opsFields: NewStartOpsFields = getOpsFieldsForStatus(status, soldDate)

  return {
    id: generateId(),
    ...aeFields,
    ...opsFields,
    status,
    branchId: 'houston-98',
    createdAt: soldDate,
    updatedAt: new Date().toISOString(),
  }
}

function getRandomStatus(daysAgo: number): NewStartStatus {
  if (daysAgo < 3) {
    return rng() > 0.3 ? 'pending_ops' : 'scheduled'
  } else if (daysAgo < 10) {
    const r = rng()
    if (r < 0.2) return 'pending_ops'
    if (r < 0.5) return 'scheduled'
    if (r < 0.8) return 'confirmed'
    return 'in_progress'
  } else if (daysAgo < 30) {
    const r = rng()
    if (r < 0.1) return 'scheduled'
    if (r < 0.3) return 'confirmed'
    if (r < 0.5) return 'in_progress'
    if (r < 0.9) return 'completed'
    return 'on_hold'
  } else {
    return rng() > 0.1 ? 'completed' : 'on_hold'
  }
}

function getOpsFieldsForStatus(status: NewStartStatus, soldDate: string): NewStartOpsFields {
  const baseFields: NewStartOpsFields = {
    operationsManager: '',
    assignedSpecialist: '',
    materialsOrdered: '',
    installationStarted: '',
    pocNamePhone: '',
    confirmedStartDate: '',
    specialNotes: '',
  }

  if (status === 'pending_ops') {
    return baseFields
  }

  // Scheduled or later - has ops manager assigned
  baseFields.operationsManager = randomFromArray(OPS_MANAGERS)
  baseFields.assignedSpecialist = randomFromArray(SPECIALISTS)

  if (status === 'scheduled') {
    baseFields.materialsOrdered = rng() > 0.5 ? 'Y' : 'N'
    return baseFields
  }

  // Confirmed or later
  baseFields.materialsOrdered = 'Y'
  baseFields.pocNamePhone = `Contact Person / ${Math.floor(rng() * 9000000000 + 1000000000)}`

  if (status === 'confirmed' || status === 'in_progress' || status === 'completed') {
    const startDate = new Date(soldDate)
    startDate.setDate(startDate.getDate() + Math.floor(rng() * 14) + 3)
    baseFields.confirmedStartDate = startDate.toISOString().split('T')[0]
  }

  if (status === 'in_progress' || status === 'completed') {
    baseFields.installationStarted = baseFields.confirmedStartDate
  }

  if (rng() > 0.6) {
    baseFields.specialNotes = randomFromArray([
      'Install door sweeps on 2 front entry doors',
      'Customer prefers morning appointments',
      'Large facility - may need 2 techs',
      'Gate code: 1234#',
      'Check rodent stations in warehouse',
      'Food safety audit scheduled next month',
    ])
  }

  return baseFields
}

// Generate sample data
let newStartEntries: NewStartEntry[] = []

export function initializeNewStartData(): NewStartEntry[] {
  rng = seedrandom('new-start-2026')
  newStartEntries = []

  // Generate entries for last 60 days
  for (let i = 0; i < 35; i++) {
    const daysAgo = Math.floor(rng() * 60)
    newStartEntries.push(generateNewStartEntry(daysAgo))
  }

  // Sort by sold date descending
  newStartEntries.sort((a, b) => b.soldDate.localeCompare(a.soldDate))

  return newStartEntries
}

export function getNewStartEntries(): NewStartEntry[] {
  if (newStartEntries.length === 0) {
    initializeNewStartData()
  }
  return newStartEntries
}

export function getNewStartSummary(): NewStartSummary {
  const entries = getNewStartEntries()

  return {
    total: entries.length,
    pendingOps: entries.filter(e => e.status === 'pending_ops').length,
    scheduled: entries.filter(e => e.status === 'scheduled').length,
    confirmed: entries.filter(e => e.status === 'confirmed').length,
    inProgress: entries.filter(e => e.status === 'in_progress').length,
    completed: entries.filter(e => e.status === 'completed').length,
    onHold: entries.filter(e => e.status === 'on_hold').length,
    totalInitialValue: entries.reduce((sum, e) => sum + e.initialJobPrice, 0),
    totalContractValue: entries.reduce((sum, e) => sum + (e.maintenancePrice * 12), 0),
  }
}

export function getNewStartById(id: string): NewStartEntry | undefined {
  return getNewStartEntries().find(e => e.id === id)
}

export function addNewStart(aeFields: NewStartAEFields): NewStartEntry {
  const entry: NewStartEntry = {
    id: generateId(),
    ...aeFields,
    operationsManager: '',
    assignedSpecialist: '',
    materialsOrdered: '',
    installationStarted: '',
    pocNamePhone: '',
    confirmedStartDate: '',
    specialNotes: '',
    status: 'pending_ops',
    branchId: 'houston-98',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  newStartEntries.unshift(entry)
  return entry
}

export function updateNewStartOpsFields(id: string, opsFields: Partial<NewStartOpsFields>, newStatus?: NewStartStatus): NewStartEntry | null {
  const entry = newStartEntries.find(e => e.id === id)
  if (!entry) return null

  Object.assign(entry, opsFields)
  if (newStatus) {
    entry.status = newStatus
  }
  entry.updatedAt = new Date().toISOString()

  return entry
}

export function getEntriesByStatus(status: NewStartStatus): NewStartEntry[] {
  return getNewStartEntries().filter(e => e.status === status)
}

export function getEntriesForOpsManager(managerName: string): NewStartEntry[] {
  return getNewStartEntries().filter(e =>
    e.operationsManager.toLowerCase() === managerName.toLowerCase() ||
    e.status === 'pending_ops'
  )
}

export function getEntriesForSalesRep(repName: string): NewStartEntry[] {
  return getNewStartEntries().filter(e =>
    e.salesRepsInvolved.toLowerCase().includes(repName.toLowerCase())
  )
}
