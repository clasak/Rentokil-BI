"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Database, Cloud, FlaskConical, Check, Clock, AlertTriangle,
  ExternalLink, ChevronDown
} from 'lucide-react'

export type DataSourceMode = 'simulation' | 'rtx' | 'hybrid'
type RTXStatus = 'connected' | 'pending_access' | 'disconnected'

function getRTXBadgeVariant(status: RTXStatus): 'success' | 'warning' | 'secondary' {
  switch (status) {
    case 'connected': return 'success'
    case 'pending_access': return 'warning'
    case 'disconnected': return 'secondary'
  }
}

function getRTXStatusDisplay(status: RTXStatus) {
  switch (status) {
    case 'connected':
      return <><Check className="h-3 w-3" /> Connected</>
    case 'pending_access':
      return <><Clock className="h-3 w-3" /> Access Pending</>
    case 'disconnected':
      return <><AlertTriangle className="h-3 w-3" /> Disconnected</>
  }
}

interface ConnectionStatusProps {
  className?: string
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const [isOpen, setIsOpen] = useState(false)

  // In production, this would come from the store or environment
  const currentMode: DataSourceMode = 'simulation'
  const rtxStatus: RTXStatus = 'pending_access'

  const getModeConfig = (mode: DataSourceMode) => {
    switch (mode) {
      case 'simulation':
        return {
          icon: FlaskConical,
          label: 'Simulation Mode',
          description: 'Using synthetic demo data',
          badgeVariant: 'warning' as const,
          color: 'text-amber-600 dark:text-amber-400'
        }
      case 'rtx':
        return {
          icon: Database,
          label: 'RTX Connected',
          description: 'Live production data',
          badgeVariant: 'success' as const,
          color: 'text-green-600 dark:text-green-400'
        }
      case 'hybrid':
        return {
          icon: Cloud,
          label: 'Hybrid Mode',
          description: 'RTX + simulation fallback',
          badgeVariant: 'secondary' as const,
          color: 'text-blue-600 dark:text-blue-400'
        }
    }
  }

  const modeConfig = getModeConfig(currentMode)
  const ModeIcon = modeConfig.icon

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${className}`}
            >
              <ModeIcon className={`h-4 w-4 ${modeConfig.color}`} />
              <span className="text-sm font-medium">{modeConfig.label}</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to view data source details</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Data Source Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Current Mode */}
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Current Data Source
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <ModeIcon className={`h-5 w-5 ${modeConfig.color}`} />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {modeConfig.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {modeConfig.description}
                </div>
              </div>
            </div>
          </div>

          {/* RTX Status */}
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              RTX Data Hub Status
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-gray-500" />
                <span className="text-sm">RTX Data Hub</span>
              </div>
              <Badge
                variant={getRTXBadgeVariant(rtxStatus)}
                className="gap-1"
              >
                {getRTXStatusDisplay(rtxStatus)}
              </Badge>
            </div>
          </div>

          {/* Info Text */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
            {currentMode === 'simulation' ? (
              <>
                Simulation mode uses synthetic data that mirrors production schema.
                Dashboard will transition seamlessly once RTX access is approved.
              </>
            ) : (
              <>
                Connected to production data sources. Data refreshes daily at 6 AM EST.
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link href="/integration" className="flex-1" onClick={() => setIsOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                Integration Roadmap
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
            <Link href="/settings/data-sources" className="flex-1" onClick={() => setIsOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
