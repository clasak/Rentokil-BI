'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Package,
  Upload,
  Download,
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { NewStartRecord } from '@/lib/bigquery/queries/new-starts'
import type { EquipmentDetails } from '@/types/new-start-log'
import { EquipmentSelector } from '@/components/features/EquipmentSelector'

// Default equipment structure
const DEFAULT_EQUIPMENT: EquipmentDetails = {
  generalPest: {
    rbsQty: 0,
    mrtQty: 0,
    iltQty: 0,
    doorSweepsQty: 0,
    glueBoardsQty: 0,
    flyLightsQty: 0,
    perimeterSpray: false,
    interiorTreatment: false,
  },
  termite: {
    baitStationsQty: 0,
    liquidTreatment: false,
    monitoringStationsQty: 0,
    drillingRequired: false,
  },
  notes: '',
}

// Helper to check if equipment has any items configured
function hasEquipment(equipment: EquipmentDetails | null | undefined): boolean {
  if (!equipment) return false

  const hasGeneralPest =
    equipment.generalPest.rbsQty > 0 ||
    equipment.generalPest.mrtQty > 0 ||
    equipment.generalPest.iltQty > 0 ||
    equipment.generalPest.doorSweepsQty > 0 ||
    equipment.generalPest.glueBoardsQty > 0 ||
    equipment.generalPest.flyLightsQty > 0 ||
    equipment.generalPest.perimeterSpray === true ||
    equipment.generalPest.interiorTreatment === true

  const hasTermite =
    equipment.termite.baitStationsQty > 0 ||
    equipment.termite.liquidTreatment === true ||
    equipment.termite.monitoringStationsQty > 0 ||
    equipment.termite.drillingRequired === true

  const hasNotes = Boolean(equipment.notes && equipment.notes.length > 0)

  return hasGeneralPest || hasTermite || hasNotes
}

const OPS_MANAGERS = ['Mitchell', 'Rodriguez', 'Thompson', 'Anderson']
const SPECIALISTS = ['Daniel Cox', 'Maria Santos', 'John Williams', 'Robert Chen', 'Emily Davis']

type NewStartStatus = 'pending_ops' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'on_hold'
type YesNo = 'Y' | 'N' | ''

// Empty fallback data
const EMPTY_NEW_STARTS: NewStartRecord[] = []

// Type alias for entries
type NewStartEntry = NewStartRecord

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

/**
 * Operations Manager New Starts View
 *
 * Team oversight and scheduling for operations managers
 * - View all new starts assigned to their branches
 * - Assign specialists to new starts
 * - Schedule installation dates
 * - Track materials and equipment
 */
export default function OpsNewStartsView() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [editingEntry, setEditingEntry] = useState<NewStartEntry | null>(null)
  const [editForm, setEditForm] = useState({
    operationsManager: '',
    assignedSpecialist: '',
    materialsOrdered: '' as YesNo,
    confirmedStartDate: '',
    installationStartedDate: '',
    pocNamePhone: '',
    specialNotes: '',
    equipment: DEFAULT_EQUIPMENT,
    newStatus: '' as NewStartStatus | '',
  })
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch contract data from BigQuery
  const { data: bigQueryData, isLoading: bqLoading, dataSource } = useBigQueryData<NewStartRecord[], NewStartRecord[]>({
    queryName: 'new-starts',
    filters: { daysBack: 90 },
    defaultData: EMPTY_NEW_STARTS,
    transformBigQueryData: (raw) => raw as NewStartRecord[],
    includeOrgFilters: true, // Auto-filter to manager's branches
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use BigQuery data directly
  const entries: NewStartEntry[] = useMemo(() => {
    if (!bigQueryData) return []
    return bigQueryData.map(record => ({
      ...record,
      status: (record.status as NewStartStatus) || 'pending_ops',
    }))
  }, [bigQueryData])

  const handleEdit = (entry: NewStartEntry) => {
    // Auto-populate special notes with service information
    const pestTypesList = entry.pestTypes && entry.pestTypes.length > 0
      ? entry.pestTypes.join(', ')
      : 'General Pest'

    const autoNotes = `Service Type: ${entry.serviceTypeName}
Pest Types: ${pestTypesList}
Product Group: ${entry.productGroup || 'N/A'}
Service Address: ${entry.serviceAddress}
PestPac ID: ${entry.pestPacId || 'N/A'}
Contract Value: ${formatCurrency(entry.contractValue || 0)}

Equipment & Service Notes:
- `

    setEditingEntry(entry)
    setEditForm({
      operationsManager: '',
      assignedSpecialist: '',
      materialsOrdered: '',
      confirmedStartDate: entry.startDate || '',
      installationStartedDate: '',
      pocNamePhone: '',
      specialNotes: autoNotes,
      equipment: DEFAULT_EQUIPMENT,
      newStatus: '',
    })
  }

  const handleSave = async () => {
    if (!editingEntry || isSubmitting) return

    setIsSubmitting(true)

    /**
     * BACKEND INTEGRATION REQUIRED
     *
     * This page currently displays live BigQuery data (contract details) but does not
     * persist operations manager edits. To enable full functionality, implement:
     *
     * 1. Create API endpoint: POST /api/ops/new-starts
     *    - Accept salesId (editingEntry.id) and editForm data
     *    - Store in Supabase table: new_start_ops_data
     *
     * 2. On page load, fetch ops data and merge with BigQuery results
     *
     * For now, logging data structure for reference:
     */
    console.log('Save payload (implement backend to persist):', {
      salesId: editingEntry.id,
      pestPacId: editingEntry.pestPacId,
      ...editForm,
    })

    // Simulate save for UX feedback
    await new Promise(resolve => setTimeout(resolve, 500))
    alert('⚠️ Backend integration required\n\nThis form is ready but needs a backend API to save operations data.\nSee handleSave() for implementation details.')

    setEditingEntry(null)
    setIsSubmitting(false)
  }

  const handleExportToSheets = async (mode: 'append' | 'smart-sync') => {
    if (isExporting) return

    setIsExporting(true)

    try {
      const response = await fetch('/api/new-starts/sync-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          filters: { daysBack: 90 } // Match current view filters
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const result = await response.json()

      if (mode === 'smart-sync') {
        alert(`✅ Success! Smart Sync completed:
• Updated: ${result.rowsUpdated || 0} existing rows
• Added: ${result.rowsAppended || 0} new rows
• Total: ${result.totalProcessed || 0} records processed

Manual entries preserved in columns 12-14 and 17.`)
      } else {
        alert(`✅ Success! Appended ${result.rowsSynced} rows to first blank row.`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nSee /docs/GOOGLE-SHEETS-INTEGRATION-GUIDE.md for setup instructions.`)
    } finally {
      setIsExporting(false)
    }
  }

  if (!mounted || bqLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  // Calculate summary
  const summary = {
    pendingOps: entries.filter(e => e.status === 'pending_ops').length,
    scheduled: entries.filter(e => e.status === 'scheduled').length,
    confirmed: entries.filter(e => e.status === 'confirmed').length,
    inProgress: entries.filter(e => e.status === 'in_progress').length,
    completed: entries.filter(e => e.status === 'completed').length,
    totalInitialValue: entries.reduce((sum, e) => sum + (e.initialJobPrice || 0), 0),
  }

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Start Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Operations Manager view - Assign and schedule new starts</p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} />

          {/* Export to Google Sheets Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportToSheets('append')}
              disabled={isExporting || entries.length === 0}
              className="text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {isExporting ? 'Exporting...' : 'Append to Sheets'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportToSheets('smart-sync')}
              disabled={isExporting || entries.length === 0}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {isExporting ? 'Exporting...' : 'Smart Sync'}
            </Button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-300">Operations (YELLOW) Fields</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Click any row to assign specialist, schedule start date, equipment, and update status.
              Contract data comes from BigQuery; your edits are saved to the database.
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
              <span className="text-sm text-gray-500 dark:text-gray-400">Needs Assignment</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{summary.pendingOps}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === 'scheduled' ? 'ring-2 ring-blue-500' : ''}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setActiveTab('scheduled')}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.scheduled}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === 'confirmed' ? 'ring-2 ring-green-500' : ''}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setActiveTab('confirmed')}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Confirmed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === 'active' ? 'ring-2 ring-purple-500' : ''}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setActiveTab('active')}>
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
              <span className="text-sm text-gray-500 dark:text-gray-400">Pipeline Value</span>
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
                    colSpan={11}
                    className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-center font-semibold border-r-2 border-red-300 dark:border-red-700"
                  >
                    Sales Rep Section (Read-Only)
                  </TableHead>
                  <TableHead
                    colSpan={7}
                    className="bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 text-center font-semibold"
                  >
                    Operations Manager Section (Your Inputs)
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
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-right">Contract Price</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Type</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Pest Types</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Customer Start</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">POC Name/Phone</TableHead>
                  <TableHead className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-r-2 border-red-300 dark:border-red-700">Special Notes</TableHead>
                  {/* YELLOW - OPS Columns (Editable) */}
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Ops Manager</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Specialist</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Materials</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Confirmed Start</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Install Started</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Status</TableHead>
                  <TableHead className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center text-muted-foreground py-8">
                      No entries in this queue
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => {
                    const status = (entry.status || 'pending_ops') as NewStartStatus
                    return (
                      <TableRow
                        key={entry.id}
                        className={`cursor-pointer hover:bg-muted/50 ${status === 'pending_ops' ? 'ring-2 ring-inset ring-red-300 dark:ring-red-700' : ''} ${status === 'completed' ? 'opacity-60' : ''}`}
                        onClick={() => handleEdit(entry)}
                      >
                        {/* RED - AE Columns (Read-only) - 11 columns */}
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20 font-medium">
                          {formatDate(entry.soldDate)}
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                          <p className="font-medium truncate max-w-[140px]">{entry.accountName}</p>
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                          <p className="text-xs truncate max-w-[120px]">{entry.serviceAddress || '-'}</p>
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                          {entry.salesPerson}
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20 text-right font-medium">
                          {formatCurrency(entry.initialJobPrice || 0)}
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20 text-right font-medium">
                          {formatCurrency(entry.contractValue || 0)}
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                          <Badge variant="outline" className="text-xs">{entry.serviceTypeName}</Badge>
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                          {entry.pestTypes && entry.pestTypes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {entry.pestTypes.slice(0, 2).map((pest, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {pest}
                                </Badge>
                              ))}
                              {entry.pestTypes.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{entry.pestTypes.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                          <span className="text-muted-foreground text-xs">-</span>
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                          <span className="text-muted-foreground text-xs">-</span>
                        </TableCell>
                        <TableCell className="bg-red-50/50 dark:bg-red-950/20 border-r-2 border-red-200 dark:border-red-800">
                          <span className="text-muted-foreground text-xs">-</span>
                        </TableCell>
                        {/* YELLOW - OPS Columns (Editable by Ops Manager) - 7 columns */}
                        <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                          <span className="text-red-600 dark:text-red-400 font-medium text-sm">-</span>
                        </TableCell>
                        <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                        <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20 text-center">
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                        <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                          {entry.startDate ? (
                            formatDate(entry.startDate)
                          ) : (
                            <span className="text-amber-600 text-sm">TBD</span>
                          )}
                        </TableCell>
                        <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                          <span className="text-muted-foreground text-xs">-</span>
                        </TableCell>
                        <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                          {getStatusBadge(status)}
                        </TableCell>
                        <TableCell className="bg-yellow-50/50 dark:bg-yellow-950/20">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-yellow-200 dark:hover:bg-yellow-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(entry);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
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
                <span className="font-medium text-red-700 dark:text-red-400">Contract data from BigQuery (Read-Only)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-700 rounded" />
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Your inputs (Saved to database)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Click any row to edit | Currency: $0.00 | Dates: MM/DD/YYYY
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog - Simplified for now (full implementation exists in original ops page) */}
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
              {/* Note: Full form implementation available in /ops/new-starts/page.tsx */}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Operations assignment form (see original Ops page for full implementation)
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
