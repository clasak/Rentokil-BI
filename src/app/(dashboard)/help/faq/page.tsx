'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  ArrowLeft,
  Search,
  HelpCircle,
  ChevronRight,
  Database,
  Calculator,
  Shield,
  AlertTriangle,
  Lightbulb,
  Zap,
  MessageCircle
} from 'lucide-react'

const FAQ_CATEGORIES = [
  {
    id: 'data',
    name: 'Data Sources',
    icon: Database,
    description: 'Questions about where data comes from and how it is refreshed',
    questions: [
      {
        q: 'Where does the data in the dashboard come from?',
        a: 'The Rentokil BI dashboard pulls data from multiple source systems including Salesforce CRM (opportunities, leads, accounts), the Billing/ERP system (invoices, revenue), the Service Management System (service events, technician activities), the HR System (employee data), and the RTX Data Hub which aggregates data from all enterprise systems.'
      },
      {
        q: 'How often is the data refreshed?',
        a: 'Refresh cadences vary by KPI: Revenue metrics refresh every 4 hours, Sales pipeline data refreshes every 2 hours, Service operations data refreshes daily, and Forecast data updates weekly on Monday mornings. You can see the specific refresh cadence for any KPI in the KPI Glossary or on the KPI detail page.'
      },
      {
        q: 'Why might I see different numbers than in our source systems?',
        a: 'There are several potential reasons: 1) Timing differences due to refresh cadences, 2) Different date ranges or filters applied, 3) Different calculation methodologies (e.g., weighted vs. unweighted values), 4) Data quality issues in source systems. Use the "Reconcile" tab on any KPI detail page to compare values and understand differences.'
      },
      {
        q: 'What happens if a data source is unavailable?',
        a: 'The platform includes automatic failover capabilities. If the primary data source (RTX Data Hub) is unavailable, the system will automatically switch to cached or mock data and display a notification banner. Data freshness indicators will show the data is stale until the source recovers.'
      },
      {
        q: 'How can I request new data sources or integrations?',
        a: 'Contact the BI team at bi-support@rentokil.com with your request. Include: what data you need, why you need it, and which source system contains it. The team will evaluate the request and provide an implementation timeline.'
      }
    ]
  },
  {
    id: 'calculations',
    name: 'Calculations',
    icon: Calculator,
    description: 'Understanding how KPIs and metrics are calculated',
    questions: [
      {
        q: 'How is the Win Rate calculated?',
        a: 'Win Rate = (Number of Closed Won Opportunities) / (Number of Closed Won + Closed Lost Opportunities) x 100. Only opportunities that actually closed in the selected period are included. Open opportunities are not counted. This gives you the true conversion rate of opportunities that reached a decision point.'
      },
      {
        q: 'What is the difference between weighted and unweighted pipeline?',
        a: 'Unweighted pipeline is the raw sum of all opportunity amounts. Weighted pipeline multiplies each opportunity amount by its stage probability (e.g., a $100K opportunity at 50% probability = $50K weighted value). The dashboard primarily uses weighted values for forecasting accuracy.'
      },
      {
        q: 'How is the Service Risk Index calculated?',
        a: 'The Service Risk Index is a composite score from 0-100 based on: On-time service completion (40% weight), First-time resolution rate (30% weight), and Customer satisfaction scores (30% weight). Higher scores indicate BETTER service delivery (lower risk). A score of 85+ is considered healthy.'
      },
      {
        q: 'Why are some metrics marked as "Higher is Better" or "Lower is Better"?',
        a: 'This indicates the direction of improvement. For example, Revenue: higher is better. Callback Rate: lower is better. DSO (Days Sales Outstanding): lower is better. This helps you quickly interpret trend arrows - a green up arrow on Revenue is good, but a green down arrow on Callback Rate is good.'
      },
      {
        q: 'How is the 8-Week Forecast calculated?',
        a: 'The forecast combines: 1) Weighted pipeline by expected close date, 2) Historical conversion rates by stage, 3) Baseline recurring revenue, 4) Seasonality adjustments based on prior year patterns. Three scenarios are available: Base (expected), Upside (optimistic), and Downside (conservative). The backtest tab shows historical accuracy.'
      }
    ]
  },
  {
    id: 'permissions',
    name: 'Permissions & Roles',
    icon: Shield,
    description: 'Access levels and role-based features',
    questions: [
      {
        q: 'What determines what I can see in the dashboard?',
        a: 'Your assigned role determines your data access and available features. Executives see national data across all markets. Regional directors see their region. Branch managers see their branch. Account Executives see their accounts and pipeline. Technicians see their assigned routes and tickets.'
      },
      {
        q: 'What are the different roles and their access levels?',
        a: 'The platform has 10 roles in a hierarchy: Executive (national view, all features), Market VP/Sales Director (market level), Region Director/Sales Manager (region level), Branch Manager (branch level), Sales Manager (sales-specific views), Ops Manager (operations focus), Sales Rep/AE (personal accounts and pipeline), and Technician (routes and tickets only).'
      },
      {
        q: 'How do I get access to additional modules or data?',
        a: 'Contact your manager to request access changes. They will need to submit a request to IT/HR to update your role assignment. Role changes require manager approval and may take 1-2 business days to process.'
      },
      {
        q: 'Why can I not see the Governance section?',
        a: 'The Governance section (KPI Dictionary, Data Quality, Permissions) is only available to management-level roles (exec, directors, managers). Sales reps and technicians do not have access to governance features as these are administrative functions.'
      },
      {
        q: 'What can admins do that regular users cannot?',
        a: 'Admin users (specific emails configured by IT) can: simulate any role to test views, toggle data quality mode, launch presenter mode for demos, access the admin console, and configure system settings. Regular users only see their role-appropriate view.'
      }
    ]
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    icon: AlertTriangle,
    description: 'Common issues and how to resolve them',
    questions: [
      {
        q: 'The dashboard is loading slowly. What can I do?',
        a: 'Try these steps: 1) Refresh the page, 2) Clear your browser cache, 3) Try a different browser (Chrome recommended), 4) Check your internet connection, 5) If the problem persists, the system may be under heavy load - try again in a few minutes. Contact support if issues continue.'
      },
      {
        q: 'I am seeing a "Data Stale" warning. What does this mean?',
        a: 'This means the data has not refreshed within the expected window. Common causes: scheduled maintenance, source system issues, or integration problems. The data shown is still valid but may not reflect the most recent changes. The banner will clear once data refreshes successfully.'
      },
      {
        q: 'A KPI is showing as red/critical but I think it is wrong. What should I do?',
        a: 'First, click into the KPI detail page and check the Reconcile tab to compare against source systems. If there is a genuine discrepancy, use the Definition tab to understand the calculation. If you still believe there is an error, contact bi-support@rentokil.com with the KPI name, expected value, and source system reference.'
      },
      {
        q: 'I cannot log in to the dashboard. What should I do?',
        a: 'Try these steps: 1) Verify you are using the correct URL, 2) Try the "Forgot Password" flow if you cannot remember your password, 3) Clear browser cookies and cache, 4) Try an incognito/private browser window, 5) Contact IT helpdesk if you still cannot log in - your account may need to be reset.'
      },
      {
        q: 'The charts or visualizations are not displaying correctly.',
        a: 'This is usually a browser compatibility issue. Try: 1) Using Chrome (recommended) or Edge, 2) Disabling browser extensions that might interfere, 3) Zooming to 100%, 4) Enabling JavaScript if disabled. For persistent issues, take a screenshot and report to bi-support@rentokil.com.'
      }
    ]
  },
  {
    id: 'bestpractices',
    name: 'Best Practices',
    icon: Lightbulb,
    description: 'Tips for getting the most out of the dashboard',
    questions: [
      {
        q: 'What should I review daily vs. weekly?',
        a: 'Daily: Check Command Center for any critical (red) KPIs, review your specific metrics (pipeline for sales, routes for techs). Weekly: Deep-dive into trends, compare week-over-week performance, review forecast accuracy. Monthly: Use WBR/QBR reports for comprehensive analysis and planning.'
      },
      {
        q: 'How should I use the different forecast scenarios?',
        a: 'Base scenario: Use for standard planning and goal-setting. Upside scenario: Use when identifying stretch goals or best-case resource planning. Downside scenario: Use for risk planning and ensuring you can meet minimum commitments. Switch between scenarios to understand the range of possible outcomes.'
      },
      {
        q: 'What is the best way to investigate a declining KPI?',
        a: '1) Click into the KPI detail page, 2) Check the Drivers tab to understand what factors impact it, 3) Use filters to identify which segments are underperforming, 4) Review the Actions tab for recommended next steps, 5) Drill down to individual accounts/opportunities to find specific issues.'
      },
      {
        q: 'How can I share dashboard insights with my team?',
        a: 'Options include: 1) Export PDF reports (WBR/QBR pages), 2) Use screen sharing in meetings, 3) Export specific data tables to CSV/Excel, 4) Take screenshots of key visualizations. Coming soon: scheduled email reports and shareable dashboard links.'
      },
      {
        q: 'Should I trust the AI-generated narratives and recommendations?',
        a: 'AI narratives are designed to surface insights and suggest actions based on data patterns. They should be treated as a starting point for investigation, not definitive conclusions. Always validate AI suggestions against your domain knowledge and consider local context that the system may not fully understand.'
      }
    ]
  },
  {
    id: 'shortcuts',
    name: 'Keyboard Shortcuts',
    icon: Zap,
    description: 'Speed up your workflow with keyboard shortcuts',
    questions: [
      {
        q: 'What keyboard shortcuts are available?',
        a: 'Global shortcuts: Cmd/Ctrl + K: Quick navigation search. Presenter Mode: Left/Right arrows: Navigate steps, Space: Auto-play, N: Toggle speaker notes, P: Pop-out notes window, Esc: Exit presenter mode. More shortcuts coming in future updates.'
      },
      {
        q: 'How do I quickly navigate to a specific page?',
        a: 'Press Cmd/Ctrl + K to open the quick navigation search. Type the page name or KPI you want to access, then press Enter. This is the fastest way to move around the dashboard without using the sidebar.'
      },
      {
        q: 'Can I customize keyboard shortcuts?',
        a: 'Custom keyboard shortcuts are not currently available but are on the roadmap. If you have specific shortcut requests that would improve your workflow, please submit feedback through the Help > Feedback option.'
      }
    ]
  }
]

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredCategories = useMemo(() => {
    if (!searchQuery && !selectedCategory) {
      return FAQ_CATEGORIES
    }

    return FAQ_CATEGORIES.map(category => {
      // If category is selected, show only that category
      if (selectedCategory && category.id !== selectedCategory) {
        return null
      }

      // Filter questions by search
      const filteredQuestions = category.questions.filter(qa =>
        qa.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qa.a.toLowerCase().includes(searchQuery.toLowerCase())
      )

      if (filteredQuestions.length === 0 && searchQuery) {
        return null
      }

      return {
        ...category,
        questions: searchQuery ? filteredQuestions : category.questions
      }
    }).filter(Boolean) as typeof FAQ_CATEGORIES
  }, [searchQuery, selectedCategory])

  const totalQuestions = FAQ_CATEGORIES.reduce((acc, cat) => acc + cat.questions.length, 0)
  const filteredQuestionsCount = filteredCategories.reduce((acc, cat) => acc + cat.questions.length, 0)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/help" className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Help Center
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 dark:text-gray-100">FAQ</span>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold dark:text-gray-100">Frequently Asked Questions</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Find answers to common questions about the Rentokil BI platform
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search questions and answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </Button>
        {FAQ_CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {category.name}
            </Button>
          )
        })}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredQuestionsCount} of {totalQuestions} questions
      </div>

      {/* FAQ Sections */}
      <div className="space-y-6">
        {filteredCategories.map((category) => {
          const Icon = category.icon
          return (
            <Card key={category.id} id={category.id}>
              <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {category.questions.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((qa, idx) => (
                    <AccordionItem key={idx} value={`${category.id}-${idx}`}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 pr-4">
                          {qa.q}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {qa.a}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No Results */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No questions found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or browse all categories.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory(null)
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Still Need Help */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/50">
              <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Still have questions?
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                If you could not find the answer you were looking for, our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  <span className="font-medium">Email:</span> bi-support@rentokil.com
                </div>
                <div className="hidden sm:block text-blue-400">|</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  <span className="font-medium">Response time:</span> Within 24 hours
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
