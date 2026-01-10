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
  ArrowLeft,
  Plus,
  Trash2,
  DollarSign,
  Target,
  CheckCircle2,
  Banknote,
  Play,
  CheckCircle,
  XCircle,
  Download,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import {
  initializeAEData,
  getAEData,
  addSale,
  updateSale,
  deleteSale,
  updateMonthlyISQ,
  updateMonthlyPersonalGoal,
  getMonthlyPersonalGoal,
  exportSalesToCSV,
  getAvailableAEs,
  switchAE,
} from '@/lib/sales-tracker-data'
import {
  Sale,
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

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

export default function SalesTrackerPage() {
  const [aeData, setAeData] = useState<AccountExecutive | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(2026)
  const [editingISQ, setEditingISQ] = useState(false)
  const [newISQ, setNewISQ] = useState('')
  const [editingPersonalGoal, setEditingPersonalGoal] = useState(false)
  const [newPersonalGoal, setNewPersonalGoal] = useState('')
  const [newRow, setNewRow] = useState<Partial<Sale> | null>(null)
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
    const csv = exportSalesToCSV(selectedMonth)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-${MONTHS[selectedMonth]}-${selectedYear}.csv`
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
  const sales = monthData?.sales || []
  const summary = monthData?.salesSummary

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
      started: false,
      paid: false,
      pestPacId: '',
    })
  }

  const handleSaveNewRow = () => {
    if (!newRow || !newRow.companyName) return

    addSale(selectedMonth, {
      date: newRow.date || '',
      companyName: newRow.companyName,
      leadType: (newRow.leadType as LeadType) || '',
      service: (newRow.service as ServiceType) || '',
      jobType: (newRow.jobType as JobType) || '',
      jobWorkPrice: newRow.jobWorkPrice || 0,
      termitePrice: newRow.termitePrice || 0,
      contractPrice: newRow.contractPrice || 0,
      started: newRow.started || false,
      paid: newRow.paid || false,
      pestPacId: newRow.pestPacId || '',
    })
    setNewRow(null)
    refreshData()
  }

  const handleCancelNewRow = () => {
    setNewRow(null)
  }

  const handleUpdateSale = (id: string, field: keyof Sale, value: unknown) => {
    updateSale(selectedMonth, id, { [field]: value })
    refreshData()
  }

  const handleDeleteSale = (id: string) => {
    if (confirm('Are you sure you want to delete this sale?')) {
      deleteSale(selectedMonth, id)
      refreshData()
    }
  }

  const handleSaveISQ = () => {
    const isqValue = parseFloat(newISQ)
    if (!isNaN(isqValue)) {
      updateMonthlyISQ(selectedMonth, isqValue)
      refreshData()
    }
    setEditingISQ(false)
  }

  const handleSavePersonalGoal = () => {
    const goalValue = parseFloat(newPersonalGoal)
    if (!isNaN(goalValue)) {
      updateMonthlyPersonalGoal(selectedMonth, goalValue)
      refreshData()
    }
    setEditingPersonalGoal(false)
  }

  const personalGoal = getMonthlyPersonalGoal(selectedMonth)

  const startedSalesTotal = sales
    .filter(s => s.started)
    .reduce((sum, s) => sum + s.jobWorkPrice + s.termitePrice + (s.contractPrice * 12), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ae">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Sales</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Track closed deals and commission status
            </p>
          </div>
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

      {/* ISQ and Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* ISQ Card */}
        <Card className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-200">{MONTHS[selectedMonth]} ISQ</p>
                {editingISQ ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={newISQ}
                      onChange={(e) => setNewISQ(e.target.value)}
                      className="h-8 w-24 text-black"
                      placeholder="Enter ISQ"
                      autoFocus
                    />
                    <Button size="sm" variant="secondary" className="h-8" onClick={handleSaveISQ}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <p
                    className="text-2xl font-bold cursor-pointer hover:underline"
                    onClick={() => {
                      setNewISQ(String(summary?.monthISQ || ''))
                      setEditingISQ(true)
                    }}
                  >
                    {formatCurrency(summary?.monthISQ || 0)}
                  </p>
                )}
              </div>
              <Target className="h-8 w-8 text-indigo-300" />
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

        <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
          <CardContent className="pt-4 pb-4">
            <div>
              <p className="text-xs text-green-100">Grand Total</p>
              <p className="text-2xl font-bold">{formatCurrency(summary?.grandTotal || 0)}</p>
              <p className="text-xs text-green-200 mt-1">{summary?.totalSales || 0} sales</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Started Sales</p>
                <p className="text-xl font-bold">{summary?.totalStartedSales || 0}</p>
                <p className="text-xs text-gray-400">{formatCurrency(startedSalesTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Goal Card */}
      <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-100">{MONTHS[selectedMonth]} Personal Goal</p>
              {editingPersonalGoal ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={newPersonalGoal}
                    onChange={(e) => setNewPersonalGoal(e.target.value)}
                    className="h-8 w-28 text-black"
                    placeholder="Enter goal"
                    autoFocus
                  />
                  <Button size="sm" variant="secondary" className="h-8" onClick={handleSavePersonalGoal}>
                    Save
                  </Button>
                </div>
              ) : (
                <p
                  className="text-2xl font-bold cursor-pointer hover:underline"
                  onClick={() => {
                    setNewPersonalGoal(String(personalGoal))
                    setEditingPersonalGoal(true)
                  }}
                >
                  {formatCurrency(personalGoal)}
                </p>
              )}
              <p className="text-xs text-amber-200 mt-1">
                {summary?.grandTotal ? ((summary.grandTotal / personalGoal) * 100).toFixed(0) : 0}% achieved
              </p>
            </div>
            <Target className="h-8 w-8 text-amber-200" />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{MONTHS[selectedMonth]} {selectedYear} Sales</CardTitle>
            <Button onClick={handleAddRow} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Sale
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
                  <TableHead className="text-center w-[70px]">Started</TableHead>
                  <TableHead className="text-center w-[60px]">Paid</TableHead>
                  <TableHead className="w-[100px]">PestPac ID</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* New Row */}
                {newRow && (
                  <TableRow className="bg-blue-50 dark:bg-blue-900/20">
                    <TableCell>
                      <Input
                        type="date"
                        value={newRow.date || ''}
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
                    <TableCell className="text-center">
                      <Checkbox
                        checked={newRow.started || false}
                        onCheckedChange={(checked) => setNewRow({ ...newRow, started: !!checked })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={newRow.paid || false}
                        onCheckedChange={(checked) => setNewRow({ ...newRow, paid: !!checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newRow.pestPacId || ''}
                        onChange={(e) => setNewRow({ ...newRow, pestPacId: e.target.value })}
                        placeholder="PP######"
                        className="h-8 text-sm w-24"
                      />
                    </TableCell>
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

                {/* Existing Sales */}
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-sm">
                      {formatDateDisplay(sale.date)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{sale.companyName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sale.leadType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {sale.service}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{sale.jobType}</TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {sale.jobWorkPrice > 0 ? formatCurrency(sale.jobWorkPrice) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {sale.termitePrice > 0 ? formatCurrency(sale.termitePrice) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {sale.contractPrice > 0 ? formatCurrency(sale.contractPrice) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={sale.started}
                        onCheckedChange={(checked) => handleUpdateSale(sale.id, 'started', !!checked)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={sale.paid}
                        onCheckedChange={(checked) => handleUpdateSale(sale.id, 'paid', !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={sale.pestPacId}
                        onChange={(e) => handleUpdateSale(sale.id, 'pestPacId', e.target.value)}
                        className="h-7 text-xs w-24"
                        placeholder="PP######"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteSale(sale.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {sales.length === 0 && !newRow && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                      No sales for {MONTHS[selectedMonth]} {selectedYear}. Sales are added when proposals are marked as &quot;Sold&quot;.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-gray-600 dark:text-gray-400">Started = Service has begun</span>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600 dark:text-gray-400">Paid = Commission received</span>
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              Tip: Click on the ISQ value to edit the monthly quota
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
