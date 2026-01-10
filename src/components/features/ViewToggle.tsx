"use client"

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Building2, TrendingUp, Truck, DollarSign, ChevronDown,
  BarChart3, Users, Target, Globe
} from 'lucide-react'

export type FunctionalView =
  | 'executive'   // Cross-functional executive view (default /)
  | 'sales'       // National sales view
  | 'ops'         // National ops view
  | 'finance'     // National finance view

interface ViewConfig {
  id: FunctionalView
  label: string
  shortLabel: string
  description: string
  icon: typeof Building2
  route: string
  color: string
}

const VIEW_CONFIG: Record<FunctionalView, ViewConfig> = {
  executive: {
    id: 'executive',
    label: 'Executive Command Center',
    shortLabel: 'Executive',
    description: 'Cross-functional view of all KPIs and metrics',
    icon: Building2,
    route: '/',
    color: 'text-purple-600'
  },
  sales: {
    id: 'sales',
    label: 'National Sales View',
    shortLabel: 'Sales',
    description: 'Pipeline, opportunities, and revenue metrics across all regions',
    icon: TrendingUp,
    route: '/sales/national',
    color: 'text-blue-600'
  },
  ops: {
    id: 'ops',
    label: 'National Operations View',
    shortLabel: 'Operations',
    description: 'Service delivery, technician efficiency, and callbacks nationwide',
    icon: Truck,
    route: '/ops/national',
    color: 'text-green-600'
  },
  finance: {
    id: 'finance',
    label: 'National Finance View',
    shortLabel: 'Finance',
    description: 'Revenue, AR aging, margins, and financial health',
    icon: DollarSign,
    route: '/finance',
    color: 'text-amber-600'
  }
}

interface ViewToggleProps {
  className?: string
  variant?: 'tabs' | 'dropdown' | 'pills'
}

export function ViewToggle({ className, variant = 'tabs' }: ViewToggleProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Determine current view from pathname
  const getCurrentView = (): FunctionalView => {
    if (pathname.startsWith('/sales/national')) return 'sales'
    if (pathname.startsWith('/ops/national')) return 'ops'
    if (pathname.startsWith('/finance')) return 'finance'
    return 'executive'
  }

  const currentView = getCurrentView()
  const currentConfig = VIEW_CONFIG[currentView]

  const handleViewChange = (view: FunctionalView) => {
    router.push(VIEW_CONFIG[view].route)
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`gap-2 ${className}`}>
            <currentConfig.icon className={`h-4 w-4 ${currentConfig.color}`} />
            {currentConfig.shortLabel}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Functional Views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.values(VIEW_CONFIG).map(view => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => handleViewChange(view.id)}
              className={`cursor-pointer ${currentView === view.id ? 'bg-primary/10' : ''}`}
            >
              <div className="flex items-start gap-3 py-1">
                <view.icon className={`h-5 w-5 mt-0.5 ${view.color}`} />
                <div>
                  <div className="font-medium">{view.label}</div>
                  <div className="text-xs text-gray-500">{view.description}</div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {Object.values(VIEW_CONFIG).map(view => (
          <Tooltip key={view.id}>
            <TooltipTrigger asChild>
              <Button
                variant={currentView === view.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewChange(view.id)}
                className={`gap-2 ${currentView === view.id ? '' : 'text-gray-600'}`}
              >
                <view.icon className={`h-4 w-4 ${currentView === view.id ? '' : view.color}`} />
                {view.shortLabel}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{view.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    )
  }

  // Default: tabs variant
  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <nav className="-mb-px flex space-x-6" aria-label="Views">
        {Object.values(VIEW_CONFIG).map(view => {
          const isActive = currentView === view.id
          return (
            <button
              key={view.id}
              onClick={() => handleViewChange(view.id)}
              className={`
                flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors
                ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <view.icon className={`h-4 w-4 ${isActive ? '' : view.color}`} />
              {view.shortLabel}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// Quick navigation buttons for functional views
export function FunctionalViewCards({ className }: { className?: string }) {
  const router = useRouter()

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {Object.values(VIEW_CONFIG).map(view => (
        <button
          key={view.id}
          onClick={() => router.push(view.route)}
          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <view.icon className={`h-5 w-5 ${view.color}`} />
            </div>
            <div className="font-semibold">{view.shortLabel}</div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{view.description}</p>
        </button>
      ))}
    </div>
  )
}
