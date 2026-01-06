"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, ROLE_PERMISSIONS, DEMO_MODE_CONFIG } from '@/store'
import { getMarkets, getAccounts, getOpportunities, getInvoices } from '@/lib/data'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Search, Bell, RefreshCw, User, Shield, Map,
  Play, Settings, HelpCircle
} from 'lucide-react'
import { Role, DemoMode } from '@/types'

export function Header() {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  const {
    settings,
    setRole,
    setDemoMode,
    refreshData,
    getCurrentUserScope,
    setTourActive,
  } = useAppStore()

  const scope = getCurrentUserScope()
  const markets = getMarkets()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    const accounts = getAccounts()
    const opportunities = getOpportunities()
    const invoices = getInvoices()
    const lowerQuery = query.toLowerCase()

    const results: any[] = []

    // Search accounts
    accounts
      .filter(a => a.name.toLowerCase().includes(lowerQuery) || a.id.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .forEach(a => results.push({ type: 'Account', id: a.id, name: a.name, href: `/account/${a.id}` }))

    // Search opportunities
    opportunities
      .filter(o => o.name.toLowerCase().includes(lowerQuery) || o.id.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .forEach(o => results.push({ type: 'Opportunity', id: o.id, name: o.name, href: `/sales/opportunity/${o.id}` }))

    // Search invoices
    invoices
      .filter(i => i.id.toLowerCase().includes(lowerQuery) || i.accountName.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .forEach(i => results.push({ type: 'Invoice', id: i.id, name: `${i.accountName} - ${i.id}`, href: `/finance/invoice/${i.id}` }))

    setSearchResults(results)
  }

  const handleResultClick = (href: string) => {
    router.push(href)
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search accounts, opportunities, invoices..."
                className="pl-10 bg-gray-50 border-gray-200"
                onFocus={() => setSearchOpen(true)}
              />
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Global Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result.href)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3"
                    >
                      <Badge variant="outline">{result.type}</Badge>
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-gray-500">{result.id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No results found</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Center - RLS Badge */}
      <div className="flex items-center gap-4 mx-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
          <Shield className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium">
            Viewing as: <span className="text-primary">{ROLE_PERMISSIONS[settings.role].label}</span>
          </span>
          <span className="text-gray-400">|</span>
          <Map className="h-4 w-4 text-gray-600" />
          <span className="text-sm">
            {scope.scope}
          </span>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Demo Mode Selector */}
        <Select
          value={settings.demoMode}
          onValueChange={(value) => setDemoMode(value as DemoMode)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Demo Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exec_bi_review">Exec BI Review</SelectItem>
            <SelectItem value="sales_ops_execution">Sales Ops</SelectItem>
            <SelectItem value="branch_field_manager">Branch Manager</SelectItem>
          </SelectContent>
        </Select>

        {/* Role Selector */}
        <Select
          value={settings.role}
          onValueChange={(value) => setRole(value as Role)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exec">Executive</SelectItem>
            <SelectItem value="vp_director">VP/Director</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="rep">Rep</SelectItem>
          </SelectContent>
        </Select>

        {/* Tour Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTourActive(true)}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Demo Tour
        </Button>

        {/* Refresh Data */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            refreshData()
            window.location.reload()
          }}
          title="Refresh Data"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* User */}
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
