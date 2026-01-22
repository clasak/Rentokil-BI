"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, ROLE_PERMISSIONS } from '@/store'
import { getAccounts, getOpportunities, getInvoices, getMarkets } from '@/lib/data'
import { getAEData } from '@/lib/sales-tracker-data'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search, Bell, RefreshCw, User, Shield, Map,
  Settings, HelpCircle, Sun, Moon, Monitor,
  AlertTriangle, CheckCircle, Clock, LogOut, Mail, Menu
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  onMenuClick?: () => void
  mobileMenuOpen?: boolean
}

// Search result type for better type safety
interface SearchResult {
  type: 'Account' | 'Opportunity' | 'Invoice'
  id: string
  name: string
  subtitle?: string
  href: string
}

// Max recent searches to store
const MAX_RECENT_SEARCHES = 5
const RECENT_SEARCHES_KEY = 'rentokil-bi-recent-searches'

export function Header({ onMenuClick, mobileMenuOpen }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([])
  const [isClient, setIsClient] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const {
    settings,
    filters,
    refreshData,
    getCurrentUserScope,
    theme,
    setTheme,
    setMarketFilter,
  } = useAppStore()

  // Load user info and recent searches
  useEffect(() => {
    setIsClient(true)

    // Load recent searches
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Load user info
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
          // Try to get name from profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('name')
            .eq('id', user.id)
            .single()
          if (profile?.name) {
            setUserName(profile.name)
          } else {
            // Fallback to local storage
            const stored = localStorage.getItem('user_profile')
            if (stored) {
              const parsed = JSON.parse(stored)
              setUserName(parsed.name)
            }
          }
        }
      } catch (e) {
        // Check local storage fallback
        const stored = localStorage.getItem('user_profile')
        if (stored) {
          const parsed = JSON.parse(stored)
          setUserName(parsed.name)
          setUserEmail(parsed.email)
        }
      }
    }
    loadUser()
  }, [supabase])

  // Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  const scope = getCurrentUserScope()
  const allMarkets = getMarkets()

  // Get markets available to current user based on role scope
  const availableMarkets = isClient
    ? (scope.markets.length > 0
        ? allMarkets.filter(m => scope.markets.includes(m.id))
        : allMarkets) // Execs see all markets
    : []

  // Get currently selected market
  const selectedMarketId = filters.marketIds?.[0] || 'all'

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    const accounts = getAccounts()
    const opportunities = getOpportunities()
    const invoices = getInvoices()
    const aeData = getAEData()
    const lowerQuery = query.toLowerCase()

    const results: SearchResult[] = []

    // Search accounts
    accounts
      .filter(a => a.name.toLowerCase().includes(lowerQuery) || a.id.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .forEach(a => results.push({
        type: 'Account',
        id: a.id,
        name: a.name,
        subtitle: a.vertical,
        href: `/account/${a.id}`
      }))

    // Search opportunities
    opportunities
      .filter(o => o.name.toLowerCase().includes(lowerQuery) || o.id.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .forEach(o => results.push({
        type: 'Opportunity',
        id: o.id,
        name: o.name,
        subtitle: `${o.stage} • $${o.amount.toLocaleString()}`,
        href: `/sales/opportunity/${o.id}`
      }))

    // Search invoices
    invoices
      .filter(i => i.id.toLowerCase().includes(lowerQuery) || i.accountName.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .forEach(i => results.push({
        type: 'Invoice',
        id: i.id,
        name: `${i.accountName} - ${i.id}`,
        subtitle: `$${i.amount.toLocaleString()} • ${i.status}`,
        href: `/finance/invoice/${i.id}`
      }))

    // Search AE proposals (from sales tracker)
    if (aeData) {
      const allProposals = aeData.monthlyData.flatMap(m => m.proposals)
      allProposals
        .filter(p => p.companyName.toLowerCase().includes(lowerQuery) || p.id.toLowerCase().includes(lowerQuery))
        .slice(0, 5)
        .forEach(p => {
          const total = p.jobWorkPrice + p.termitePrice + (p.contractPrice * 12)
          results.push({
            type: 'Opportunity',
            id: p.id,
            name: p.companyName,
            subtitle: `${p.service} • $${total.toLocaleString()}${p.sold ? ' • Sold' : p.dead ? ' • Dead' : ' • Open'}`,
            href: '/ae/tracker/proposals'
          })
        })
    }

    setSearchResults(results)
  }

  // Save result to recent searches
  const saveRecentSearch = (result: SearchResult) => {
    try {
      const updated = [result, ...recentSearches.filter(r => r.id !== result.id)].slice(0, MAX_RECENT_SEARCHES)
      setRecentSearches(updated)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(result)
    router.push(result.href)
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      // Clear onboarding cookie
      document.cookie = 'onboarding_complete=; path=/; max-age=0'
      // Clear local storage
      localStorage.removeItem('user_profile')
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setSigningOut(false)
      setUserMenuOpen(false)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
    <header className="h-14 sm:h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-6 shadow-sm">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden mr-2"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-xl">
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              {/* Full search on desktop, icon only on mobile */}
              <Input
                placeholder="Search..."
                className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hidden sm:block"
                onFocus={() => setSearchOpen(true)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Global Search</span>
                <span className="text-xs font-normal text-gray-400">⌘K to open</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search accounts, opportunities, invoices..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />

              {/* Recent searches (shown when no query) */}
              {searchQuery.length < 2 && recentSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent</span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((result) => (
                      <button
                        key={`recent-${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                      >
                        <Clock className="h-4 w-4 text-gray-400" />
                        <Badge variant="outline" className="text-xs">{result.type}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{result.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-auto">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Results</span>
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                    >
                      <Badge variant="outline">{result.type}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{result.subtitle || result.id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No results found for &quot;{searchQuery}&quot;</p>
                  <p className="text-xs text-gray-400 mt-1">Try searching for account names, opportunity titles, or invoice numbers</p>
                </div>
              )}

              {searchQuery.length < 2 && recentSearches.length === 0 && (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Start typing to search</p>
                  <p className="text-xs text-gray-400 mt-1">Search across accounts, opportunities, and invoices</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Center - Role Badge (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-4 mx-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Shield className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium dark:text-gray-200">
            <span className="text-primary">{isClient ? (ROLE_PERMISSIONS[settings.role]?.label ?? 'Executive') : 'Loading...'}</span>
          </span>
          <span className="text-gray-400">|</span>
          <Map className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm dark:text-gray-200">
            {isClient ? scope.scope : 'Loading...'}
          </span>
        </div>

        {/* Market Selector */}
        {isClient && availableMarkets.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select
                  value={selectedMarketId}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setMarketFilter([])
                    } else {
                      setMarketFilter([value])
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-primary" />
                      <SelectValue placeholder="All Markets" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        All Markets
                      </div>
                    </SelectItem>
                    {availableMarkets.map((market) => (
                      <SelectItem key={market.id} value={market.id}>
                        {market.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter data by market</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Theme Toggle - hidden on small screens */}
        <div className="hidden sm:block">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
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
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Change color theme</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Refresh Data - hidden on mobile */}
        <div className="hidden sm:block">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  refreshData()
                  window.location.reload()
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh data</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Notifications */}
        <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>View notifications</p>
            </TooltipContent>
          </Tooltip>
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

        {/* User Profile */}
        <Dialog open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your profile</p>
            </TooltipContent>
          </Tooltip>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Your Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-lg">{userName || 'User'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {isClient ? (ROLE_PERMISSIONS[settings.role]?.label ?? 'User') : 'Loading...'}
                  </div>
                </div>
              </div>

              {userEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <Mail className="h-4 w-4" />
                  {userEmail}
                </div>
              )}

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
                    router.push('/governance')
                  }}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help & Documentation
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
    </TooltipProvider>
  )
}
