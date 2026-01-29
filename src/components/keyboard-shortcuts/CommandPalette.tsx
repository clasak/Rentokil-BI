"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard, TrendingUp, Wrench, DollarSign, Users,
  Target, Calendar, Briefcase, Star, Settings, HelpCircle,
  FileText, Shield, Database, Building, Search, Moon, Sun,
  RefreshCw, LogOut, ChevronRight
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

export interface Command {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  keywords?: string[]
  action: () => void
  category: 'navigation' | 'actions' | 'settings' | 'help'
  shortcut?: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme, refreshData, settings } = useAppStore()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Define all available commands
  const allCommands = useMemo<Command[]>(() => [
    // Navigation
    {
      id: 'nav-home',
      label: 'Command Center',
      description: 'Executive KPI overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      keywords: ['home', 'dashboard', 'command', 'center', 'executive'],
      action: () => router.push('/'),
      category: 'navigation',
      shortcut: 'G then H'
    },
    {
      id: 'nav-sales',
      label: 'Sales Overview',
      description: 'Sales metrics and pipeline',
      icon: <TrendingUp className="h-4 w-4" />,
      keywords: ['sales', 'revenue', 'pipeline'],
      action: () => router.push('/sales'),
      category: 'navigation',
      shortcut: 'G then S'
    },
    {
      id: 'nav-operations',
      label: 'Operations',
      description: 'Service and operations metrics',
      icon: <Wrench className="h-4 w-4" />,
      keywords: ['operations', 'ops', 'service'],
      action: () => router.push('/ops'),
      category: 'navigation',
      shortcut: 'G then O'
    },
    {
      id: 'nav-finance',
      label: 'Finance',
      description: 'Financial metrics and AR',
      icon: <DollarSign className="h-4 w-4" />,
      keywords: ['finance', 'money', 'ar', 'aging'],
      action: () => router.push('/finance'),
      category: 'navigation',
      shortcut: 'G then F'
    },
    {
      id: 'nav-people',
      label: 'People',
      description: 'Workforce capacity and utilization',
      icon: <Users className="h-4 w-4" />,
      keywords: ['people', 'workforce', 'hr', 'capacity'],
      action: () => router.push('/people'),
      category: 'navigation',
      shortcut: 'G then P'
    },
    {
      id: 'nav-forecast',
      label: 'Forecast',
      description: '8-week revenue projections',
      icon: <Target className="h-4 w-4" />,
      keywords: ['forecast', 'projections', 'predictions'],
      action: () => router.push('/forecast'),
      category: 'navigation',
    },
    {
      id: 'nav-salti',
      label: 'SALTI Dashboard',
      description: 'Sales leadership tracking',
      icon: <Briefcase className="h-4 w-4" />,
      keywords: ['salti', 'sales', 'leadership'],
      action: () => router.push('/salti'),
      category: 'navigation',
    },
    {
      id: 'nav-customer-sat',
      label: 'Customer Satisfaction',
      description: 'NPS and feedback metrics',
      icon: <Star className="h-4 w-4" />,
      keywords: ['customer', 'satisfaction', 'nps', 'feedback'],
      action: () => router.push('/customer-satisfaction'),
      category: 'navigation',
    },
    {
      id: 'nav-governance',
      label: 'Governance',
      description: 'Data quality and definitions',
      icon: <Shield className="h-4 w-4" />,
      keywords: ['governance', 'data', 'quality', 'dictionary'],
      action: () => router.push('/governance'),
      category: 'navigation',
      shortcut: 'G then G'
    },
    {
      id: 'nav-admin',
      label: 'Admin Console',
      description: 'Platform administration',
      icon: <Database className="h-4 w-4" />,
      keywords: ['admin', 'console', 'platform', 'settings'],
      action: () => router.push('/admin'),
      category: 'navigation',
    },

    // Actions
    {
      id: 'action-refresh',
      label: 'Refresh Data',
      description: 'Reload dashboard and clear cache',
      icon: <RefreshCw className="h-4 w-4" />,
      keywords: ['refresh', 'reload', 'update'],
      action: () => {
        refreshData()
        window.location.reload()
      },
      category: 'actions',
      shortcut: 'R'
    },
    {
      id: 'action-search',
      label: 'Global Search',
      description: 'Search across all data',
      icon: <Search className="h-4 w-4" />,
      keywords: ['search', 'find', 'lookup'],
      action: () => {
        onOpenChange(false)
        // Trigger search dialog
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
          searchInput?.focus()
        }, 100)
      },
      category: 'actions',
      shortcut: '/'
    },

    // Settings
    {
      id: 'settings-theme-light',
      label: 'Light Theme',
      description: 'Switch to light mode',
      icon: <Sun className="h-4 w-4" />,
      keywords: ['light', 'theme', 'bright'],
      action: () => setTheme('light'),
      category: 'settings',
    },
    {
      id: 'settings-theme-dark',
      label: 'Dark Theme',
      description: 'Switch to dark mode',
      icon: <Moon className="h-4 w-4" />,
      keywords: ['dark', 'theme', 'night'],
      action: () => setTheme('dark'),
      category: 'settings',
    },
    {
      id: 'settings-theme-system',
      label: 'System Theme',
      description: 'Match system preferences',
      icon: <Settings className="h-4 w-4" />,
      keywords: ['system', 'theme', 'auto'],
      action: () => setTheme('system'),
      category: 'settings',
    },
    {
      id: 'settings-page',
      label: 'Settings',
      description: 'App settings and preferences',
      icon: <Settings className="h-4 w-4" />,
      keywords: ['settings', 'preferences', 'config'],
      action: () => router.push('/settings'),
      category: 'settings',
    },

    // Help
    {
      id: 'help-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: <HelpCircle className="h-4 w-4" />,
      keywords: ['keyboard', 'shortcuts', 'hotkeys', 'help'],
      action: () => {
        onOpenChange(false)
        // Open shortcuts help modal
        window.dispatchEvent(new CustomEvent('show-shortcuts-help'))
      },
      category: 'help',
      shortcut: '?'
    },
    {
      id: 'help-docs',
      label: 'Documentation',
      description: 'View help and documentation',
      icon: <FileText className="h-4 w-4" />,
      keywords: ['help', 'docs', 'documentation', 'guide'],
      action: () => router.push('/governance'),
      category: 'help',
    },
  ], [router, theme, setTheme, refreshData, onOpenChange])

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return allCommands

    const searchLower = search.toLowerCase()
    return allCommands.filter(command => {
      const labelMatch = command.label.toLowerCase().includes(searchLower)
      const descriptionMatch = command.description?.toLowerCase().includes(searchLower)
      const keywordsMatch = command.keywords?.some(kw => kw.toLowerCase().includes(searchLower))
      return labelMatch || descriptionMatch || keywordsMatch
    })
  }, [search, allCommands])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      actions: [],
      settings: [],
      help: []
    }

    filteredCommands.forEach(command => {
      groups[command.category].push(command)
    })

    return groups
  }, [filteredCommands])

  // Reset search and selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedIndex(0)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const command = filteredCommands[selectedIndex]
        if (command) {
          command.action()
          onOpenChange(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, filteredCommands, onOpenChange])

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleCommandClick = (command: Command) => {
    command.action()
    onOpenChange(false)
  }

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    settings: 'Settings',
    help: 'Help'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Command Palette
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-2 pb-3 border-b dark:border-gray-700">
          <Input
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 px-0 text-base"
            autoFocus
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No commands found</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => {
              if (commands.length === 0) return null

              return (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {categoryLabels[category]}
                  </div>
                  <div className="space-y-1">
                    {commands.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command)
                      const isSelected = globalIndex === selectedIndex

                      return (
                        <button
                          key={command.id}
                          onClick={() => handleCommandClick(command)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary dark:bg-primary/20'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                          )}
                        >
                          {command.icon}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{command.label}</div>
                            {command.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {command.description}
                              </div>
                            )}
                          </div>
                          {command.shortcut && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {command.shortcut}
                            </Badge>
                          )}
                          {isSelected && (
                            <ChevronRight className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border rounded">↵</kbd> Select</span>
              <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border rounded">Esc</kbd> Close</span>
            </div>
            <span className="text-gray-400">
              {filteredCommands.length} {filteredCommands.length === 1 ? 'command' : 'commands'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
