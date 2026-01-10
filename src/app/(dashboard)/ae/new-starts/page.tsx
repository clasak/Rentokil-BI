'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function getStatusBadge(status: NewStartStatus) {
  const config: Record<NewStartStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
    pending_ops: { label: 'Pending Ops', variant: 'secondary', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    scheduled: { label: 'Scheduled', variant: 'outline', className: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300' },
    confirmed: { label: 'Confirmed', variant: 'default', className: 'bg-blue-600 text-white' },
    in_progress: { label: 'In Progress', variant: 'default', className: 'bg-purple-600 text-white' },
    completed: { label: 'Completed', variant: 'default', className: 'bg-green-600 text-white' },
    on_hold: { label: 'On Hold', variant: 'destructive' },
  }
  const { label, variant, className } = config[status]
  return <Badge variant={variant} className={className}>{label}</Badge>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Start Log</h1>
          <p className="text-gray-500 dark:text-gray-400">Track handoffs from Sales to Operations</p>
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
              <span className="text-sm text-gray-500 dark:text-gray-400">Pending Ops</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.pendingOps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Confirmed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Initial Value</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalInitialValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Contract Value</span>
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Column Group Headers */}
                <TableRow className="border-b-0">
                  <TableHead
                    colSpan={8}
                    className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-center font-semibold border-r-2 border-red-300 dark:border-red-700"
                  >
                    AE Section (Sales)
                  </TableHead>
                  <TableHead
                    colSpan={5}
                    className="bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 text-center font-semibold"
                  >
                    OM Section (Operations)
                  </TableHead>
                </TableRow>
                {/* Column Headers */}
                <TableRow>
                  {/* RED - AE Columns */}
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Sold Date</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Account Name</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Service Address</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Sales Rep(s)</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-right">Initial Price</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-right">Contract Price</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Type</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-r-2 border-red-300 dark:border-red-700">Frequency</TableHead>
                  {/* YELLOW - OPS Columns */}
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Ops Manager</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Specialist</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Materials</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Start Date</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={`hover:bg-muted/50 ${entry.status === 'completed' ? 'opacity-60' : ''}`}
                    >
                      {/* RED - AE Columns */}
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 font-medium">
                        {formatDate(entry.soldDate)}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <p className="font-medium truncate max-w-[140px]">{entry.accountName}</p>
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <p className="text-sm truncate max-w-[180px]">{entry.serviceAddress}</p>
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        {entry.salesRepsInvolved}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 text-right font-medium">
                        {formatCurrency(entry.initialJobPrice)}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 text-right">
                        {entry.maintenancePrice > 0 ? `${formatCurrency(entry.maintenancePrice)}/mo` : '-'}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <Badge variant="outline" className="text-xs">{entry.serviceType}</Badge>
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 border-r-2 border-red-200 dark:border-red-800">
                        {entry.frequency}x/yr
                      </TableCell>
                      {/* YELLOW - OPS Columns */}
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.operationsManager || (
                          <span className="text-muted-foreground italic text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.assignedSpecialist || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20 text-center">
                        {entry.materialsOrdered === 'Y' ? (
                          <CheckCircle className="h-4 w-4 text-green-600 inline" />
                        ) : entry.materialsOrdered === 'N' ? (
                          <span className="text-amber-600 text-sm">No</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.confirmedStartDate ? formatDate(entry.confirmedStartDate) : (
                          <span className="text-amber-600 text-sm">TBD</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {getStatusBadge(entry.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 dark:bg-red-950 border-2 border-red-400 dark:border-red-700 rounded" />
                <span className="font-medium text-red-700 dark:text-red-400">AE fills in (RED columns)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-700 rounded" />
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Ops Manager fills in (YELLOW columns)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Currency displayed as $0.00 | Dates displayed as MM/DD/YYYY
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
