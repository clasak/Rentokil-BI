/**
 * Tour Step Definitions for Guided Onboarding Experience
 *
 * This module provides comprehensive tour step definitions for guiding
 * new users through the Rentokil BI application based on their role.
 */

import type { Role } from '@/types'

/**
 * Placement options for tour step tooltips
 */
export type TourStepPlacement = 'top' | 'bottom' | 'left' | 'right'

/**
 * Action types for tour steps
 * - click: User must click the target to proceed
 * - highlight: Element is highlighted but no action required
 * - none: No target element (e.g., welcome/finish screens)
 */
export type TourStepAction = 'click' | 'highlight' | 'none'

/**
 * Trigger types for advancing to the next step
 * - button: User clicks the "Next" button in the tooltip
 * - action: User performs the specified action on the target
 * - auto: Automatically advances after a delay
 */
export type TourStepNextTrigger = 'button' | 'action' | 'auto'

/**
 * Interface defining a single tour step
 */
export interface TourStep {
  /** Unique identifier for the step */
  id: string
  /** CSS selector for the target element (empty string for no target) */
  target: string
  /** Title displayed in the tooltip header */
  title: string
  /** Content/description displayed in the tooltip body */
  content: string
  /** Tooltip placement relative to the target element */
  placement: TourStepPlacement
  /** Action type for this step */
  action: TourStepAction
  /** How the user advances to the next step */
  nextStepTrigger: TourStepNextTrigger
  /** Optional: Roles that should see this step (undefined = all roles) */
  visibleToRoles?: Role[]
  /** Optional: Roles that should NOT see this step */
  hiddenFromRoles?: Role[]
  /** Optional: Delay in ms for auto-advance steps */
  autoAdvanceDelay?: number
  /** Optional: Route this step should appear on */
  route?: string
}

/**
 * Comprehensive array of tour steps covering all key application areas
 */
export const TOUR_STEPS: TourStep[] = [
  // Welcome Step - No target
  {
    id: 'welcome',
    target: '',
    title: 'Welcome to Rentokil BI',
    content:
      'This quick tour will help you get familiar with the key features of your business intelligence dashboard. You can exit at any time by pressing Escape or clicking outside the tooltip.',
    placement: 'bottom',
    action: 'none',
    nextStepTrigger: 'button',
  },

  // Navigation Sidebar
  {
    id: 'sidebar-navigation',
    target: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    content:
      'Use the sidebar to navigate between different areas of the application. Your available sections depend on your role and permissions.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
  },

  // Command Center Overview
  {
    id: 'command-center',
    target: '[data-tour="command-center"]',
    title: 'Command Center',
    content:
      'The Command Center is your central hub for monitoring key performance indicators. It displays the top 10 KPIs most relevant to your role and business unit.',
    placement: 'bottom',
    action: 'highlight',
    nextStepTrigger: 'button',
    route: '/',
    hiddenFromRoles: ['rep', 'technician'],
  },

  // KPI Cards
  {
    id: 'kpi-cards',
    target: '[data-tour="kpi-card"]',
    title: 'KPI Cards',
    content:
      'Each KPI card shows the current value, target, and trend. Click any card to drill down into detailed analysis, drivers, and recommended actions.',
    placement: 'bottom',
    action: 'highlight',
    nextStepTrigger: 'button',
    hiddenFromRoles: ['technician'],
  },

  // KPI Status Indicators
  {
    id: 'kpi-status',
    target: '[data-tour="kpi-status"]',
    title: 'Status Indicators',
    content:
      'Green indicates the KPI is meeting or exceeding target. Yellow means approaching threshold. Red signals the KPI needs attention and may require action.',
    placement: 'left',
    action: 'highlight',
    nextStepTrigger: 'button',
    hiddenFromRoles: ['technician'],
  },

  // Filter Controls
  {
    id: 'filter-controls',
    target: '[data-tour="filters"]',
    title: 'Filter Controls',
    content:
      'Use filters to narrow down data by time period, business unit, region, or other dimensions. Filters apply across all dashboards and visualizations.',
    placement: 'bottom',
    action: 'highlight',
    nextStepTrigger: 'button',
    hiddenFromRoles: ['rep', 'technician'],
  },

  // Business Unit Selector
  {
    id: 'business-unit-selector',
    target: '[data-tour="business-unit"]',
    title: 'Business Unit Selector',
    content:
      'Select your market, region, or branch to focus on specific business units. Data will automatically scope to your selection.',
    placement: 'bottom',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager'],
  },

  // Date Range Picker
  {
    id: 'date-range',
    target: '[data-tour="date-range"]',
    title: 'Date Range',
    content:
      'Adjust the date range to view historical trends or focus on specific time periods. Common presets include MTD, QTD, YTD, and custom ranges.',
    placement: 'bottom',
    action: 'highlight',
    nextStepTrigger: 'button',
    hiddenFromRoles: ['technician'],
  },

  // Data Refresh
  {
    id: 'data-refresh',
    target: '[data-tour="refresh"]',
    title: 'Data Refresh',
    content:
      'Click the refresh button to fetch the latest data. The timestamp shows when data was last updated. In demo mode, this regenerates synthetic data.',
    placement: 'left',
    action: 'highlight',
    nextStepTrigger: 'button',
  },

  // Theme Toggle
  {
    id: 'theme-toggle',
    target: '[data-tour="theme-toggle"]',
    title: 'Theme Settings',
    content:
      'Toggle between light and dark mode based on your preference. The system option will follow your device settings.',
    placement: 'bottom',
    action: 'highlight',
    nextStepTrigger: 'button',
  },

  // Sales Dashboard (Leadership)
  {
    id: 'sales-dashboard',
    target: '[data-tour="nav-sales"]',
    title: 'Sales Dashboard',
    content:
      'Access the Sales dashboard for pipeline analysis, opportunity tracking, win rates, and revenue metrics. Drill into specific opportunities for detailed views.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    hiddenFromRoles: ['technician'],
  },

  // Operations Dashboard
  {
    id: 'ops-dashboard',
    target: '[data-tour="nav-ops"]',
    title: 'Operations Dashboard',
    content:
      'Monitor service delivery metrics, technician performance, completion rates, and customer satisfaction scores.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
  },

  // Finance Dashboard
  {
    id: 'finance-dashboard',
    target: '[data-tour="nav-finance"]',
    title: 'Finance Dashboard',
    content:
      'Review accounts receivable, DSO (Days Sales Outstanding), invoice aging, and collection metrics.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'ops_manager'],
  },

  // Forecast
  {
    id: 'forecast',
    target: '[data-tour="nav-forecast"]',
    title: 'Forecast',
    content:
      'View 8-week revenue forecasts with base, upside, and downside scenarios. Includes historical backtest for accuracy validation.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    hiddenFromRoles: ['rep', 'technician'],
  },

  // Lead Service Engine
  {
    id: 'lead-engine',
    target: '[data-tour="nav-lead-engine"]',
    title: 'Lead Service Engine',
    content:
      'Track leads through the full lifecycle from intake to close. View funnel metrics, handoff status, and at-risk accounts.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    hiddenFromRoles: ['rep', 'technician'],
  },

  // Governance Section (Leadership only)
  {
    id: 'governance',
    target: '[data-tour="nav-governance"]',
    title: 'Governance',
    content:
      'Access the KPI Dictionary, data quality metrics, and role-based permissions. Ensure data accuracy and maintain metric definitions.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    hiddenFromRoles: ['rep', 'technician'],
  },

  // Help Menu
  {
    id: 'help-menu',
    target: '[data-tour="help"]',
    title: 'Help & Resources',
    content:
      'Access documentation, tutorial replays, keyboard shortcuts, and support contact information from the help menu.',
    placement: 'left',
    action: 'highlight',
    nextStepTrigger: 'button',
  },

  // Settings
  {
    id: 'settings',
    target: '[data-tour="settings"]',
    title: 'Settings',
    content:
      'Customize your experience including theme preferences, default forecast scenario, and notification settings.',
    placement: 'left',
    action: 'highlight',
    nextStepTrigger: 'button',
  },

  // AE Dashboard (Rep only)
  {
    id: 'ae-dashboard',
    target: '[data-tour="nav-ae-dashboard"]',
    title: 'My Dashboard',
    content:
      'Your personal dashboard shows your pipeline, quota attainment, recent proposals, and upcoming activities.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['rep'],
  },

  // Sales Tracker (Rep only)
  {
    id: 'sales-tracker',
    target: '[data-tour="nav-sales-tracker"]',
    title: 'Sales Tracker',
    content:
      'Track your proposals and sales in one place. This mirrors your Google Sheets workflow with added automation and insights.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['rep'],
  },

  // New Starts (Rep only)
  {
    id: 'new-starts',
    target: '[data-tour="nav-new-starts"]',
    title: 'New Starts',
    content:
      'Manage the handoff of new sales to operations. Upload start packets and track the onboarding progress of new accounts.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['rep', 'ops_manager'],
  },

  // Tech Schedule (Technician only)
  {
    id: 'tech-schedule',
    target: '[data-tour="nav-tech-schedule"]',
    title: 'My Schedule',
    content:
      'View your daily service schedule with appointment times, customer details, and service requirements.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['technician'],
  },

  // Tech Route (Technician only)
  {
    id: 'tech-route',
    target: '[data-tour="nav-tech-route"]',
    title: 'Route Map',
    content:
      'Visualize your daily route on an interactive map. Optimize your travel path between service stops.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['technician'],
  },

  // Service Tickets (Technician only)
  {
    id: 'service-tickets',
    target: '[data-tour="nav-tech-tickets"]',
    title: 'Service Tickets',
    content:
      'Manage your service tickets, document work completed, and capture customer signatures.',
    placement: 'right',
    action: 'highlight',
    nextStepTrigger: 'button',
    visibleToRoles: ['technician'],
  },

  // Finish Step - No target
  {
    id: 'finish',
    target: '',
    title: 'You are Ready!',
    content:
      'You have completed the tour. You can replay this tour anytime from the Help menu. If you have questions, reach out to your manager or the support team.',
    placement: 'bottom',
    action: 'none',
    nextStepTrigger: 'button',
  },
]

/**
 * Returns filtered tour steps based on the user's role
 *
 * @param role - The user's role (e.g., 'exec', 'rep', 'technician')
 * @returns Array of TourStep objects appropriate for the given role
 *
 * @example
 * ```typescript
 * const steps = getTourStepsForRole('exec')
 * // Returns all steps except role-specific ones for rep/technician
 *
 * const repSteps = getTourStepsForRole('rep')
 * // Returns general steps + rep-specific steps, excludes leadership-only steps
 * ```
 */
export function getTourStepsForRole(role: string): TourStep[] {
  return TOUR_STEPS.filter((step) => {
    // If step has visibleToRoles, check if current role is included
    if (step.visibleToRoles && step.visibleToRoles.length > 0) {
      return step.visibleToRoles.includes(role as Role)
    }

    // If step has hiddenFromRoles, check if current role is excluded
    if (step.hiddenFromRoles && step.hiddenFromRoles.length > 0) {
      return !step.hiddenFromRoles.includes(role as Role)
    }

    // If neither is specified, show to all roles
    return true
  })
}

/**
 * Get a specific tour step by ID
 *
 * @param stepId - The unique identifier of the step
 * @returns The TourStep object or undefined if not found
 */
export function getTourStepById(stepId: string): TourStep | undefined {
  return TOUR_STEPS.find((step) => step.id === stepId)
}

/**
 * Get tour steps for a specific route
 *
 * @param route - The route path (e.g., '/', '/sales')
 * @param role - Optional role to further filter steps
 * @returns Array of TourStep objects for the given route
 */
export function getTourStepsForRoute(route: string, role?: string): TourStep[] {
  let steps = TOUR_STEPS.filter((step) => !step.route || step.route === route)

  if (role) {
    steps = steps.filter((step) => {
      if (step.visibleToRoles && step.visibleToRoles.length > 0) {
        return step.visibleToRoles.includes(role as Role)
      }
      if (step.hiddenFromRoles && step.hiddenFromRoles.length > 0) {
        return !step.hiddenFromRoles.includes(role as Role)
      }
      return true
    })
  }

  return steps
}

/**
 * Get the total number of steps for a given role
 *
 * @param role - The user's role
 * @returns Number of tour steps available for the role
 */
export function getTourStepCount(role: string): number {
  return getTourStepsForRole(role).length
}

/**
 * Check if a step should be visible for a given role
 *
 * @param step - The tour step to check
 * @param role - The user's role
 * @returns Boolean indicating if the step is visible
 */
export function isStepVisibleForRole(step: TourStep, role: string): boolean {
  if (step.visibleToRoles && step.visibleToRoles.length > 0) {
    return step.visibleToRoles.includes(role as Role)
  }
  if (step.hiddenFromRoles && step.hiddenFromRoles.length > 0) {
    return !step.hiddenFromRoles.includes(role as Role)
  }
  return true
}

/**
 * Default export containing all tour-related exports
 */
const tourSteps = {
  TOUR_STEPS,
  getTourStepsForRole,
  getTourStepById,
  getTourStepsForRoute,
  getTourStepCount,
  isStepVisibleForRole,
}

export default tourSteps
