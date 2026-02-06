"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ClipboardList, Clock, AlertTriangle, CheckCircle, FileText, RefreshCw, ExternalLink, Mail } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { BCGTechWorkOrder } from '@/lib/bigquery/queries/bcg-analytics'

interface Ticket {
  id: string
  accountName: string
  type: 'callback' | 'complaint' | 'follow_up' | 'new_service'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  description: string
  createdAt: string
  dueDate: string
  status: 'open' | 'in_progress' | 'completed'
}

// =============================================================================
// BigQuery Integration
// =============================================================================

interface TicketsDisplay {
  tickets: Ticket[]
  openCount: number
  inProgressCount: number
  highPriorityCount: number
  completedCount: number
}

const EMPTY_TICKETS: TicketsDisplay = {
  tickets: [],
  openCount: 0,
  inProgressCount: 0,
  highPriorityCount: 0,
  completedCount: 0,
}

function transformBigQueryData(bqData: BCGTechWorkOrder[]): TicketsDisplay {
  // Transform BCG tech work order data to ticket/work order format
  const tickets: Ticket[] = (bqData || []).map((workOrder, index) => {
    // Derive ticket type from completion rate and efficiency
    let ticketType: Ticket['type'] = 'new_service'
    if (workOrder.completion_rate < 0.7) {
      ticketType = 'callback' // Low completion suggests callbacks
    } else if (workOrder.efficiency_score < 60) {
      ticketType = 'follow_up' // Low efficiency suggests follow-ups
    }

    // Derive priority from efficiency score and work order count
    let priority: Ticket['priority'] = 'medium'
    if (workOrder.total_work_orders > 20 && workOrder.efficiency_score < 50) {
      priority = 'urgent'
    } else if (workOrder.efficiency_score < 60) {
      priority = 'high'
    } else if (workOrder.completion_rate > 0.9) {
      priority = 'low'
    }

    // Derive status from completion rate
    let status: Ticket['status'] = 'open'
    if (workOrder.completion_rate >= 0.9) {
      status = 'completed'
    } else if (workOrder.completion_rate >= 0.5) {
      status = 'in_progress'
    }

    const today = new Date().toISOString().split('T')[0]
    // Deterministic creation date based on work order index
    const createdDaysAgo = (index * 3 + 1) % 14
    const createdDate = new Date()
    createdDate.setDate(createdDate.getDate() - createdDaysAgo)
    const createdDateStr = createdDate.toISOString().split('T')[0]

    return {
      id: `WO-${workOrder.technician_id}`,
      accountName: workOrder.technician_name || 'Unknown Technician',
      type: ticketType,
      priority,
      description: `${workOrder.total_work_orders} work orders, ${Math.round(workOrder.completion_rate * 100)}% completion, ${workOrder.avg_stops_per_day.toFixed(1)} stops/day avg`,
      createdAt: createdDateStr,
      dueDate: today,
      status,
    }
  })

  return {
    tickets,
    openCount: tickets.filter(t => t.status === 'open').length,
    inProgressCount: tickets.filter(t => t.status === 'in_progress').length,
    highPriorityCount: tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length,
    completedCount: tickets.filter(t => t.status === 'completed').length,
  }
}

export default function TechTicketsPage() {
  // BigQuery integration - Use BCG tech work orders query
  const {
    data: ticketsData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<BCGTechWorkOrder[], TicketsDisplay>({
    queryName: 'bcg-tech-work-orders',
    filters: { daysBack: 30 },
    defaultData: EMPTY_TICKETS,
    transformBigQueryData,
    includeRoleFilters: true, // Filter tickets to logged-in technician's assigned work
  })

  const tickets = ticketsData?.tickets || []
  const isLoading = isBQLoading

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="danger">Urgent</Badge>
      case 'high':
        return <Badge variant="warning">High</Badge>
      case 'medium':
        return <Badge variant="outline">Medium</Badge>
      default:
        return <Badge variant="secondary">Low</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'callback':
        return <Badge variant="danger" className="gap-1"><AlertTriangle className="h-3 w-3" />Callback</Badge>
      case 'complaint':
        return <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" />Complaint</Badge>
      case 'follow_up':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Follow Up</Badge>
      default:
        return <Badge variant="success" className="gap-1"><FileText className="h-3 w-3" />New Service</Badge>
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading tickets...</div>
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Work orders and service tickets
          </p>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Tickets</span>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">BCG Tech Work Orders</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Query:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">bcg-tech-work-orders</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
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
                  const subject = encodeURIComponent('Tech Tickets Error')
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
      </div>
    )
  }

  const openTickets = tickets.filter(t => t.status !== 'completed')

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Technician', href: '/tech/tickets' },
        { label: 'Service Tickets' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {openTickets.length} open tickets assigned to you
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={isBQLoading}>
            <RefreshCw className={`h-4 w-4 ${isBQLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{ticketsData?.openCount || 0}</div>
            <div className="text-sm text-gray-500">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{ticketsData?.inProgressCount || 0}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{ticketsData?.highPriorityCount || 0}</div>
            <div className="text-sm text-gray-500">High Priority</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{ticketsData?.completedCount || 0}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            My Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                className={`p-4 rounded-lg border ${
                  ticket.status === 'completed' ? 'opacity-60 border-gray-200 dark:border-gray-700' :
                  ticket.priority === 'urgent' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                  'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{ticket.id}</span>
                      {getTypeBadge(ticket.type)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{ticket.accountName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{ticket.description}</div>
                    <div className="text-xs text-gray-400 mt-2">Due: {format(parseISO(ticket.dueDate), 'MMM d, yyyy')}</div>
                  </div>
                  {ticket.status !== 'completed' && (
                    <Button size="sm" variant="outline">
                      {ticket.status === 'open' ? 'Start' : 'Complete'}
                    </Button>
                  )}
                  {ticket.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
