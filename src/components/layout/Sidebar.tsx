"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import {
  LayoutDashboard, TrendingUp, Settings, FileText,
  Users, DollarSign, Wrench, ShieldCheck, Calendar,
  CalendarDays, ChevronLeft, ChevronRight, Target,
  ClipboardList, Truck, Upload, Book, Shield, GitBranch,
  ClipboardCheck, Workflow, Lock, X, Database,
  ChevronDown, Bug, Clock, Layers, BarChart3, BookOpen,
  Briefcase, Building, AlertTriangle, RefreshCw, UserX,
  Percent, FileBarChart, Receipt, LineChart, PieChart
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Role } from '@/types'

// Collapsible nav section interface
interface NavSection {
  name: string
  icon: React.ComponentType<{ className?: string }>
  children: NavItem[]
  allowedRoles: Role[]
}

interface NavItem {
  name: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SidebarProps {
  onNavigate?: () => void
  isMobile?: boolean
}

// Executive navigation (no daily cadence - they don't need branch-level detail)
const executiveNav = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Sales', href: '/sales', icon: TrendingUp },
  { name: 'Operations', href: '/ops', icon: Wrench },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Forecast', href: '/forecast', icon: Target },
  { name: 'Lead Service Engine', href: '/lead-service-engine', icon: Workflow },
]

// Market VP / Market Sales Director navigation (includes market-level daily rollup)
const marketVPNav = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Daily Rollup', href: '/market/daily', icon: CalendarDays },
  { name: 'Sales', href: '/sales', icon: TrendingUp },
  { name: 'Operations', href: '/ops', icon: Wrench },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Forecast', href: '/forecast', icon: Target },
  { name: 'Lead Service Engine', href: '/lead-service-engine', icon: Workflow },
]

// Region Director / Region Sales Manager navigation (includes region-level daily rollup)
const regionDirectorNav = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Daily Rollup', href: '/region/daily', icon: CalendarDays },
  { name: 'Weekly WIG', href: '/region/weekly-wig', icon: ClipboardCheck },
  { name: 'Sales', href: '/sales', icon: TrendingUp },
  { name: 'Operations', href: '/ops', icon: Wrench },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Forecast', href: '/forecast', icon: Target },
  { name: 'Lead Service Engine', href: '/lead-service-engine', icon: Workflow },
]

// Operations Manager specific navigation
const opsManagerNav = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Operations', href: '/ops', icon: Wrench },
  { name: 'New Starts', href: '/ops/new-starts', icon: Truck },
  { name: 'Sales', href: '/sales', icon: TrendingUp },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'Forecast', href: '/forecast', icon: Target },
  { name: 'Lead Service Engine', href: '/lead-service-engine', icon: Workflow },
]

// Account Executive navigation
// Note: Proposals and Sales are sub-tabs within Sales Tracker, not separate nav items
const aeNav = [
  { name: 'My Dashboard', href: '/ae', icon: LayoutDashboard },
  { name: 'Import Quote', href: '/ae/import', icon: Upload },
  { name: 'Sales Tracker', href: '/ae/tracker/totals', icon: Target },
  { name: 'New Starts', href: '/ae/new-starts', icon: Truck },
]

// Branch Manager navigation
const branchManagerNav = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Daily Cadence', href: '/manager/daily-cadence', icon: CalendarDays },
  { name: 'WIG Scorecard', href: '/manager/wig-scorecard', icon: Target },
  { name: 'Sales', href: '/sales', icon: TrendingUp },
  { name: 'Operations', href: '/ops', icon: Wrench },
  { name: 'Forecast', href: '/forecast', icon: Target },
  { name: 'Lead Service Engine', href: '/lead-service-engine', icon: Workflow },
]

// Technician navigation
const techNav = [
  { name: 'My Schedule', href: '/tech', icon: Calendar },
  { name: 'Service Tickets', href: '/tech/tickets', icon: ClipboardList },
  { name: 'Route', href: '/tech/route', icon: Truck },
]

const governance = [
  { name: 'Governance', href: '/governance', icon: ShieldCheck },
  { name: 'Platform Admin', href: '/platform-admin', icon: Shield },
  { name: 'Data Dictionary', href: '/governance/data-dictionary', icon: Book },
  { name: 'Data Standards', href: '/governance/data-standards', icon: ClipboardCheck },
  { name: 'Data Quality', href: '/governance/data-quality', icon: Shield },
  { name: 'RTX Discovery', href: '/governance/rtx-discovery', icon: Database },
  { name: 'Field Lineage', href: '/governance/field-lineage', icon: GitBranch },
  { name: 'WBR', href: '/wbr', icon: Calendar },
  { name: 'QBR', href: '/qbr', icon: CalendarDays },
]

const settings = [
  { name: 'Settings', href: '/settings', icon: Settings },
]

// RTX Power BI Feature Parity - Collapsible Sections
const rtxSections: NavSection[] = [
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
      { name: 'Speed to Install', href: '/sales/speed-to-install' },
      { name: "Today's Sales", href: '/sales/today' },
      { name: 'Backlog', href: '/sales/backlog' },
      { name: 'Canceled Agreements', href: '/sales/canceled-agreements' },
      { name: 'Start Rate', href: '/sales/start-rate' },
      { name: 'Glossary', href: '/governance?module=sales', icon: BookOpen },
    ],
  },
  {
    name: 'Finance',
    icon: DollarSign,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager'],
    children: [
      { name: 'Projections', href: '/finance/projections' },
      { name: 'P&L Detail', href: '/finance/pnl' },
      { name: 'AR Aging', href: '/finance/ar' },
      { name: 'Glossary', href: '/governance?module=finance', icon: BookOpen },
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
    name: 'Cross-Functional',
    icon: Layers,
    allowedRoles: ['exec', 'market_vp', 'market_sales_director', 'region_director'],
    children: [
      { name: 'Lead to Revenue', href: '/cross-functional' },
      { name: 'Glossary', href: '/governance?module=cross-functional', icon: BookOpen },
    ],
  },
]

// Get navigation based on role
function getNavigationForRole(role: Role) {
  switch (role) {
    case 'rep':
      return { main: aeNav, showGovernance: false }
    case 'technician':
      return { main: techNav, showGovernance: false }
    case 'ops_manager':
      return { main: opsManagerNav, showGovernance: true }
    case 'manager':
      return { main: branchManagerNav, showGovernance: true }
    case 'sales_manager':
      return { main: executiveNav, showGovernance: true }
    case 'region_sales_manager':
    case 'region_director':
      return { main: regionDirectorNav, showGovernance: true }
    case 'market_sales_director':
    case 'market_vp':
      return { main: marketVPNav, showGovernance: true }
    case 'exec':
      return { main: executiveNav, showGovernance: true }
    default:
      return { main: executiveNav, showGovernance: true }
  }
}

// Get display label for role
function getRoleLabel(role: Role): string {
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

export function Sidebar({ onNavigate, isMobile }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, setSidebarCollapsed, settings: appSettings } = useAppStore()
  const [isClient, setIsClient] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  // Toggle section expansion
  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }

  // Check if any child route is active in a section
  const isSectionActive = (section: NavSection) => {
    return section.children.some(child =>
      pathname === child.href ||
      (child.href !== '/' && !child.href.includes('?') && pathname.startsWith(child.href))
    )
  }

  // Auto-expand sections with active routes
  useEffect(() => {
    const activeSection = rtxSections.find(section => isSectionActive(section))
    if (activeSection && !expandedSections[activeSection.name]) {
      setExpandedSections(prev => ({
        ...prev,
        [activeSection.name]: true
      }))
    }
  }, [pathname])

  useEffect(() => {
    setIsClient(true)

    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.log('Sidebar: Error getting user:', error)
          return
        }
        if (user?.email) {
          const isUserAdmin = isAdminEmail(user.email)
          console.log('Sidebar: Admin check -', { email: user.email, isUserAdmin })
          setIsAdmin(isUserAdmin)
        } else {
          console.log('Sidebar: No user email found')
        }
      } catch (e) {
        console.log('Sidebar: Exception checking admin:', e)
      }
    }
    checkAdmin()
  }, [supabase])

  // Use default values during SSR to avoid hydration mismatch
  const currentRole = isClient ? appSettings.role : 'exec'
  const currentDemoMode = isClient ? appSettings.demoMode : 'bi_leadership'
  const { main: navigation, showGovernance } = getNavigationForRole(currentRole)

  // On mobile, never collapse - always show full width
  const isCollapsed = isMobile ? false : sidebarCollapsed

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  const NavItem = ({ item }: { item: typeof executiveNav[0] }) => {
    const isActive = pathname === item.href ||
      (item.href !== '/' && pathname.startsWith(item.href))

    return (
      <Link
        href={item.href}
        onClick={handleNavClick}
        className={cn(
          'nav-item group',
          isActive && 'nav-item-active',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <item.icon className={cn(
          'h-5 w-5 flex-shrink-0',
          isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
        )} />
        {!isCollapsed && (
          <span className={cn(
            isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-200'
          )}>
            {item.name}
          </span>
        )}
      </Link>
    )
  }

  // Collapsible section for RTX Power BI nav
  const CollapsibleSection = ({ section }: { section: NavSection }) => {
    const isExpanded = expandedSections[section.name] || false
    const sectionIsActive = isSectionActive(section)
    const SectionIcon = section.icon

    // Filter sections by role
    if (!section.allowedRoles.includes(currentRole)) {
      return null
    }

    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleSection(section.name)}
          className={cn(
            'nav-item group w-full justify-between',
            sectionIsActive && 'bg-gray-100 dark:bg-gray-800',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <div className="flex items-center gap-3">
            <SectionIcon className={cn(
              'h-5 w-5 flex-shrink-0',
              sectionIsActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
            )} />
            {!isCollapsed && (
              <span className={cn(
                'text-sm font-medium',
                sectionIsActive ? 'text-primary' : 'text-gray-700 dark:text-gray-200'
              )}>
                {section.name}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <ChevronDown className={cn(
              'h-4 w-4 text-gray-400 transition-transform duration-200',
              isExpanded && 'transform rotate-180'
            )} />
          )}
        </button>
        {!isCollapsed && isExpanded && (
          <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 space-y-1">
            {section.children.map((child) => {
              const isChildActive = pathname === child.href ||
                (child.href !== '/' && !child.href.includes('?') && pathname.startsWith(child.href))
              const ChildIcon = child.icon

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                    isChildActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {ChildIcon && (
                    <ChildIcon className={cn(
                      'h-4 w-4',
                      isChildActive ? 'text-primary' : 'text-gray-400'
                    )} />
                  )}
                  {child.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-white dark:bg-gray-900 border-r dark:border-gray-700 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center px-4 border-b dark:border-gray-700',
        isCollapsed ? 'justify-center h-16' : 'justify-between h-24'
      )}>
        {!isCollapsed && (
          <div className="flex flex-col">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" className="h-[60px] w-auto">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E4002B" />
                  <stop offset="100%" stopColor="#B8001F" />
                </linearGradient>
              </defs>
              <text x="0" y="32" fontFamily="Arial, Helvetica, sans-serif" fontSize="32" fontWeight="bold" fill="url(#logoGradient)">
                Rentokil
              </text>
              <text x="0" y="52" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="500" className="fill-gray-600 dark:fill-gray-300">
                The Experts in Pest Control
              </text>
            </svg>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Business Intelligence</p>
          </div>
        )}
        {isCollapsed && (
          <div className="w-11 h-11 bg-rentokil-red rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
        )}
        {/* Close button for mobile */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigate}
            className="ml-auto"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* RTX Power BI Feature Parity - Collapsible Sections */}
        {showGovernance && (
          <>
            <Separator className="my-4 mx-2" />
            {!isCollapsed && (
              <div className="px-3 py-2">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  RTX Reports
                </span>
              </div>
            )}
            <nav className="space-y-1 px-2">
              {rtxSections.map((section) => (
                <CollapsibleSection key={section.name} section={section} />
              ))}
            </nav>
          </>
        )}

        {showGovernance && (
          <>
            <Separator className="my-4 mx-2" />
            {!isCollapsed && (
              <div className="px-3 py-2">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Governance
                </span>
              </div>
            )}
            <nav className="space-y-1 px-2">
              {governance.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </>
        )}

        <Separator className="my-4 mx-2" />

        <nav className="space-y-1 px-2">
          {settings.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
          {isAdmin && (
            <NavItem item={{ name: 'Admin', href: '/admin', icon: Lock }} />
          )}
        </nav>
      </ScrollArea>

      {/* Role Indicator */}
      {!isCollapsed && (
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your Role</div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {getRoleLabel(currentRole)}
          </div>
        </div>
      )}

      {/* Collapse Button - only on desktop */}
      {!isMobile && (
        <div className="p-2 border-t dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full justify-center"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
