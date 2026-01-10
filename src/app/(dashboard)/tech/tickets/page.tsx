"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardList, Clock, AlertTriangle, CheckCircle, FileText } from 'lucide-react'

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

export default function TechTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const mockTickets: Ticket[] = [
      { id: 'TKT-001', accountName: 'ABC Manufacturing', type: 'callback', priority: 'high', description: 'Customer reported rodent activity after last service', createdAt: '2024-01-15', dueDate: '2024-01-17', status: 'open' },
      { id: 'TKT-002', accountName: 'Downtown Cafe', type: 'follow_up', priority: 'medium', description: 'Follow up on bait station placement', createdAt: '2024-01-14', dueDate: '2024-01-20', status: 'in_progress' },
      { id: 'TKT-003', accountName: 'City Hospital', type: 'complaint', priority: 'urgent', description: 'Pest sighting in cafeteria area', createdAt: '2024-01-16', dueDate: '2024-01-16', status: 'open' },
      { id: 'TKT-004', accountName: 'Tech Solutions', type: 'new_service', priority: 'low', description: 'Initial service setup for new contract', createdAt: '2024-01-10', dueDate: '2024-01-25', status: 'completed' },
    ]

    setTimeout(() => {
      setTickets(mockTickets)
      setIsLoading(false)
    }, 300)
  }, [])

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

  const openTickets = tickets.filter(t => t.status !== 'completed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {openTickets.length} open tickets assigned to you
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{tickets.filter(t => t.status === 'open').length}</div>
            <div className="text-sm text-gray-500">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{tickets.filter(t => t.status === 'in_progress').length}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length}</div>
            <div className="text-sm text-gray-500">High Priority</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{tickets.filter(t => t.status === 'completed').length}</div>
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
                    <div className="text-xs text-gray-400 mt-2">Due: {ticket.dueDate}</div>
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
