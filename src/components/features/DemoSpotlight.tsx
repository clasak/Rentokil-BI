"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  Database, ArrowRight, Zap, Play, Pause, ChevronRight, ChevronLeft,
  RefreshCw, Clock, GitBranch, Calculator, Server, Cloud, FileSpreadsheet,
  Users, Building2, BarChart3, X, Minimize2, Maximize2, MessageSquare,
  Lightbulb, ExternalLink, Monitor
} from 'lucide-react'

// Data source definitions with full lineage info
export interface DataSourceInfo {
  name: string
  system: string
  icon: 'database' | 'cloud' | 'spreadsheet' | 'server' | 'users' | 'building' | 'chart'
  refreshRate: string
  lastRefresh?: string
  recordCount?: string
  color: string
}

// Spotlight target configuration
export interface SpotlightTarget {
  elementId: string
  label: string
  description: string
  dataSources: DataSourceInfo[]
  calculation?: string
  refreshSchedule?: string
  dataFlow?: string[]
  position?: 'top' | 'bottom' | 'left' | 'right'
  arrowDirection?: 'up' | 'down' | 'left' | 'right'
  autoClick?: boolean // Automatically click this element when spotlight reaches it
  clickDelay?: number // Delay in ms before auto-clicking (default 1500)
}

// Full step configuration
export interface DemoStep {
  title: string
  route: string
  script: string[] // Speaker notes / talking points
  tips?: string[] // Presentation tips
  spotlights: SpotlightTarget[]
  autoAdvanceDelay?: number
  subStepDelay?: number
}

// Icon mapping
const DataSourceIcon = ({ type, className }: { type: DataSourceInfo['icon'], className?: string }) => {
  const icons = {
    database: Database,
    cloud: Cloud,
    spreadsheet: FileSpreadsheet,
    server: Server,
    users: Users,
    building: Building2,
    chart: BarChart3
  }
  const Icon = icons[type] || Database
  return <Icon className={className} />
}

// Complete demo configuration with speaker notes and lineage
export const DEMO_CONFIG: Record<string, { name: string; steps: DemoStep[] }> = {
  bi_leadership: {
    name: 'BI Leadership Demo',
    steps: [
      {
        title: 'Command Center Overview',
        route: '/',
        script: [
          "Welcome to the Rentokil Business Intelligence Command Center.",
          "This is the executive view - a single pane of glass for the top 10 KPIs that matter most.",
          "Everything you see here is pulled from live source systems - SAP, Salesforce, PestPac.",
          "Let me walk you through how the data flows into each metric."
        ],
        tips: [
          "Pause here to let the audience absorb the dashboard layout",
          "Point out the color coding: green = on track, red = needs attention"
        ],
        autoAdvanceDelay: 28000,
        subStepDelay: 7000,
        spotlights: [
          {
            elementId: 'revenue-mtd-card',
            label: 'Revenue MTD',
            description: 'Month-to-date recognized revenue from all service lines',
            dataSources: [
              { name: 'SAP Billing', system: 'SAP S/4HANA', icon: 'server', refreshRate: 'Every 4 hours', recordCount: '~45K invoices/mo', color: 'blue' },
              { name: 'PestPac', system: 'Field Service', icon: 'database', refreshRate: 'Every 15 min', recordCount: '~120K services/mo', color: 'green' }
            ],
            calculation: 'SUM(Invoice Amount) WHERE Status = "Posted" AND Date >= MTD Start',
            refreshSchedule: 'Every 4 hours from SAP',
            dataFlow: ['SAP Billing', 'Data Warehouse', 'KPI Engine', 'Dashboard'],
            position: 'bottom',
            arrowDirection: 'up',
            autoClick: true,
            clickDelay: 3000
          },
          {
            elementId: 'variance-card',
            label: 'Variance to Target',
            description: 'Performance gap vs. monthly revenue target set by Finance',
            dataSources: [
              { name: 'SAP Billing', system: 'SAP S/4HANA', icon: 'server', refreshRate: 'Every 4 hours', color: 'blue' },
              { name: 'Targets DB', system: 'Planning System', icon: 'spreadsheet', refreshRate: 'Monthly', color: 'purple' }
            ],
            calculation: '(Actual Revenue - Target Revenue) / Target Revenue × 100',
            refreshSchedule: 'Targets set monthly, actuals refresh every 4 hours',
            dataFlow: ['SAP + Targets', 'Variance Calc', 'Dashboard'],
            position: 'bottom',
            arrowDirection: 'up'
          },
          {
            elementId: 'kpi-health-card',
            label: 'KPI Health Summary',
            description: 'Aggregated status of all monitored KPIs across the business',
            dataSources: [
              { name: 'KPI Engine', system: 'BI Platform', icon: 'chart', refreshRate: 'Real-time', color: 'orange' }
            ],
            calculation: 'COUNT(KPIs) grouped by status thresholds (Good/Warning/Critical)',
            refreshSchedule: 'Calculated on page load',
            dataFlow: ['All KPI Values', 'Threshold Check', 'Status Aggregation'],
            position: 'bottom',
            arrowDirection: 'up'
          },
          {
            elementId: 'kpi-grid',
            label: 'Key Performance Indicators',
            description: 'Top 10 executive KPIs with real-time values, trends, and status',
            dataSources: [
              { name: 'Multiple Sources', system: 'Unified Data Layer', icon: 'database', refreshRate: 'Varies by KPI', color: 'gray' }
            ],
            calculation: 'Each KPI has its own calculation - click any card for details',
            dataFlow: ['Source Systems', 'ETL Pipeline', 'Data Warehouse', 'KPI Calculations', 'Dashboard'],
            position: 'right',
            arrowDirection: 'left'
          }
        ]
      },
      {
        title: 'KPI Deep Dive - Revenue',
        route: '/kpi/revenue_mtd',
        script: [
          "Let's drill into Revenue MTD to understand what's driving our variance.",
          "This detail page shows the complete picture - current value, prior period, and target.",
          "The Overview tab breaks down exactly how the number is calculated.",
          "Watch as we open the Data Lineage to show exactly where this data comes from."
        ],
        tips: [
          "The lineage button will be clicked automatically",
          "This demonstrates full data transparency"
        ],
        autoAdvanceDelay: 28000,
        subStepDelay: 7000,
        spotlights: [
          {
            elementId: 'kpi-header',
            label: 'KPI Definition',
            description: 'Complete metric definition with business owner and calculation logic',
            dataSources: [
              { name: 'KPI Dictionary', system: 'Metadata Store', icon: 'spreadsheet', refreshRate: 'Version controlled', color: 'purple' }
            ],
            calculation: 'Definition managed by Finance team, versioned in governance system',
            refreshSchedule: 'Updated quarterly or as business rules change',
            dataFlow: ['Business Rules', 'KPI Dictionary', 'Display'],
            position: 'bottom',
            arrowDirection: 'up'
          },
          {
            elementId: 'kpi-value-display',
            label: 'Current Value & Comparisons',
            description: 'Real-time metric value compared to prior period and target',
            dataSources: [
              { name: 'SAP Billing', system: 'SAP S/4HANA', icon: 'server', refreshRate: 'Every 4 hours', recordCount: '~45K invoices', color: 'blue' }
            ],
            calculation: 'Current: SUM(Posted Invoices MTD)\nPrior: SUM(Posted Invoices Prior MTD)\nChange: (Current - Prior) / Prior × 100',
            refreshSchedule: 'Last refresh: ~2 hours ago',
            dataFlow: ['SAP GL', 'Invoice Extract', 'Aggregation', 'Dashboard'],
            position: 'right',
            arrowDirection: 'left'
          },
          {
            elementId: 'lineage-button',
            label: 'Data Lineage Explorer',
            description: 'Opening the complete data journey from source to dashboard...',
            dataSources: [
              { name: 'Lineage Metadata', system: 'Data Catalog', icon: 'database', refreshRate: 'On-demand', color: 'green' }
            ],
            calculation: 'Shows full source-to-dashboard data flow with transformations',
            dataFlow: ['Source Systems', 'ETL Jobs', 'Data Warehouse', 'KPI Calc', 'Dashboard'],
            position: 'left',
            arrowDirection: 'right',
            autoClick: true,
            clickDelay: 2000
          }
        ]
      },
      {
        title: 'Sales Dashboard',
        route: '/sales',
        script: [
          "This is the Sales Operations dashboard for pipeline visibility.",
          "All sales data flows directly from Salesforce CRM - syncing every 15 minutes.",
          "The pipeline funnel shows weighted value by stage.",
          "CRM Hygiene Score tells us the quality of our data - missing fields, stale deals."
        ],
        tips: [
          "Highlight the hygiene score as a differentiator",
          "Mention this replaces manual pipeline reviews"
        ],
        autoAdvanceDelay: 24000,
        subStepDelay: 6000,
        spotlights: [
          {
            elementId: 'sales-kpi-cards',
            label: 'Sales KPI Cards',
            description: 'Key sales metrics at a glance - pipeline, win rate, cycle time, hygiene',
            dataSources: [
              { name: 'Salesforce', system: 'CRM', icon: 'cloud', refreshRate: 'Every 15 min', recordCount: '~2,500 open opps', color: 'blue' }
            ],
            calculation: 'Each card shows current value, trend, and status vs target',
            refreshSchedule: 'Syncs from Salesforce every 15 minutes',
            dataFlow: ['Salesforce API', 'Opportunity Sync', 'KPI Calculation', 'Dashboard'],
            position: 'bottom',
            arrowDirection: 'up'
          },
          {
            elementId: 'pipeline-card',
            label: 'Pipeline by Stage',
            description: 'Weighted pipeline value at each sales stage',
            dataSources: [
              { name: 'Salesforce', system: 'CRM', icon: 'cloud', refreshRate: 'Every 15 min', recordCount: '~2,500 open opps', color: 'blue' }
            ],
            calculation: 'SUM(Amount × Stage Probability) GROUP BY Stage\n\nStage weights: Prospect 10%, Qualified 25%, Proposal 50%, Negotiation 75%',
            refreshSchedule: 'Syncs from Salesforce every 15 minutes',
            dataFlow: ['Salesforce API', 'Opportunity Sync', 'Stage Weighting', 'Dashboard'],
            position: 'right',
            arrowDirection: 'left'
          },
          {
            elementId: 'conversion-funnel',
            label: 'Rep Performance & Hygiene',
            description: 'Sales rep metrics including pipeline, stalled deals, and data quality',
            dataSources: [
              { name: 'Salesforce', system: 'CRM', icon: 'cloud', refreshRate: 'Every 15 min', color: 'blue' },
              { name: 'Hygiene Rules', system: 'Data Quality', icon: 'chart', refreshRate: 'Real-time calc', color: 'orange' }
            ],
            calculation: 'Hygiene Score = 100 - (Missing Fields Penalty + Stale Opps Penalty + Stage Violation Penalty)',
            refreshSchedule: 'Calculated on page load from latest Salesforce sync',
            dataFlow: ['SF Opportunities', 'Field Validation', 'Hygiene Scoring', 'Rep Rollup'],
            position: 'top',
            arrowDirection: 'down'
          },
          {
            elementId: 'hygiene-score',
            label: 'At-Risk Opportunities',
            description: 'Opportunities flagged as stalled or aging beyond normal cycle',
            dataSources: [
              { name: 'Salesforce', system: 'CRM', icon: 'cloud', refreshRate: 'Every 15 min', color: 'blue' }
            ],
            calculation: 'Stalled = No activity for 14+ days\nAging = Days in stage > Stage average × 1.5',
            refreshSchedule: 'Re-evaluated on each Salesforce sync',
            dataFlow: ['SF Activities', 'Stall Detection', 'Aging Analysis', 'Alert List'],
            position: 'top',
            arrowDirection: 'down'
          }
        ]
      },
      {
        title: 'Operations Dashboard',
        route: '/ops',
        script: [
          "Now the Operations dashboard for service delivery metrics.",
          "Data flows from PestPac - our field service system - every 15 minutes.",
          "Service Risk Index is our composite quality score combining callbacks, misses, and CSAT.",
          "Branch capacity shows technician utilization across the region."
        ],
        tips: [
          "Emphasize the Service Risk Index as predictive of churn",
          "Point out branches over 100% utilization (overtime)"
        ],
        autoAdvanceDelay: 26000,
        subStepDelay: 6500,
        spotlights: [
          {
            elementId: 'ops-kpi-cards',
            label: 'Operations KPI Cards',
            description: 'Key ops metrics - service risk, callbacks, CSAT, route efficiency',
            dataSources: [
              { name: 'PestPac', system: 'Field Service', icon: 'database', refreshRate: 'Every 15 min', recordCount: '~4K events/day', color: 'green' }
            ],
            calculation: 'Each card shows current value, trend, and status vs target',
            refreshSchedule: 'PestPac syncs every 15 minutes',
            dataFlow: ['PestPac API', 'Event Processing', 'KPI Calculation', 'Dashboard'],
            position: 'bottom',
            arrowDirection: 'up'
          },
          {
            elementId: 'service-risk-card',
            label: 'Service Status Breakdown',
            description: 'Distribution of service events by completion status',
            dataSources: [
              { name: 'PestPac', system: 'Field Service', icon: 'database', refreshRate: 'Every 15 min', recordCount: '~4K events/day', color: 'green' },
              { name: 'CSAT Surveys', system: 'Qualtrics', icon: 'users', refreshRate: 'Daily batch', color: 'purple' }
            ],
            calculation: 'Service Risk Index = (Callback Rate × 0.30) + (Miss Rate × 0.25) + (Complaint Rate × 0.25) + (CSAT Inverse × 0.20)',
            refreshSchedule: 'PestPac every 15 min, CSAT daily at 6am',
            dataFlow: ['PestPac Events', 'Status Classification', 'Risk Scoring', 'Dashboard'],
            position: 'right',
            arrowDirection: 'left'
          },
          {
            elementId: 'route-efficiency',
            label: 'Branch Capacity Utilization',
            description: 'Technician utilization by branch showing workload distribution',
            dataSources: [
              { name: 'PestPac', system: 'Field Service', icon: 'database', refreshRate: 'Every 15 min', color: 'green' },
              { name: 'Workday', system: 'HR/Scheduling', icon: 'users', refreshRate: 'Daily', color: 'blue' }
            ],
            calculation: 'Utilization = (Completed Stops / Available Capacity) × 100\n\n>100% = Overtime, >85% = Healthy, <70% = Underutilized',
            refreshSchedule: 'Capacity from Workday daily, actuals from PestPac every 15 min',
            dataFlow: ['Workday Capacity', 'PestPac Completions', 'Utilization Calc', 'Branch Rollup'],
            position: 'right',
            arrowDirection: 'left'
          },
          {
            elementId: 'callback-rate',
            label: 'Complaints by Type',
            description: 'Customer complaints categorized by root cause',
            dataSources: [
              { name: 'PestPac', system: 'Field Service', icon: 'database', refreshRate: 'Every 15 min', color: 'green' },
              { name: 'Call Center', system: 'Five9', icon: 'users', refreshRate: 'Real-time', color: 'orange' }
            ],
            calculation: 'COUNT(Complaints) GROUP BY Type (Service Quality, Billing, Scheduling, Technician, Other)',
            refreshSchedule: 'Call center real-time, PestPac every 15 min',
            dataFlow: ['Five9 Calls', 'PestPac Notes', 'Categorization', 'Type Rollup'],
            position: 'top',
            arrowDirection: 'down'
          }
        ]
      },
      {
        title: 'Forecast & Scenarios',
        route: '/forecast',
        script: [
          "Now let's look at our 8-week rolling revenue forecast.",
          "This is machine learning - trained on 3 years of historical data.",
          "We show three scenarios: base case, upside, and downside.",
          "The backtest results show our model accuracy - currently under 8% error."
        ],
        tips: [
          "The scenario selector will change automatically to show different views",
          "Emphasize the backtest accuracy as validation"
        ],
        autoAdvanceDelay: 24000,
        subStepDelay: 6000,
        spotlights: [
          {
            elementId: 'forecast-chart',
            label: '8-Week Revenue Forecast',
            description: 'ML-generated forecast with confidence intervals',
            dataSources: [
              { name: 'Historical Revenue', system: 'Data Warehouse', icon: 'database', refreshRate: '3 years history', color: 'blue' },
              { name: 'ML Model', system: 'Prophet + XGBoost', icon: 'chart', refreshRate: 'Retrained weekly', color: 'purple' }
            ],
            calculation: 'Ensemble model combining:\n• Time series decomposition (trend + seasonality)\n• XGBoost with 45 features\n• Weighted average of predictions',
            refreshSchedule: 'Model retrained every Sunday, predictions refresh daily',
            dataFlow: ['3yr History', 'Feature Engineering', 'Model Training', 'Prediction', 'Confidence Bands'],
            position: 'top',
            arrowDirection: 'down'
          },
          {
            elementId: 'scenario-selector',
            label: 'Scenario Selection',
            description: 'Toggle between base, upside, and downside scenarios',
            dataSources: [
              { name: 'Assumptions', system: 'Planning', icon: 'spreadsheet', refreshRate: 'Set by FP&A', color: 'purple' }
            ],
            calculation: 'Base: Most likely outcome (P50)\nUpside: +10% close rate, -5% churn\nDownside: -15% close rate, +10% churn',
            refreshSchedule: 'Assumptions reviewed monthly by FP&A',
            dataFlow: ['Assumption Inputs', 'Scenario Calc', 'Forecast Adjustment'],
            position: 'right',
            arrowDirection: 'left',
            autoClick: true,
            clickDelay: 2000
          },
          {
            elementId: 'backtest-results',
            label: 'Backtest Accuracy',
            description: 'How accurate our forecasts have been historically',
            dataSources: [
              { name: 'Forecast Archive', system: 'Data Warehouse', icon: 'database', refreshRate: 'Historical', color: 'blue' },
              { name: 'Actuals', system: 'SAP', icon: 'server', refreshRate: 'After close', color: 'green' }
            ],
            calculation: 'MAPE = AVG(|Predicted - Actual| / Actual) × 100\n\nTarget: <8% error',
            refreshSchedule: 'Updated after each weekly close',
            dataFlow: ['Past Predictions', 'Actual Results', 'Error Calculation', 'Accuracy Metrics'],
            position: 'bottom',
            arrowDirection: 'up'
          }
        ]
      },
      {
        title: 'Governance - KPI Dictionary',
        route: '/governance',
        script: [
          "This is our Governance hub - the foundation of trusted data.",
          "The KPI Dictionary contains every metric's definition, owner, and calculation.",
          "Click any KPI row to see its full definition, data lineage, and business rules.",
          "This prevents the 'whose number is right' debates."
        ],
        tips: [
          "The dictionary tab will be selected automatically",
          "Emphasize this is the single source of truth for definitions"
        ],
        autoAdvanceDelay: 28000,
        subStepDelay: 7000,
        spotlights: [
          {
            elementId: 'governance-tabs',
            label: 'Governance Tabs',
            description: 'Four pillars of data governance: Dictionary, Quality, Permissions, Change Log',
            dataSources: [
              { name: 'Governance System', system: 'BI Platform', icon: 'database', refreshRate: 'Real-time', color: 'purple' }
            ],
            calculation: 'Organized navigation to all governance capabilities',
            dataFlow: ['User Selection', 'Tab Content', 'Display'],
            position: 'bottom',
            arrowDirection: 'up'
          },
          {
            elementId: 'kpi-dictionary',
            label: 'KPI Dictionary Tab',
            description: 'Complete catalog of all KPIs with definitions and ownership',
            dataSources: [
              { name: 'Metadata Store', system: 'Data Catalog', icon: 'spreadsheet', refreshRate: 'Version controlled', color: 'purple' }
            ],
            calculation: 'Each KPI includes:\n• Business definition\n• Calculation logic\n• Owner & approver\n• Source systems\n• Refresh cadence',
            refreshSchedule: 'Updated when KPI definitions change (audit logged)',
            dataFlow: ['Business Rules', 'Approval Workflow', 'Metadata Store', 'Dictionary Display'],
            position: 'right',
            arrowDirection: 'left',
            autoClick: true,
            clickDelay: 1500
          },
          {
            elementId: 'data-quality-panel',
            label: 'Data Quality Tab',
            description: 'Real-time health monitoring of all source system integrations',
            dataSources: [
              { name: 'All Sources', system: 'Monitoring', icon: 'server', refreshRate: 'Real-time', color: 'orange' }
            ],
            calculation: 'Quality Score = (Freshness × 0.4) + (Completeness × 0.3) + (Accuracy × 0.3)\n\nEach source monitored independently',
            refreshSchedule: 'Continuous monitoring with alerting',
            dataFlow: ['Source Heartbeats', 'Quality Checks', 'Score Aggregation', 'Alert Triggers'],
            position: 'top',
            arrowDirection: 'down',
            autoClick: true,
            clickDelay: 1500
          },
          {
            elementId: 'permissions-tab',
            label: 'Permissions Tab',
            description: 'Role-based access control matrix showing who can see what',
            dataSources: [
              { name: 'IAM System', system: 'Okta + App RBAC', icon: 'users', refreshRate: 'Real-time', color: 'blue' }
            ],
            calculation: 'Permissions inherited from role hierarchy:\nExec → VP/Director → Manager → Rep/Technician\n\nEach level has view/edit/export rights',
            refreshSchedule: 'Syncs from Okta on login, cached for session',
            dataFlow: ['Okta Groups', 'Role Mapping', 'Permission Check', 'UI Enforcement'],
            position: 'left',
            arrowDirection: 'right',
            autoClick: true,
            clickDelay: 1500
          }
        ]
      },
      {
        title: 'Thank You',
        route: '/',
        script: [
          "That concludes our tour of the Rentokil BI Command Center.",
          "Key takeaways: Single source of truth, real-time data, full transparency.",
          "Every number is traceable back to its source system.",
          "Questions?"
        ],
        tips: [
          "Open for Q&A",
          "Offer to deep-dive into any specific area"
        ],
        autoAdvanceDelay: 30000,
        subStepDelay: 8000,
        spotlights: [
          {
            elementId: 'kpi-grid',
            label: 'Your BI Command Center',
            description: 'Real-time visibility into what matters most',
            dataSources: [
              { name: 'All Systems', system: 'Unified Platform', icon: 'chart', refreshRate: 'Continuous', color: 'green' }
            ],
            calculation: 'Unified view of:\n• Revenue & Finance\n• Sales Pipeline\n• Operations Quality\n• Forecasting\n• Governance',
            dataFlow: ['Source Systems', 'Data Warehouse', 'BI Platform', 'Executive Dashboard'],
            position: 'top',
            arrowDirection: 'down'
          }
        ]
      }
    ]
  }
}

// Spotlight overlay component
function SpotlightOverlay({
  target,
  isActive,
  subStepIndex,
  totalSubSteps
}: {
  target: SpotlightTarget
  isActive: boolean
  subStepIndex: number
  totalSubSteps: number
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
      const element = document.getElementById(target.elementId)
      if (element) {
        const rect = element.getBoundingClientRect()
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        })
      } else {
        setPosition(null)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    // Multiple retries to handle page navigation and React rendering delays
    const retryTimeouts = [
      setTimeout(updatePosition, 100),
      setTimeout(updatePosition, 300),
      setTimeout(updatePosition, 500),
      setTimeout(updatePosition, 1000),
      setTimeout(updatePosition, 1500),
    ]

    // Continuous polling to keep position updated during animations/transitions
    const pollInterval = setInterval(updatePosition, 250)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
      retryTimeouts.forEach(t => clearTimeout(t))
      clearInterval(pollInterval)
    }
  }, [target.elementId, isActive])

  if (!mounted || !isActive || !position) return null

  const calloutStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 9999,
  }

  const padding = 20
  const calloutWidth = 380

  switch (target.position) {
    case 'top':
      calloutStyle.bottom = `calc(100vh - ${position.top - padding}px)`
      calloutStyle.left = Math.max(10, Math.min(position.left + position.width / 2 - calloutWidth / 2, window.innerWidth - calloutWidth - 10))
      break
    case 'bottom':
      calloutStyle.top = position.top + position.height + padding
      calloutStyle.left = Math.max(10, Math.min(position.left + position.width / 2 - calloutWidth / 2, window.innerWidth - calloutWidth - 10))
      break
    case 'left':
      calloutStyle.top = Math.max(10, position.top + position.height / 2 - 150)
      calloutStyle.right = `calc(100vw - ${position.left - padding}px)`
      break
    case 'right':
    default:
      calloutStyle.top = Math.max(10, position.top + position.height / 2 - 150)
      calloutStyle.left = position.left + position.width + padding
      break
  }

  const ArrowIndicator = () => {
    const arrowClass = "text-rentokil-red drop-shadow-lg"
    const baseStyle = "absolute"
    const arrowStyle = { filter: 'drop-shadow(0 0 8px rgba(228, 0, 43, 0.5))' }

    switch (target.arrowDirection) {
      case 'up':
        return (
          <div className={cn(baseStyle, "left-1/2 -translate-x-1/2 -bottom-10")} style={arrowStyle}>
            <div className="animate-bounce"><ArrowRight className={cn(arrowClass, "h-10 w-10 rotate-[-90deg]")} /></div>
          </div>
        )
      case 'down':
        return (
          <div className={cn(baseStyle, "left-1/2 -translate-x-1/2 -top-10")} style={arrowStyle}>
            <div className="animate-bounce"><ArrowRight className={cn(arrowClass, "h-10 w-10 rotate-90")} /></div>
          </div>
        )
      case 'left':
        return (
          <div className={cn(baseStyle, "top-1/2 -translate-y-1/2 -right-10")} style={arrowStyle}>
            <div className="animate-pulse"><ArrowRight className={cn(arrowClass, "h-10 w-10 rotate-180")} /></div>
          </div>
        )
      default:
        return (
          <div className={cn(baseStyle, "top-1/2 -translate-y-1/2 -left-10")} style={arrowStyle}>
            <div className="animate-pulse"><ArrowRight className={cn(arrowClass, "h-10 w-10")} /></div>
          </div>
        )
    }
  }

  return createPortal(
    <>
      {/* Spotlight ring */}
      <div
        className="fixed pointer-events-none z-[9998] transition-all duration-500"
        style={{
          top: position.top - 6,
          left: position.left - 6,
          width: position.width + 12,
          height: position.height + 12,
          boxShadow: '0 0 0 4px rgba(228, 0, 43, 0.7), 0 0 30px rgba(228, 0, 43, 0.5), 0 0 80px rgba(228, 0, 43, 0.3)',
          borderRadius: '12px',
        }}
      />

      {/* Callout card with lineage */}
      <div
        style={calloutStyle}
        className={cn(
          "w-[380px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-rentokil-red overflow-hidden",
          "animate-in fade-in zoom-in-95 duration-300"
        )}
      >
        <ArrowIndicator />

        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 flex">
          {Array.from({ length: totalSubSteps }).map((_, i) => (
            <div key={i} className={cn("flex-1 transition-all duration-500", i <= subStepIndex ? "bg-rentokil-red" : "bg-transparent")} />
          ))}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-xl mb-1">{target.label}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{target.description}</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-rentokil-red/10 rounded-lg shrink-0">
              <span className="text-xs font-bold text-rentokil-red">{subStepIndex + 1}/{totalSubSteps}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Data Sources</span>
            </div>
            <div className="space-y-2">
              {target.dataSources.map((source, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border",
                  source.color === 'blue' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                  source.color === 'green' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                  source.color === 'purple' && "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
                  source.color === 'orange' && "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
                  source.color === 'gray' && "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                )}>
                  <DataSourceIcon type={source.icon} className={cn("h-5 w-5",
                    source.color === 'blue' && "text-blue-600 dark:text-blue-400",
                    source.color === 'green' && "text-green-600 dark:text-green-400",
                    source.color === 'purple' && "text-purple-600 dark:text-purple-400",
                    source.color === 'orange' && "text-orange-600 dark:text-orange-400",
                    source.color === 'gray' && "text-gray-600 dark:text-gray-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{source.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{source.system}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <RefreshCw className="h-3 w-3" />{source.refreshRate}
                    </div>
                    {source.recordCount && <div className="text-xs text-gray-400">{source.recordCount}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {target.dataFlow && target.dataFlow.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Data Flow</span>
              </div>
              <div className="flex items-center flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {target.dataFlow.map((step, i) => (
                  <div key={i} className="flex items-center">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-2 py-1 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">{step}</span>
                    {i < target.dataFlow!.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {target.calculation && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Calculation</span>
              </div>
              <div className="p-2 bg-gray-900 dark:bg-gray-950 rounded-lg">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{target.calculation}</pre>
              </div>
            </div>
          )}

          {target.refreshSchedule && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Clock className="h-3.5 w-3.5" /><span>{target.refreshSchedule}</span>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

// Main unified presenter component
export function DemoSpotlight() {
  const router = useRouter()
  const pathname = usePathname()
  const {
    presenterMode,
    presenterStep,
    settings,
    nextPresenterStep,
    prevPresenterStep,
    setPresenterMode
  } = useAppStore()

  const [currentSubStep, setCurrentSubStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showNotes, setShowNotes] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isPoppedOut, setIsPoppedOut] = useState(false)
  const [popoutWindow, setPopoutWindow] = useState<Window | null>(null)
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const subStepTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
      if (subStepTimerRef.current) clearTimeout(subStepTimerRef.current)
    }
  }, [])

  // Close popout window when presenter mode is disabled or component unmounts
  useEffect(() => {
    if (!presenterMode && popoutWindow && !popoutWindow.closed) {
      popoutWindow.close()
      setPopoutWindow(null)
      setIsPoppedOut(false)
    }
    return () => {
      if (popoutWindow && !popoutWindow.closed) {
        popoutWindow.close()
      }
    }
  }, [presenterMode, popoutWindow])

  // Monitor if popout window was closed externally
  useEffect(() => {
    if (!popoutWindow) return
    const checkClosed = setInterval(() => {
      if (popoutWindow.closed) {
        setPopoutWindow(null)
        setIsPoppedOut(false)
      }
    }, 500)
    return () => clearInterval(checkClosed)
  }, [popoutWindow])

  // Function to open presenter notes in a new window
  const openPopoutWindow = useCallback(() => {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.focus()
      return
    }

    const width = 480
    const height = 700
    const left = window.screen.width - width - 50
    const top = 50

    const newWindow = window.open(
      '',
      'PresenterNotes',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    )

    if (newWindow) {
      setPopoutWindow(newWindow)
      setIsPoppedOut(true)
    }
  }, [popoutWindow])

  const demoMode = settings.demoMode in DEMO_CONFIG ? settings.demoMode : 'bi_leadership'
  const config = DEMO_CONFIG[demoMode]
  const steps = config?.steps || []
  const currentStepConfig = steps[presenterStep]
  const spotlights = currentStepConfig?.spotlights || []
  const totalSubSteps = spotlights.length
  const currentTarget = spotlights[currentSubStep]

  // Render content to popout window
  useEffect(() => {
    if (!popoutWindow || popoutWindow.closed) return

    const doc = popoutWindow.document
    doc.title = 'Presenter Notes - Rentokil BI'

    // Add styles
    doc.head.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          padding: 20px;
          min-height: 100vh;
        }
        .header {
          background: linear-gradient(135deg, #E4002B 0%, #b30022 100%);
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .header h1 { font-size: 18px; font-weight: 700; }
        .header .subtitle { font-size: 12px; opacity: 0.8; margin-top: 4px; }
        .step-info {
          background: rgba(255,255,255,0.1);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .step-number { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .step-title { font-size: 24px; font-weight: 700; margin-top: 4px; }
        .spotlight-info {
          background: rgba(228, 0, 43, 0.2);
          border: 1px solid rgba(228, 0, 43, 0.4);
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .spotlight-label { font-weight: 600; color: #ff6b6b; }
        .spotlight-sources { font-size: 12px; color: #aaa; margin-top: 4px; }
        .progress-bar {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
        }
        .progress-dot {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: rgba(255,255,255,0.2);
        }
        .progress-dot.active { background: #E4002B; }
        .progress-dot.done { background: rgba(228, 0, 43, 0.5); }
        .section { margin-bottom: 20px; }
        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #888;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .notes {
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 12px;
        }
        .notes p {
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 10px;
          padding-left: 16px;
          position: relative;
        }
        .notes p:before {
          content: '•';
          position: absolute;
          left: 0;
          color: #3b82f6;
        }
        .notes p:last-child { margin-bottom: 0; }
        .tips {
          background: rgba(234, 179, 8, 0.15);
          border: 1px solid rgba(234, 179, 8, 0.3);
          border-radius: 8px;
          padding: 12px;
        }
        .tips p {
          font-size: 13px;
          color: #fbbf24;
          margin-bottom: 6px;
          padding-left: 16px;
          position: relative;
        }
        .tips p:before {
          content: '→';
          position: absolute;
          left: 0;
        }
        .tips p:last-child { margin-bottom: 0; }
        .nav-buttons {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .nav-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .nav-btn.back { background: rgba(255,255,255,0.1); color: white; }
        .nav-btn.back:hover:not(:disabled) { background: rgba(255,255,255,0.2); }
        .nav-btn.next { background: #E4002B; color: white; }
        .nav-btn.next:hover:not(:disabled) { background: #b30022; }
        .nav-btn.finish { background: #22c55e; color: white; }
        .keyboard-hint {
          text-align: center;
          margin-top: 12px;
          font-size: 11px;
          color: #666;
        }
        .keyboard-hint kbd {
          background: rgba(255,255,255,0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          margin: 0 2px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-auto { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .status-manual { background: rgba(255,255,255,0.1); color: #888; }
      </style>
    `

    const isLastStep = presenterStep === steps.length - 1 && currentSubStep === totalSubSteps - 1

    // Build progress bar HTML
    const progressBarHtml = totalSubSteps > 0
      ? '<div class="progress-bar">' + spotlights.map((_, i) =>
          '<div class="progress-dot ' + (i === currentSubStep ? 'active' : i < currentSubStep ? 'done' : '') + '"></div>'
        ).join('') + '</div>'
      : ''

    // Build spotlight info HTML
    const spotlightHtml = currentTarget
      ? '<div class="spotlight-info"><div class="spotlight-label">📍 ' + currentTarget.label + '</div><div class="spotlight-sources">' + currentTarget.dataSources.map(s => s.name).join(' + ') + '</div></div>'
      : ''

    // Build speaker notes HTML
    const notesHtml = currentStepConfig?.script
      ? '<div class="section"><div class="section-title">💬 Speaker Notes</div><div class="notes">' + currentStepConfig.script.map(line => '<p>' + line + '</p>').join('') + '</div></div>'
      : ''

    // Build tips HTML
    const tipsHtml = currentStepConfig?.tips
      ? '<div class="section"><div class="section-title">💡 Tips</div><div class="tips">' + currentStepConfig.tips.map(tip => '<p>' + tip + '</p>').join('') + '</div></div>'
      : ''

    doc.body.innerHTML =
      '<div class="header">' +
        '<h1>📋 Presenter Notes</h1>' +
        '<div class="subtitle">' + (config?.name || 'Demo Mode') + '</div>' +
      '</div>' +
      '<div class="step-info">' +
        '<div class="step-number">Step ' + (presenterStep + 1) + ' of ' + steps.length + '</div>' +
        '<div class="step-title">' + (currentStepConfig?.title || 'Loading...') + '</div>' +
        '<div style="margin-top: 8px;">' +
          '<span class="status-badge ' + (isAutoPlaying ? 'status-auto' : 'status-manual') + '">' +
            (isAutoPlaying ? '▶ Auto-playing' : '⏸ Manual control') +
          '</span>' +
        '</div>' +
      '</div>' +
      progressBarHtml +
      spotlightHtml +
      notesHtml +
      tipsHtml +
      '<div class="nav-buttons">' +
        '<button class="nav-btn back" id="back-btn"' + (presenterStep === 0 && currentSubStep === 0 ? ' disabled' : '') + '>← Back</button>' +
        '<button class="nav-btn ' + (isLastStep ? 'finish' : 'next') + '" id="next-btn">' + (isLastStep ? '✓ Finish' : 'Next →') + '</button>' +
      '</div>' +
      '<div class="keyboard-hint">' +
        '<kbd>←→</kbd> navigate &nbsp; <kbd>Space</kbd> auto-play &nbsp; <kbd>Esc</kbd> exit' +
      '</div>'

    // Add event listeners to buttons
    const backBtn = doc.getElementById('back-btn')
    const nextBtn = doc.getElementById('next-btn')

    if (backBtn) {
      backBtn.onclick = () => {
        if (currentSubStep > 0) {
          setCurrentSubStep(prev => prev - 1)
        } else if (presenterStep > 0) {
          prevPresenterStep()
        }
        setIsAutoPlaying(false)
      }
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        if (currentSubStep < totalSubSteps - 1) {
          setCurrentSubStep(prev => prev + 1)
        } else if (presenterStep < steps.length - 1) {
          nextPresenterStep()
        } else {
          setPresenterMode(false)
        }
        setIsAutoPlaying(false)
      }
    }

    // Handle keyboard in popout window
    doc.onkeydown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsAutoPlaying(prev => !prev)
          break
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          if (currentSubStep < totalSubSteps - 1) {
            setCurrentSubStep(prev => prev + 1)
          } else if (presenterStep < steps.length - 1) {
            nextPresenterStep()
          }
          setIsAutoPlaying(false)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          if (currentSubStep > 0) {
            setCurrentSubStep(prev => prev - 1)
          } else if (presenterStep > 0) {
            prevPresenterStep()
          }
          setIsAutoPlaying(false)
          break
        case 'Escape':
          e.preventDefault()
          setPresenterMode(false)
          break
      }
    }

  }, [popoutWindow, presenterStep, currentSubStep, currentStepConfig, currentTarget, isAutoPlaying, spotlights, totalSubSteps, steps.length, config?.name, prevPresenterStep, nextPresenterStep, setPresenterMode])

  // Navigate to route when step changes
  useEffect(() => {
    if (presenterMode && currentStepConfig && pathname !== currentStepConfig.route) {
      router.push(currentStepConfig.route)
    }
  }, [presenterMode, currentStepConfig, pathname, router])

  // Reset substep when main step changes
  useEffect(() => {
    setCurrentSubStep(0)
  }, [presenterStep])

  // Auto-advance
  useEffect(() => {
    if (!presenterMode || !isAutoPlaying || !currentStepConfig) return

    const subStepDelay = currentStepConfig.subStepDelay || 6000

    if (currentSubStep < totalSubSteps - 1) {
      subStepTimerRef.current = setTimeout(() => setCurrentSubStep(prev => prev + 1), subStepDelay)
    } else if (currentSubStep === totalSubSteps - 1) {
      const autoAdvanceDelay = currentStepConfig.autoAdvanceDelay || 22000
      const remainingDelay = autoAdvanceDelay - (totalSubSteps * subStepDelay)

      autoAdvanceTimerRef.current = setTimeout(() => {
        if (presenterStep < steps.length - 1) {
          nextPresenterStep()
        } else {
          setIsAutoPlaying(false)
        }
      }, Math.max(remainingDelay, 3000))
    }

    return () => {
      if (subStepTimerRef.current) clearTimeout(subStepTimerRef.current)
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    }
  }, [presenterMode, isAutoPlaying, currentSubStep, totalSubSteps, presenterStep, currentStepConfig, nextPresenterStep, steps.length])

  // Auto-click elements when spotlight reaches them
  useEffect(() => {
    if (!presenterMode || !currentTarget?.autoClick) return

    const clickDelay = currentTarget.clickDelay || 1500
    const clickTimer = setTimeout(() => {
      const element = document.getElementById(currentTarget.elementId)
      if (element) {
        // Find clickable element (button, link, or the element itself)
        const clickable = element.querySelector('button, a, [role="button"]') || element
        if (clickable instanceof HTMLElement) {
          clickable.click()
        }
      }
    }, clickDelay)

    return () => clearTimeout(clickTimer)
  }, [presenterMode, currentTarget, currentSubStep])

  // Keyboard controls
  useEffect(() => {
    if (!presenterMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsAutoPlaying(prev => !prev)
          break
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          if (currentSubStep < totalSubSteps - 1) {
            setCurrentSubStep(prev => prev + 1)
            setIsAutoPlaying(false)
          } else if (presenterStep < steps.length - 1) {
            nextPresenterStep()
            setIsAutoPlaying(false)
          }
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          if (currentSubStep > 0) {
            setCurrentSubStep(prev => prev - 1)
            setIsAutoPlaying(false)
          } else if (presenterStep > 0) {
            prevPresenterStep()
            setIsAutoPlaying(false)
          }
          break
        case 'Escape':
          e.preventDefault()
          setPresenterMode(false)
          break
        case 'm':
        case 'M':
          e.preventDefault()
          setIsMinimized(prev => !prev)
          break
        case 'n':
        case 'N':
          e.preventDefault()
          setShowNotes(prev => !prev)
          break
        case 'p':
        case 'P':
          e.preventDefault()
          if (isPoppedOut) {
            popoutWindow?.close()
            setPopoutWindow(null)
            setIsPoppedOut(false)
          } else {
            openPopoutWindow()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [presenterMode, currentSubStep, totalSubSteps, presenterStep, steps.length, nextPresenterStep, prevPresenterStep, setPresenterMode, isPoppedOut, popoutWindow, openPopoutWindow])

  if (!mounted || !presenterMode) return null

  return (
    <>
      {/* Spotlight overlay - ALWAYS visible regardless of minimized/popped out state */}
      {currentTarget && (
        <SpotlightOverlay target={currentTarget} isActive={true} subStepIndex={currentSubStep} totalSubSteps={totalSubSteps} />
      )}

      {/* Minimized view - just a small bar, spotlight still shows above */}
      {isMinimized ? (
        <div className="fixed bottom-6 left-6 z-[10000] animate-in slide-in-from-left-4 duration-300">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rentokil-red to-rentokil-darkred text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Zap className="h-5 w-5" />
            <span className="font-semibold">Step {presenterStep + 1}/{steps.length}</span>
            <span className="text-white/70">•</span>
            <span className="text-sm text-white/80">{currentTarget?.label || currentStepConfig?.title}</span>
            <Maximize2 className="h-4 w-4 ml-2" />
          </button>
        </div>
      ) : isPoppedOut ? (
        /* When popped out, show minimal indicator instead of full panel */
        <div className="fixed bottom-6 left-6 z-[10000] animate-in slide-in-from-left-4 duration-300">
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl shadow-lg">
            <Monitor className="h-5 w-5" />
            <div>
              <div className="font-semibold text-sm">Presenter Mode Active</div>
              <div className="text-xs text-white/70">Notes in separate window</div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="ml-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Hide indicator (notes stay open)"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
      /* Unified presenter panel - ONLY visible to presenter when NOT popped out */
      <div className="fixed bottom-6 left-6 z-[10000] animate-in slide-in-from-left-4 duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-[420px]">
          {/* Progress indicator */}
          <div className={cn("h-1.5 transition-all duration-300", isAutoPlaying ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600")}>
            {isAutoPlaying && <div className="h-full bg-green-400 animate-pulse" style={{ width: '100%' }} />}
          </div>

          {/* Header */}
          <div className="px-5 py-3 bg-gradient-to-r from-rentokil-red to-rentokil-darkred">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-white" />
                <span className="font-bold text-white">{config.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={cn("p-2 rounded-lg transition-colors", isAutoPlaying ? "bg-white/20 text-white" : "bg-white/10 text-white/70")}
                  title={isAutoPlaying ? "Pause (Space)" : "Auto-play (Space)"}
                >
                  {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={cn("p-2 rounded-lg transition-colors", showNotes ? "bg-white/20 text-white" : "bg-white/10 text-white/70")}
                  title="Toggle notes (N)"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                <button
                  onClick={openPopoutWindow}
                  className={cn("p-2 rounded-lg transition-colors", isPoppedOut ? "bg-green-500/30 text-white" : "bg-white/10 text-white/70 hover:bg-white/20")}
                  title="Pop out to separate window (P) - for presenting"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button onClick={() => setIsMinimized(true)} className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20" title="Minimize (M)">
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button onClick={() => setPresenterMode(false)} className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20" title="Exit (Esc)">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Step info */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">STEP {presenterStep + 1} OF {steps.length}</span>
              <span className="text-xs text-gray-400">{isAutoPlaying ? 'Auto-advancing...' : 'Manual control'}</span>
            </div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">{currentStepConfig?.title}</h3>

            {/* Current spotlight indicator */}
            {currentTarget && (
              <div className="flex items-center gap-3 p-3 bg-rentokil-red/5 border border-rentokil-red/20 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-lg bg-rentokil-red/10 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-5 w-5 text-rentokil-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-rentokil-red truncate">{currentTarget.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentTarget.dataSources.map(s => s.name).join(' + ')}</div>
                </div>
              </div>
            )}

            {/* Sub-step progress */}
            {totalSubSteps > 0 && (
              <div className="flex items-center gap-1.5 mb-4">
                {spotlights.map((spotlight, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentSubStep(i); setIsAutoPlaying(false) }}
                    className={cn("flex-1 h-2 rounded-full transition-all duration-300",
                      i === currentSubStep ? "bg-rentokil-red" : i < currentSubStep ? "bg-rentokil-red/40" : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300"
                    )}
                    title={spotlight.label}
                  />
                ))}
              </div>
            )}

            {/* Speaker Notes */}
            {showNotes && currentStepConfig?.script && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Speaker Notes</span>
                </div>
                <div className="max-h-[150px] overflow-y-auto space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  {currentStepConfig.script.map((line, i) => (
                    <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span className="text-blue-400 mr-2">•</span>{line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {showNotes && currentStepConfig?.tips && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Tips</span>
                </div>
                <div className="space-y-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  {currentStepConfig.tips.map((tip, i) => (
                    <p key={i} className="text-xs text-yellow-800 dark:text-yellow-300">
                      <span className="text-yellow-500 mr-1">→</span>{tip}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (currentSubStep > 0) setCurrentSubStep(prev => prev - 1)
                  else prevPresenterStep()
                  setIsAutoPlaying(false)
                }}
                disabled={presenterStep === 0 && currentSubStep === 0}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />Back
              </button>

              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono">←→</kbd>
                <span className="mx-1">nav</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono">N</kbd>
                <span className="ml-1">notes</span>
              </div>

              <button
                onClick={() => {
                  if (currentSubStep < totalSubSteps - 1) setCurrentSubStep(prev => prev + 1)
                  else if (presenterStep < steps.length - 1) nextPresenterStep()
                  else setPresenterMode(false)
                  setIsAutoPlaying(false)
                }}
                className={cn(
                  "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  presenterStep === steps.length - 1 && currentSubStep === totalSubSteps - 1
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-rentokil-red hover:bg-rentokil-darkred text-white"
                )}
              >
                {presenterStep === steps.length - 1 && currentSubStep === totalSubSteps - 1 ? 'Finish' : 'Next'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  )
}
