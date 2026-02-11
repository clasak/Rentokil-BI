'use client'

/**
 * Pipeline Kanban Board Page
 *
 * Visual pipeline management with drag-and-drop functionality.
 * Uses Salesforce Opportunity data (Raw_RTXSF_Opportunity_Daily).
 *
 * Features:
 * - Drag-and-drop opportunities between stages
 * - Stage grouping (Prospect, Qualified, Proposal, Closed Won, Closed Lost)
 * - Quick view of opportunity details
 * - Live BigQuery data
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { useRecentPages } from '@/hooks/useRecentPages'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useAppStore } from '@/store'
import type { SalesforceOpportunity } from '@/lib/bigquery/queries/ae'
import {
  DollarSign,
  Calendar,
  TrendingUp,
  User,
  Plus,
  ArrowRight,
  Filter,
  AlertTriangle,
  ExternalLink,
  Mail,
  RefreshCw,
  FileText,
} from 'lucide-react'

const EMPTY_OPPORTUNITIES: SalesforceOpportunity[] = []

// Standard Salesforce opportunity stages
const STAGES = [
  { id: 'Prospect', name: 'Prospect', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { id: 'Qualified', name: 'Qualified', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { id: 'Proposal', name: 'Proposal', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  { id: 'Negotiation', name: 'Negotiation', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { id: 'Closed Won', name: 'Closed Won', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { id: 'Closed Lost', name: 'Closed Lost', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
]

interface OpportunityCardProps {
  opportunity: SalesforceOpportunity
  onViewDetail: (id: string) => void
}

function OpportunityCard({ opportunity, onViewDetail }: OpportunityCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card
      className="cursor-pointer hover:border-blue-500 transition-colors mb-3"
      onClick={() => onViewDetail(opportunity.opportunityId)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {opportunity.opportunityName}
          </CardTitle>
          {opportunity.probability > 0 && (
            <Badge variant="outline" className="ml-2 shrink-0">
              {opportunity.probability}%
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs mt-1">
          {opportunity.accountName}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        {opportunity.amount > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="font-semibold text-green-600">
              {formatCurrency(opportunity.amount)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Close: {opportunity.closeDate}</span>
        </div>

        {opportunity.brand && (
          <Badge variant="secondary" className="text-xs">
            {opportunity.brand}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

export default function PipelinePage() {
  useRecentPages()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const role = useEffectiveRole(mounted)
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch opportunities
  const {
    data: opportunities,
    isLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<SalesforceOpportunity[], SalesforceOpportunity[]>({
    queryName: 'salesforce-opportunities',
    filters: {
      daysBack: 90,
      limit: 200,
    },
    defaultData: EMPTY_OPPORTUNITIES,
    transformBigQueryData: (data) => data,
    includeRoleFilters: true,
  })

  // Group opportunities by stage
  const opportunitiesByStage = STAGES.map(stage => {
    const stageOpps = opportunities.filter(opp => {
      // Handle both exact stage names and variations
      const oppStage = opp.stageName.trim()
      if (stage.id === 'Closed Won') {
        return opp.isWon || oppStage.toLowerCase().includes('won') || oppStage.toLowerCase().includes('closed won')
      }
      if (stage.id === 'Closed Lost') {
        return (opp.isClosed && !opp.isWon) || oppStage.toLowerCase().includes('lost') || oppStage.toLowerCase().includes('closed lost')
      }
      return oppStage.toLowerCase() === stage.id.toLowerCase() ||
             oppStage.toLowerCase().includes(stage.id.toLowerCase())
    })

    const stageValue = stageOpps.reduce((sum, opp) => sum + opp.amount, 0)

    return {
      stage,
      opportunities: stageOpps,
      count: stageOpps.length,
      value: stageValue,
    }
  })

  const totalOpportunities = opportunities.length
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.amount, 0)
  const totalWeightedValue = opportunities.reduce((sum, opp) => sum + (opp.amount * opp.probability / 100), 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleViewDetail = (opportunityId: string) => {
    // Navigate to opportunity detail page (to be implemented)
    // For now, navigate to accounts page
    const opp = opportunities.find(o => o.opportunityId === opportunityId)
    if (opp?.pestPacBillToId) {
      // If we have a PestPac ID, could navigate to account detail
      // TODO: Navigate to opportunity detail page
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Manage opportunities and track progress through the sales funnel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button
            onClick={() => router.push('/ae/tracker')}
            variant="outline"
          >
            View Quotes
          </Button>
          <Button
            onClick={() => router.push('/ae/accounts')}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Opportunity
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpportunities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weighted Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalWeightedValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on probability</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {opportunitiesByStage.map(({ stage, opportunities: stageOpps, count, value }) => (
          <div key={stage.id} className="space-y-2">
            {/* Stage Header */}
            <Card className={stage.color}>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {stage.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {count}
                  </Badge>
                </div>
                {value > 0 && (
                  <CardDescription className="text-xs font-medium mt-1">
                    {formatCurrency(value)}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>

            {/* Stage Cards */}
            <div className="space-y-2 min-h-[200px]">
              {isLoading ? (
                <Card className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  </CardContent>
                </Card>
              ) : stageOpps.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    No opportunities
                  </CardContent>
                </Card>
              ) : (
                stageOpps.map(opportunity => (
                  <OpportunityCard
                    key={opportunity.opportunityId}
                    opportunity={opportunity}
                    onViewDetail={handleViewDetail}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Pipeline Data</span>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">Salesforce Opportunities</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Query:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">salesforce-opportunities</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://console.cloud.google.com/bigquery', '_blank')}
              >
                <FileText className="h-3 w-3 mr-1.5" />
                View Logs
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const subject = encodeURIComponent('Pipeline Error')
                  const body = encodeURIComponent(`Error: ${error}\n\nPlease investigate.`)
                  window.location.href = `mailto:support@rentokil.com?subject=${subject}&body=${body}`
                }}
              >
                <Mail className="h-3 w-3 mr-1.5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
