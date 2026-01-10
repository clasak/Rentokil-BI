"use client"

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  calculateAutomationROI,
  DEFAULT_ROI_INPUTS,
  AUTOMATION_OPPORTUNITIES,
  ROIInputs,
  ROIOutputs
} from '@/lib/lead-engine-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Calculator, DollarSign, Clock, Users, TrendingUp, ArrowRight, Zap
} from 'lucide-react'

interface ROICalculatorProps {
  className?: string
}

export function ROICalculator({ className }: ROICalculatorProps) {
  const [inputs, setInputs] = useState<ROIInputs>(DEFAULT_ROI_INPUTS)

  const outputs = useMemo(() => calculateAutomationROI(inputs), [inputs])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Calculator Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-500" />
            Automation ROI Calculator
          </CardTitle>
          <CardDescription>
            Estimate potential savings from automating manual handoff processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Your Inputs</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyLeads">Monthly Lead Volume</Label>
                  <Input
                    id="monthlyLeads"
                    type="number"
                    value={inputs.monthlyLeadVolume}
                    onChange={(e) => setInputs({
                      ...inputs,
                      monthlyLeadVolume: parseInt(e.target.value) || 0
                    })}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-gray-500">
                    Average number of new leads per month
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualTime">Avg Manual Time per Handoff (minutes)</Label>
                  <Input
                    id="manualTime"
                    type="number"
                    value={inputs.avgManualTimePerHandoffMinutes}
                    onChange={(e) => setInputs({
                      ...inputs,
                      avgManualTimePerHandoffMinutes: parseInt(e.target.value) || 0
                    })}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-gray-500">
                    Time spent on each manual email handoff
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="laborCost">Labor Cost per Hour ($)</Label>
                  <Input
                    id="laborCost"
                    type="number"
                    value={inputs.laborCostPerHour}
                    onChange={(e) => setInputs({
                      ...inputs,
                      laborCostPerHour: parseInt(e.target.value) || 0
                    })}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-gray-500">
                    Fully loaded labor cost (salary + benefits)
                  </p>
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Projected Savings</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">Hours Saved/Year</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {formatNumber(outputs.annualHoursSaved)}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">Cost Savings/Year</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrency(outputs.annualCostSavings)}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-700 dark:text-purple-400">FTE Equivalent</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {outputs.fteEquivalent}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-700 dark:text-orange-400">Payback Period</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {outputs.paybackMonths} mo
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                * Based on estimated $50,000 implementation cost. Actual costs may vary based on scope and complexity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Automation Opportunities
          </CardTitle>
          <CardDescription>
            Specific processes that can be automated to eliminate manual work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Process</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Manual Time</TableHead>
                <TableHead className="text-right">Automated Time</TableHead>
                <TableHead className="text-right">Time Saved</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AUTOMATION_OPPORTUNITIES.map((opp) => (
                <TableRow key={opp.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{opp.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="text-gray-400">Current:</span> {opp.currentProcess}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        {opp.automatedProcess}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{opp.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {opp.manualTimeMinutes} min
                  </TableCell>
                  <TableCell className="text-right">
                    {opp.automatedTimeMinutes > 0 ? `${opp.automatedTimeMinutes} min` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                    {opp.manualTimeMinutes - opp.automatedTimeMinutes} min
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      opp.implementationStatus === 'active' ? 'success' :
                      opp.implementationStatus === 'ready' ? 'success' :
                      opp.implementationStatus === 'in_progress' ? 'warning' :
                      'outline'
                    }>
                      {opp.implementationStatus === 'in_progress' ? 'In Progress' :
                       opp.implementationStatus.charAt(0).toUpperCase() + opp.implementationStatus.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Summary row */}
          <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
            <span className="font-medium">Total Time Saved per Lead</span>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">
              {AUTOMATION_OPPORTUNITIES.reduce((sum, opp) =>
                sum + (opp.manualTimeMinutes - opp.automatedTimeMinutes), 0
              )} minutes
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Process comparison component for the visual side-by-side
export function ProcessComparison({ className }: { className?: string }) {
  const currentSteps = [
    { step: 'BD receives lead', time: '0 min', manual: true },
    { step: 'BD enters in CRM', time: '10 min', manual: true },
    { step: 'BD looks up territory', time: '5 min', manual: true },
    { step: 'BD emails Sales Manager + AE', time: '10 min', manual: true },
    { step: 'AE receives & acknowledges', time: '2-4 hours', manual: true },
    { step: 'AE works the deal', time: 'Variable', manual: true },
    { step: 'AE creates start packet', time: '20 min', manual: true },
    { step: 'AE emails Ops', time: '10 min', manual: true },
    { step: 'Ops receives & acknowledges', time: '2-4 hours', manual: true },
    { step: 'Ops schedules service', time: '15 min', manual: true },
  ]

  const automatedSteps = [
    { step: 'Lead auto-captured from source', time: '0 min', manual: false },
    { step: 'Auto-populated in CRM', time: '0 min', manual: false },
    { step: 'Territory auto-assigned', time: '0 min', manual: false },
    { step: 'Auto-routed to AE + instant alert', time: '0 min', manual: false },
    { step: 'AE gets push notification', time: 'Instant', manual: false },
    { step: 'AE works the deal', time: 'Variable', manual: true },
    { step: 'Digital start packet (auto-filled)', time: '5 min', manual: true },
    { step: 'Auto-routed to Ops queue', time: '0 min', manual: false },
    { step: 'Ops gets real-time alert', time: 'Instant', manual: false },
    { step: 'Smart scheduling suggestion', time: '5 min', manual: true },
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Process Comparison</CardTitle>
        <CardDescription>Current manual process vs. automated future state</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current State */}
          <div>
            <h4 className="font-medium mb-4 text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Current State (Manual)
            </h4>
            <div className="space-y-2">
              {currentSteps.map((step, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-2 rounded text-sm flex justify-between',
                    step.manual
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  )}
                >
                  <span>{step.step}</span>
                  <span className="font-medium text-gray-600 dark:text-gray-400">{step.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Future State */}
          <div>
            <h4 className="font-medium mb-4 text-green-600 dark:text-green-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              Future State (Automated)
            </h4>
            <div className="space-y-2">
              {automatedSteps.map((step, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-2 rounded text-sm flex justify-between',
                    step.manual
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {!step.manual && <Zap className="h-3 w-3 text-green-500" />}
                    {step.step}
                  </span>
                  <span className="font-medium text-gray-600 dark:text-gray-400">{step.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Manual Step</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Automated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">Streamlined Manual</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
