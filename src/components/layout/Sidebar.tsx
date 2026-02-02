"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Percent, FileBarChart, Receipt, LineChart, PieChart, Star,
  History, Trash2, Eye, Filter, MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Role } from '@/types'
import { useRecentPages } from '@/hooks/useRecentPages'
import {
  RTX_SECTIONS,
  GOVERNANCE_NAV,
  SETTINGS_NAV,
  hasPermission,
  getRoleLabel,
  getNavigationForRole,
  type NavSection,
  type NavItem,
} from '@/lib/navigation-config'
import { NavCollapsibleSection } from './NavCollapsibleSection'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  onNavigate?: () => void
  isMobile?: boolean
  previewRole?: Role
  isPreview?: boolean
}

export function Sidebar({ onNavigate, isMobile, previewRole, isPreview = false }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, setSidebarCollapsed, settings: appSettings, isAdmin: storeIsAdmin, exitRolePreview, organizationFilters, clearOrganizationFilters } = useAppStore()
  const [isClient, setIsClient] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [recentPagesExpanded, setRecentPagesExpanded] = useState(false)
  const { recentPages, clearRecent, mounted: recentMounted } = useRecentPages()
  const { getMarketByCode, getRegionByCode, getBranchByCode } = useOrganizationData()

  // Use store's isAdmin (set by AuthProvider) - only trust it after client mount
  // When previewing a role, hide admin sections to show exactly what that role sees
  const isAdmin = isClient ? storeIsAdmin : false
  const isRolePreviewActive = !!previewRole

  // Toggle section expansion (memoized)
  const toggleSection = useCallback((sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }, [])

  // Check if any child route is active in a section
  const isSectionActive = (section: NavSection) => {
    return section.children.some(child =>
      pathname === child.href ||
      (child.href !== '/' && !child.href.includes('?') && pathname.startsWith(child.href))
    )
  }

  // Auto-expand sections with active routes
  useEffect(() => {
    const activeSection = RTX_SECTIONS.find(section => isSectionActive(section))
    if (activeSection && !expandedSections[activeSection.name]) {
      setExpandedSections(prev => ({
        ...prev,
        [activeSection.name]: true
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Use default values during SSR to avoid hydration mismatch
  // In preview mode, use the previewRole instead of the user's actual role
  const currentRole = previewRole || (isClient ? appSettings.role : 'exec')
  const currentDemoMode = isClient ? appSettings.demoMode : 'bi_leadership'
  const navigationResult = getNavigationForRole(currentRole)
  const navigation = navigationResult?.mainNav || []

  // Debug logging
  if (typeof window !== 'undefined' && !navigation) {
    console.error('[Sidebar] Navigation is undefined:', { currentRole, navigationResult })
  }

  // On mobile, never collapse - always show full width
  // In preview mode, never collapse to show full navigation
  const isCollapsed = isMobile || isPreview ? false : sidebarCollapsed

  // Handle navigation click (memoized)
  const handleNavClick = useCallback((e?: React.MouseEvent) => {
    // In preview mode, prevent navigation
    if (isPreview && e) {
      e.preventDefault()
      return
    }
    if (onNavigate) {
      onNavigate()
    }
  }, [isPreview, onNavigate])

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href ||
      (item.href !== '/' && pathname.startsWith(item.href))

    const itemContent = (
      <>
        <item.icon className={cn(
          'h-5 w-5 flex-shrink-0',
          isActive && !isPreview ? 'text-primary' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
        )} />
        {!isCollapsed && (
          <span className={cn(
            isActive && !isPreview ? 'text-primary' : 'text-gray-700 dark:text-gray-200'
          )}>
            {item.name}
          </span>
        )}
      </>
    )

    const className = cn(
      'nav-item group',
      isActive && !isPreview && 'nav-item-active',
      isCollapsed && 'justify-center px-2',
      isPreview && 'cursor-default'
    )

    const linkElement = isPreview ? (
      <div className={className}>
        {itemContent}
      </div>
    ) : (
      <Link
        href={item.href}
        onClick={handleNavClick}
        className={className}
      >
        {itemContent}
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


  return (
    <TooltipProvider>
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
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Sales & Operations Intelligence</p>
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
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Organization Filter Indicator */}
      {isClient && (organizationFilters.selectedMarket || organizationFilters.selectedRegion || organizationFilters.selectedBranch) && (
        <div className={cn(
          'px-2 py-2 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-950/20',
          isCollapsed && 'px-1'
        )}>
          {!isCollapsed ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Active Filters
                  </span>
                </div>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={clearOrganizationFilters}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear all filters</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-0.5 text-xs">
                {organizationFilters.selectedMarket && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">
                      {getMarketByCode(organizationFilters.selectedMarket)?.market_name || organizationFilters.selectedMarket}
                    </span>
                  </div>
                )}
                {organizationFilters.selectedRegion && (
                  <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 pl-4">
                    <Building className="h-3 w-3" />
                    <span className="truncate">
                      {getRegionByCode(organizationFilters.selectedRegion)?.region_name || organizationFilters.selectedRegion}
                    </span>
                  </div>
                )}
                {organizationFilters.selectedBranch && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 pl-8">
                    <Building className="h-3 w-3" />
                    <span className="truncate">
                      {getBranchByCode(organizationFilters.selectedBranch)?.branch_name || organizationFilters.selectedBranch}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <Badge variant="default" className="h-6 w-6 p-0 rounded-full bg-blue-600">
                    <Filter className="h-3 w-3 text-white" />
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="space-y-1">
                  <p className="font-semibold">Active Organization Filters</p>
                  {organizationFilters.selectedMarket && (
                    <p className="text-xs">Market: {getMarketByCode(organizationFilters.selectedMarket)?.market_name || organizationFilters.selectedMarket}</p>
                  )}
                  {organizationFilters.selectedRegion && (
                    <p className="text-xs">Region: {getRegionByCode(organizationFilters.selectedRegion)?.region_name || organizationFilters.selectedRegion}</p>
                  )}
                  {organizationFilters.selectedBranch && (
                    <p className="text-xs">Branch: {getBranchByCode(organizationFilters.selectedBranch)?.branch_name || organizationFilters.selectedBranch}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        {/* Recently Viewed Section */}
        {!isPreview && recentMounted && recentPages.length > 0 && !isCollapsed && (
          <>
            <div
              className="px-2 mb-1"
              onMouseEnter={() => setRecentPagesExpanded(true)}
              onMouseLeave={() => setRecentPagesExpanded(false)}
            >
              <button
                onClick={() => setRecentPagesExpanded(!recentPagesExpanded)}
                className="flex items-center justify-between w-full px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <ChevronDown className={cn(
                    'h-3 w-3 text-gray-400 transition-transform duration-200',
                    recentPagesExpanded && 'transform rotate-180'
                  )} />
                  <History className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Recent
                  </span>
                  <span className="text-xs text-gray-400">({recentPages.length})</span>
                </div>
                {recentPagesExpanded && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      clearRecent()
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity cursor-pointer"
                    aria-label="Clear recent pages"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        clearRecent()
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-gray-400" />
                  </div>
                )}
              </button>
              {recentPagesExpanded && (
                <nav className="space-y-0.5 mt-1">
                  {recentPages.slice(0, 5).map((page) => {
                    const isActive = pathname === page.path
                    return (
                      <Link
                        key={page.path}
                        href={page.path}
                        onClick={handleNavClick}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                        title={page.title}
                      >
                        <Clock className={cn(
                          'h-3 w-3 flex-shrink-0',
                          isActive ? 'text-primary' : 'text-gray-400'
                        )} />
                        <span className="truncate">{page.title}</span>
                      </Link>
                    )
                  })}
                </nav>
              )}
            </div>
            <Separator className="my-2 mx-2" />
          </>
        )}

        <nav className="space-y-1 px-2">
          {navigation && Array.isArray(navigation) && navigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* RTX Power BI Feature Parity - Collapsible Sections */}
        {/* Show if: user is admin OR has rtxReports permission */}
        {/* Hide when: previewing (static mode only) */}
        {(isAdmin || hasPermission(currentRole, 'rtxReports')) && !isPreview && (
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
              {RTX_SECTIONS.map((section) => (
                <NavCollapsibleSection
                  key={section.name}
                  section={section}
                  currentRole={currentRole}
                  isCollapsed={isCollapsed}
                  isExpanded={expandedSections[section.name] || false}
                  onToggle={toggleSection}
                  isPreview={isPreview}
                  onNavigate={handleNavClick}
                />
              ))}
            </nav>
          </>
        )}

        {/* Governance Section - Admin Console, RTX Discovery, QBR, WBR (ADMIN ONLY) */}
        {/* Show for all admins regardless of role */}
        {/* Hide when: previewing (static mode only) */}
        {isAdmin && !isPreview && (
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
              {GOVERNANCE_NAV.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </>
        )}

        <Separator className="my-4 mx-2" />

        <nav className="space-y-1 px-2">
          {SETTINGS_NAV.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
          {isAdmin && !isPreview && !isRolePreviewActive && (
            <NavItem item={{ name: 'Admin', href: '/admin', icon: Lock }} />
          )}
        </nav>
      </ScrollArea>

      {/* Role Indicator */}
      {!isCollapsed && (
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {isPreview ? 'Preview Role' : 'Your Role'}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {getRoleLabel(currentRole)}
          </div>
          {isPreview && (
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Preview Mode
            </div>
          )}
        </div>
      )}

      {/* Exit Preview Button - shown when in preview mode and user is admin */}
      {!isCollapsed && isClient && storeIsAdmin && previewRole && (
        <div className="p-2 border-t dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <Button
            variant="outline"
            size="sm"
            onClick={exitRolePreview}
            className="w-full justify-center gap-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium"
          >
            <Eye className="h-4 w-4" />
            Exit Preview
          </Button>
        </div>
      )}

      {/* Collapse Button - only on desktop, not in preview mode */}
      {!isMobile && !isPreview && (
        <div className="p-2 border-t dark:border-gray-700">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}
