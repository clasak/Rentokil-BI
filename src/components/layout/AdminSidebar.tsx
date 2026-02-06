"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import {
  LayoutDashboard, Shield, Users, Eye, Activity, Settings,
  ChevronLeft, ChevronRight, X, Database, Workflow, ClipboardCheck,
  AlertTriangle, BarChart3, UserCog, Gauge, FileText, GitBranch,
  Book, Calendar, CalendarDays, ShieldCheck, Target, ChevronDown,
  TrendingUp, Wrench, DollarSign, Building, Bug, UserX, Layers, Briefcase, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Role } from '@/types'
import {
  ADMIN_NAV,
  ROLE_PREVIEW_NAV,
  ROLE_ROUTES,
  GOVERNANCE_NAV,
  SETTINGS_NAV,
  getRoleLabel,
  type NavItem,
} from '@/lib/navigation-config'

interface AdminSidebarProps {
  onNavigate?: () => void
  isMobile?: boolean
}

export function AdminSidebar({ onNavigate, isMobile }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    isPreviewingRole,
    previewedRole,
    setPreviewingRole,
    exitRolePreview,
    setRole,
  } = useAppStore()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // On mobile, never collapse - always show full width
  const isCollapsed = isMobile ? false : sidebarCollapsed

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href ||
      (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href.split('?')[0]))

    const linkElement = (
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

    // Wrap with tooltip when sidebar is collapsed
    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkElement}
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="space-y-1">
              <p className="font-medium">{item.name}</p>
              {item.description && (
                <p className="text-xs text-gray-400">{item.description}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )
    }

    return linkElement
  }

  const RolePreviewItem = ({ item }: { item: typeof ROLE_PREVIEW_NAV[0] }) => {
    const isActive = isPreviewingRole && previewedRole === item.role

    const buttonElement = (
      <button
        onClick={() => {
          if (isActive) {
            // Exit preview and go back to admin dashboard
            exitRolePreview()
            setRole('exec')
            router.push('/admin')
          } else {
            // Create preview user FIRST (reads currentUser before setRole could change it)
            setPreviewingRole(item.role)
            // Then update settings role for dashboard rendering
            setRole(item.role)

            router.push(ROLE_ROUTES[item.role])
          }
          handleNavClick()
        }}
        className={cn(
          'nav-item group w-full text-left',
          isActive && 'nav-item-active bg-blue-50 dark:bg-blue-900/20',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <item.icon className={cn(
          'h-5 w-5 flex-shrink-0',
          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
        )} />
        {!isCollapsed && (
          <span className={cn(
            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
          )}>
            {item.name}
          </span>
        )}
        {!isCollapsed && isActive && (
          <Eye className="h-4 w-4 ml-auto text-blue-600 dark:text-blue-400" />
        )}
      </button>
    )

    // Wrap with tooltip when sidebar is collapsed
    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {buttonElement}
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="space-y-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-gray-400">
                Preview dashboard as {getRoleLabel(item.role)}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      )
    }

    return buttonElement
  }

  return (
    <TooltipProvider>
      <div className={cn(
        'flex flex-col h-full bg-white dark:bg-gray-900 border-r dark:border-gray-700 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}>
        {/* Logo with Admin Badge */}
      <div className={cn(
        'flex items-center px-4 border-b dark:border-gray-700',
        isCollapsed ? 'justify-center h-16' : 'justify-between h-24'
      )}>
        {!isCollapsed && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" className="h-[50px] w-auto">
                <defs>
                  <linearGradient id="logoGradientAdmin" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E4002B" />
                    <stop offset="100%" stopColor="#B8001F" />
                  </linearGradient>
                </defs>
                <text x="0" y="32" fontFamily="Arial, Helvetica, sans-serif" fontSize="32" fontWeight="bold" fill="url(#logoGradientAdmin)">
                  Rentokil
                </text>
                <text x="0" y="52" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="500" className="fill-gray-600 dark:fill-gray-300">
                  The Experts in Pest Control
                </text>
              </svg>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-11 h-11 bg-amber-500 rounded-lg flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
        )}
        {/* Close button for mobile */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigate}
            className="ml-auto"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        {/* Admin Navigation */}
        <nav className="space-y-1 px-2">
          {!isCollapsed && (
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Admin Console
            </div>
          )}
          {ADMIN_NAV.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        <Separator className="my-4 mx-2" />

        {/* Role Preview Section */}
        <nav className="space-y-1 px-2">
          {!isCollapsed && (
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Role Preview
            </div>
          )}
          {ROLE_PREVIEW_NAV.map((item) => (
            <RolePreviewItem key={item.role} item={item} />
          ))}
          {!isCollapsed && (
            <div className="px-3 py-2 mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
              Preview a role to see RTX reports and user-facing navigation
            </div>
          )}
        </nav>

        <Separator className="my-4 mx-2" />

        {/* Governance Section */}
        <nav className="space-y-1 px-2">
          {!isCollapsed && (
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Governance
            </div>
          )}
          {GOVERNANCE_NAV.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        <Separator className="my-4 mx-2" />

        <nav className="space-y-1 px-2">
          {SETTINGS_NAV.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* Admin Indicator */}
      {!isCollapsed && (
        <div className="p-4 border-t dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Admin Mode</div>
          <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Product Owner
          </div>
          {isPreviewingRole && previewedRole && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Previewing: {getRoleLabel(previewedRole)}
            </div>
          )}
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
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
    </TooltipProvider>
  )
}
