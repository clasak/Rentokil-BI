import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  AppSettings, GlobalFilters, DemoMode, Role, Scenario, User
} from '@/types'
import { getUsers, getMarkets, regenerateData, setDataQualityIssues } from '@/lib/data'

type Theme = 'light' | 'dark' | 'system'

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

  // Presenter Mode
  presenterMode: boolean
  setPresenterMode: (active: boolean) => void
  presenterMinimized: boolean
  setPresenterMinimized: (minimized: boolean) => void
  presenterStep: number
  setPresenterStep: (step: number) => void
  nextPresenterStep: () => void
  prevPresenterStep: () => void

  // Tutorial Mode (for users)
  tutorialActive: boolean
  setTutorialActive: (active: boolean) => void
  tutorialStep: number
  setTutorialStep: (step: number) => void

  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Ops Manager filter toggle
  showAllBranchTechnicians: boolean
  setShowAllBranchTechnicians: (show: boolean) => void

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
  demoMode: 'bi_leadership',
  role: 'exec',
  userId: 'USR-00001',
  selectedMarkets: [],
  scenario: 'base',
  dataQualityIssuesEnabled: false,
  refreshSeed: 12345,
}

// Presenter Mode Configuration with full scripts
export interface PresenterStep {
  title: string
  route: string
  script: string[]
}

export const PRESENTER_MODE_CONFIG: Record<DemoMode, {
  name: string
  persona: string
  description: string
  steps: PresenterStep[]
}> = {
  bi_leadership: {
    name: 'BI Leadership Demo',
    persona: 'Susan Michael & Jason Gonski',
    description: 'Full BI platform overview for leadership',
    steps: [
      {
        title: 'Command Center Overview',
        route: '/',
        script: [
          "Welcome to the Rentokil Business Intelligence Command Center.",
          "This is the executive view - a single pane of glass for the top KPIs that matter most.",
          "Notice each card shows the current value, trend sparkline, and variance to target.",
          "Red means we're behind plan, green means we're ahead, yellow is a warning zone.",
          "The system pulls data from connected source systems and updates throughout the day."
        ]
      },
      {
        title: 'Revenue Deep Dive',
        route: '/kpi/revenue_mtd',
        script: [
          "Let's drill into Revenue MTD to understand what's driving our variance.",
          "The Overview tab shows the full calculation breakdown - actual vs target vs prior period.",
          "Click the Drivers tab to see exactly what's causing us to be ahead or behind.",
          "We can slice by market, product line, or customer segment to pinpoint the story.",
          "The Lineage button shows exactly where this number comes from - full data traceability."
        ]
      },
      {
        title: 'Sales Dashboard',
        route: '/sales',
        script: [
          "This is the Sales Operations dashboard for pipeline visibility.",
          "At the top, we see pipeline health: total pipeline value, weighted pipeline, and stage distribution.",
          "The conversion funnel shows how deals are progressing through stages.",
          "CRM Hygiene Score tells us how clean our data is - missing fields, stale opportunities, etc.",
          "Red flags here mean the pipeline number might not be trustworthy."
        ]
      },
      {
        title: 'Operations Dashboard',
        route: '/ops',
        script: [
          "This is the Operations dashboard for service delivery metrics.",
          "Service Risk Index is our composite score of quality, callbacks, and customer satisfaction.",
          "Route efficiency shows how well we're utilizing our technicians.",
          "Callback rate is critical - every callback is a customer we disappointed and money we lost.",
          "Green means we're operating well, red means we need immediate attention."
        ]
      },
      {
        title: 'Forecast & Scenarios',
        route: '/forecast',
        script: [
          "Now let's look at our 8-week rolling forecast.",
          "We show three scenarios: Base case is our most likely outcome, Upside assumes tailwinds, Downside assumes headwinds.",
          "The shaded confidence bands show our statistical uncertainty based on historical accuracy.",
          "Below that, you can see our backtest results - how accurate we've been in prior periods.",
          "This builds trust that our forecasts are grounded in reality, not wishful thinking."
        ]
      },
      {
        title: 'Governance & Data Quality',
        route: '/governance',
        script: [
          "Finally, let's look at governance - this is what builds trust with leadership.",
          "The KPI Dictionary shows every metric's definition, business owner, and calculation logic.",
          "Data Quality shows freshness scores across all source systems - you can see when data was last refreshed.",
          "The Permissions tab shows who can see what - full role-based access control visibility.",
          "This transparency is how we ensure everyone trusts the numbers they're seeing."
        ]
      }
    ]
  }
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

      // Presenter Mode
      presenterMode: false,
      setPresenterMode: (active: boolean) => set({ presenterMode: active, presenterStep: 0 }),
      presenterMinimized: false,
      setPresenterMinimized: (minimized: boolean) => set({ presenterMinimized: minimized }),
      presenterStep: 0,
      setPresenterStep: (step: number) => set({ presenterStep: step }),
      nextPresenterStep: () => {
        const state = get()
        const demoMode = state.settings.demoMode in PRESENTER_MODE_CONFIG
          ? state.settings.demoMode
          : 'bi_leadership'
        const config = PRESENTER_MODE_CONFIG[demoMode]
        const maxStep = (config?.steps?.length || 1) - 1
        if (state.presenterStep < maxStep) {
          set({ presenterStep: state.presenterStep + 1 })
        }
      },
      prevPresenterStep: () => {
        const state = get()
        if (state.presenterStep > 0) {
          set({ presenterStep: state.presenterStep - 1 })
        }
      },

      // Tutorial Mode (for users)
      tutorialActive: false,
      setTutorialActive: (active: boolean) => set({ tutorialActive: active }),
      tutorialStep: 0,
      setTutorialStep: (step: number) => set({ tutorialStep: step }),

      // Theme
      theme: 'light' as Theme,
      setTheme: (theme: Theme) => set({ theme }),

      // Ops Manager filter toggle
      showAllBranchTechnicians: false,
      setShowAllBranchTechnicians: (show: boolean) => set({ showAllBranchTechnicians: show }),

      // Current user
      currentUser: null,

      getCurrentUserScope: () => {
        const state = get()
        const { role } = state.settings
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

        // Determine scope label based on role
        let scopeLabel: string
        switch (role) {
          case 'rep':
            scopeLabel = 'My Accounts'
            break
          case 'technician':
            scopeLabel = 'My Routes'
            break
          case 'manager':
            scopeLabel = `${user.assignedBranches.length} Branch${user.assignedBranches.length !== 1 ? 'es' : ''}`
            break
          case 'sales_manager':
            scopeLabel = `${user.assignedReps?.length || 0} Account Executives`
            break
          case 'ops_manager':
            scopeLabel = `${user.assignedTechnicians?.length || 0} Technicians`
            break
          case 'region_director':
            scopeLabel = `${user.assignedRegions?.length || 0} Region${(user.assignedRegions?.length || 0) !== 1 ? 's' : ''}`
            break
          case 'market_director':
            scopeLabel = marketNames.join(', ')
            break
          default:
            scopeLabel = marketNames.join(', ')
        }

        return {
          markets: user.assignedMarkets,
          branches: user.assignedBranches,
          scope: scopeLabel,
        }
      },
    }),
    {
      name: 'rentokil-bi-store',
      partialize: (state) => ({
        settings: state.settings,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        showAllBranchTechnicians: state.showAllBranchTechnicians,
      }),
      // Migrate persisted state to fix invalid roles
      onRehydrateStorage: () => (state) => {
        if (state) {
          const validRoles: Role[] = ['exec', 'market_director', 'region_director', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician']
          if (!validRoles.includes(state.settings.role)) {
            state.settings.role = 'exec'
          }
        }
      },
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
  bi_leadership: {
    name: 'BI Leadership Demo',
    persona: 'Susan Michael & Jason Gonski',
    description: 'Full BI platform overview for leadership',
    defaultRoute: '/',
    highlightedKpis: ['revenue_mtd', 'variance_to_target_mtd', 'forecast_revenue_8w', 'pipeline_30_60_90', 'win_rate', 'service_risk_index', 'nrr'],
    tourSteps: [
      { title: 'Command Center', description: 'Overview of all key metrics with variance and trends', route: '/' },
      { title: 'Revenue Variance', description: 'Deep dive into variance drivers and reconciliation', route: '/kpi/revenue_mtd' },
      { title: 'Sales Dashboard', description: 'Pipeline health, stage conversion, and hygiene', route: '/sales' },
      { title: 'Operations Dashboard', description: 'Service quality and capacity overview', route: '/ops' },
      { title: 'Forecast & Scenarios', description: 'Review forecast with confidence bands and backtest', route: '/forecast' },
      { title: 'Governance', description: 'KPI dictionary, data quality, and lineage', route: '/governance' },
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
  market_director: {
    label: 'Market Director',
    description: 'Access to all regions and branches within assigned market',
    canView: ['market_data', 'all_regions', 'all_branches'],
    canEdit: ['market_targets'],
    canExport: ['market_data'],
  },
  region_director: {
    label: 'Region Director',
    description: 'Access to all branches within assigned region',
    canView: ['region_data', 'all_region_branches'],
    canEdit: ['region_targets'],
    canExport: ['region_data'],
  },
  manager: {
    label: 'Branch Manager',
    description: 'Access to assigned branch data',
    canView: ['branch_data', 'team_members'],
    canEdit: ['team_activities'],
    canExport: ['branch_data'],
  },
  sales_manager: {
    label: 'Sales Manager',
    description: 'Access to assigned Account Executives\' data',
    canView: ['assigned_reps', 'rep_opportunities', 'rep_accounts'],
    canEdit: ['rep_targets'],
    canExport: ['sales_data'],
  },
  ops_manager: {
    label: 'Operations Manager',
    description: 'Access to assigned technicians (toggle for all branch technicians)',
    canView: ['assigned_technicians', 'service_data'],
    canEdit: ['service_schedules', 'routes'],
    canExport: ['operations_data'],
  },
  rep: {
    label: 'Account Executive',
    description: 'Access to own accounts and opportunities',
    canView: ['own_accounts', 'own_opportunities'],
    canEdit: ['own_activities'],
    canExport: ['own_data'],
  },
  technician: {
    label: 'Technician',
    description: 'Access to own routes and service assignments',
    canView: ['own_routes', 'assigned_services'],
    canEdit: ['service_notes'],
    canExport: ['own_services'],
  },
}
