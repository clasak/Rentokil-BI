"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts'
import { Eye, FileText, ShoppingCart, Users, CheckCircle, XCircle } from 'lucide-react'
import { FiveTenTwoMetrics } from '@/lib/mock/saltiData'

interface SALTIFiveTenTwoProps {
  data: FiveTenTwoMetrics
  className?: string
}

interface GaugeCircleProps {
  value: number
  target: number
  label: string
  icon: React.ReactNode
  unit: string
}

function GaugeCircle({ value, target, label, icon, unit }: GaugeCircleProps) {
  const percentage = Math.min((value / target) * 100, 100)
  const isAtTarget = value >= target
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (isAtTarget) return '#22c55e' // green
    if (percentage >= 80) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="120" height="120" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={getColor()}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold">{value.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{unit}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        Target: {target} {unit}
      </div>
    </div>
  )
}

export function SALTIFiveTenTwo({ data, className }: SALTIFiveTenTwoProps) {
  // Data for the bar chart showing % of reps meeting targets
  const repPerformanceData = [
    {
      name: '5+ Inspections',
      value: data.reps_5_plus_inspections_pct,
      target: 80,
      color: data.reps_5_plus_inspections_pct >= 80 ? '#22c55e' : data.reps_5_plus_inspections_pct >= 60 ? '#f59e0b' : '#ef4444'
    },
    {
      name: '10+ Proposed',
      value: data.reps_10_plus_proposed_pct,
      target: 70,
      color: data.reps_10_plus_proposed_pct >= 70 ? '#22c55e' : data.reps_10_plus_proposed_pct >= 50 ? '#f59e0b' : '#ef4444'
    },
    {
      name: '2+ Sales',
      value: data.reps_2_plus_sales_pct,
      target: 60,
      color: data.reps_2_plus_sales_pct >= 60 ? '#22c55e' : data.reps_2_plus_sales_pct >= 40 ? '#f59e0b' : '#ef4444'
    }
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              5-10-2 Tracker
              <Badge variant="outline" className="ml-2">Daily Productivity</Badge>
            </CardTitle>
            <CardDescription>
              Rep performance against daily targets: 5 Inspections, 10 Proposals, 2 Sales
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gauge Circles */}
          <div className="flex justify-around items-center py-4 bg-muted/30 rounded-lg">
            <GaugeCircle
              value={data.inspections_per_day_per_rep}
              target={data.inspections_target}
              label="Inspections"
              icon={<Eye className="h-4 w-4 text-blue-500" />}
              unit="/day"
            />
            <GaugeCircle
              value={data.services_proposed_per_day_per_rep}
              target={data.proposed_target}
              label="Proposed"
              icon={<FileText className="h-4 w-4 text-purple-500" />}
              unit="/day"
            />
            <GaugeCircle
              value={data.sales_per_day_per_rep}
              target={data.sales_target}
              label="Sales"
              icon={<ShoppingCart className="h-4 w-4 text-green-500" />}
              unit="/day"
            />
          </div>

          {/* Rep Performance Bar Chart */}
          <div className="lg:col-span-2">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              % of Reps Meeting Daily Targets
            </div>
            <div className="h-[180px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="font-medium mb-1">{item.name}</div>
                            <div className="text-2xl font-bold">{item.value}%</div>
                            <div className="text-xs text-muted-foreground">
                              Target: {item.target}%
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {repPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t dark:border-gray-700">
          {repPerformanceData.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                {item.value >= item.target ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm">{item.name}</span>
              </div>
              <Badge
                variant={item.value >= item.target ? "default" : "destructive"}
                className={item.value >= item.target ? "bg-green-500" : ""}
              >
                {item.value}%
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
