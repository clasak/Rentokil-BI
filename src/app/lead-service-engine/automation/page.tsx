"use client"

import Link from 'next/link'
import { ROICalculator, ProcessComparison } from '@/components/lead-engine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, TrendingUp, Zap, Clock, DollarSign, Users, ArrowRight,
  CheckCircle, XCircle, Lightbulb
} from 'lucide-react'

export default function AutomationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/lead-service-engine">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-green-500" />
            Automation ROI
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Calculate potential savings from automating manual handoff processes
          </p>
        </div>
      </div>

      {/* Value Proposition Banner */}
      <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
        <Lightbulb className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Key Insight:</strong> The two manual email handoffs (BD→Sales and Sales→Ops) consume
          significant time and create delays. Automating these touchpoints can save hundreds of hours
          annually and improve lead-to-service time.
        </AlertDescription>
      </Alert>

      {/* Key Benefits Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <div className="text-3xl font-bold">85%</div>
            <div className="text-sm opacity-80">Reduction in Handoff Time</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <div className="text-3xl font-bold">$50K+</div>
            <div className="text-sm opacity-80">Potential Annual Savings</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <div className="text-3xl font-bold">1.5+</div>
            <div className="text-sm opacity-80">FTE Equivalent Freed</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <div className="text-3xl font-bold">24h</div>
            <div className="text-sm opacity-80">Faster Lead Response</div>
          </CardContent>
        </Card>
      </div>

      {/* Process Comparison */}
      <ProcessComparison />

      {/* ROI Calculator */}
      <ROICalculator />

      {/* Implementation Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Roadmap</CardTitle>
          <CardDescription>Phased approach to automation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Phase 1 */}
            <div className="p-4 rounded-lg border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600">Phase 1</Badge>
                <span className="font-medium">Quick Wins</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Digital start packet form</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Required field validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>SLA monitoring dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>At-risk lead alerts</span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
                <div className="text-xs text-green-700 dark:text-green-400">
                  Impact: ~30% time savings
                </div>
              </div>
            </div>

            {/* Phase 2 */}
            <div className="p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-600">Phase 2</Badge>
                <span className="font-medium">Integration</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Salesforce API integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Auto-populated lead data</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Territory-based routing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Real-time status sync</span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-blue-300 dark:border-blue-700">
                <div className="text-xs text-blue-700 dark:text-blue-400">
                  Impact: ~60% time savings
                </div>
              </div>
            </div>

            {/* Phase 3 */}
            <div className="p-4 rounded-lg border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-purple-600">Phase 3</Badge>
                <span className="font-medium">Full Automation</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Eliminate email handoffs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Auto-assignment to AE/Ops</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Instant mobile notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Automated customer updates</span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-purple-300 dark:border-purple-700">
                <div className="text-xs text-purple-700 dark:text-purple-400">
                  Impact: ~85% time savings
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Case Summary */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <CardHeader>
          <CardTitle>Business Case Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-red-700 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                Current Pain Points
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Manual email handoffs create 24-48 hour delays
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Start packet data often incomplete or incorrect
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  No visibility into pipeline bottlenecks
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Leads fall through cracks during handoffs
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Time spent on manual data entry and re-entry
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                Automation Benefits
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  Instant lead routing (seconds vs. hours)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  Validated data at every stage
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  Real-time visibility and proactive alerts
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  100% lead tracking and accountability
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  Staff time redirected to customer engagement
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ready to explore automation options? The integration framework is ready for Salesforce connection.
            </p>
            <Link href="/lead-service-engine/integration">
              <Button>
                View Integration Status
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
