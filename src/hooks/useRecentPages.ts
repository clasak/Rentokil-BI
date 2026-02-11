'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export interface RecentPage {
  path: string
  title: string
  timestamp: number
  icon?: string
}

const STORAGE_KEY = 'rentokil-recent-pages'
const MAX_RECENT_PAGES = 10

// Page titles mapping
const PAGE_TITLES: Record<string, string> = {
  '/': 'Command Center',
  '/admin': 'Platform Admin',
  '/ae': 'AE Dashboard',
  '/ae/sales': 'Sales Hub',
  '/ae/accounts': 'Account Search',
  '/ae/pipeline': 'Sales Pipeline',
  '/ae/new-starts': 'New Starts Log',
  '/ae/new-starts/new': 'Add New Start',
  '/ae/proposal/new': 'Create Proposal',
  '/ae/sale/new': 'Log Sale',
  '/ae/tracker': 'Sales Tracker',
  '/branch/daily': 'Branch Daily Performance',
  '/call-center': 'Call Center Performance',
  '/cross-functional': 'Cross-Functional Dashboard',
  '/customer-satisfaction': 'Customer Satisfaction (NPS)',
  '/finance': 'Finance Dashboard',
  '/finance/ar': 'Accounts Receivable',
  '/finance/pnl': 'P&L Statement',
  '/finance/projections': 'Revenue Projections',
  '/forecast': 'Revenue Forecast',
  '/governance/data-dictionary': 'Data Dictionary',
  '/governance/data-quality': 'Data Quality Dashboard',
  '/governance/field-lineage': 'Field Lineage',
  '/hr/retention': 'Employee Retention',
  '/lead-service-engine': 'Lead Service Engine',
  '/lead-service-engine/at-risk': 'At-Risk Leads',
  '/lead-service-engine/handoffs': 'AE Handoffs',
  '/leads/cancels': 'Lead Cancellations',
  '/leads/geographic': 'Geographic Analysis',
  '/leads/journey': 'Lead Journey Tracking',
  '/leads/rankings': 'Lead Rankings',
  '/leads/trends': 'Lead Trends',
  '/leads/type-pest': 'Leads by Type & Pest',
  '/manager/daily-cadence': 'Daily Cadence',
  '/manager/wig-scorecard': 'WIG Scorecard',
  '/market/daily': 'Market Daily Performance',
  '/ops': 'Operations Dashboard',
  '/ops/national': 'National Operations',
  '/ops/new-starts': 'New Starts Monitor',
  '/people': 'People & Workforce',
  '/portfolio': 'Portfolio Analytics',
  '/qbr': 'Quarterly Business Review',
  '/region/daily': 'Region Daily Performance',
  '/region/weekly-wig': 'Weekly WIG Review',
  '/sales': 'Sales Dashboard',
  '/sales/backlog': 'Sales Backlog',
  '/sales/canceled-agreements': 'Canceled Agreements',
  '/sales/national': 'National Sales',
  '/sales/speed-to-install': 'Speed to Install',
  '/sales/start-rate': 'Start Rate Analysis',
  '/sales/today': 'Sales Today',
  '/salti': 'SALTI Dashboard',
  '/salti/daily-check-in': 'Daily Check-In',
  '/salti/funnel-fallout': 'Funnel Fallout',
  '/salti/productivity': 'SALTI Productivity',
  '/salti/proposal-pipeline': 'Proposal Pipeline',
  '/salti/sales-ladders': 'Sales Ladders',
  '/salti/weekend-blitz': 'Weekend Blitz',
  '/salti/yoy-trends': 'YoY Trends',
  '/tech': 'Technician Dashboard',
  '/tech/tickets': 'Tech Tickets',
  '/termite/pni': 'PNI Inspections',
  '/termite/renewals': 'Termite Renewals',
  '/ai-roadmap': 'AI & Data Science Roadmap',
  '/wbr': 'Weekly Business Review',
  '/workforce/tech-productivity': 'Tech Productivity',
}

export function useRecentPages() {
  const pathname = usePathname()
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const [mounted, setMounted] = useState(false)

  // Load recent pages from localStorage on mount
  useEffect(() => {
    setMounted(true)
    loadRecentPages()
  }, [])

  // Track page visit when pathname changes
  useEffect(() => {
    if (mounted && pathname) {
      trackPageVisit(pathname)
    }
  }, [pathname, mounted])

  const loadRecentPages = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const pages: RecentPage[] = JSON.parse(stored)
        setRecentPages(pages)
      }
    } catch (error) {
      console.error('Failed to load recent pages:', error)
    }
  }, [])

  const saveRecentPages = useCallback((pages: RecentPage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
      setRecentPages(pages)
    } catch (error) {
      console.error('Failed to save recent pages:', error)
    }
  }, [])

  const trackPageVisit = useCallback(
    (path: string) => {
      // Don't track auth pages, onboarding, or generic routes
      if (
        path === '/login' ||
        path === '/onboarding' ||
        path === '/auth/sso-callback' ||
        path.startsWith('/api/')
      ) {
        return
      }

      const title = PAGE_TITLES[path] || path
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '))
        .join(' > ')

      const newPage: RecentPage = {
        path,
        title,
        timestamp: Date.now(),
      }

      // Load existing pages
      let pages: RecentPage[] = []
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          pages = JSON.parse(stored)
        }
      } catch (error) {
        console.error('Failed to load recent pages:', error)
      }

      // Remove duplicate if exists (same path)
      pages = pages.filter((p) => p.path !== path)

      // Add new page to beginning
      pages.unshift(newPage)

      // Keep only MAX_RECENT_PAGES
      pages = pages.slice(0, MAX_RECENT_PAGES)

      // Save updated pages
      saveRecentPages(pages)
    },
    [saveRecentPages]
  )

  const clearRecent = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setRecentPages([])
    } catch (error) {
      console.error('Failed to clear recent pages:', error)
    }
  }, [])

  return {
    recentPages,
    clearRecent,
    mounted,
  }
}
