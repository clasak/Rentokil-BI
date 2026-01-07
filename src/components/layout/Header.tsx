"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, ROLE_PERMISSIONS } from '@/store'
import { getAccounts, getOpportunities, getInvoices } from '@/lib/data'
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
  Play, Settings, HelpCircle, Sun, Moon, Monitor,
  AlertTriangle, CheckCircle, Clock, LogOut
} from 'lucide-react'
import { Role, DemoMode } from '@/types'

export function Header() {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const {
    settings,
    setRole,
    setDemoMode,
    refreshData,
    getCurrentUserScope,
    setTourActive,
    theme,
    setTheme,
  } = useAppStore()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const scope = getCurrentUserScope()

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
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search accounts, opportunities, invoices..."
                className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                    >
                      <Badge variant="outline">{result.type}</Badge>
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{result.id}</div>
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
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Shield className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium dark:text-gray-200">
            Viewing as: <span className="text-primary">{isClient ? ROLE_PERMISSIONS[settings.role].label : 'Loading...'}</span>
          </span>
          <span className="text-gray-400">|</span>
          <Map className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm dark:text-gray-200">
            {isClient ? scope.scope : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Demo Mode Selector */}
        <Select
          value={isClient ? settings.demoMode : 'exec_bi_review'}
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
          value={isClient ? settings.role : 'exec'}
          onValueChange={(value) => setRole(value as Role)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exec">Executive</SelectItem>
            <SelectItem value="director">Director</SelectItem>
            <SelectItem value="manager">Branch Manager</SelectItem>
            <SelectItem value="ops_manager">Ops Manager</SelectItem>
            <SelectItem value="rep">Account Exec</SelectItem>
            <SelectItem value="technician">Technician</SelectItem>
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

        {/* Theme Toggle */}
        <Select
          value={isClient ? theme : 'light'}
          onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light
              </div>
            </SelectItem>
            <SelectItem value="dark">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </div>
            </SelectItem>
            <SelectItem value="system">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

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
        <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Notifications</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-80 overflow-auto">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800 dark:text-red-300">High-Risk Account Alert</div>
                    <p className="text-sm text-red-700 dark:text-red-400">3 accounts flagged for retention risk</p>
                    <p className="text-xs text-red-500 dark:text-red-500 mt-1">2 hours ago</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-800 dark:text-yellow-300">Pipeline Update</div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">5 opportunities moved to negotiation</p>
                    <p className="text-xs text-yellow-500 dark:text-yellow-500 mt-1">4 hours ago</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-300">Deal Closed</div>
                    <p className="text-sm text-green-700 dark:text-green-400">New contract signed: $45,000 ARR</p>
                    <p className="text-xs text-green-500 dark:text-green-500 mt-1">Yesterday</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User */}
        <Dialog open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-lg">{isClient ? ROLE_PERMISSIONS[settings.role].label : 'User'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{isClient ? scope.scope : 'Loading...'}</div>
                </div>
              </div>
              <div className="border-t dark:border-gray-700 pt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setUserMenuOpen(false)
                    router.push('/settings')
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setUserMenuOpen(false)
                    router.push('/help')
                  }}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help & Support
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out (Demo)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  )
}
