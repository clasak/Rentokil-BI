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
  ClipboardCheck, Workflow, Lock, X, Database
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Role } from '@/types'

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

// Market Director / Market Sales Director navigation (includes market-level daily rollup)
const marketDirectorNav = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Daily Rollup', href: '/market/daily', icon: CalendarDays },
  { name: 'Sales', href: '/sales', icon: TrendingUp },
  { name: 'Operations', href: '/ops', icon: Wrench },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Forecast', href: '/forecast', icon: Target },
  { name: 'Lead Service Engine', href: '/lead-service-engine', icon: Workflow },
]

// Region Director navigation (includes region-level daily rollup)
const regionDirectorNav = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Daily Rollup', href: '/region/daily', icon: CalendarDays },
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
    case 'region_director':
      return { main: regionDirectorNav, showGovernance: true }
    case 'market_sales_director':
    case 'market_director':
      return { main: marketDirectorNav, showGovernance: true }
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
    case 'market_director':
      return 'Market Director'
    case 'market_sales_director':
      return 'Market Sales Director'
    case 'region_director':
      return 'Region Director'
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
  const supabase = createClient()

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

        {showGovernance && (
          <>
            <Separator className="my-4 mx-2" />
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
