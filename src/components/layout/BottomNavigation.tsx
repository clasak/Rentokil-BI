"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { Role } from '@/types'
import {
  LayoutDashboard,
  TrendingUp,
  Wrench,
  Calendar,
  FileText,
  Target,
  User,
  Truck,
  ClipboardList,
  DollarSign,
  Users,
  Zap,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: number
}

// Role-specific navigation configurations
const BOTTOM_NAV_CONFIG: Record<Role, NavItem[]> = {
  exec: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sales', href: '/sales', icon: TrendingUp },
    { name: 'Ops', href: '/ops', icon: Wrench },
    { name: 'Forecast', href: '/forecast', icon: Target },
    { name: 'Profile', href: '/settings', icon: User },
  ],
  market_director: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Daily', href: '/market/daily', icon: Calendar },
    { name: 'Sales', href: '/sales', icon: TrendingUp },
    { name: 'Ops', href: '/ops', icon: Wrench },
    { name: 'Profile', href: '/settings', icon: User },
  ],
  market_sales_director: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Daily', href: '/market/daily', icon: Calendar },
    { name: 'Sales', href: '/sales', icon: TrendingUp },
    { name: 'People', href: '/people', icon: Users },
    { name: 'Profile', href: '/settings', icon: User },
  ],
  region_director: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Daily', href: '/region/daily', icon: Calendar },
    { name: 'Sales', href: '/sales', icon: TrendingUp },
    { name: 'Ops', href: '/ops', icon: Wrench },
    { name: 'Profile', href: '/settings', icon: User },
  ],
  manager: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Cadence', href: '/manager/daily-cadence', icon: Calendar },
    { name: 'Leads', href: '/lead-service-engine', icon: Zap },
    { name: 'Forecast', href: '/forecast', icon: Target },
    { name: 'Profile', href: '/settings', icon: User },
  ],
  sales_manager: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sales', href: '/sales', icon: TrendingUp },
    { name: 'People', href: '/people', icon: Users },
    { name: 'Forecast', href: '/forecast', icon: Target },
    { name: 'Profile', href: '/settings', icon: User },
  ],
  ops_manager: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Ops', href: '/ops', icon: Wrench },
    { name: 'New Starts', href: '/ops/new-starts', icon: Truck },
    { name: 'Leads', href: '/lead-service-engine', icon: Zap },
    { name: 'Profile', href: '/settings', icon: User },
  ],
  rep: [
    { name: 'Dashboard', href: '/ae', icon: LayoutDashboard },
    { name: 'Tracker', href: '/ae/tracker/totals', icon: Target },
    { name: 'New Start', href: '/ae/new-starts', icon: Truck },
    { name: 'Import', href: '/ae/import', icon: FileText },
    { name: 'Profile', href: '/settings', icon: User },
  ],
  technician: [
    { name: 'Schedule', href: '/tech', icon: Calendar },
    { name: 'Tickets', href: '/tech/tickets', icon: ClipboardList },
    { name: 'Route', href: '/tech/route', icon: Truck },
    { name: 'Profile', href: '/settings', icon: User },
  ],
}

export function BottomNavigation() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get role from store or default to exec
  const role = mounted ? settings.role : 'exec'
  const navItems = BOTTOM_NAV_CONFIG[role] || BOTTOM_NAV_CONFIG.exec

  // Don't render during SSR to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <nav
      className={cn(
        // Fixed bottom positioning
        "fixed bottom-0 left-0 right-0 z-50",
        // Background and border
        "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700",
        // Safe area padding for iOS home indicator
        "pb-safe",
        // Hide on desktop (lg breakpoint = 1024px)
        "lg:hidden",
        // Shadow for depth
        "shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          // Check if this route is active
          const isActive = pathname === item.href ||
            (item.href !== '/' && item.href !== '/ae' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // Layout
                "flex flex-col items-center justify-center w-full h-full px-1 py-2",
                // Touch interaction
                "touch-manipulation active:scale-95 transition-all duration-150",
                // Minimum touch target (48x48)
                "min-h-[48px]",
                // Color states
                isActive
                  ? "text-primary"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {/* Badge for notifications */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium transition-all",
                  isActive ? "text-primary font-semibold" : ""
                )}
              >
                {item.name}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
