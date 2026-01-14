"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { Role } from '@/types'
import {
  ChevronRight, ChevronLeft, X, HelpCircle, MessageCircle,
  Lightbulb, CheckCircle, LayoutDashboard, TrendingUp, Wrench,
  Target, Users, DollarSign, Calendar, ClipboardList, Truck,
  Send, Search, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Tutorial step configuration
export interface TutorialStep {
  elementId: string
  title: string
  description: string
  tips?: string[]
  route?: string // Navigate to this route before showing step
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  highlight?: boolean // Show spotlight effect on element
}

// Role-specific tutorial configurations
export const ROLE_TUTORIALS: Record<Role, { name: string; welcome: string; steps: TutorialStep[] }> = {
  exec: {
    name: 'Executive Dashboard',
    welcome: 'Welcome to the Executive Command Center! This tutorial will show you how to monitor your organization\'s key performance indicators at a glance.',
    steps: [
      {
        elementId: 'kpi-grid',
        title: 'Your KPI Dashboard',
        description: 'This is your command center showing the top 10 KPIs that matter most. Each card shows the current value, trend, and status compared to target.',
        tips: ['Green = On Track', 'Yellow = Warning', 'Red = Needs Attention'],
        route: '/',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'revenue-mtd-card',
        title: 'Revenue MTD',
        description: 'Click any KPI card to drill down into details. You\'ll see the full breakdown, historical trends, and what\'s driving the numbers.',
        tips: ['Click to see drivers and actions'],
        route: '/',
        position: 'bottom',
        highlight: true
      },
      {
        elementId: 'sidebar-nav',
        title: 'Navigation',
        description: 'Use the sidebar to navigate between departments: Sales, Operations, Finance, and more. Each has its own detailed dashboard.',
        route: '/',
        position: 'right',
        highlight: true
      },
      {
        elementId: 'sales-kpi-cards',
        title: 'Sales Dashboard',
        description: 'The Sales dashboard shows pipeline health, win rates, and rep performance. Monitor your sales team\'s effectiveness in real-time.',
        tips: ['CRM Hygiene Score shows data quality', 'Stalled deals are flagged automatically'],
        route: '/sales',
        position: 'bottom',
        highlight: true
      },
      {
        elementId: 'ops-kpi-cards',
        title: 'Operations Dashboard',
        description: 'Track service delivery quality, technician utilization, and customer satisfaction across all branches.',
        tips: ['Service Risk Index predicts customer churn', 'Callback rates under 5% is healthy'],
        route: '/ops',
        position: 'bottom',
        highlight: true
      },
      {
        elementId: 'forecast-chart',
        title: 'Revenue Forecast',
        description: 'Our ML-powered forecast shows 8-week projections with confidence intervals. Toggle between Base, Upside, and Downside scenarios.',
        tips: ['Backtest accuracy shows model reliability', 'Updated weekly with latest data'],
        route: '/forecast',
        position: 'top',
        highlight: true
      },
      {
        elementId: 'governance-tabs',
        title: 'Data Governance',
        description: 'Every metric is fully documented here. See definitions, data sources, owners, and quality scores. This is your single source of truth.',
        tips: ['KPI Dictionary has all definitions', 'Data Quality shows source health'],
        route: '/governance',
        position: 'bottom',
        highlight: true
      }
    ]
  },
  market_director: {
    name: 'Market Director Dashboard',
    welcome: 'Welcome! As a Market Director, you oversee multiple regions. This tutorial will help you monitor performance across your market.',
    steps: [
      {
        elementId: 'kpi-grid',
        title: 'Market Overview',
        description: 'Your command center shows aggregated KPIs across all regions in your market. Focus on trends and outliers.',
        route: '/',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'sidebar-nav',
        title: 'Department Views',
        description: 'Drill into Sales, Operations, and Finance to see detailed breakdowns by region and branch.',
        route: '/',
        position: 'right',
        highlight: true
      },
      {
        elementId: 'forecast-chart',
        title: 'Market Forecast',
        description: 'View revenue projections for your market. Use scenarios to plan for different outcomes.',
        route: '/forecast',
        position: 'top',
        highlight: true
      }
    ]
  },
  market_sales_director: {
    name: 'Market Sales Director Dashboard',
    welcome: 'Welcome! As a Market Sales Director, you lead sales strategy across your entire market. This tutorial will show you how to monitor and drive sales performance.',
    steps: [
      {
        elementId: 'kpi-grid',
        title: 'Market Sales Overview',
        description: 'Your command center shows sales KPIs across all regions. Focus on pipeline health and revenue attainment.',
        route: '/',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'sales-kpi-cards',
        title: 'Pipeline Dashboard',
        description: 'Monitor pipeline by region, identify stalled opportunities, and track win rates across your market.',
        route: '/sales',
        position: 'bottom',
        highlight: true
      },
      {
        elementId: 'lead-engine-nav',
        title: 'Lead Service Engine',
        description: 'Track lead conversion across all regions. Identify which sources and teams perform best.',
        route: '/lead-service-engine',
        position: 'center',
        highlight: true
      }
    ]
  },
  region_director: {
    name: 'Region Director Dashboard',
    welcome: 'Welcome! As a Region Director, you manage branches within your region. Let\'s explore your dashboard.',
    steps: [
      {
        elementId: 'kpi-grid',
        title: 'Region Performance',
        description: 'Monitor key metrics across all branches in your region. Identify which branches need attention.',
        route: '/',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'sales-kpi-cards',
        title: 'Regional Sales',
        description: 'Track pipeline and sales performance across your branches. Compare rep productivity.',
        route: '/sales',
        position: 'bottom',
        highlight: true
      },
      {
        elementId: 'ops-kpi-cards',
        title: 'Service Operations',
        description: 'Monitor service quality, technician utilization, and customer satisfaction for your region.',
        route: '/ops',
        position: 'bottom',
        highlight: true
      }
    ]
  },
  manager: {
    name: 'Branch Manager Dashboard',
    welcome: 'Welcome! As a Branch Manager, you have a unique view focused on daily operations and team performance.',
    steps: [
      {
        elementId: 'kpi-grid',
        title: 'Your Branch KPIs',
        description: 'These are the key metrics for your branch. Track daily progress against targets.',
        route: '/',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'daily-cadence-card',
        title: 'Daily Cadence',
        description: 'The Daily Cadence view helps you run your morning meeting. See leads, appointments, and sales activity at a glance.',
        tips: ['Great for morning standup', 'Updates throughout the day'],
        route: '/manager/daily-cadence',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'wig-scorecard',
        title: 'WIG Scorecard',
        description: 'Track your Wildly Important Goals. This scorecard shows progress on your key initiatives.',
        route: '/manager/wig-scorecard',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'lead-service-engine',
        title: 'Lead Service Engine',
        description: 'Monitor leads from source to sale. See conversion rates and identify bottlenecks in your funnel.',
        route: '/lead-service-engine',
        position: 'center',
        highlight: true
      }
    ]
  },
  sales_manager: {
    name: 'Sales Manager Dashboard',
    welcome: 'Welcome! As a Sales Manager, you\'ll focus on pipeline health, rep performance, and hitting targets.',
    steps: [
      {
        elementId: 'kpi-grid',
        title: 'Sales Overview',
        description: 'Your command center for sales KPIs. Monitor pipeline, win rates, and team performance.',
        route: '/',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'sales-kpi-cards',
        title: 'Pipeline Health',
        description: 'Track total pipeline, weighted value by stage, and deals at risk. The CRM Hygiene Score shows data quality.',
        tips: ['Stalled deals are 14+ days without activity', 'Hygiene issues hurt forecast accuracy'],
        route: '/sales',
        position: 'bottom',
        highlight: true
      },
      {
        elementId: 'conversion-funnel',
        title: 'Rep Performance',
        description: 'See how each rep is performing. Compare pipeline, close rates, and deal velocity.',
        route: '/sales',
        position: 'top',
        highlight: true
      },
      {
        elementId: 'lead-service-engine',
        title: 'Lead to Sale Funnel',
        description: 'Track leads from first contact to closed deal. Identify where leads are getting stuck.',
        route: '/lead-service-engine',
        position: 'center',
        highlight: true
      }
    ]
  },
  ops_manager: {
    name: 'Operations Manager Dashboard',
    welcome: 'Welcome! As an Operations Manager, you\'ll focus on service delivery, technician performance, and customer satisfaction.',
    steps: [
      {
        elementId: 'kpi-grid',
        title: 'Operations Overview',
        description: 'Your command center for operations KPIs. Monitor service quality, utilization, and customer satisfaction.',
        route: '/',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'ops-kpi-cards',
        title: 'Service Quality',
        description: 'Track callbacks, complaints, and customer satisfaction. The Service Risk Index predicts churn risk.',
        tips: ['Service Risk above 20 needs attention', 'CSAT below 4.0 requires action'],
        route: '/ops',
        position: 'bottom',
        highlight: true
      },
      {
        elementId: 'route-efficiency',
        title: 'Technician Utilization',
        description: 'See capacity utilization by branch. Identify teams running hot (overtime) or cold (underutilized).',
        tips: ['85-95% is optimal utilization', 'Over 100% means overtime'],
        route: '/ops',
        position: 'right',
        highlight: true
      },
      {
        elementId: 'new-starts-list',
        title: 'New Starts',
        description: 'Track new customer onboarding. See handoffs from sales and ensure smooth first service.',
        route: '/ops/new-starts',
        position: 'center',
        highlight: true
      }
    ]
  },
  rep: {
    name: 'Account Executive Dashboard',
    welcome: 'Welcome! Your dashboard is designed to help you track your personal sales performance and manage your pipeline.',
    steps: [
      {
        elementId: 'ae-dashboard',
        title: 'Your Personal Dashboard',
        description: 'This is your home base. See your pipeline, closed deals, and progress to quota at a glance.',
        route: '/ae',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'sales-tracker',
        title: 'Sales Tracker',
        description: 'Track your proposals and closed sales. This mirrors your sales tracker spreadsheet.',
        tips: ['Add new proposals as you create them', 'Mark deals as won when closed'],
        route: '/ae/tracker/totals',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'proposal-list',
        title: 'Proposals',
        description: 'See all your open proposals. Track status, value, and expected close dates.',
        route: '/ae/tracker/proposals',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'import-quote',
        title: 'Import Quotes',
        description: 'Quickly import quotes from Salesforce or other systems. Keep your tracker up to date.',
        route: '/ae/import',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'new-starts-ae',
        title: 'Your New Starts',
        description: 'Hand off new customers to operations. Track the status of your closed deals through first service.',
        route: '/ae/new-starts',
        position: 'center',
        highlight: true
      }
    ]
  },
  technician: {
    name: 'Technician Dashboard',
    welcome: 'Welcome! Your dashboard helps you manage your daily schedule and service tickets.',
    steps: [
      {
        elementId: 'tech-schedule',
        title: 'Your Schedule',
        description: 'See your service appointments for today and the week ahead. Plan your route efficiently.',
        route: '/tech',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'service-tickets',
        title: 'Service Tickets',
        description: 'Access customer details, service history, and special instructions for each stop.',
        tips: ['Check notes before each visit', 'Update status after service'],
        route: '/tech/tickets',
        position: 'center',
        highlight: true
      },
      {
        elementId: 'route-map',
        title: 'Route Optimization',
        description: 'View your route on a map. The system optimizes for minimum drive time.',
        route: '/tech/route',
        position: 'center',
        highlight: true
      }
    ]
  }
}

// FAQ/Help content
export const HELP_FAQ = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I change my dashboard view?',
        a: 'Your dashboard view is based on your role. Contact your administrator if you need access to different views.'
      },
      {
        q: 'How often is the data updated?',
        a: 'Data refreshes vary by source: CRM data every 15 minutes, financial data every 4 hours, and service data in near real-time.'
      },
      {
        q: 'What do the colors on KPI cards mean?',
        a: 'Green means the metric is on track or exceeding target. Yellow indicates a warning (within 10% of target). Red means the metric needs attention (below target).'
      }
    ]
  },
  {
    category: 'KPIs & Metrics',
    questions: [
      {
        q: 'Where can I find the definition of a KPI?',
        a: 'Click on any KPI card, then go to the "Definition" tab. You can also find all KPI definitions in the Governance > KPI Dictionary section.'
      },
      {
        q: 'Why is my KPI showing as stale?',
        a: 'A stale indicator means the source data hasn\'t been updated recently. Check the Data Quality section in Governance to see source system status.'
      },
      {
        q: 'How is the forecast calculated?',
        a: 'The forecast uses machine learning models trained on 3 years of historical data. It considers seasonality, trends, and current pipeline to project future revenue.'
      }
    ]
  },
  {
    category: 'Navigation',
    questions: [
      {
        q: 'How do I drill down into a metric?',
        a: 'Click on any KPI card to see detailed information including trends, drivers, and recommended actions.'
      },
      {
        q: 'Can I customize my dashboard?',
        a: 'Dashboard layouts are standardized by role for consistency. You can use filters to focus on specific regions, branches, or time periods.'
      },
      {
        q: 'How do I export data?',
        a: 'Look for the export button on dashboard pages. You can export to Excel or PDF. Some reports are available in the WBR/QBR sections.'
      }
    ]
  },
  {
    category: 'Troubleshooting',
    questions: [
      {
        q: 'The data looks wrong. What should I do?',
        a: 'First, check when the data was last refreshed (shown on each card). If it\'s recent and still looks wrong, check the Data Quality section. For persistent issues, contact your administrator.'
      },
      {
        q: 'I can\'t access a page. Why?',
        a: 'Access is role-based. If you need access to additional pages, contact your administrator to adjust your permissions.'
      },
      {
        q: 'The page is loading slowly. What can I do?',
        a: 'Try refreshing the page. If the issue persists, it may be due to high data volume. Contact IT support for performance issues.'
      }
    ]
  }
]

// Spotlight overlay for tutorial
function TutorialSpotlight({
  step,
  isActive,
  stepNumber,
  totalSteps,
  onNext,
  onPrev,
  onClose,
  onHelp
}: {
  step: TutorialStep
  isActive: boolean
  stepNumber: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  onHelp: () => void
}) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isActive) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const element = document.getElementById(step.elementId)
      if (element) {
        const rect = element.getBoundingClientRect()
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        })
      } else {
        // Element not found - show centered modal
        setPosition(null)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    // Retry to handle page navigation
    const retryTimeouts = [
      setTimeout(updatePosition, 100),
      setTimeout(updatePosition, 300),
      setTimeout(updatePosition, 500),
      setTimeout(updatePosition, 1000),
    ]

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
      retryTimeouts.forEach(t => clearTimeout(t))
    }
  }, [step.elementId, isActive])

  if (!mounted || !isActive || typeof document === 'undefined') return null

  const isLastStep = stepNumber === totalSteps
  const isFirstStep = stepNumber === 1

  // Calculate callout position
  const getCalloutStyle = (): React.CSSProperties => {
    if (!position || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001
      }
    }

    const padding = 20
    const calloutWidth = 400
    const style: React.CSSProperties = {
      position: 'absolute',
      zIndex: 10001,
      width: calloutWidth
    }

    switch (step.position) {
      case 'top':
        style.bottom = `calc(100vh - ${position.top - padding}px)`
        style.left = Math.max(10, Math.min(position.left + position.width / 2 - calloutWidth / 2, window.innerWidth - calloutWidth - 10))
        break
      case 'bottom':
        style.top = position.top + position.height + padding
        style.left = Math.max(10, Math.min(position.left + position.width / 2 - calloutWidth / 2, window.innerWidth - calloutWidth - 10))
        break
      case 'left':
        style.top = Math.max(10, position.top + position.height / 2 - 100)
        style.right = `calc(100vw - ${position.left - padding}px)`
        break
      case 'right':
      default:
        style.top = Math.max(10, position.top + position.height / 2 - 100)
        style.left = position.left + position.width + padding
        break
    }

    return style
  }

  return createPortal(
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/60 z-[9999]" onClick={onClose} />

      {/* Spotlight cutout */}
      {position && step.highlight && (
        <div
          className="fixed pointer-events-none z-[10000] transition-all duration-300"
          style={{
            top: position.top - 8,
            left: position.left - 8,
            width: position.width + 16,
            height: position.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 4px rgba(228, 0, 43, 0.8), 0 0 30px rgba(228, 0, 43, 0.5)',
            borderRadius: '12px',
          }}
        />
      )}

      {/* Tutorial card */}
      <div style={getCalloutStyle()} className="animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-rentokil-red overflow-hidden">
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 flex">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 transition-all duration-300",
                  i < stepNumber ? "bg-rentokil-red" : "bg-transparent"
                )}
              />
            ))}
          </div>

          {/* Header */}
          <div className="px-5 py-3 bg-gradient-to-r from-rentokil-red to-rentokil-darkred flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">Tutorial</span>
              <span className="text-white/70 text-sm">Step {stepNumber} of {totalSteps}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onHelp}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                title="Need help?"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                title="Exit tutorial"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{step.description}</p>

            {step.tips && step.tips.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">Tips</span>
                </div>
                <ul className="space-y-1">
                  {step.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={isFirstStep}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <button
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip tutorial
            </button>

            <Button
              size="sm"
              onClick={onNext}
              className={cn(
                "gap-1",
                isLastStep
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-rentokil-red hover:bg-rentokil-darkred"
              )}
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// Help dialog component
function HelpDialog({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [askQuestion, setAskQuestion] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Getting Started')

  if (!isOpen || typeof document === 'undefined') return null

  const filteredFAQ = HELP_FAQ.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 z-[10100]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] z-[10101] animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Help Center</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* FAQ Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filteredFAQ.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No results found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFAQ.map((category) => (
                  <div key={category.category} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(
                        expandedCategory === category.category ? null : category.category
                      )}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white">{category.category}</span>
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 text-gray-400 transition-transform",
                          expandedCategory === category.category && "rotate-90"
                        )}
                      />
                    </button>
                    {expandedCategory === category.category && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {category.questions.map((item, i) => (
                          <div key={i} className="px-4 py-3">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{item.q}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{item.a}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ask a question */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Can&apos;t find what you need?</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type your question..."
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" disabled={!askQuestion.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Your question will be sent to the support team.
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// Main Tutorial component
export function Tutorial() {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Only access store after mount to prevent hydration mismatch
  const { settings, tutorialActive, tutorialStep, setTutorialActive, setTutorialStep } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get tutorial config - use default values during SSR
  const currentRole = mounted ? settings.role : 'exec'
  const isTutorialActive = mounted ? tutorialActive : false
  const currentStep = mounted ? tutorialStep : 0

  const tutorial = ROLE_TUTORIALS[currentRole]
  const currentStepConfig = tutorial?.steps[currentStep]
  const totalSteps = tutorial?.steps.length || 0

  // Navigate to route when step changes
  useEffect(() => {
    if (isTutorialActive && currentStepConfig?.route && pathname !== currentStepConfig.route) {
      router.push(currentStepConfig.route)
    }
  }, [isTutorialActive, currentStepConfig, pathname, router])

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setTutorialStep(currentStep + 1)
    } else {
      // Tutorial complete
      setTutorialActive(false)
      setTutorialStep(0)
      // Mark tutorial as completed in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`tutorial_completed_${currentRole}`, 'true')
      }
    }
  }, [currentStep, totalSteps, setTutorialStep, setTutorialActive, currentRole])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setTutorialStep(currentStep - 1)
    }
  }, [currentStep, setTutorialStep])

  const handleClose = useCallback(() => {
    setTutorialActive(false)
    setTutorialStep(0)
  }, [setTutorialActive, setTutorialStep])

  // Keyboard navigation
  useEffect(() => {
    if (!isTutorialActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          handleNext()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          handlePrev()
          break
        case 'Escape':
          e.preventDefault()
          handleClose()
          break
        case '?':
          e.preventDefault()
          setShowHelp(true)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTutorialActive, handleNext, handlePrev, handleClose])

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted || !isTutorialActive || !currentStepConfig) return null

  return (
    <>
      <TutorialSpotlight
        step={currentStepConfig}
        isActive={true}
        stepNumber={currentStep + 1}
        totalSteps={totalSteps}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={handleClose}
        onHelp={() => setShowHelp(true)}
      />
      <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}

// Help button component for use anywhere in the app
export function HelpButton() {
  const [showHelp, setShowHelp] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowHelp(true)}
        className="gap-2"
      >
        <HelpCircle className="h-4 w-4" />
        Help
      </Button>
      {mounted && <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />}
    </>
  )
}

// Tutorial launcher button
export function TutorialLauncher() {
  const [mounted, setMounted] = useState(false)
  const { settings, setTutorialActive, setTutorialStep } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const role = mounted ? settings.role : 'exec'
  const tutorial = ROLE_TUTORIALS[role]

  const startTutorial = () => {
    setTutorialStep(0)
    setTutorialActive(true)
  }

  if (!tutorial) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={startTutorial}
      className="gap-2"
    >
      <BookOpen className="h-4 w-4" />
      Start Tutorial
    </Button>
  )
}
