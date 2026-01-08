'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  Calendar,
  DollarSign,
  Edit,
  Save,
} from 'lucide-react'
import {
  getNewStartEntries,
  getNewStartSummary,
  initializeNewStartData,
  updateNewStartOpsFields,
} from '@/lib/new-start-data'
import { NewStartEntry, NewStartStatus, YesNo } from '@/types/new-start-log'

const OPS_MANAGERS = ['Mitchell', 'Rodriguez', 'Thompson', 'Anderson']
const SPECIALISTS = ['Daniel Cox', 'Maria Santos', 'John Williams', 'Robert Chen', 'Emily Davis']

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
    pending_ops: { label: 'Needs Assignment', variant: 'destructive', className: 'bg-red-600 text-white' },
    scheduled: { label: 'Scheduled', variant: 'outline', className: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300' },
    confirmed: { label: 'Confirmed', variant: 'default', className: 'bg-blue-600 text-white' },
    in_progress: { label: 'In Progress', variant: 'default', className: 'bg-purple-600 text-white' },
    completed: { label: 'Completed', variant: 'default', className: 'bg-green-600 text-white' },
    on_hold: { label: 'On Hold', variant: 'secondary', className: 'bg-gray-500 text-white' },
  }
  const { label, variant, className } = config[status]
  return <Badge variant={variant} className={className}>{label}</Badge>
}

export default function OpsNewStartsPage() {
  const [entries, setEntries] = useState<NewStartEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [editingEntry, setEditingEntry] = useState<NewStartEntry | null>(null)
  const [editForm, setEditForm] = useState({
    operationsManager: '',
    assignedSpecialist: '',
    materialsOrdered: '' as YesNo,
    installationStarted: '',
    pocNamePhone: '',
    confirmedStartDate: '',
    specialNotes: '',
    newStatus: '' as NewStartStatus | '',
  })

  useEffect(() => {
    initializeNewStartData()
    setEntries(getNewStartEntries())
    setIsLoading(false)
  }, [])

  const handleEdit = (entry: NewStartEntry) => {
    setEditingEntry(entry)
    setEditForm({
      operationsManager: entry.operationsManager,
      assignedSpecialist: entry.assignedSpecialist,
      materialsOrdered: entry.materialsOrdered,
      installationStarted: entry.installationStarted,
      pocNamePhone: entry.pocNamePhone,
      confirmedStartDate: entry.confirmedStartDate,
      specialNotes: entry.specialNotes,
      newStatus: '',
    })
  }

  const handleSave = () => {
    if (!editingEntry) return

    const newStatus = editForm.newStatus || undefined
    updateNewStartOpsFields(editingEntry.id, {
      operationsManager: editForm.operationsManager,
      assignedSpecialist: editForm.assignedSpecialist,
      materialsOrdered: editForm.materialsOrdered,
      installationStarted: editForm.installationStarted,
      pocNamePhone: editForm.pocNamePhone,
      confirmedStartDate: editForm.confirmedStartDate,
      specialNotes: editForm.specialNotes,
    }, newStatus as NewStartStatus)

    // Refresh entries
    setEntries([...getNewStartEntries()])
    setEditingEntry(null)
  }

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
    if (activeTab === 'scheduled') return e.status === 'scheduled'
    if (activeTab === 'confirmed') return e.status === 'confirmed'
    if (activeTab === 'active') return e.status === 'in_progress'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Start Management</h1>
          <p className="text-gray-500">Operations Manager view - Assign and schedule new starts</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Operations (YELLOW) Fields</p>
            <p className="text-sm text-yellow-700">
              Click any row to assign specialist, schedule start date, and update status.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={activeTab === 'pending' ? 'ring-2 ring-red-500' : ''}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setActiveTab('pending')}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-500">Needs Assignment</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{summary.pendingOps}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === 'scheduled' ? 'ring-2 ring-blue-500' : ''}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setActiveTab('scheduled')}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500">Scheduled</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.scheduled}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === 'confirmed' ? 'ring-2 ring-green-500' : ''}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setActiveTab('confirmed')}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">Confirmed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === 'active' ? 'ring-2 ring-purple-500' : ''}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setActiveTab('active')}>
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
              <span className="text-sm text-gray-500">Pipeline Value</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalInitialValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>New Starts Queue</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('all')}>
              View All ({entries.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Column Group Headers */}
                <TableRow className="border-b-0">
                  <TableHead
                    colSpan={6}
                    className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-center font-semibold border-r-2 border-red-300 dark:border-red-700"
                  >
                    AE Section (Read-Only)
                  </TableHead>
                  <TableHead
                    colSpan={6}
                    className="bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 text-center font-semibold"
                  >
                    OM Section (Your Inputs)
                  </TableHead>
                </TableRow>
                {/* Column Headers */}
                <TableRow>
                  {/* RED - AE Columns (Read-only for Ops) */}
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Sold Date</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Account Name</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Service Address</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Sales Rep</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-right">Initial Price</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-r-2 border-red-300 dark:border-red-700">Type</TableHead>
                  {/* YELLOW - OPS Columns (Editable) */}
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Ops Manager</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Specialist</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Materials</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Start Date</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Status</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      No entries in this queue
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={`cursor-pointer hover:bg-muted/50 ${entry.status === 'pending_ops' ? 'ring-2 ring-inset ring-red-300 dark:ring-red-700' : ''} ${entry.status === 'completed' ? 'opacity-60' : ''}`}
                      onClick={() => handleEdit(entry)}
                    >
                      {/* RED - AE Columns (Read-only) */}
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 font-medium">
                        {formatDate(entry.soldDate)}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <p className="font-medium truncate max-w-[140px]">{entry.accountName}</p>
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        <p className="text-sm truncate max-w-[160px]">{entry.serviceAddress}</p>
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                        {entry.salesRepsInvolved}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 text-right font-medium">
                        {formatCurrency(entry.initialJobPrice)}
                      </TableCell>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/20 border-r-2 border-red-200 dark:border-red-800">
                        <Badge variant="outline" className="text-xs">{entry.serviceType}</Badge>
                      </TableCell>
                      {/* YELLOW - OPS Columns (Editable) */}
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {entry.operationsManager || (
                          <span className="text-red-600 dark:text-red-400 font-medium text-sm">Unassigned</span>
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
                        {entry.confirmedStartDate ? (
                          formatDate(entry.confirmedStartDate)
                        ) : (
                          <span className="text-amber-600 text-sm">TBD</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        {getStatusBadge(entry.status)}
                      </TableCell>
                      <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        <Button size="sm" variant="ghost" className="hover:bg-yellow-200 dark:hover:bg-yellow-900" onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
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
                <span className="font-medium text-red-700 dark:text-red-400">AE data (Read-Only)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-700 rounded" />
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Your inputs (Editable)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Click any row to edit | Currency: $0.00 | Dates: MM/DD/YYYY
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Update New Start</DialogTitle>
            <DialogDescription className="text-base">
              {editingEntry?.accountName}
            </DialogDescription>
          </DialogHeader>

          {editingEntry && (
            <div className="space-y-6 py-4">
              {/* Sale Info (Read-only) - RED Section */}
              <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  AE Section (Read-Only)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Sold Date</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(editingEntry.soldDate)}</p>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Initial Price</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(editingEntry.initialJobPrice)}</p>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Contract Price</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {editingEntry.maintenancePrice > 0 ? `${formatCurrency(editingEntry.maintenancePrice)}/mo` : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Type</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{editingEntry.serviceType}</p>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Frequency</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{editingEntry.frequency}x/year</p>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Requested Start</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{editingEntry.customerRequestedStartMonth || 'Any'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Service Address</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{editingEntry.serviceAddress}</p>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Sales Rep</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{editingEntry.salesRepsInvolved}</p>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Log Book Needed</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{editingEntry.logBookNeeded || '-'}</p>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">PestPac Loc #</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{editingEntry.pestPacLocNumber}</p>
                  </div>
                </div>
              </div>

              {/* Ops Fields - YELLOW Section */}
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-700 p-4 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded" />
                  OM Section (Your Inputs)
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Operations Manager *</label>
                    <Select
                      value={editForm.operationsManager}
                      onValueChange={(v) => setEditForm({ ...editForm, operationsManager: v })}
                    >
                      <SelectTrigger className="border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500">
                        <SelectValue placeholder="Assign manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPS_MANAGERS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Assigned Specialist *</label>
                    <Select
                      value={editForm.assignedSpecialist}
                      onValueChange={(v) => setEditForm({ ...editForm, assignedSpecialist: v })}
                    >
                      <SelectTrigger className="border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500">
                        <SelectValue placeholder="Assign specialist" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALISTS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Materials Ordered</label>
                    <Select
                      value={editForm.materialsOrdered}
                      onValueChange={(v) => setEditForm({ ...editForm, materialsOrdered: v as YesNo })}
                    >
                      <SelectTrigger className="border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">Yes</SelectItem>
                        <SelectItem value="N">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Confirmed Start Date</label>
                    <Input
                      type="date"
                      className="border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500"
                      value={editForm.confirmedStartDate}
                      onChange={(e) => setEditForm({ ...editForm, confirmedStartDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300">POC Name / Phone #</label>
                  <Input
                    placeholder="Contact person and phone number"
                    className="border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500"
                    value={editForm.pocNamePhone}
                    onChange={(e) => setEditForm({ ...editForm, pocNamePhone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Special Notes / Equipment Overview</label>
                  <Input
                    placeholder="Any special instructions or equipment needs"
                    className="border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500"
                    value={editForm.specialNotes}
                    onChange={(e) => setEditForm({ ...editForm, specialNotes: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Update Status</label>
                  <Select
                    value={editForm.newStatus}
                    onValueChange={(v) => setEditForm({ ...editForm, newStatus: v as NewStartStatus })}
                  >
                    <SelectTrigger className="border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500">
                      <SelectValue placeholder="Keep current status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
