'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  Home,
  Users,
  Target,
  DollarSign,
  Settings,
  Wrench,
  TrendingUp,
  BarChart3,
  Building2,
  MapPin,
  Calendar,
  Shield,
  Clock,
  FileText,
  Search,
  X,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface PageItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  section: string
  keywords?: string[]
}

const PAGES: PageItem[] = [
  // Main
  { name: 'Command Center', href: '/', icon: Home, section: 'Main', keywords: ['home', 'dashboard', 'overview'] },
  { name: 'Admin Console', href: '/admin', icon: Settings, section: 'Main', keywords: ['settings', 'admin', 'config'] },

  // Leads
  { name: 'Leads Overview', href: '/leads', icon: Users, section: 'Leads', keywords: ['leads', 'prospects'] },
  { name: 'Leads by Type & Pest', href: '/leads/type-pest', icon: Users, section: 'Leads', keywords: ['pest', 'termite', 'rodent'] },
  { name: 'Lead Trends', href: '/leads/trends', icon: TrendingUp, section: 'Leads', keywords: ['trend', 'analytics'] },
  { name: 'Lead Rankings', href: '/leads/rankings', icon: BarChart3, section: 'Leads', keywords: ['rank', 'leaderboard'] },
  { name: 'Lead Cancellations', href: '/leads/cancels', icon: X, section: 'Leads', keywords: ['cancel', 'churn'] },
  { name: 'Geographic Distribution', href: '/leads/geographic', icon: MapPin, section: 'Leads', keywords: ['map', 'geography', 'location'] },
  { name: 'Lead Journey', href: '/leads/journey', icon: TrendingUp, section: 'Leads', keywords: ['funnel', 'journey', 'conversion'] },

  // SALTI
  { name: 'SALTI Dashboard', href: '/salti', icon: Target, section: 'SALTI', keywords: ['salti', 'sales', 'activity'] },
  { name: 'Daily Check-In', href: '/salti/daily-check-in', icon: Calendar, section: 'SALTI', keywords: ['daily', 'check-in'] },
  { name: 'Productivity', href: '/salti/productivity', icon: BarChart3, section: 'SALTI', keywords: ['productivity', 'efficiency'] },
  { name: 'Proposal Pipeline', href: '/salti/proposal-pipeline', icon: FileText, section: 'SALTI', keywords: ['proposal', 'pipeline'] },
  { name: 'Sales Ladders', href: '/salti/sales-ladders', icon: TrendingUp, section: 'SALTI', keywords: ['ladder', 'ranking'] },
  { name: 'Weekend Blitz', href: '/salti/weekend-blitz', icon: Target, section: 'SALTI', keywords: ['weekend', 'blitz'] },
  { name: 'YoY Trends', href: '/salti/yoy-trends', icon: TrendingUp, section: 'SALTI', keywords: ['year', 'yoy', 'trend'] },
  { name: 'Funnel Fallout', href: '/salti/funnel-fallout', icon: BarChart3, section: 'SALTI', keywords: ['funnel', 'fallout', 'dropout'] },

  // Sales
  { name: 'Sales Overview', href: '/sales', icon: DollarSign, section: 'Sales', keywords: ['sales', 'revenue'] },
  { name: 'Sales Today', href: '/sales/today', icon: Calendar, section: 'Sales', keywords: ['today', 'daily'] },
  { name: 'Start Rate', href: '/sales/start-rate', icon: TrendingUp, section: 'Sales', keywords: ['start', 'rate'] },
  { name: 'Backlog', href: '/sales/backlog', icon: Clock, section: 'Sales', keywords: ['backlog', 'pending'] },
  { name: 'Speed to Install', href: '/sales/speed-to-install', icon: Clock, section: 'Sales', keywords: ['speed', 'install', 'sla'] },
  { name: 'Canceled Agreements', href: '/sales/canceled-agreements', icon: X, section: 'Sales', keywords: ['cancel', 'agreement'] },

  // Operations
  { name: 'Operations Overview', href: '/ops', icon: Wrench, section: 'Operations', keywords: ['ops', 'operations', 'service'] },
  { name: 'National Ops', href: '/ops/national', icon: Building2, section: 'Operations', keywords: ['national', 'company-wide'] },
  { name: 'Tech Tickets', href: '/tech/tickets', icon: Wrench, section: 'Operations', keywords: ['tech', 'tickets', 'dispatch'] },

  // Finance
  { name: 'Finance Overview', href: '/finance', icon: BarChart3, section: 'Finance', keywords: ['finance', 'ar', 'revenue'] },
  { name: 'AR Aging', href: '/finance/ar', icon: Clock, section: 'Finance', keywords: ['ar', 'aging', 'collections'] },

  // HR & People
  { name: 'People Overview', href: '/people', icon: Users, section: 'HR', keywords: ['people', 'hr', 'employees'] },
  { name: 'HR Retention', href: '/hr/retention', icon: Users, section: 'HR', keywords: ['retention', 'turnover'] },
  { name: 'Tech Productivity', href: '/workforce/tech-productivity', icon: BarChart3, section: 'HR', keywords: ['technician', 'productivity'] },

  // Hierarchy
  { name: 'Market Daily', href: '/market/daily', icon: Building2, section: 'Hierarchy', keywords: ['market', 'daily'] },
  { name: 'Region Daily', href: '/region/daily', icon: Building2, section: 'Hierarchy', keywords: ['region', 'daily'] },
  { name: 'Branch Daily', href: '/branch/daily', icon: Building2, section: 'Hierarchy', keywords: ['branch', 'daily'] },

  // Termite
  { name: 'PNI Dashboard', href: '/termite/pni', icon: Target, section: 'Termite', keywords: ['pni', 'termite', 'inspect'] },
  { name: 'Termite Renewals', href: '/termite/renewals', icon: Calendar, section: 'Termite', keywords: ['renewal', 'termite'] },

  // AE
  { name: 'AE Dashboard', href: '/ae', icon: TrendingUp, section: 'Account Executive', keywords: ['ae', 'account', 'executive', 'rep'] },
]

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  // Toggle on Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false)
      setSearch('')
      router.push(href)
    },
    [router]
  )

  // Group pages by section
  const sections = PAGES.reduce<Record<string, PageItem[]>>((acc, page) => {
    if (!acc[page.section]) {
      acc[page.section] = []
    }
    acc[page.section].push(page)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-lg overflow-hidden">
        <Command className="rounded-lg border shadow-md" shouldFilter={true}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search pages..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            {Object.entries(sections).map(([section, items]) => (
              <Command.Group
                key={section}
                heading={section}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {items.map((page) => (
                  <Command.Item
                    key={page.href}
                    value={`${page.name} ${page.keywords?.join(' ') || ''}`}
                    onSelect={() => handleSelect(page.href)}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <page.icon className="mr-2 h-4 w-4" />
                    <span>{page.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {page.href}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <span className="text-xs">↑</span>
              </kbd>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <span className="text-xs">↓</span>
              </kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                Enter
              </kbd>
              <span>Select</span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
