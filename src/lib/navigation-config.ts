/**
 * Shared Navigation Configuration
 * Single source of truth for all sidebar navigation across the application
 * Eliminates duplication between Sidebar.tsx and AdminSidebar.tsx
 */

import {
  LayoutDashboard, TrendingUp, Settings, FileText,
  Users, DollarSign, Wrench, ShieldCheck, Calendar,
  CalendarDays, Target, ClipboardList, Truck, Upload, Book,
  Shield, GitBranch, ClipboardCheck, Workflow, Database,
  Bug, Layers, BarChart3, BookOpen, Briefcase, Building,
  UserX, Eye, Activity, UserCog, Gauge, Star
} from 'lucide-react'
import { Role } from '@/types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive'
}

export interface NavSection {
  name: string
  icon: React.ComponentType<{ className?: string }>
  allowedRoles?: Role[]
  children: Array<{
    name: string
    href: string
    icon?: React.ComponentType<{ className?: string }>
  }>
}

// ============================================================================
// ROLE PERMISSIONS - Single source of truth for feature access
// ============================================================================

export type PermissionKey =
  | 'commandCenter' | 'sales' | 'operations' | 'finance' | 'people' | 'forecast' | 'leadServiceEngine'
  | 'dailyRollup' | 'weeklyWig' | 'newStarts' | 'dailyCadence' | 'wigScorecard'
  | 'rtxReports' | 'governance' | 'adminConsole'
  | 'myDashboard' | 'importQuote' | 'salesTracker' | 'mySchedule' | 'serviceTickets' | 'route'

export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  // Executive: Core strategic dashboards only (7 items)
  exec: ['commandCenter', 'sales', 'operations', 'finance', 'people', 'forecast', 'leadServiceEngine'],

  // Market VP: Exec + market daily rollup + RTX Reports
  market_vp: ['commandCenter', 'dailyRollup', 'sales', 'operations', 'finance', 'people', 'forecast', 'leadServiceEngine', 'rtxReports'],

  // Market Sales Director: Same as Market VP
  market_sales_director: ['commandCenter', 'dailyRollup', 'sales', 'operations', 'finance', 'people', 'forecast', 'leadServiceEngine', 'rtxReports'],

  // Region Director: Regional view with weekly WIG + RTX Reports
  region_director: ['commandCenter', 'dailyRollup', 'weeklyWig', 'sales', 'operations', 'finance', 'people', 'forecast', 'leadServiceEngine', 'rtxReports'],

  // Region Sales Manager: Same as Region Director
  region_sales_manager: ['commandCenter', 'dailyRollup', 'weeklyWig', 'sales', 'operations', 'finance', 'people', 'forecast', 'leadServiceEngine', 'rtxReports'],

  // Branch Manager: Operational focus with daily cadence + RTX Reports
  manager: ['commandCenter', 'dailyCadence', 'wigScorecard', 'sales', 'operations', 'forecast', 'leadServiceEngine', 'rtxReports'],

  // Sales Manager: Sales-focused view + RTX Reports
  sales_manager: ['commandCenter', 'sales', 'operations', 'finance', 'people', 'forecast', 'leadServiceEngine', 'rtxReports'],

  // Ops Manager: Operations-focused view + RTX Reports
  ops_manager: ['commandCenter', 'operations', 'newStarts', 'sales', 'finance', 'forecast', 'leadServiceEngine', 'rtxReports'],

  // Account Executive: Personal dashboard
  rep: ['myDashboard', 'importQuote', 'salesTracker', 'newStarts'],

  // Technician: Field operations
  technician: ['mySchedule', 'serviceTickets', 'route'],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Get display label for role
 */
export function getRoleLabel(role: Role): string {
  switch (role) {
    case 'exec':
      return 'Executive'
    case 'market_vp':
      return 'Market VP'
    case 'market_sales_director':
      return 'Market Sales Director'
    case 'region_director':
      return 'Region Director'
    case 'region_sales_manager':
      return 'Region Sales Manager'
    case 'manager':
      return 'Branch Manager'
    case 'sales_manager':
      return 'Sales Manager'
    case 'ops_manager':
      return 'Operations Manager'
    case 'rep':
      return 'Account Executive'
    case 'technician':
      return 'Technician'
    default:
      return 'User'
  }
}

// ============================================================================
// MAIN NAVIGATION ARRAYS
// ============================================================================

// Executive navigation (no daily cadence - they don't need branch-level detail)
// Removed duplicate top-level links: Sales, Operations, Finance, Portfolio, Lead Service Engine
// (these are accessible via RTX sections)
export const EXECUTIVE_NAV: NavItem[] = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard, description: 'Executive KPI overview and priority actions' },
  { name: 'People', href: '/people', icon: Users, description: 'Workforce capacity and utilization metrics' },
  { name: 'Customer Satisfaction', href: '/customer-satisfaction', icon: Star, description: 'NPS scores and customer feedback trends' },
  { name: 'Forecast', href: '/forecast', icon: Target, description: '8-week revenue projections with scenarios' },
]

// Market VP / Market Sales Director navigation (includes daily performance)
// Removed duplicate top-level links: Sales, Operations, Finance, Portfolio, Lead Service Engine
export const MARKET_VP_NAV: NavItem[] = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard, description: 'Executive KPI overview and priority actions' },
  { name: 'Daily Performance', href: '/daily-performance', icon: CalendarDays, description: 'Market-level daily scorecard' },
  { name: 'People', href: '/people', icon: Users, description: 'Workforce capacity and utilization metrics' },
  { name: 'Customer Satisfaction', href: '/customer-satisfaction', icon: Star, description: 'NPS scores and customer feedback trends' },
  { name: 'Forecast', href: '/forecast', icon: Target, description: '8-week revenue projections with scenarios' },
]

// Region Director / Region Sales Manager navigation (includes daily performance)
// Removed duplicate top-level links: Sales, Operations, Finance, Portfolio, Lead Service Engine
export const REGION_DIRECTOR_NAV: NavItem[] = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard, description: 'Executive KPI overview and priority actions' },
  { name: 'Daily Performance', href: '/daily-performance', icon: CalendarDays, description: 'Regional daily scorecard' },
  { name: 'Weekly WIG', href: '/region/weekly-wig', icon: ClipboardCheck, description: 'Wildly Important Goal tracking' },
  { name: 'People', href: '/people', icon: Users, description: 'Workforce capacity and utilization metrics' },
  { name: 'Customer Satisfaction', href: '/customer-satisfaction', icon: Star, description: 'NPS scores and customer feedback trends' },
  { name: 'Forecast', href: '/forecast', icon: Target, description: '8-week revenue projections with scenarios' },
]

// Operations Manager specific navigation
// Removed duplicate top-level links: Operations, Sales, Finance, Lead Service Engine
export const OPS_MANAGER_NAV: NavItem[] = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard, description: 'Executive KPI overview and priority actions' },
  { name: 'New Starts', href: '/new-starts', icon: Truck, description: 'New customer installations and onboarding' },
  { name: 'Forecast', href: '/forecast', icon: Target, description: '8-week revenue projections with scenarios' },
]

// Account Executive navigation
// Note: Sales Hub consolidates Accounts, Pipeline, Quotes into tabs
export const AE_NAV: NavItem[] = [
  { name: 'My Dashboard', href: '/ae', icon: LayoutDashboard, description: 'Personal performance metrics and goals' },
  { name: 'Sales Hub', href: '/ae/sales', icon: TrendingUp, description: 'Accounts, pipeline, and quote management' },
  { name: 'Sales Tracker', href: '/ae/tracker', icon: Target, description: 'Track proposals, sales, and new starts' },
  { name: 'New Starts', href: '/new-starts', icon: Truck, description: 'New customer installations and onboarding' },
]

// Branch Manager navigation
// Removed duplicate top-level links: Sales, Operations, Lead Service Engine
export const BRANCH_MANAGER_NAV: NavItem[] = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard, description: 'Executive KPI overview and priority actions' },
  { name: 'Daily Cadence', href: '/manager/daily-cadence', icon: CalendarDays, description: 'Branch-level daily operations review' },
  { name: 'WIG Scorecard', href: '/manager/wig-scorecard', icon: Target, description: 'Wildly Important Goal tracking' },
  { name: 'Customer Satisfaction', href: '/customer-satisfaction', icon: Star, description: 'NPS scores and customer feedback trends' },
  { name: 'Forecast', href: '/forecast', icon: Target, description: '8-week revenue projections with scenarios' },
]

// Technician navigation
export const TECH_NAV: NavItem[] = [
  { name: 'My Schedule', href: '/tech', icon: Calendar, description: 'Daily route and appointment schedule' },
  { name: 'Service Tickets', href: '/tech/tickets', icon: ClipboardList, description: 'Open and completed service requests' },
  { name: 'Route', href: '/tech/route', icon: Truck, description: 'Optimized route planning and navigation' },
]

// ============================================================================
// RTX SECTIONS - Collapsible navigation for Power BI feature parity
// ============================================================================

export const RTX_SECTIONS: NavSection[] = [
  {
    name: 'Leads',
    icon: Target,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
    children: [
      { name: 'Journey Tracking', href: '/leads/journey', icon: GitBranch },
      { name: 'Type & Pest', href: '/leads/type-pest' },
      { name: 'Trends', href: '/leads/trends' },
      { name: 'Rankings', href: '/leads/rankings' },
      { name: 'Cancels', href: '/leads/cancels' },
      { name: 'Geographic', href: '/leads/geographic' },
      { name: 'Glossary', href: '/governance?module=leads', icon: BookOpen },
    ],
  },
  {
    name: 'SALTI',
    icon: Briefcase,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager'],
    children: [
      { name: 'Overview', href: '/salti' },
      { name: 'Daily Check-In', href: '/salti/daily-check-in' },
      { name: 'Productivity', href: '/salti/productivity' },
      { name: 'Proposal Pipeline', href: '/salti/proposal-pipeline' },
      { name: 'YoY Trends', href: '/salti/yoy-trends' },
      { name: 'Funnel Fallout', href: '/salti/funnel-fallout' },
      { name: 'Sales Ladders', href: '/salti/sales-ladders' },
      { name: 'Weekend Blitz', href: '/salti/weekend-blitz' },
      { name: 'Glossary', href: '/governance?module=salti', icon: BookOpen },
    ],
  },
  {
    name: 'Sales',
    icon: TrendingUp,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
    children: [
      { name: 'Overview', href: '/sales' },
      { name: 'National', href: '/sales/national' },
      { name: 'Speed to Install', href: '/sales/speed-to-install' },
      { name: "Today's Sales", href: '/sales/today' },
      { name: 'Backlog', href: '/sales/backlog' },
      { name: 'Canceled Agreements', href: '/sales/canceled-agreements' },
      { name: 'Start Rate', href: '/sales/start-rate' },
      { name: 'Glossary', href: '/governance?module=sales', icon: BookOpen },
    ],
  },
  {
    name: 'Operations',
    icon: Wrench,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'ops_manager'],
    children: [
      { name: 'Overview', href: '/ops' },
      { name: 'National', href: '/ops/national' },
      { name: 'New Starts', href: '/new-starts' },
      { name: 'Call Center', href: '/call-center' },
      { name: 'Glossary', href: '/governance?module=ops', icon: BookOpen },
    ],
  },
  {
    name: 'Finance',
    icon: DollarSign,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager'],
    children: [
      { name: 'Overview', href: '/finance' },
      { name: 'AR Aging', href: '/finance/ar' },
      { name: 'Projections', href: '/finance/projections' },
      { name: 'P&L Detail', href: '/finance/pnl' },
      { name: 'Glossary', href: '/governance?module=finance', icon: BookOpen },
    ],
  },
  {
    name: 'Branch Hierarchy',
    icon: Building,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager'],
    children: [
      { name: 'Organization', href: '/governance/organization' },
      { name: 'Daily Performance', href: '/daily-performance' },
      { name: 'Branch List', href: '/branch' },
    ],
  },
  {
    name: 'Termite',
    icon: Bug,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'ops_manager'],
    children: [
      { name: 'PNI', href: '/termite/pni' },
      { name: 'Renewals', href: '/termite/renewals' },
      { name: 'Glossary', href: '/governance?module=termite', icon: BookOpen },
    ],
  },
  {
    name: 'Workforce',
    icon: Users,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'ops_manager'],
    children: [
      { name: 'Tech Productivity', href: '/workforce/tech-productivity' },
      { name: 'Glossary', href: '/governance?module=workforce', icon: BookOpen },
    ],
  },
  {
    name: 'HR',
    icon: UserX,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager'],
    children: [
      { name: 'Retention Detail', href: '/hr/retention' },
      { name: 'Glossary', href: '/governance?module=hr', icon: BookOpen },
    ],
  },
  {
    name: 'Portfolio',
    icon: Briefcase,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager'],
    children: [
      { name: 'Overview', href: '/portfolio' },
      { name: 'Retention', href: '/portfolio?tab=retention' },
      { name: 'Churn', href: '/portfolio?tab=churn' },
      { name: 'Growth', href: '/portfolio?tab=growth' },
    ],
  },
  {
    name: 'Cross-Functional',
    icon: Layers,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director'],
    children: [
      { name: 'Lead to Revenue', href: '/cross-functional' },
      { name: 'Glossary', href: '/governance?module=cross-functional', icon: BookOpen },
    ],
  },
  {
    name: 'Lead Service Engine',
    icon: Workflow,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager'],
    children: [
      { name: 'Overview', href: '/lead-service-engine' },
      { name: 'At-Risk Leads', href: '/lead-service-engine/at-risk' },
      { name: 'Handoffs', href: '/lead-service-engine/handoffs' },
      { name: 'Stages', href: '/lead-service-engine/stages' },
      { name: 'Automation', href: '/lead-service-engine/automation' },
      { name: 'Integration', href: '/lead-service-engine/integration' },
      { name: 'Flows', href: '/lead-service-engine/flows' },
      { name: 'Glossary', href: '/governance?module=lead-service', icon: BookOpen },
    ],
  },
  {
    name: 'Help',
    icon: BookOpen,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician'],
    children: [
      { name: 'Getting Started', href: '/help/getting-started' },
      { name: 'Modules Guide', href: '/help/modules' },
      { name: 'KPI Glossary', href: '/help/kpi-glossary' },
      { name: 'FAQ', href: '/help/faq' },
    ],
  },
]

// ============================================================================
// GOVERNANCE & SETTINGS NAVIGATION
// ============================================================================

export const GOVERNANCE_NAV: NavItem[] = [
  {
    name: 'Governance',
    href: '/governance',
    icon: ShieldCheck,
    description: 'Data governance overview'
  },
  {
    name: 'Platform Admin',
    href: '/platform-admin',
    icon: Shield,
    description: 'System health and monitoring'
  },
  {
    name: 'Data Dictionary',
    href: '/governance/data-dictionary',
    icon: Book,
    description: 'Field definitions and metadata'
  },
  {
    name: 'Data Standards',
    href: '/governance/data-standards',
    icon: ClipboardCheck,
    description: 'Data quality standards and rules'
  },
  {
    name: 'Data Quality',
    href: '/governance/data-quality',
    icon: Shield,
    description: 'Data validation and quality metrics'
  },
  {
    name: 'RTX Discovery',
    href: '/governance/rtx-discovery',
    icon: Database,
    description: 'RTX monitoring implementation'
  },
  {
    name: 'Field Lineage',
    href: '/governance/field-lineage',
    icon: GitBranch,
    description: 'Data lineage and dependencies'
  },
  {
    name: 'WBR',
    href: '/wbr',
    icon: Calendar,
    description: 'Weekly business review'
  },
  {
    name: 'QBR',
    href: '/qbr',
    icon: CalendarDays,
    description: 'Quarterly business review'
  },
]

export const SETTINGS_NAV: NavItem[] = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'User preferences and configuration'
  },
]

// ============================================================================
// ADMIN NAVIGATION
// ============================================================================

export const ADMIN_NAV: NavItem[] = [
  {
    name: 'Admin Dashboard',
    href: '/admin',
    icon: Shield,
    description: 'Platform controls and role preview'
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: UserCog,
    description: 'Manage user roles and permissions'
  },
  {
    name: 'Platform Admin',
    href: '/platform-admin',
    icon: ShieldCheck,
    description: 'System health and monitoring'
  },
  {
    name: 'SALTI Dashboard',
    href: '/salti',
    icon: Target,
    description: 'Sales leadership tracking initiative'
  },
  {
    name: 'Platform Health',
    href: '/platform-health',
    icon: Activity,
    description: 'ETL pipeline and uptime monitoring'
  },
  {
    name: 'User Adoption',
    href: '/user-adoption',
    icon: Users,
    description: 'Dashboard usage analytics'
  },
  {
    name: 'Data Quality',
    href: '/governance/data-quality',
    icon: ClipboardCheck,
    description: 'Data validation and quality metrics'
  },
  {
    name: 'Anomalies',
    href: '/anomalies',
    icon: Eye,
    description: 'Statistical anomaly detection'
  },
]

// ============================================================================
// ROLE PREVIEW NAVIGATION
// ============================================================================

export const ROLE_PREVIEW_NAV: Array<{
  name: string
  role: Role
  icon: React.ComponentType<{ className?: string }>
}> = [
  { name: 'Executive', role: 'exec', icon: LayoutDashboard },
  { name: 'Market VP', role: 'market_vp', icon: BarChart3 },
  { name: 'Market Sales Director', role: 'market_sales_director', icon: TrendingUp },
  { name: 'Region Director', role: 'region_director', icon: UserCog },
  { name: 'Region Sales Manager', role: 'region_sales_manager', icon: TrendingUp },
  { name: 'Branch Manager', role: 'manager', icon: Gauge },
  { name: 'Sales Manager', role: 'sales_manager', icon: TrendingUp },
  { name: 'Operations Manager', role: 'ops_manager', icon: Wrench },
  { name: 'Account Executive', role: 'rep', icon: FileText },
  { name: 'Technician', role: 'technician', icon: Workflow },
]

// ============================================================================
// ROLE ROUTES - Default navigation destination per role
// ============================================================================

export const ROLE_ROUTES: Record<Role, string> = {
  exec: '/',
  market_vp: '/',
  market_sales_director: '/',
  region_director: '/',
  region_sales_manager: '/',
  manager: '/',
  sales_manager: '/ae',
  ops_manager: '/',
  rep: '/ae',
  technician: '/tech'
}

// ============================================================================
// NAVIGATION RESOLVER - Get navigation for role
// ============================================================================

export function getNavigationForRole(role: Role): {
  mainNav: NavItem[]
  showGovernance: boolean
} {
  switch (role) {
    case 'rep':
      return { mainNav: AE_NAV, showGovernance: false }
    case 'technician':
      return { mainNav: TECH_NAV, showGovernance: false }
    case 'ops_manager':
      return { mainNav: OPS_MANAGER_NAV, showGovernance: true }
    case 'manager':
      return { mainNav: BRANCH_MANAGER_NAV, showGovernance: true }
    case 'sales_manager':
      return { mainNav: EXECUTIVE_NAV, showGovernance: true }
    case 'region_sales_manager':
    case 'region_director':
      return { mainNav: REGION_DIRECTOR_NAV, showGovernance: true }
    case 'market_sales_director':
    case 'market_vp':
      return { mainNav: MARKET_VP_NAV, showGovernance: true }
    case 'exec':
      return { mainNav: EXECUTIVE_NAV, showGovernance: true }
    default:
      return { mainNav: EXECUTIVE_NAV, showGovernance: true }
  }
}
