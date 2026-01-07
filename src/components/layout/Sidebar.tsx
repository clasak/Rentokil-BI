"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import {
  LayoutDashboard, TrendingUp, Settings, FileText,
  Users, DollarSign, Wrench, ShieldCheck, Calendar,
  CalendarDays, ChevronLeft, ChevronRight, Target,
  UserCircle, ClipboardList, Truck, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Role } from '@/types'

// Executive / Manager navigation
const executiveNav = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Sales', href: '/sales', icon: TrendingUp },
  { name: 'Operations', href: '/ops', icon: Wrench },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Forecast', href: '/forecast', icon: Target },
]

// Account Executive navigation
const aeNav = [
  { name: 'My Dashboard', href: '/ae', icon: LayoutDashboard },
  { name: 'New Proposal', href: '/ae/proposal/new', icon: Plus },
  { name: 'Log Sale', href: '/ae/sale/new', icon: ClipboardList },
]

// Technician navigation
const techNav = [
  { name: 'My Schedule', href: '/tech', icon: Calendar },
  { name: 'Service Tickets', href: '/tech/tickets', icon: ClipboardList },
  { name: 'Route', href: '/tech/route', icon: Truck },
]

const governance = [
  { name: 'Governance', href: '/governance', icon: ShieldCheck },
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
    case 'manager':
      return { main: executiveNav, showGovernance: true }
    case 'vp_director':
    case 'exec':
      return { main: executiveNav, showGovernance: true }
    default:
      return { main: executiveNav, showGovernance: true }
  }
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, setSidebarCollapsed, settings: appSettings } = useAppStore()

  const { main: navigation, showGovernance } = getNavigationForRole(appSettings.role)

  const NavItem = ({ item }: { item: typeof executiveNav[0] }) => {
    const isActive = pathname === item.href ||
      (item.href !== '/' && pathname.startsWith(item.href))

    return (
      <Link
        href={item.href}
        className={cn(
          'nav-item group',
          isActive && 'nav-item-active',
          sidebarCollapsed && 'justify-center px-2'
        )}
      >
        <item.icon className={cn(
          'h-5 w-5 flex-shrink-0',
          isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-700'
        )} />
        {!sidebarCollapsed && (
          <span className={cn(
            isActive ? 'text-primary' : 'text-gray-700'
          )}>
            {item.name}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b',
        sidebarCollapsed ? 'justify-center' : 'justify-between'
      )}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Rentokil BI</h1>
              <p className="text-xs text-gray-500">Business OS</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
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
        </nav>
      </ScrollArea>

      {/* Role & Demo Mode Indicator */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">Logged in as</div>
          <div className="text-sm font-medium text-gray-900">
            {appSettings.role === 'rep' && 'Account Executive'}
            {appSettings.role === 'manager' && 'Branch Manager'}
            {appSettings.role === 'vp_director' && 'Area Manager'}
            {appSettings.role === 'exec' && 'Executive'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {appSettings.demoMode === 'exec_bi_review' && 'Exec BI Review'}
            {appSettings.demoMode === 'sales_ops_execution' && 'Sales Ops'}
            {appSettings.demoMode === 'branch_field_manager' && 'Branch Manager'}
          </div>
        </div>
      )}

      {/* Collapse Button */}
      <div className="p-2 border-t">
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
    </div>
  )
}
