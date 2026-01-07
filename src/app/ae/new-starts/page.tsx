'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  Calendar,
  DollarSign,
  Building2,
} from 'lucide-react'
import {
  getNewStartEntries,
  getNewStartSummary,
  initializeNewStartData,
} from '@/lib/new-start-data'
import { NewStartEntry, NewStartStatus } from '@/types/new-start-log'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getStatusBadge(status: NewStartStatus) {
  const config: Record<NewStartStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending_ops: { label: 'Pending Ops', variant: 'secondary' },
    scheduled: { label: 'Scheduled', variant: 'outline' },
    confirmed: { label: 'Confirmed', variant: 'default' },
    in_progress: { label: 'In Progress', variant: 'default' },
    completed: { label: 'Completed', variant: 'default' },
    on_hold: { label: 'On Hold', variant: 'destructive' },
  }
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}

export default function NewStartsPage() {
  const [entries, setEntries] = useState<NewStartEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    initializeNewStartData()
    setEntries(getNewStartEntries())
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  const summary = getNewStartSummary()

  // Filter entries by tab
  const filteredEntries = entries.filter(e => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return e.status === 'pending_ops'
    if (activeTab === 'active') return ['scheduled', 'confirmed', 'in_progress'].includes(e.status)
    if (activeTab === 'completed') return e.status === 'completed'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Start Log</h1>
          <p className="text-gray-500">Track handoffs from Sales to Operations</p>
        </div>
        <Button asChild>
          <Link href="/ae/new-starts/new">
            <Plus className="h-4 w-4 mr-2" />
            New Start Entry
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-500">Pending Ops</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.pendingOps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500">Scheduled</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">Confirmed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500">Initial Value</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalInitialValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500">Contract Value</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalContractValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({summary.pendingOps})</TabsTrigger>
              <TabsTrigger value="active">Active ({summary.scheduled + summary.confirmed + summary.inProgress})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({summary.completed})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sold Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Initial</TableHead>
                  <TableHead className="text-right">Contract</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Ops Manager</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      No entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{formatDate(entry.soldDate)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[150px]">{entry.accountName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{entry.serviceAddress}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.serviceType}</Badge>
                        {entry.frequency !== '1' && (
                          <span className="text-xs text-muted-foreground ml-1">/{entry.frequency}x yr</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.initialJobPrice)}</TableCell>
                      <TableCell className="text-right">
                        {entry.maintenancePrice > 0 ? formatCurrency(entry.maintenancePrice) + '/mo' : '-'}
                      </TableCell>
                      <TableCell>{entry.salesRepsInvolved}</TableCell>
                      <TableCell>
                        {entry.operationsManager || (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.confirmedStartDate ? formatDate(entry.confirmedStartDate) : (
                          <span className="text-muted-foreground">TBD</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-muted">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded" />
              <span className="text-muted-foreground">Sales fills in (RED columns)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-800 rounded" />
              <span className="text-muted-foreground">Ops Manager fills in (YELLOW columns)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
