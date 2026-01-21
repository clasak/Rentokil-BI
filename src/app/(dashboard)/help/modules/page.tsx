'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Layers,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  Bug,
  Briefcase,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Clock,
  Shield
} from 'lucide-react'

const MODULES = [
  {
    id: 'leads',
    name: 'Lead Service Engine',
    icon: Target,
    category: 'Sales',
    status: 'Active',
    description: 'End-to-end lead management system tracking the complete funnel from MQL to closed sale. Includes pipeline stages, handoff tracking, at-risk identification, and conversion analytics.',
    features: [
      'Full funnel visibility from MQL through Sold',
      'Lead source quality scoring and ROI analysis',
      'Sales-to-Ops handoff tracking',
      'At-risk account identification',
      'Automation rules for lead routing',
      'Integration status monitoring'
    ],
    routes: [
      { name: 'Dashboard', path: '/lead-service-engine' },
      { name: 'Pipeline Stages', path: '/lead-service-engine/stages' },
      { name: 'Handoffs', path: '/lead-service-engine/handoffs' },
      { name: 'At-Risk', path: '/lead-service-engine/at-risk' },
      { name: 'Automation', path: '/lead-service-engine/automation' },
      { name: 'Integrations', path: '/lead-service-engine/integration' }
    ],
    kpis: ['MQL Count', 'SQL Count', 'Conversion Rates', 'Speed to Lead', 'Close Rate'],
    roles: ['exec', 'market_vp', 'sales_manager', 'manager', 'rep']
  },
  {
    id: 'salti',
    name: 'SALTI Analytics',
    icon: BarChart3,
    category: 'Sales',
    status: 'Active',
    description: 'Sales Activity, Leads, Tracking & Intelligence. Comprehensive sales performance analytics including daily check-ins, productivity metrics, proposal pipeline, and year-over-year trends.',
    features: [
      'Daily check-in tracking',
      'Sales rep productivity metrics',
      'Proposal pipeline management',
      'Year-over-year trend analysis',
      'Funnel fallout identification',
      'Sales ladder progression',
      'Weekend blitz campaigns'
    ],
    routes: [
      { name: 'Dashboard', path: '/salti' },
      { name: 'Daily Check-In', path: '/salti/daily-check-in' },
      { name: 'Productivity', path: '/salti/productivity' },
      { name: 'Proposal Pipeline', path: '/salti/proposal-pipeline' },
      { name: 'YoY Trends', path: '/salti/yoy-trends' },
      { name: 'Funnel Fallout', path: '/salti/funnel-fallout' },
      { name: 'Sales Ladders', path: '/salti/sales-ladders' }
    ],
    kpis: ['Inspections per Day', 'Services Proposed', 'Sales per Rep', 'YoY Variance'],
    roles: ['exec', 'market_vp', 'market_sales_director', 'region_sales_manager', 'sales_manager']
  },
  {
    id: 'sales',
    name: 'Sales Dashboard',
    icon: TrendingUp,
    category: 'Sales',
    status: 'Active',
    description: 'Core sales performance tracking including pipeline health, opportunity management, win rates, and revenue forecasting. The primary view for understanding sales team performance.',
    features: [
      'Pipeline 30/60/90 day view',
      'Win rate tracking by segment',
      'Average sales cycle analysis',
      'Opportunity detail drill-down',
      'Stalled opportunity alerts',
      'Forecast scenario modeling'
    ],
    routes: [
      { name: 'Dashboard', path: '/sales' },
      { name: 'National View', path: '/sales/national' },
      { name: 'Opportunity Detail', path: '/sales/opportunity/[id]' }
    ],
    kpis: ['Pipeline 30/60/90', 'Win Rate', 'Avg Cycle Time', 'Stalled Opps'],
    roles: ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'sales_manager']
  },
  {
    id: 'finance',
    name: 'Finance & AR',
    icon: DollarSign,
    category: 'Finance',
    status: 'Active',
    description: 'Financial performance and accounts receivable management. Track revenue, AR aging, DSO, and margin metrics to ensure financial health and cash flow optimization.',
    features: [
      'Revenue MTD/YTD tracking',
      'AR aging buckets (30/60/90+)',
      'Days Sales Outstanding (DSO)',
      'Invoice detail drill-down',
      'Margin proxy calculations',
      'Variance to target analysis'
    ],
    routes: [
      { name: 'Dashboard', path: '/finance' },
      { name: 'Invoice Detail', path: '/finance/invoice/[id]' }
    ],
    kpis: ['Revenue MTD', 'AR Aging', 'DSO', 'Margin Proxy', 'Variance to Target'],
    roles: ['exec', 'market_vp', 'ops_manager', 'manager']
  },
  {
    id: 'hr',
    name: 'HR & People',
    icon: Users,
    category: 'People',
    status: 'Active',
    description: 'Human resources metrics including headcount, turnover, retention rates, and workforce planning. Essential for managing team health and capacity planning.',
    features: [
      'Headcount tracking by role',
      'Voluntary/involuntary terminations',
      'Retention rate analysis',
      'Capacity utilization',
      'Scheduling pressure index',
      'Role-based analytics'
    ],
    routes: [
      { name: 'Dashboard', path: '/people' }
    ],
    kpis: ['Headcount', 'Voluntary Terms', 'Involuntary Terms', 'Retention Rate'],
    roles: ['exec', 'market_vp', 'region_director']
  },
  {
    id: 'termite',
    name: 'Termite Operations',
    icon: Bug,
    category: 'Operations',
    status: 'Active',
    description: 'Specialized tracking for termite service operations including inspections, treatments, warranty management, and specialized KPIs for the termite vertical.',
    features: [
      'Termite inspection tracking',
      'Treatment scheduling',
      'Warranty management',
      'Specialized lead tracking',
      'Geographic heat maps',
      'Seasonal trend analysis'
    ],
    routes: [
      { name: 'Type Pest View', path: '/leads/type-pest' },
      { name: 'Geographic', path: '/leads/geographic' }
    ],
    kpis: ['Termite Inspections', 'Treatment Rate', 'Warranty Claims', 'Termite Revenue'],
    roles: ['exec', 'market_vp', 'region_director', 'ops_manager']
  },
  {
    id: 'workforce',
    name: 'Workforce Management',
    icon: Briefcase,
    category: 'Operations',
    status: 'Active',
    description: 'Operations workforce management including technician scheduling, route optimization, service completion rates, and capacity planning.',
    features: [
      'Technician scheduling',
      'Route optimization',
      'Service risk tracking',
      'Callback rate monitoring',
      'Missed service alerts',
      'Response time analytics'
    ],
    routes: [
      { name: 'Ops Dashboard', path: '/ops' },
      { name: 'National Ops', path: '/ops/national' },
      { name: 'New Starts', path: '/ops/new-starts' },
      { name: 'Tech Schedule', path: '/tech/schedule' },
      { name: 'Tech Route', path: '/tech/route' }
    ],
    kpis: ['Service Risk Index', 'Callback Rate', 'Missed Service Rate', 'Avg Response Time'],
    roles: ['exec', 'ops_manager', 'manager', 'technician']
  }
]

const CATEGORIES = ['All', 'Sales', 'Finance', 'People', 'Operations']

export default function ModulesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredModules = MODULES.filter(module => {
    const matchesSearch =
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = selectedCategory === 'All' || module.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/help" className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Help Center
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 dark:text-gray-100">Modules</span>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold dark:text-gray-100">Modules</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Explore all available modules in the Rentokil BI platform
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Module Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredModules.length} of {MODULES.length} modules
      </div>

      {/* Modules List */}
      <div className="space-y-6">
        {filteredModules.map((module) => {
          const Icon = module.icon
          return (
            <Card key={module.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{module.name}</CardTitle>
                        <Badge variant="secondary">{module.category}</Badge>
                        <Badge variant="outline" className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-700">
                          {module.status}
                        </Badge>
                      </div>
                      <CardDescription className="max-w-2xl">
                        {module.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Key Features
                    </h4>
                    <ul className="space-y-2">
                      {module.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Routes & KPIs */}
                  <div className="space-y-4">
                    {/* Routes */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Available Pages
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {module.routes.map((route) => (
                          <Link key={route.path} href={route.path.includes('[') ? '#' : route.path}>
                            <Button variant="outline" size="sm" className="text-xs">
                              {route.name}
                              {!route.path.includes('[') && (
                                <ExternalLink className="h-3 w-3 ml-1" />
                              )}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* KPIs */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Key Metrics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {module.kpis.map((kpi) => (
                          <span
                            key={kpi}
                            className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          >
                            {kpi}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Roles */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Access Roles
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {module.roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No Results */}
      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <Layers className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No modules found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Additional Resources */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Module availability depends on your role
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Not all modules are visible to all users. Your role determines which modules and features you can access.
                Contact your administrator if you need access to additional modules.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
