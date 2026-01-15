'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Trash2,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  initializeAEData,
  getAEData,
  addProposal,
  updateProposal,
  deleteProposal,
  convertProposalToSale,
  markProposalDead,
  exportProposalsToCSV,
  getAvailableAEs,
  switchAE,
} from '@/lib/sales-tracker-data'
import {
  Proposal,
  LeadType,
  ServiceType,
  JobType,
  AccountExecutive,
} from '@/types/sales-tracker'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
const LEAD_TYPES: LeadType[] = ['Inbound', 'In Bound', 'Self-Gen', 'Referral', 'Outbound', 'Canvass']
const SERVICE_TYPES: ServiceType[] = ['Pest Control', 'Gen Pest', 'Termite', 'Termite (Res)', 'Rodent Control', 'Wildlife', 'Mosquito', 'Bed Bug', 'Exclusion', 'Insulation', 'Commercial']
const JOB_TYPES: JobType[] = ['Contract', 'One-Time', 'Recurring']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateForInput(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

export default function ProposalsTrackerPage() {
  const [aeData, setAeData] = useState<AccountExecutive | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(2026)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newRow, setNewRow] = useState<Partial<Proposal> | null>(null)
  const [selectedAE, setSelectedAE] = useState('')
  const availableAEs = getAvailableAEs()

  const refreshData = useCallback(() => {
    const data = getAEData()
    if (data) {
      setAeData({ ...data })
    }
  }, [])

  useEffect(() => {
    const data = getAEData() || initializeAEData('Cody Lytle')
    setAeData(data)
    setSelectedAE(availableAEs[0]?.id || '')
    setIsLoading(false)
  }, [availableAEs])

  const handleAEChange = (aeId: string) => {
    const newData = switchAE(aeId)
    if (newData) {
      setAeData({ ...newData })
      setSelectedAE(aeId)
    }
  }

  const handleExportCSV = () => {
    const csv = exportProposalsToCSV(selectedMonth)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proposals-${MONTHS[selectedMonth]}-${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading || !aeData) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  const monthData = aeData.monthlyData[selectedMonth]
  const proposals = monthData?.proposals || []
  const summary = monthData?.proposalSummary

  const handleAddRow = () => {
    const today = new Date()
    setNewRow({
      date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      companyName: '',
      leadType: '',
      service: '',
      jobType: '',
      jobWorkPrice: 0,
      termitePrice: 0,
      contractPrice: 0,
      sold: false,
      dead: false,
    })
  }

  const handleSaveNewRow = () => {
    if (!newRow || !newRow.companyName) return

    addProposal(selectedMonth, {
      date: newRow.date || '',
      companyName: newRow.companyName,
      leadType: (newRow.leadType as LeadType) || '',
      service: (newRow.service as ServiceType) || '',
      jobType: (newRow.jobType as JobType) || '',
      jobWorkPrice: newRow.jobWorkPrice || 0,
      termitePrice: newRow.termitePrice || 0,
      contractPrice: newRow.contractPrice || 0,
      sold: false,
      dead: false,
    })
    setNewRow(null)
    refreshData()
  }

  const handleCancelNewRow = () => {
    setNewRow(null)
  }

  const handleUpdateProposal = (id: string, field: keyof Proposal, value: unknown) => {
    updateProposal(selectedMonth, id, { [field]: value })
    refreshData()
  }

  const handleDeleteProposal = (id: string) => {
    if (confirm('Are you sure you want to delete this proposal?')) {
      deleteProposal(selectedMonth, id)
      refreshData()
    }
  }

  const handleSoldChange = (proposal: Proposal, sold: boolean) => {
    if (sold) {
      // Convert to sale
      convertProposalToSale(selectedMonth, proposal.id)
    } else {
      // Unmark as sold (shouldn't typically happen, but handle it)
      updateProposal(selectedMonth, proposal.id, { sold: false })
    }
    refreshData()
  }

  const handleDeadChange = (proposal: Proposal, dead: boolean) => {
    if (dead) {
      markProposalDead(selectedMonth, proposal.id)
    } else {
      updateProposal(selectedMonth, proposal.id, { dead: false })
    }
    refreshData()
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'My Dashboard', href: '/ae' },
          { label: 'Sales Tracker', href: '/ae/tracker/totals' },
          { label: 'Proposals' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Proposals</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track and manage your sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* AE Selector */}
          <Select value={selectedAE} onValueChange={handleAEChange}>
            <SelectTrigger className="w-44">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select AE" />
            </SelectTrigger>
            <SelectContent>
              {availableAEs.map((ae) => (
                <SelectItem key={ae.id} value={ae.id}>{ae.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, idx) => (
                <SelectItem key={month} value={String(idx)}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Proposals</p>
                <p className="text-xl font-bold">{summary?.totalProposals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Job Work Total</p>
                <p className="text-xl font-bold">{formatCurrency(summary?.jobWorkTotal || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Termite Total</p>
                <p className="text-xl font-bold">{formatCurrency(summary?.termiteTotal || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Contract Total</p>
                <p className="text-xl font-bold">{formatCurrency(summary?.contractTotal || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="pt-4 pb-4">
            <div>
              <p className="text-xs text-blue-100">Grand Total</p>
              <p className="text-2xl font-bold">{formatCurrency(summary?.grandTotal || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{MONTHS[selectedMonth]} {selectedYear} Proposals</CardTitle>
            <Button onClick={handleAddRow} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Proposal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[150px]">Company Name</TableHead>
                  <TableHead className="w-[100px]">Lead Type</TableHead>
                  <TableHead className="w-[120px]">Service</TableHead>
                  <TableHead className="w-[100px]">Job Type</TableHead>
                  <TableHead className="text-right w-[100px]">Job Work $</TableHead>
                  <TableHead className="text-right w-[100px]">Termite $</TableHead>
                  <TableHead className="text-right w-[100px]">Contract $</TableHead>
                  <TableHead className="text-center w-[60px]">Sold</TableHead>
                  <TableHead className="text-center w-[60px]">Dead</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* New Row */}
                {newRow && (
                  <TableRow className="bg-green-50 dark:bg-green-900/20">
                    <TableCell>
                      <Input
                        type="date"
                        value={formatDateForInput(newRow.date || '')}
                        onChange={(e) => setNewRow({ ...newRow, date: e.target.value })}
                        className="h-8 text-sm w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newRow.companyName || ''}
                        onChange={(e) => setNewRow({ ...newRow, companyName: e.target.value })}
                        placeholder="Company name..."
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={newRow.leadType || ''}
                        onValueChange={(v) => setNewRow({ ...newRow, leadType: v as LeadType })}
                      >
                        <SelectTrigger className="h-8 text-sm w-24">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={newRow.service || ''}
                        onValueChange={(v) => setNewRow({ ...newRow, service: v as ServiceType })}
                      >
                        <SelectTrigger className="h-8 text-sm w-28">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={newRow.jobType || ''}
                        onValueChange={(v) => setNewRow({ ...newRow, jobType: v as JobType })}
                      >
                        <SelectTrigger className="h-8 text-sm w-24">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newRow.jobWorkPrice || ''}
                        onChange={(e) => setNewRow({ ...newRow, jobWorkPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-8 text-sm text-right w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newRow.termitePrice || ''}
                        onChange={(e) => setNewRow({ ...newRow, termitePrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-8 text-sm text-right w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newRow.contractPrice || ''}
                        onChange={(e) => setNewRow({ ...newRow, contractPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-8 text-sm text-right w-24"
                      />
                    </TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={handleSaveNewRow}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={handleCancelNewRow}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Existing Proposals */}
                {proposals.map((proposal) => (
                  <TableRow
                    key={proposal.id}
                    className={proposal.dead ? 'bg-gray-100 dark:bg-gray-800 opacity-60' : proposal.sold ? 'bg-green-50 dark:bg-green-900/20' : ''}
                  >
                    <TableCell className="text-sm">
                      {formatDateDisplay(proposal.date)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium block max-w-[160px] truncate ${proposal.dead ? 'line-through' : ''}`}
                        title={proposal.companyName}
                      >
                        {proposal.companyName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {proposal.leadType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {proposal.service}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{proposal.jobType}</TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {proposal.jobWorkPrice > 0 ? formatCurrency(proposal.jobWorkPrice) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {proposal.termitePrice > 0 ? formatCurrency(proposal.termitePrice) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {proposal.contractPrice > 0 ? formatCurrency(proposal.contractPrice) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={proposal.sold}
                        onCheckedChange={(checked) => handleSoldChange(proposal, !!checked)}
                        disabled={proposal.dead}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={proposal.dead}
                        onCheckedChange={(checked) => handleDeadChange(proposal, !!checked)}
                        disabled={proposal.sold}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteProposal(proposal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {proposals.length === 0 && !newRow && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      No proposals for {MONTHS[selectedMonth]} {selectedYear}. Click &quot;Add Proposal&quot; to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-50 dark:bg-green-900/20 border" />
              <span className="text-gray-600 dark:text-gray-400">Sold (moved to Sales)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border" />
              <span className="text-gray-600 dark:text-gray-400">Dead (lost opportunity)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white dark:bg-gray-900 border" />
              <span className="text-gray-600 dark:text-gray-400">Open (in pipeline)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
