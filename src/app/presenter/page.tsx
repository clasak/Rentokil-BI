"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, PRESENTER_MODE_CONFIG } from '@/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ChevronRight,
  ChevronLeft,
  Presentation,
  MessageCircleQuestion,
  Lightbulb
} from 'lucide-react'

// Q&A and additional notes for each step
const PRESENTER_NOTES: Record<string, Record<number, {
  anticipatedQuestions: { q: string; a: string }[]
  tips: string[]
}>> = {
  bi_leadership: {
    0: {
      anticipatedQuestions: [
        {
          q: "How often does the data refresh?",
          a: "The system connects to source systems via APIs and refreshes throughout the day. Most operational data updates every 15-30 minutes. Financial data syncs nightly after close."
        },
        {
          q: "What source systems feed into this?",
          a: "We pull from Salesforce (CRM), SAP (Finance), Workday (HR), ServiceMax (Field Ops), and our data warehouse. The Governance page shows all connections."
        },
        {
          q: "How do you handle data quality issues?",
          a: "The system monitors for missing fields, stale data, and anomalies. Issues surface in the Data Quality dashboard and can trigger alerts."
        }
      ],
      tips: [
        "Point out the color coding - red/yellow/green status indicators",
        "Click a KPI card to show the drill-down capability",
        "Mention that the view adapts based on user role"
      ]
    },
    1: {
      anticipatedQuestions: [
        {
          q: "How do you calculate variance?",
          a: "Variance = (Actual - Target) / Target. We show both dollar and percentage variance. The Reconcile tab shows the full calculation breakdown."
        },
        {
          q: "Where does the target come from?",
          a: "Targets flow from the annual planning process in SAP. Branch managers can see their targets but can't edit them - that requires finance approval."
        },
        {
          q: "Can I see variance by region or product?",
          a: "Yes - the Drivers tab breaks down variance by any dimension: market, branch, product line, customer segment. Click any driver to drill further."
        }
      ],
      tips: [
        "Show the Drivers tab to demonstrate drill-down",
        "Click the Lineage button to show data traceability",
        "Mention the Reconcile tab for finance users who need audit trails"
      ]
    },
    2: {
      anticipatedQuestions: [
        {
          q: "What's included in the pipeline number?",
          a: "Active opportunities in stages 2-5 with close dates in the next 90 days. We exclude stage 1 (unqualified) and closed deals."
        },
        {
          q: "How is weighted pipeline calculated?",
          a: "Each stage has a probability weight based on historical conversion rates. Stage 3 might be 30%, Stage 4 is 60%, Stage 5 is 85%."
        },
        {
          q: "What counts as a hygiene issue?",
          a: "Missing close dates, no activity in 14+ days, outdated contact info, or deals stuck at same stage for 30+ days."
        }
      ],
      tips: [
        "Point out the stage conversion funnel",
        "Show the hygiene score breakdown",
        "Click into a stalled opportunity to show the detail view"
      ]
    },
    3: {
      anticipatedQuestions: [
        {
          q: "What's in the Service Risk Index?",
          a: "Composite score of callback rate (40%), customer satisfaction (30%), on-time completion (20%), and first-time fix rate (10%)."
        },
        {
          q: "How do callbacks impact the business?",
          a: "Each callback costs $150-200 in truck roll and labor, plus customer satisfaction impact. Reducing callbacks 1% saves ~$50K annually for a mid-size branch."
        },
        {
          q: "What's the target for route efficiency?",
          a: "80-85% utilization is the sweet spot. Lower means excess capacity cost, higher risks quality issues and burnout."
        }
      ],
      tips: [
        "Show the trend lines, not just today's numbers",
        "Click into callback rate to see by technician",
        "Point out the correlation between utilization and callbacks"
      ]
    },
    4: {
      anticipatedQuestions: [
        {
          q: "How accurate are these forecasts?",
          a: "The backtest section shows our historical accuracy - typically within 3-5% for 4-week forecasts. Accuracy degrades for longer horizons, hence the confidence bands."
        },
        {
          q: "What drives the scenarios?",
          a: "Base case uses current trends. Upside assumes favorable seasonality, pipeline conversion, and retention. Downside models economic headwinds and churn risk."
        },
        {
          q: "Can managers input their own forecasts?",
          a: "Yes - managers can submit their forecast calls which get weighted with the statistical model. This blends local knowledge with data-driven predictions."
        }
      ],
      tips: [
        "Hover over the chart to show confidence intervals",
        "Toggle between scenarios to show the range of outcomes",
        "Scroll down to show the backtest accuracy metrics"
      ]
    },
    5: {
      anticipatedQuestions: [
        {
          q: "Who owns each KPI?",
          a: "Every KPI has a business owner (accountable for the number) and a technical owner (accountable for the data). The dictionary shows both."
        },
        {
          q: "How do you ensure data quality?",
          a: "Automated monitoring checks for freshness, completeness, and anomalies. We score each source system and alert when quality degrades."
        },
        {
          q: "What about data access and security?",
          a: "Role-based access control. Execs see everything, managers see their branches, reps see their accounts. The Permissions tab shows the full matrix."
        }
      ],
      tips: [
        "Use the search to find a specific KPI definition",
        "Show the Data Quality scores for each source system",
        "Click a KPI to show its full governance metadata"
      ]
    }
  }
}

export default function PresenterPage() {
  const router = useRouter()
  const {
    presenterMode,
    setPresenterMode,
    presenterStep,
    nextPresenterStep,
    prevPresenterStep,
    settings
  } = useAppStore()

  // Fallback to bi_leadership if the stored demoMode doesn't exist in config
  const demoMode = settings.demoMode in PRESENTER_MODE_CONFIG
    ? settings.demoMode
    : 'bi_leadership'
  const config = PRESENTER_MODE_CONFIG[demoMode]
  const currentStep = config?.steps?.[presenterStep]
  const totalSteps = config?.steps?.length || 0
  const isFirstStep = presenterStep === 0
  const isLastStep = presenterStep === totalSteps - 1

  const notes = PRESENTER_NOTES[demoMode]?.[presenterStep]

  // Auto-start presenter mode when this page opens
  useEffect(() => {
    if (!presenterMode) {
      setPresenterMode(true)
    }
  }, [presenterMode, setPresenterMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          nextPresenterStep()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevPresenterStep()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPresenterStep, prevPresenterStep])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Presentation className="h-6 w-6 text-rentokil-red" />
          <div>
            <h1 className="font-bold text-lg">{config.name}</h1>
            <p className="text-sm text-gray-400">{config.persona}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          Step {presenterStep + 1} of {totalSteps}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 rounded-full mb-6">
        <div
          className="h-full bg-rentokil-red rounded-full transition-all duration-300"
          style={{ width: `${((presenterStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step Title */}
      <h2 className="text-2xl font-bold mb-4">{currentStep?.title}</h2>

      {/* Script */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Talking Points
        </h3>
        <div className="space-y-3">
          {currentStep?.script.map((line, index) => (
            <p key={index} className="text-gray-200 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Tips */}
      {notes?.tips && notes.tips.length > 0 && (
        <div className="bg-blue-950/50 border border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Demo Tips
          </h3>
          <ul className="space-y-2">
            {notes.tips.map((tip, index) => (
              <li key={index} className="text-blue-200 text-sm flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Anticipated Q&A */}
      {notes?.anticipatedQuestions && notes.anticipatedQuestions.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4" />
            Anticipated Questions
          </h3>
          <div className="space-y-4">
            {notes.anticipatedQuestions.map((qa, index) => (
              <div key={index} className="border-l-2 border-gray-700 pl-4">
                <p className="text-white font-medium mb-1">Q: {qa.q}</p>
                <p className="text-gray-400 text-sm">A: {qa.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator className="my-6 bg-gray-800" />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevPresenterStep}
          disabled={isFirstStep}
          className="gap-2 bg-gray-900 border-gray-700 hover:bg-gray-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="text-sm text-gray-500">
          <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">←</kbd>
          {' / '}
          <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">→</kbd>
          {' to navigate'}
        </div>

        <Button
          onClick={isLastStep ? () => window.close() : nextPresenterStep}
          className={isLastStep ? "bg-green-600 hover:bg-green-700" : "bg-rentokil-red hover:bg-rentokil-darkred"}
        >
          {isLastStep ? 'Finish' : 'Next'}
          {!isLastStep && <ChevronRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>
    </div>
  )
}
