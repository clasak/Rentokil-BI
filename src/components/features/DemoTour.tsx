"use client"

import { useEffect, useCallback, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore, DEMO_MODE_CONFIG } from '@/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  ChevronLeft,
  X,
  Maximize2,
  Minimize2,
  Presentation,
  ArrowRight,
  CheckCircle2,
  Circle,
  Keyboard
} from 'lucide-react'

interface TalkingPoint {
  text: string
  emphasis?: boolean
}

interface PresentationStep {
  title: string
  description: string
  route: string
  talkingPoints: TalkingPoint[]
  keyFeatures: string[]
}

// Enhanced presentation steps with talking points for executives
const PRESENTATION_STEPS: Record<string, PresentationStep[]> = {
  exec_bi_review: [
    {
      title: 'Command Center',
      description: 'Executive KPI Overview',
      route: '/',
      talkingPoints: [
        { text: 'Single source of truth for all key business metrics', emphasis: true },
        { text: 'Real-time variance tracking against targets' },
        { text: 'Click any KPI card to drill down into details' },
        { text: 'Trend indicators show week-over-week momentum' },
      ],
      keyFeatures: ['20 KPIs', 'Real-time data', 'Drill-down capability'],
    },
    {
      title: 'Revenue Deep Dive',
      description: 'Variance Analysis & Reconciliation',
      route: '/kpi/revenue_mtd',
      talkingPoints: [
        { text: 'Detailed breakdown of revenue variance drivers', emphasis: true },
        { text: 'Reconciliation tab validates data accuracy' },
        { text: 'Action items linked directly to variance causes' },
        { text: 'Data lineage shows source-to-report flow' },
      ],
      keyFeatures: ['Variance drivers', 'Reconciliation', 'Data lineage'],
    },
    {
      title: 'Forecast & Scenarios',
      description: 'Predictive Analytics',
      route: '/forecast',
      talkingPoints: [
        { text: '8-week rolling forecast with confidence bands', emphasis: true },
        { text: 'Toggle between Base, Upside, and Downside scenarios' },
        { text: 'Backtest results validate model accuracy' },
        { text: 'Assumptions clearly documented and adjustable' },
      ],
      keyFeatures: ['3 scenarios', 'Confidence bands', 'Backtest validation'],
    },
    {
      title: 'Governance & Trust',
      description: 'Data Quality & Compliance',
      route: '/governance',
      talkingPoints: [
        { text: 'Complete KPI dictionary with business definitions', emphasis: true },
        { text: 'Data quality dashboard tracks 6 dimensions' },
        { text: 'Role-based access matrix ensures compliance' },
        { text: 'Audit trail for all data changes' },
      ],
      keyFeatures: ['KPI dictionary', 'Quality scores', 'Access controls'],
    },
  ],
  sales_ops_execution: [
    {
      title: 'Sales Pipeline',
      description: 'Opportunity Management',
      route: '/sales',
      talkingPoints: [
        { text: 'Full pipeline visibility with stage breakdown', emphasis: true },
        { text: 'CRM hygiene score highlights data quality issues' },
        { text: 'Conversion rates by stage identify bottlenecks' },
        { text: 'Win/loss analysis drives improvement' },
      ],
      keyFeatures: ['Pipeline health', 'Stage conversion', 'Hygiene score'],
    },
    {
      title: 'Stalled Deals',
      description: 'Action Required Queue',
      route: '/kpi/stalled_opps',
      talkingPoints: [
        { text: 'Automatic identification of stuck opportunities', emphasis: true },
        { text: 'Days stalled and risk level clearly visible' },
        { text: 'Direct action buttons for quick resolution' },
        { text: 'Manager escalation workflow built-in' },
      ],
      keyFeatures: ['Risk scoring', 'Action items', 'Escalation paths'],
    },
    {
      title: 'Rep Performance',
      description: 'Coaching & Development',
      route: '/people',
      talkingPoints: [
        { text: 'Individual rep scorecards with trend data', emphasis: true },
        { text: 'Quota attainment and activity metrics' },
        { text: 'Coaching priorities based on data' },
        { text: 'Team comparison for best practice sharing' },
      ],
      keyFeatures: ['Scorecards', 'Activity tracking', 'Coaching insights'],
    },
    {
      title: 'Deal Details',
      description: 'Opportunity Context',
      route: '/sales/opportunity/OPP-000001',
      talkingPoints: [
        { text: 'Complete deal context in one view', emphasis: true },
        { text: 'Activity timeline shows engagement history' },
        { text: 'Next best action recommendations' },
        { text: 'Risk factors and mitigation options' },
      ],
      keyFeatures: ['Full context', 'Activity history', 'Next actions'],
    },
  ],
  branch_field_manager: [
    {
      title: 'Operations Overview',
      description: 'Service Quality Dashboard',
      route: '/ops',
      talkingPoints: [
        { text: 'Service quality metrics at a glance', emphasis: true },
        { text: 'Callback rate trending and benchmarks' },
        { text: 'Capacity utilization by technician' },
        { text: 'Route efficiency optimization opportunities' },
      ],
      keyFeatures: ['Quality metrics', 'Capacity view', 'Efficiency data'],
    },
    {
      title: 'New Starts Queue',
      description: 'Sales-to-Ops Handoff',
      route: '/ops/new-starts',
      talkingPoints: [
        { text: 'Seamless handoff from Sales to Operations', emphasis: true },
        { text: 'Track scheduling and assignment status' },
        { text: 'Specialist assignment and start date management' },
        { text: 'Complete visibility into pending starts' },
      ],
      keyFeatures: ['Handoff tracking', 'Scheduling', 'Assignment'],
    },
    {
      title: 'Daily Metrics',
      description: 'Branch Performance Tracking',
      route: '/region/daily',
      talkingPoints: [
        { text: 'Daily sales cadence tracking by branch', emphasis: true },
        { text: 'Goal attainment calculated per PCC', },
        { text: 'Regional rollup for area managers' },
        { text: 'Trend analysis over time' },
      ],
      keyFeatures: ['Daily tracking', 'Goal attainment', 'Regional view'],
    },
    {
      title: 'Retention Risk',
      description: 'At-Risk Account Management',
      route: '/kpi/retention_risk',
      talkingPoints: [
        { text: 'Proactive identification of at-risk accounts', emphasis: true },
        { text: 'Risk score based on multiple factors' },
        { text: 'Mitigation actions and owner assignment' },
        { text: 'Track intervention effectiveness' },
      ],
      keyFeatures: ['Risk scoring', 'Action plans', 'Tracking'],
    },
  ],
}

export function DemoTour() {
  const router = useRouter()
  const pathname = usePathname()
  const { tourActive, setTourActive, tourStep, setTourStep, settings } = useAppStore()
  const [isMinimized, setIsMinimized] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  const config = DEMO_MODE_CONFIG[settings.demoMode]
  const steps = PRESENTATION_STEPS[settings.demoMode] || PRESENTATION_STEPS.exec_bi_review
  const currentStep = steps[tourStep]
  const progress = ((tourStep + 1) / steps.length) * 100

  // Navigate to correct route when step changes
  useEffect(() => {
    if (tourActive && currentStep && pathname !== currentStep.route) {
      router.push(currentStep.route)
    }
  }, [tourActive, currentStep, pathname, router])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!tourActive) return

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        e.preventDefault()
        if (tourStep < steps.length - 1) {
          setTourStep(tourStep + 1)
        }
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        if (tourStep > 0) {
          setTourStep(tourStep - 1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setTourActive(false)
        setTourStep(0)
        break
      case 'm':
        e.preventDefault()
        setIsMinimized(!isMinimized)
        break
      case '?':
        e.preventDefault()
        setShowKeyboardHelp(!showKeyboardHelp)
        break
    }
  }, [tourActive, tourStep, steps.length, setTourStep, setTourActive, isMinimized, showKeyboardHelp])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleNext = () => {
    if (tourStep < steps.length - 1) {
      setTourStep(tourStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (tourStep > 0) {
      setTourStep(tourStep - 1)
    }
  }

  const handleClose = () => {
    setTourActive(false)
    setTourStep(0)
  }

  const goToStep = (index: number) => {
    setTourStep(index)
  }

  if (!tourActive) return null

  // Minimized view - just a floating pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2"
        >
          <Presentation className="h-4 w-4" />
          <span>Step {tourStep + 1}/{steps.length}</span>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Keyboard help overlay */}
      {showKeyboardHelp && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div className="bg-white rounded-xl p-6 max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Next slide</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">→ or Space</kbd>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Previous slide</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">←</kbd>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Minimize panel</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">M</kbd>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Exit presentation</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Esc</kbd>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Toggle this help</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">?</kbd>
              </div>
            </div>
            <Button className="w-full mt-4" onClick={() => setShowKeyboardHelp(false)}>
              Got it
            </Button>
          </div>
        </div>
      )}

      {/* Floating presenter panel - docked to bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-6xl mx-auto px-4 pb-4 pointer-events-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            {/* Header with progress */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Presentation className="h-5 w-5" />
                  <div>
                    <span className="font-medium">{config.name}</span>
                    <span className="mx-2 text-red-200">|</span>
                    <span className="text-red-100">{config.persona}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowKeyboardHelp(true)}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    title="Keyboard shortcuts (?)"
                  >
                    <Keyboard className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    title="Minimize (M)"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    title="Exit (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-2">
                {steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => goToStep(index)}
                    className={cn(
                      "flex-1 h-1 rounded-full transition-all",
                      index <= tourStep ? "bg-white" : "bg-white/30"
                    )}
                    title={step.title}
                  />
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="p-4">
              <div className="grid grid-cols-12 gap-6">
                {/* Left: Step navigation */}
                <div className="col-span-3 border-r pr-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Presentation Flow
                  </div>
                  <div className="space-y-1">
                    {steps.map((step, index) => (
                      <button
                        key={index}
                        onClick={() => goToStep(index)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all",
                          index === tourStep
                            ? "bg-red-50 text-red-700 font-medium"
                            : index < tourStep
                              ? "text-gray-500 hover:bg-gray-50"
                              : "text-gray-400 hover:bg-gray-50"
                        )}
                      >
                        {index < tourStep ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : index === tourStep ? (
                          <div className="h-4 w-4 rounded-full bg-red-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{step.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Middle: Current step talking points */}
                <div className="col-span-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{currentStep?.title}</h3>
                      <p className="text-sm text-gray-500">{currentStep?.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {tourStep + 1} of {steps.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {currentStep?.talkingPoints.map((point, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start gap-2 text-sm py-1",
                          point.emphasis ? "text-gray-900 font-medium" : "text-gray-600"
                        )}
                      >
                        <ArrowRight className={cn(
                          "h-4 w-4 mt-0.5 flex-shrink-0",
                          point.emphasis ? "text-red-500" : "text-gray-400"
                        )} />
                        <span>{point.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Key features & navigation */}
                <div className="col-span-3 border-l pl-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Key Features
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {currentStep?.keyFeatures.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-gray-100 text-gray-700 text-xs"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      disabled={tourStep === 0}
                      className="flex-1"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleNext}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {tourStep === steps.length - 1 ? 'Finish' : 'Next'}
                      {tourStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
