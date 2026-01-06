import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  AppSettings, GlobalFilters, DemoMode, Role, Scenario, User
} from '@/types'
import { getUsers, getMarkets, regenerateData, setDataQualityIssues } from '@/lib/data'

interface AppState {
  // Settings
  settings: AppSettings
  setDemoMode: (mode: DemoMode) => void
  setRole: (role: Role) => void
  setUserId: (userId: string) => void
  setSelectedMarkets: (marketIds: string[]) => void
  setScenario: (scenario: Scenario) => void
  setDataQualityIssuesEnabled: (enabled: boolean) => void
  refreshData: () => void

  // Filters
  filters: GlobalFilters
  setDateRange: (start: Date, end: Date) => void
  setMarketFilter: (marketIds: string[]) => void
  setBranchFilter: (branchIds: string[]) => void
  setOwnerFilter: (ownerIds: string[]) => void
  resetFilters: () => void

  // UI State
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  tourActive: boolean
  setTourActive: (active: boolean) => void
  tourStep: number
  setTourStep: (step: number) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  lineageModalOpen: boolean
  setLineageModalOpen: (open: boolean) => void
  selectedKpiSlug: string | null
  setSelectedKpiSlug: (slug: string | null) => void

  // Current user context
  currentUser: User | null
  getCurrentUserScope: () => { markets: string[]; branches: string[]; scope: string }
}

const defaultFilters: GlobalFilters = {
  dateRange: {
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  },
  marketIds: [],
  branchIds: [],
  ownerIds: [],
}

const defaultSettings: AppSettings = {
  demoMode: 'exec_bi_review',
  role: 'exec',
  userId: 'USR-00001',
  selectedMarkets: [],
  scenario: 'base',
  dataQualityIssuesEnabled: false,
  refreshSeed: 12345,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Settings
      settings: defaultSettings,

      setDemoMode: (mode: DemoMode) => {
        set((state) => ({
          settings: { ...state.settings, demoMode: mode },
        }))
      },

      setRole: (role: Role) => {
        const users = getUsers()
        const userForRole = users.find(u => u.role === role) || users[0]
        set((state) => ({
          settings: {
            ...state.settings,
            role,
            userId: userForRole.id,
            selectedMarkets: role === 'exec' ? [] : userForRole.assignedMarkets,
          },
          currentUser: userForRole,
        }))
      },

      setUserId: (userId: string) => {
        const users = getUsers()
        const user = users.find(u => u.id === userId)
        if (user) {
          set((state) => ({
            settings: { ...state.settings, userId, role: user.role },
            currentUser: user,
          }))
        }
      },

      setSelectedMarkets: (marketIds: string[]) => {
        set((state) => ({
          settings: { ...state.settings, selectedMarkets: marketIds },
        }))
      },

      setScenario: (scenario: Scenario) => {
        set((state) => ({
          settings: { ...state.settings, scenario },
        }))
      },

      setDataQualityIssuesEnabled: (enabled: boolean) => {
        setDataQualityIssues(enabled)
        set((state) => ({
          settings: { ...state.settings, dataQualityIssuesEnabled: enabled },
        }))
        // Regenerate data with quality issues
        regenerateData(get().settings.refreshSeed)
      },

      refreshData: () => {
        const newSeed = Math.floor(Math.random() * 100000)
        regenerateData(newSeed)
        set((state) => ({
          settings: { ...state.settings, refreshSeed: newSeed },
        }))
      },

      // Filters
      filters: defaultFilters,

      setDateRange: (start: Date, end: Date) => {
        set((state) => ({
          filters: { ...state.filters, dateRange: { start, end } },
        }))
      },

      setMarketFilter: (marketIds: string[]) => {
        set((state) => ({
          filters: { ...state.filters, marketIds },
        }))
      },

      setBranchFilter: (branchIds: string[]) => {
        set((state) => ({
          filters: { ...state.filters, branchIds },
        }))
      },

      setOwnerFilter: (ownerIds: string[]) => {
        set((state) => ({
          filters: { ...state.filters, ownerIds },
        }))
      },

      resetFilters: () => {
        set({ filters: defaultFilters })
      },

      // UI State
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),

      tourActive: false,
      setTourActive: (active: boolean) => set({ tourActive: active }),

      tourStep: 0,
      setTourStep: (step: number) => set({ tourStep: step }),

      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),

      lineageModalOpen: false,
      setLineageModalOpen: (open: boolean) => set({ lineageModalOpen: open }),

      selectedKpiSlug: null,
      setSelectedKpiSlug: (slug: string | null) => set({ selectedKpiSlug: slug }),

      // Current user
      currentUser: null,

      getCurrentUserScope: () => {
        const state = get()
        const { role, selectedMarkets } = state.settings
        const markets = getMarkets()

        if (role === 'exec') {
          return {
            markets: markets.map(m => m.id),
            branches: [],
            scope: 'All Markets',
          }
        }

        const user = state.currentUser
        if (!user) {
          return { markets: [], branches: [], scope: 'Unknown' }
        }

        const marketNames = markets
          .filter(m => user.assignedMarkets.includes(m.id))
          .map(m => m.name)

        return {
          markets: user.assignedMarkets,
          branches: user.assignedBranches,
          scope: role === 'rep'
            ? 'My Accounts'
            : role === 'manager'
              ? `${user.assignedBranches.length} Branches`
              : `${marketNames.join(', ')}`,
        }
      },
    }),
    {
      name: 'rentokil-bi-store',
      partialize: (state) => ({
        settings: state.settings,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

// Demo mode configurations
export const DEMO_MODE_CONFIG: Record<DemoMode, {
  name: string
  persona: string
  description: string
  defaultRoute: string
  highlightedKpis: string[]
  tourSteps: { title: string; description: string; route: string }[]
}> = {
  exec_bi_review: {
    name: 'Exec BI Review',
    persona: 'Susan (VP Business Intelligence)',
    description: 'Governance, trust, forecast, variance, scale story',
    defaultRoute: '/',
    highlightedKpis: ['revenue_mtd', 'variance_to_target_mtd', 'forecast_revenue_8w', 'service_risk_index', 'nrr'],
    tourSteps: [
      { title: 'Command Center', description: 'Overview of all key metrics with variance and trends', route: '/' },
      { title: 'Revenue Variance', description: 'Deep dive into variance drivers and reconciliation', route: '/kpi/revenue_mtd' },
      { title: 'Forecast & Scenarios', description: 'Review forecast with confidence bands and backtest', route: '/forecast' },
      { title: 'Governance', description: 'KPI dictionary, data quality, and lineage', route: '/governance' },
    ],
  },
  sales_ops_execution: {
    name: 'Sales Ops Execution',
    persona: 'Jason (Director Sales Ops)',
    description: 'Pipeline, hygiene, conversion, coaching, action lists',
    defaultRoute: '/sales',
    highlightedKpis: ['pipeline_30_60_90', 'win_rate', 'stalled_opps', 'crm_hygiene_score', 'avg_cycle_time_days'],
    tourSteps: [
      { title: 'Sales Dashboard', description: 'Pipeline health, stage conversion, and hygiene', route: '/sales' },
      { title: 'Stalled Opportunities', description: 'Action list for stuck deals requiring attention', route: '/kpi/stalled_opps' },
      { title: 'Rep Coaching', description: 'Performance rankings and coaching priorities', route: '/sales' },
      { title: 'Opportunity Detail', description: 'Full context and next best action', route: '/sales/opportunity/OPP-000001' },
    ],
  },
  branch_field_manager: {
    name: 'Branch/Field Manager',
    persona: 'Branch Manager',
    description: 'Service quality, callbacks, route pressure, retention risk',
    defaultRoute: '/ops',
    highlightedKpis: ['service_risk_index', 'callback_rate', 'capacity_utilization', 'retention_risk', 'scheduling_pressure_index'],
    tourSteps: [
      { title: 'Operations Dashboard', description: 'Service quality and capacity overview', route: '/ops' },
      { title: 'At-Risk Accounts', description: 'Accounts requiring immediate attention', route: '/kpi/retention_risk' },
      { title: 'Capacity Management', description: 'Route utilization and scheduling pressure', route: '/people' },
      { title: 'Account Detail', description: 'Full account context and mitigation plan', route: '/account/ACC-000001' },
    ],
  },
}

// Role permissions
export const ROLE_PERMISSIONS: Record<Role, {
  label: string
  description: string
  canView: string[]
  canEdit: string[]
  canExport: string[]
}> = {
  exec: {
    label: 'Executive',
    description: 'Full access to all markets and data',
    canView: ['all'],
    canEdit: ['settings', 'targets'],
    canExport: ['all'],
  },
  vp_director: {
    label: 'VP / Director',
    description: 'Access to assigned markets',
    canView: ['assigned_markets', 'team_data'],
    canEdit: ['team_targets'],
    canExport: ['assigned_markets'],
  },
  manager: {
    label: 'Manager',
    description: 'Access to assigned branches and teams',
    canView: ['assigned_branches', 'team_members'],
    canEdit: ['team_activities'],
    canExport: ['assigned_branches'],
  },
  rep: {
    label: 'Rep',
    description: 'Access to own accounts and opportunities',
    canView: ['own_accounts', 'own_opportunities'],
    canEdit: ['own_activities'],
    canExport: ['own_data'],
  },
}
