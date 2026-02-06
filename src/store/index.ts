import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  AppSettings, GlobalFilters, DemoMode, Role, Scenario, User, OrganizationFilters
} from '@/types'
import type { DemoConfigSelections } from '@/components/presentation/DemoConfigurator'
import { PRESENTATION_FLOW } from '@/lib/presentation-flow'
import { getUsers, regenerateData, setDataQualityIssues } from '@/lib/data'

type Theme = 'light' | 'dark' | 'system'

// Test Mode Scenarios
export type TestScenario = 'healthy' | 'critical' | 'warning' | 'empty' | 'max_values' | 'growth_spike'

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

  // Admin Mode
  isAdmin: boolean
  setIsAdmin: (isAdmin: boolean) => void
  adminModeEnabled: boolean  // Settings toggle for admin to see admin UI
  setAdminModeEnabled: (enabled: boolean) => void
  isPreviewingRole: boolean
  previewedRole: Role | null
  previewedEmployee: User | null  // The employee whose data we're viewing in preview mode
  setPreviewingRole: (role: Role | null) => void
  setPreviewingRoleWithOrg: (role: Role, orgData: { market?: string; region?: string; branch?: string }) => void
  setPreviewedEmployee: (employee: User | null) => void
  exitRolePreview: () => void

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

  // Presentation Mode (master-toggled, disabled by default, zero impact when off)
  presentationModeEnabled: boolean
  setPresentationModeEnabled: (enabled: boolean) => void
  presentationGuidedActive: boolean
  setPresentationGuidedActive: (active: boolean) => void
  presentationGuidedStep: number
  setPresentationGuidedStep: (step: number) => void
  nextPresentationGuidedStep: () => void
  prevPresentationGuidedStep: () => void
  presentationManualTool: 'none' | 'spotlight' | 'draw'
  setPresentationManualTool: (tool: 'none' | 'spotlight' | 'draw') => void
  presentationSpotlightIntensity: 'subtle' | 'medium' | 'prominent'
  setPresentationSpotlightIntensity: (intensity: 'subtle' | 'medium' | 'prominent') => void
  presentationTalkingPointIndex: number
  setPresentationTalkingPointIndex: (index: number) => void
  demoConfigSelections: DemoConfigSelections | null
  setDemoConfigSelections: (selections: DemoConfigSelections | null) => void

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

  // Test Mode
  testModeEnabled: boolean
  testScenario: TestScenario
  setTestModeEnabled: (enabled: boolean) => void
  setTestScenario: (scenario: TestScenario) => void

  // Current user context
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  getCurrentUserScope: () => { markets: string[]; branches: string[]; scope: string }

  // Organization Hierarchy Filters (cascade: Market -> Region -> Branch)
  organizationFilters: OrganizationFilters
  setOrganizationMarket: (marketCode: string | null) => void
  setOrganizationRegion: (regionCode: string | null) => void
  setOrganizationBranch: (branchCode: string | null) => void
  clearOrganizationFilters: () => void
}

const defaultFilters: GlobalFilters = {
  dateRange: {
    start: new Date(new Date().setDate(new Date().getDate() - 90)), // Extended from 30 to 90 days for better data coverage
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

const defaultOrganizationFilters: OrganizationFilters = {
  selectedMarket: null,
  selectedRegion: null,
  selectedBranch: null,
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

/**
 * Create a preview user for role simulation.
 *
 * Preserves the user's NAME (identity) but ADJUSTS org scope based on the role being previewed.
 * This allows admins to see exactly what a Branch Manager, Rep, etc. would see.
 *
 * Org scoping logic:
 * - Uses currently selected org filters (market/region/branch) as the base
 * - Applies role-appropriate restrictions (e.g., Branch Manager sees only their branch)
 * - Falls back to sample data only if no current user or org selection exists
 *
 * @param role - The role to preview
 * @param currentUser - The actual logged-in user (preserves their name)
 * @param orgFilters - Currently selected organization filters (market/region/branch)
 */
function createPreviewUserForRole(
  role: Role,
  currentUser?: User | null,
  orgFilters?: OrganizationFilters | null
): User {
  // Determine base identity (always use current user's real identity)
  const userName = currentUser?.name || `Preview ${ROLE_PERMISSIONS[role]?.label || role}`
  const userEmail = currentUser?.email || `preview-${role}@rentokil-bi.demo`
  const userId = currentUser?.id || `preview-${role}`

  // Determine org scope: org filter dropdown > currentUser's home org > hardcoded fallback
  // Priority: 1. Explicit dropdown selection 2. User's actual org from BigQuery 3. Fallback
  const selectedMarket = orgFilters?.selectedMarket
    || currentUser?.assignedMarkets?.[0]
    || 'M536'
  const selectedRegion = orgFilters?.selectedRegion
    || currentUser?.assignedRegions?.[0]
    || 'R052'
  const selectedBranch = orgFilters?.selectedBranch
    || currentUser?.assignedBranches?.[0]
    || '098'

  // Build preview user with role-appropriate org scope
  const previewUser: User = {
    id: userId,
    name: userName,
    email: userEmail,
    role: role,
    title: ROLE_PERMISSIONS[role]?.label || role,
    assignedMarkets: [],
    assignedRegions: [],
    assignedBranches: [],
    assignedTeams: currentUser?.assignedTeams || [],
    assignedReps: currentUser?.assignedReps || [],
    assignedTechnicians: currentUser?.assignedTechnicians || [],
  }

  // Apply org scope based on role level
  // Lower-level roles have narrower scope (branch < region < market < exec)
  switch (role) {
    case 'exec':
      // Exec sees everything - no org restrictions
      // Keep current user's markets if they have any, otherwise unrestricted
      previewUser.assignedMarkets = currentUser?.assignedMarkets || []
      break

    case 'market_vp':
    case 'market_sales_director':
      // Market-level: see all data in their market(s)
      previewUser.assignedMarkets = [selectedMarket]
      break

    case 'region_director':
    case 'region_sales_manager':
      // Region-level: see all data in their region
      previewUser.assignedMarkets = [selectedMarket]
      previewUser.assignedRegions = [selectedRegion]
      break

    case 'manager':
    case 'sales_manager':
    case 'ops_manager':
      // Branch management: see all data in their branch
      previewUser.assignedMarkets = [selectedMarket]
      previewUser.assignedRegions = [selectedRegion]
      previewUser.assignedBranches = [selectedBranch]
      break

    case 'rep':
      // Rep: sees only THEIR OWN sales data (filtered by salesPerson name)
      previewUser.assignedMarkets = [selectedMarket]
      previewUser.assignedRegions = [selectedRegion]
      previewUser.assignedBranches = [selectedBranch]
      // Name is used for salesPerson filter - preserve actual user's name
      break

    case 'technician':
      // Technician: sees only THEIR OWN routes/tickets
      previewUser.assignedMarkets = [selectedMarket]
      previewUser.assignedRegions = [selectedRegion]
      previewUser.assignedBranches = [selectedBranch]
      // ID is used for technician filter
      break
  }

  return previewUser
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
        const state = get()
        // If a real user is logged in (set by AuthProvider), preserve their identity
        // Only use mock users as fallback when no real user exists
        const hasRealUser = state.currentUser && state.currentUser.email && !state.currentUser.email.includes('@rentokil-bi.demo')
        if (hasRealUser) {
          set((s) => ({
            settings: {
              ...s.settings,
              role,
              userId: s.currentUser?.id || s.settings.userId,
              selectedMarkets: role === 'exec' ? [] : s.currentUser?.assignedMarkets || [],
            },
            // Do NOT overwrite currentUser - preserve real authenticated user
          }))
        } else {
          const users = getUsers()
          const userForRole = users.find(u => u.role === role) || users[0]
          set((s) => ({
            settings: {
              ...s.settings,
              role,
              userId: userForRole.id,
              selectedMarkets: role === 'exec' ? [] : userForRole.assignedMarkets,
            },
            currentUser: userForRole,
          }))
        }
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

      // Admin Mode
      isAdmin: false,
      setIsAdmin: (isAdmin: boolean) => set({ isAdmin }),
      adminModeEnabled: true,  // Defaults to true - admins see admin UI by default
      setAdminModeEnabled: (enabled: boolean) => set({ adminModeEnabled: enabled }),
      isPreviewingRole: false,
      previewedRole: null,
      previewedEmployee: null,
      setPreviewingRole: (role: Role | null) => {
        if (role) {
          // Create preview user with role-appropriate org scoping
          // Uses current user's identity + currently selected org filters
          const currentUser = get().currentUser
          const orgFilters = get().organizationFilters
          const previewUser = createPreviewUserForRole(role, currentUser, orgFilters)

          set({
            isPreviewingRole: true,
            previewedRole: role,
            previewedEmployee: previewUser,
          })
        } else {
          set({ isPreviewingRole: false, previewedRole: null, previewedEmployee: null })
        }
      },
      setPreviewingRoleWithOrg: (role: Role, orgData: { market?: string; region?: string; branch?: string }) => {
        // Create preview with explicit org overrides (takes precedence over current selection)
        const currentUser = get().currentUser
        const orgFilters: OrganizationFilters = {
          selectedMarket: orgData.market || null,
          selectedRegion: orgData.region || null,
          selectedBranch: orgData.branch || null,
        }
        const previewUser = createPreviewUserForRole(role, currentUser, orgFilters)

        set({
          isPreviewingRole: true,
          previewedRole: role,
          previewedEmployee: previewUser,
        })
      },
      setPreviewedEmployee: (employee: User | null) => {
        if (employee) {
          // When setting a previewed employee, also set their role as the previewed role
          set({
            previewedEmployee: employee,
            previewedRole: employee.role,
            isPreviewingRole: true,
          })
        } else {
          set({ previewedEmployee: null })
        }
      },
      exitRolePreview: () => set({ isPreviewingRole: false, previewedRole: null, previewedEmployee: null }),

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

      // Presentation Mode (zero impact when disabled)
      presentationModeEnabled: false,
      setPresentationModeEnabled: (enabled: boolean) => set({
        presentationModeEnabled: enabled,
        // Reset all sub-states when toggling off
        ...(enabled ? {} : {
          presentationGuidedActive: false,
          presentationGuidedStep: 0,
          presentationManualTool: 'none' as const,
        }),
      }),
      presentationGuidedActive: false,
      setPresentationGuidedActive: (active: boolean) => set({
        presentationGuidedActive: active,
        presentationGuidedStep: active ? 0 : get().presentationGuidedStep,
        presentationTalkingPointIndex: 0,
      }),
      presentationGuidedStep: 0,
      setPresentationGuidedStep: (step: number) => set({ presentationGuidedStep: step, presentationTalkingPointIndex: 0 }),
      nextPresentationGuidedStep: () => {
        const state = get()
        const maxStep = PRESENTATION_FLOW.length - 1
        if (state.presentationGuidedStep < maxStep) {
          set({ presentationGuidedStep: state.presentationGuidedStep + 1, presentationTalkingPointIndex: 0 })
        }
      },
      prevPresentationGuidedStep: () => {
        const state = get()
        if (state.presentationGuidedStep > 0) {
          set({ presentationGuidedStep: state.presentationGuidedStep - 1, presentationTalkingPointIndex: 0 })
        }
      },
      presentationManualTool: 'none' as 'none' | 'spotlight' | 'draw',
      setPresentationManualTool: (tool: 'none' | 'spotlight' | 'draw') => set({ presentationManualTool: tool }),
      presentationSpotlightIntensity: 'medium' as 'subtle' | 'medium' | 'prominent',
      setPresentationSpotlightIntensity: (intensity: 'subtle' | 'medium' | 'prominent') => set({ presentationSpotlightIntensity: intensity }),
      presentationTalkingPointIndex: 0,
      setPresentationTalkingPointIndex: (index: number) => set({ presentationTalkingPointIndex: index }),
      demoConfigSelections: null,
      setDemoConfigSelections: (selections: DemoConfigSelections | null) => set({ demoConfigSelections: selections }),

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

      // Test Mode
      testModeEnabled: false,
      testScenario: 'healthy' as TestScenario,
      setTestModeEnabled: (enabled: boolean) => set({ testModeEnabled: enabled }),
      setTestScenario: (scenario: TestScenario) => set({ testScenario: scenario }),

      // Current user
      currentUser: null,
      setCurrentUser: (user: User | null) => set({ currentUser: user }),

      getCurrentUserScope: () => {
        const state = get()
        const { role: settingsRole } = state.settings

        // Use previewed role/employee if in preview mode, otherwise use settings
        const isPreview = state.isPreviewingRole && state.previewedEmployee
        const effectiveRole = isPreview ? state.previewedRole || settingsRole : settingsRole
        const effectiveUser = isPreview ? state.previewedEmployee : state.currentUser

        // Map market/region codes to friendly names (from BigQuery org hierarchy)
        const MARKET_CODE_NAMES: Record<string, string> = {
          'M536': 'Midwest',
          'M530': 'Atlantic',
          'M532': 'Florida',
          'M511': 'Canada Pest',
          'M512': 'Canada Ambius',
          'M538': 'Home Office',
          'M534': 'Texas',
          'M535': 'Western',
        }
        const REGION_CODE_NAMES: Record<string, string> = {
          'R052': 'Region 052',
          'R054': 'Region 054',
          'R056': 'Region 056',
          'R058': 'Region 058',
          'R060': 'Region 060',
          'R062': 'Region 062',
          'R064': 'Region 064',
        }

        if (effectiveRole === 'exec') {
          // Exec has no restrictions
          // Use selected org filter if any, otherwise show "All Markets"
          const selectedMarket = state.organizationFilters.selectedMarket
          const marketName = selectedMarket ? (MARKET_CODE_NAMES[selectedMarket] || selectedMarket) : 'All Markets'
          return {
            markets: selectedMarket ? [selectedMarket] : [],
            branches: [],
            scope: marketName,
          }
        }

        // For other roles, use the preview user's assigned markets (which are real BigQuery codes)
        if (!effectiveUser) {
          // No user data - return role-based label
          const roleLabels: Record<string, string> = {
            market_vp: 'Market',
            market_sales_director: 'Sales: Market',
            region_director: 'Region',
            region_sales_manager: 'Sales: Region',
            manager: 'Branch',
            sales_manager: 'Sales Team',
            ops_manager: 'Operations',
            rep: 'My Accounts',
            technician: 'My Routes',
          }
          return { markets: [], branches: [], scope: roleLabels[effectiveRole] || 'My View' }
        }

        // Get market display names from user's assigned markets (real codes)
        const userMarkets = effectiveUser.assignedMarkets || []
        const displayMarkets = userMarkets.map(code => MARKET_CODE_NAMES[code] || code)

        // Determine scope label based on effective role
        let scopeLabel: string
        switch (effectiveRole) {
          case 'rep':
            scopeLabel = 'My Accounts'
            break
          case 'technician':
            scopeLabel = 'My Routes'
            break
          case 'manager':
          case 'sales_manager':
          case 'ops_manager': {
            // Show market > region > branch path
            const branchCodes = effectiveUser.assignedBranches || []
            const regionCodes = effectiveUser.assignedRegions || []
            const parts: string[] = []
            if (displayMarkets.length > 0) parts.push(displayMarkets.join(', '))
            if (regionCodes.length > 0) parts.push(regionCodes.map(c => REGION_CODE_NAMES[c] || c).join(', '))
            if (branchCodes.length > 0) parts.push(`Branch ${branchCodes.join(', ')}`)
            scopeLabel = parts.join(' > ') || 'Branch'
            break
          }
          case 'region_director':
          case 'region_sales_manager': {
            // Show market > region path
            const regCodes = effectiveUser.assignedRegions || []
            const displayRegions = regCodes.map(c => REGION_CODE_NAMES[c] || c)
            const parts: string[] = []
            if (displayMarkets.length > 0) parts.push(displayMarkets.join(', '))
            if (displayRegions.length > 0) parts.push(displayRegions.join(', '))
            scopeLabel = parts.join(' > ') || 'Region'
            break
          }
          case 'market_sales_director':
            scopeLabel = `Sales: ${displayMarkets.join(', ') || 'Market'}`
            break
          case 'market_vp':
            scopeLabel = displayMarkets.join(', ') || 'Market'
            break
          default:
            scopeLabel = displayMarkets.join(', ') || 'My View'
        }

        return {
          markets: effectiveUser.assignedMarkets,
          branches: effectiveUser.assignedBranches,
          scope: scopeLabel,
        }
      },

      // Organization Hierarchy Filters
      organizationFilters: defaultOrganizationFilters,

      setOrganizationMarket: (marketCode: string | null) => {
        set({
          organizationFilters: {
            selectedMarket: marketCode,
            selectedRegion: null,    // Clear downstream selections
            selectedBranch: null,
          }
        })
      },

      setOrganizationRegion: (regionCode: string | null) => {
        set((state) => ({
          organizationFilters: {
            ...state.organizationFilters,
            selectedRegion: regionCode,
            selectedBranch: null,    // Clear downstream selection
          }
        }))
      },

      setOrganizationBranch: (branchCode: string | null) => {
        set((state) => ({
          organizationFilters: {
            ...state.organizationFilters,
            selectedBranch: branchCode,
          }
        }))
      },

      clearOrganizationFilters: () => {
        set({
          organizationFilters: defaultOrganizationFilters,
        })
      },
    }),
    {
      name: 'rentokil-bi-store',
      partialize: (state) => ({
        settings: state.settings,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        showAllBranchTechnicians: state.showAllBranchTechnicians,
        adminModeEnabled: state.adminModeEnabled,
        testModeEnabled: state.testModeEnabled,
        testScenario: state.testScenario,
        organizationFilters: state.organizationFilters,
        presentationModeEnabled: state.presentationModeEnabled,
      }),
      // Migrate persisted state to fix invalid roles
      onRehydrateStorage: () => (state) => {
        if (state) {
          const validRoles: Role[] = ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician']
          // Migrate old market_director to market_vp
          if ((state.settings.role as string) === 'market_director') {
            state.settings.role = 'market_vp'
          }
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
  market_vp: {
    label: 'Market VP',
    description: 'Access to all regions and branches within assigned market',
    canView: ['market_data', 'all_regions', 'all_branches'],
    canEdit: ['market_targets'],
    canExport: ['market_data'],
  },
  market_sales_director: {
    label: 'Market Sales Director',
    description: 'Sales leadership for entire market, oversight of all region directors and sales teams',
    canView: ['market_data', 'all_regions', 'all_branches', 'sales_pipeline', 'rep_performance'],
    canEdit: ['sales_targets', 'sales_forecasts'],
    canExport: ['sales_data', 'market_data'],
  },
  region_director: {
    label: 'Region Director',
    description: 'Access to all branches within assigned region',
    canView: ['region_data', 'all_region_branches'],
    canEdit: ['region_targets'],
    canExport: ['region_data'],
  },
  region_sales_manager: {
    label: 'Region Sales Manager',
    description: 'Sales leadership for region, oversight of all branch sales teams',
    canView: ['region_data', 'all_region_branches', 'sales_pipeline', 'rep_performance'],
    canEdit: ['sales_targets', 'sales_forecasts'],
    canExport: ['sales_data', 'region_data'],
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
