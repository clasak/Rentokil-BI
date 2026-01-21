'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  ArrowRight,
  LogIn,
  Compass,
  BarChart3,
  Filter,
  Download,
  CheckCircle2,
  PlayCircle,
  Clock,
  Lightbulb,
  ChevronRight
} from 'lucide-react'

const STEPS = [
  {
    id: 'login',
    number: 1,
    title: 'Login & Authentication',
    icon: LogIn,
    duration: '2 min',
    description: 'Access your Rentokil BI dashboard securely',
    content: [
      {
        subtitle: 'Accessing the Platform',
        text: 'Navigate to your organization\'s Rentokil BI URL and enter your email address and password. If you don\'t have credentials, contact your administrator.'
      },
      {
        subtitle: 'First-Time Setup',
        text: 'New users will be guided through an onboarding flow to set up their profile, including name, department, and role selection.'
      },
      {
        subtitle: 'Password Reset',
        text: 'If you forget your password, click "Forgot Password" on the login page. A reset link will be sent to your email.'
      }
    ],
    tips: [
      'Bookmark the login page for quick access',
      'Use a strong, unique password',
      'Contact IT if you experience login issues'
    ]
  },
  {
    id: 'navigate',
    number: 2,
    title: 'Navigate the Dashboard',
    icon: Compass,
    duration: '5 min',
    description: 'Learn your way around the interface',
    content: [
      {
        subtitle: 'Sidebar Navigation',
        text: 'The left sidebar contains all main navigation links. Sections available depend on your role. Click any menu item to navigate to that section.'
      },
      {
        subtitle: 'Command Center',
        text: 'The main dashboard (Command Center) shows your top 10 KPIs at a glance. Each KPI card displays current value, trend, and status indicator.'
      },
      {
        subtitle: 'Header Controls',
        text: 'The top header includes theme toggle (light/dark mode), settings access, notifications, and your profile menu.'
      },
      {
        subtitle: 'Role-Based Views',
        text: 'Your role determines which sections and data you can access. Executives see national data, while branch managers see their specific branch.'
      }
    ],
    tips: [
      'The sidebar can be collapsed on smaller screens',
      'Use keyboard shortcut Ctrl/Cmd + K for quick navigation',
      'Hover over KPI cards to see additional details'
    ]
  },
  {
    id: 'kpis',
    number: 3,
    title: 'Understanding KPIs',
    icon: BarChart3,
    duration: '10 min',
    description: 'Learn to read and interpret key performance indicators',
    content: [
      {
        subtitle: 'KPI Cards',
        text: 'Each KPI card shows: the metric name, current value, comparison to target/last period, trend direction, and a status indicator (green/yellow/red).'
      },
      {
        subtitle: 'Status Indicators',
        text: 'Green means on track or exceeding target. Yellow indicates approaching threshold (needs attention). Red signals critical status requiring action.'
      },
      {
        subtitle: 'Drill-Down',
        text: 'Click any KPI card to access the detail page with tabs for Overview, Drivers, Actions, Reconcile, and Definition. This provides full context and recommended actions.'
      },
      {
        subtitle: 'Trends & Comparisons',
        text: 'Arrows indicate trend direction (up/down). Percentage changes compare to prior period. Sparklines show historical trends at a glance.'
      }
    ],
    tips: [
      'Check the KPI Glossary for detailed definitions',
      'Focus on red KPIs first during your daily review',
      'Use the Definition tab to understand calculation methodology'
    ]
  },
  {
    id: 'filters',
    number: 4,
    title: 'Using Filters',
    icon: Filter,
    duration: '5 min',
    description: 'Filter data to focus on what matters',
    content: [
      {
        subtitle: 'Date Range Filters',
        text: 'Most dashboards include date range selectors. Choose from presets (Today, This Week, This Month, This Quarter) or select custom date ranges.'
      },
      {
        subtitle: 'Business Unit Filters',
        text: 'Filter by Market, Region, or Branch to focus on specific areas. Your role determines which levels you can access.'
      },
      {
        subtitle: 'Additional Filters',
        text: 'Many pages offer additional filters like service type, vertical, owner, or status. Look for filter dropdowns above data tables and charts.'
      },
      {
        subtitle: 'Saving Filter Preferences',
        text: 'Your filter selections are remembered during your session. Default scenario preferences can be set in Settings.'
      }
    ],
    tips: [
      'Use filters to compare performance across regions',
      'Combine multiple filters for focused analysis',
      'Clear filters to return to the default view'
    ]
  },
  {
    id: 'export',
    number: 5,
    title: 'Exporting Data',
    icon: Download,
    duration: '3 min',
    description: 'Export reports and data for sharing',
    content: [
      {
        subtitle: 'PDF Reports',
        text: 'Weekly Business Review (WBR) and Quarterly Business Review (QBR) pages include PDF export buttons. These generate formatted reports suitable for printing or sharing.'
      },
      {
        subtitle: 'Data Tables',
        text: 'Tables with export functionality include a download button. Data can be exported as CSV or Excel format for further analysis.'
      },
      {
        subtitle: 'Charts & Visualizations',
        text: 'Some charts allow downloading as PNG images. Look for the download icon in the chart header or use your browser\'s screenshot functionality.'
      },
      {
        subtitle: 'Scheduled Reports',
        text: 'Email-based scheduled reports are coming soon. Configure notification preferences in Settings to be notified when this feature launches.'
      }
    ],
    tips: [
      'Use PDF exports for stakeholder presentations',
      'Export to CSV for custom analysis in Excel',
      'Include date context when sharing exports'
    ]
  }
]

export default function GettingStartedPage() {
  const [activeStep, setActiveStep] = useState<string | null>(null)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/help" className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Help Center
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 dark:text-gray-100">Getting Started</span>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <Badge variant="default">Start Here</Badge>
        <h1 className="text-3xl font-bold dark:text-gray-100">Getting Started Guide</h1>
        <p className="text-gray-500 dark:text-gray-400">
          New to Rentokil BI? Follow these steps to get up and running quickly. This guide covers everything from logging in to exporting your first report.
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              <span className="font-medium dark:text-gray-100">5 Steps</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>~25 minutes total</span>
            </div>
          </div>
          <div className="flex gap-1 mt-4">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  activeStep === step.id
                    ? 'bg-primary'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = activeStep === step.id
          const isLast = index === STEPS.length - 1

          return (
            <Card
              key={step.id}
              id={step.id}
              className={`transition-all ${
                isActive ? 'border-primary shadow-md' : 'hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <CardHeader
                className="cursor-pointer"
                onClick={() => setActiveStep(isActive ? null : step.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      isActive ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Step {step.number}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {step.duration}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {isActive ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>

              {isActive && (
                <CardContent className="pt-0">
                  <Separator className="mb-6" />

                  {/* Content Sections */}
                  <div className="space-y-6">
                    {step.content.map((section, idx) => (
                      <div key={idx}>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                          {section.subtitle}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {section.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Tips */}
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Pro Tips
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {step.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between mt-6">
                    {index > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStep(STEPS[index - 1].id)
                        }}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                    ) : (
                      <div />
                    )}
                    {!isLast && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStep(STEPS[index + 1].id)
                        }}
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Next Steps */}
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800/50">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
                Ready to explore more?
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                Now that you know the basics, dive deeper into specific modules or check the KPI glossary for detailed metric definitions.
              </p>
              <div className="flex gap-3">
                <Link href="/help/modules">
                  <Button variant="outline" size="sm" className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/50">
                    Explore Modules
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/help/kpi-glossary">
                  <Button variant="outline" size="sm" className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/50">
                    KPI Glossary
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
