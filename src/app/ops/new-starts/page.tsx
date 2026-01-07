'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Building2,
  Edit,
  Save,
  User,
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
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getStatusBadge(status: NewStartStatus) {
  const config: Record<NewStartStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
    pending_ops: { label: 'Needs Assignment', variant: 'destructive' },
    scheduled: { label: 'Scheduled', variant: 'outline' },
    confirmed: { label: 'Confirmed', variant: 'default', className: 'bg-blue-600' },
    in_progress: { label: 'In Progress', variant: 'default', className: 'bg-purple-600' },
    completed: { label: 'Completed', variant: 'default', className: 'bg-green-600' },
    on_hold: { label: 'On Hold', variant: 'secondary' },
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
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Ops Manager</TableHead>
                  <TableHead>Specialist</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No entries in this queue
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={`cursor-pointer hover:bg-muted/50 ${entry.status === 'pending_ops' ? 'bg-red-50 dark:bg-red-950/30' : ''}`}
                      onClick={() => handleEdit(entry)}
                    >
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="font-medium">{formatDate(entry.soldDate)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[150px]">{entry.accountName}</p>
                          <p className="text-xs text-muted-foreground">{entry.serviceType}</p>
                        </div>
                      </TableCell>
                      <TableCell>{entry.salesRepsInvolved}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.initialJobPrice)}
                      </TableCell>
                      <TableCell>
                        {entry.operationsManager || (
                          <span className="text-red-500 dark:text-red-400 font-medium">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.assignedSpecialist || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.confirmedStartDate ? (
                          formatDate(entry.confirmedStartDate)
                        ) : (
                          <span className="text-amber-600">TBD</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update New Start</DialogTitle>
            <DialogDescription>
              {editingEntry?.accountName} - {editingEntry?.serviceAddress}
            </DialogDescription>
          </DialogHeader>

          {editingEntry && (
            <div className="space-y-6 py-4">
              {/* Sale Info (Read-only) */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Sale Info (from Account Exec)</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sold:</span>{' '}
                    <span className="font-medium">{formatDate(editingEntry.soldDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Initial:</span>{' '}
                    <span className="font-medium">{formatCurrency(editingEntry.initialJobPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contract:</span>{' '}
                    <span className="font-medium">
                      {editingEntry.maintenancePrice > 0 ? `${formatCurrency(editingEntry.maintenancePrice)}/mo` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>{' '}
                    <span className="font-medium">{editingEntry.serviceType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Frequency:</span>{' '}
                    <span className="font-medium">{editingEntry.frequency}x/year</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Requested Start:</span>{' '}
                    <span className="font-medium">{editingEntry.customerRequestedStartMonth || 'Any'}</span>
                  </div>
                </div>
              </div>

              {/* Ops Fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded" />
                  Operations Fields
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Operations Manager</label>
                    <Select
                      value={editForm.operationsManager}
                      onValueChange={(v) => setEditForm({ ...editForm, operationsManager: v })}
                    >
                      <SelectTrigger>
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
                    <label className="text-sm font-medium">Assigned Specialist</label>
                    <Select
                      value={editForm.assignedSpecialist}
                      onValueChange={(v) => setEditForm({ ...editForm, assignedSpecialist: v })}
                    >
                      <SelectTrigger>
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
                    <label className="text-sm font-medium">Materials Ordered</label>
                    <Select
                      value={editForm.materialsOrdered}
                      onValueChange={(v) => setEditForm({ ...editForm, materialsOrdered: v as YesNo })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">Yes</SelectItem>
                        <SelectItem value="N">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirmed Start Date</label>
                    <Input
                      type="date"
                      value={editForm.confirmedStartDate}
                      onChange={(e) => setEditForm({ ...editForm, confirmedStartDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">POC Name / Phone</label>
                  <Input
                    placeholder="Contact person and phone number"
                    value={editForm.pocNamePhone}
                    onChange={(e) => setEditForm({ ...editForm, pocNamePhone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Special Notes / Equipment Overview</label>
                  <Input
                    placeholder="Any special instructions or equipment needs"
                    value={editForm.specialNotes}
                    onChange={(e) => setEditForm({ ...editForm, specialNotes: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Update Status</label>
                  <Select
                    value={editForm.newStatus}
                    onValueChange={(v) => setEditForm({ ...editForm, newStatus: v as NewStartStatus })}
                  >
                    <SelectTrigger>
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
            <Button onClick={handleSave} className="bg-yellow-600 hover:bg-yellow-700">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
