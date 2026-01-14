"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft, ChevronRight, X, Play, CheckCircle, Target,
  Building2, TrendingUp, Truck, Users, UserCheck, Wrench,
  Briefcase, Crown, BarChart3, DollarSign, Settings, FileText
} from 'lucide-react'
import { Role } from '@/types'
import { useAppStore } from '@/store'

interface TutorialStep {
  title: string
  description: string
  route: string
  highlight?: string // CSS selector for element to highlight
  icon: typeof Building2
  tips: string[]
}

// Tutorial steps by role
const ROLE_TUTORIALS: Record<Role, TutorialStep[]> = {
  exec: [
    {
      title: 'Executive Command Center',
      description: 'Your single view of business health. The top 10 KPIs are displayed with real-time status, trends, and drill-down capability.',
      route: '/',
      icon: Crown,
      tips: [
        'Click any KPI card to see detailed analysis',
        'Use the variance narrative to understand key drivers',
        'The action list shows items requiring your attention'
      ]
    },
    {
      title: 'Cross-Functional Views',
      description: 'Switch between Sales, Operations, and Finance views using the view toggle in the top-right.',
      route: '/',
      icon: Building2,
      tips: [
        'Sales View shows pipeline and revenue metrics',
        'Operations View tracks service delivery and capacity',
        'Finance View monitors AR, margins, and cash flow'
      ]
    },
    {
      title: 'Forecast & Scenarios',
      description: 'Review 8-week revenue projections with scenario analysis (Base, Upside, Downside).',
      route: '/forecast',
      icon: Target,
      tips: [
        'Toggle between scenarios to see impact ranges',
        'Backtest shows historical accuracy of forecasts',
        'Assumptions can be adjusted for custom scenarios'
      ]
    },
    {
      title: 'Weekly Business Review',
      description: 'Pre-built executive summary for leadership meetings with export to PDF.',
      route: '/wbr',
      icon: FileText,
      tips: [
        'Export button generates presentation-ready PDF',
        'Commentary sections can be customized',
        'Historical comparisons are automatically included'
      ]
    }
  ],
  market_director: [
    {
      title: 'Market Overview',
      description: 'See all regions within your market with aggregated KPIs and drill-down to regional details.',
      route: '/',
      icon: Building2,
      tips: [
        'Filter by region using the business unit selector',
        'Click through to see branch-level performance',
        'Watch for retention risk alerts'
      ]
    },
    {
      title: 'Sales Pipeline',
      description: 'Monitor pipeline health across your market with weighted revenue projections.',
      route: '/sales',
      icon: TrendingUp,
      tips: [
        'Review stalled opportunities weekly',
        'Pipeline coverage ratio should be 3x quota',
        'Win rate trends indicate market competitiveness'
      ]
    },
    {
      title: 'Operations Performance',
      description: 'Track service delivery metrics including callbacks, missed services, and technician utilization.',
      route: '/ops',
      icon: Truck,
      tips: [
        'Service Risk Index combines key operational metrics',
        'Callback rate target is below 5%',
        'Capacity utilization sweet spot is 85%'
      ]
    }
  ],
  market_sales_director: [
    {
      title: 'Market Sales Overview',
      description: 'See sales performance across all regions within your market with pipeline visibility.',
      route: '/',
      icon: TrendingUp,
      tips: [
        'Monitor sales pipeline health across all regions',
        'Identify top and bottom performing sales teams',
        'Track revenue attainment vs quota by region'
      ]
    },
    {
      title: 'Sales Pipeline',
      description: 'Market-wide pipeline with weighted revenue projections and stalled opportunity alerts.',
      route: '/sales',
      icon: TrendingUp,
      tips: [
        'Review stalled opportunities for escalation',
        'Pipeline coverage should be 3x quota minimum',
        'Win rate trends indicate competitive positioning'
      ]
    },
    {
      title: 'Lead Service Engine',
      description: 'Track leads from source through conversion across all market regions.',
      route: '/lead-service-engine',
      icon: Target,
      tips: [
        'Compare lead source effectiveness by region',
        'Identify conversion bottlenecks',
        'Optimize sales team resource allocation'
      ]
    }
  ],
  region_director: [
    {
      title: 'Region Dashboard',
      description: 'Monitor all branches in your region with real-time KPI status.',
      route: '/',
      icon: Users,
      tips: [
        'Branch rankings help identify best practices',
        'Variance analysis shows drivers of performance',
        'Alert indicators require same-day review'
      ]
    },
    {
      title: 'Branch Comparison',
      description: 'Compare branch performance side-by-side to identify opportunities.',
      route: '/ops',
      icon: BarChart3,
      tips: [
        'Sort by any metric to find outliers',
        'Best-performing branches can mentor others',
        'Use for territory balancing decisions'
      ]
    }
  ],
  manager: [
    {
      title: 'Branch Command Center',
      description: 'Your daily operational dashboard with team metrics and action items.',
      route: '/',
      icon: Briefcase,
      tips: [
        'Review the action list first thing each morning',
        'Check scheduling pressure before approving PTO',
        'Monitor callback rate for training needs'
      ]
    },
    {
      title: 'WIG Scorecard',
      description: 'Track progress on your Wildly Important Goals with leading indicators.',
      route: '/manager/wig-scorecard',
      icon: Target,
      tips: [
        'Update lead measures weekly',
        'Celebrate wins with your team',
        'Adjust tactics if leading indicators are off-track'
      ]
    },
    {
      title: 'Daily Sales Cadence',
      description: 'Enter and review daily sales activity metrics for your branch.',
      route: '/manager/daily-sales',
      icon: DollarSign,
      tips: [
        'Enter data by end of each business day',
        'Compare to branch targets',
        'Track TAP leads if your market uses them'
      ]
    }
  ],
  sales_manager: [
    {
      title: 'Sales Dashboard',
      description: 'Pipeline, opportunities, and team performance metrics.',
      route: '/sales',
      icon: TrendingUp,
      tips: [
        'Monitor pipeline coverage weekly',
        'Review stalled deals for intervention',
        'Track win rate by rep for coaching'
      ]
    },
    {
      title: 'Lead Service Engine',
      description: 'Track leads from source through conversion to service delivery.',
      route: '/lead-service-engine',
      icon: Target,
      tips: [
        'Funnel shows conversion at each stage',
        'Identify drop-off points for process improvement',
        'Compare lead source effectiveness'
      ]
    },
    {
      title: 'Sales Tracker',
      description: 'Enter proposals and closed deals for accurate pipeline tracking.',
      route: '/ae/sales-tracker',
      icon: FileText,
      tips: [
        'Update opportunity status daily',
        'Include all required fields for reporting',
        'Link to accounts for service handoff'
      ]
    }
  ],
  ops_manager: [
    {
      title: 'Operations Dashboard',
      description: 'Service delivery metrics, technician performance, and capacity planning.',
      route: '/ops',
      icon: Truck,
      tips: [
        'Check Service Risk Index first',
        'Review callbacks for technician coaching',
        'Monitor capacity utilization daily'
      ]
    },
    {
      title: 'New Start Log',
      description: 'Manage sales-to-service handoffs for new customer installations.',
      route: '/ops/new-start-log',
      icon: Users,
      tips: [
        'Update status as installations progress',
        'Coordinate with sales on customer expectations',
        'Track installation timing for capacity planning'
      ]
    },
    {
      title: 'Route Management',
      description: 'Optimize technician routes for efficiency.',
      route: '/tech/route',
      icon: Wrench,
      tips: [
        'Balance route density with drive time',
        'Account for seasonal service patterns',
        'Leave capacity for on-demand requests'
      ]
    }
  ],
  rep: [
    {
      title: 'Your Dashboard',
      description: 'Personal pipeline, activity metrics, and targets.',
      route: '/ae',
      icon: UserCheck,
      tips: [
        'Review your pipeline daily',
        'Update opportunity stages promptly',
        'Log all customer activities'
      ]
    },
    {
      title: 'Sales Tracker',
      description: 'Enter proposals and track deals through the sales cycle.',
      route: '/ae/sales-tracker',
      icon: TrendingUp,
      tips: [
        'Enter proposals same day as delivery',
        'Update close dates regularly',
        'Include all pricing details'
      ]
    },
    {
      title: 'Account Details',
      description: 'View customer history, service records, and opportunities.',
      route: '/ae/accounts',
      icon: Building2,
      tips: [
        'Review service history before visits',
        'Note any open issues or complaints',
        'Identify upsell opportunities'
      ]
    }
  ],
  technician: [
    {
      title: 'Your Route',
      description: 'Today&apos;s scheduled service visits with customer details.',
      route: '/tech/route',
      icon: Wrench,
      tips: [
        'Review route before starting your day',
        'Check account notes for special instructions',
        'Update status as you complete each stop'
      ]
    },
    {
      title: 'Service Tickets',
      description: 'Document service performed, materials used, and observations.',
      route: '/tech/tickets',
      icon: FileText,
      tips: [
        'Complete tickets before leaving site',
        'Note any conditions requiring follow-up',
        'Capture customer signatures when required'
      ]
    }
  ]
}

interface RoleTutorialProps {
  autoShow?: boolean // Show automatically for new users
}

export function RoleTutorial({ autoShow = false }: RoleTutorialProps) {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use default role during SSR to prevent hydration mismatch
  const role = mounted ? settings.role : 'exec'
  const steps = ROLE_TUTORIALS[role] || ROLE_TUTORIALS.exec

  useEffect(() => {
    if (autoShow) {
      // Check if user has seen the tutorial
      const tutorialSeen = localStorage.getItem(`tutorial_seen_${role}`)
      if (!tutorialSeen) {
        setIsOpen(true)
      }
    }
  }, [autoShow, role])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(`tutorial_seen_${role}`, 'true')
    setIsOpen(false)
    setCurrentStep(0)
  }

  const handleGoToPage = () => {
    const step = steps[currentStep]
    router.push(step.route)
  }

  const currentStepData = steps[currentStep]
  const Icon = currentStepData?.icon || Building2
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Play className="h-4 w-4" />
        Tutorial
      </Button>

      {/* Tutorial Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{role.replace('_', ' ').toUpperCase()}</Badge>
                <span className="text-sm text-gray-500">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Progress value={progress} className="mt-2" />
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl mb-1">{currentStepData?.title}</DialogTitle>
                <DialogDescription>{currentStepData?.description}</DialogDescription>
              </div>
            </div>

            {/* Tips */}
            <Card className="bg-gray-50 dark:bg-gray-800/50 border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Tips for this view
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentStepData?.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Go to Page Button */}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleGoToPage}
            >
              Go to {currentStepData?.title}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex gap-1">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-primary'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? (
                <>
                  Complete
                  <CheckCircle className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper to reset tutorial for testing
export function resetTutorial(role: Role) {
  localStorage.removeItem(`tutorial_seen_${role}`)
}
