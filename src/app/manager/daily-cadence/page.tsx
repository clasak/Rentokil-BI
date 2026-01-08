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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Calendar,
  Save,
  Users,
  Target,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import {
  initializeDailySalesData,
  getDailyEntries,
  getBranches,
  getBranchesByRegion,
  addDailyEntry,
  getRegionSummary,
  getBranchDashboardStats,
  DEFAULT_DAILY_GOALS,
} from '@/lib/daily-sales-data'
import {
  Branch,
  RegionCode,
  DailySalesMetrics,
  DailySalesEntry,
} from '@/types/daily-sales-cadence'

const REGIONS: { code: RegionCode; name: string }[] = [
  { code: 'R16', name: 'Region 16 - Arkansas/Kansas' },
  { code: 'R23', name: 'Region 23 - Oklahoma/Kansas' },
  { code: 'R24', name: 'Region 24 - Illinois/Indiana' },
  { code: 'R52', name: 'Region 52 - Texas East' },
  { code: 'R54', name: 'Region 54 - Texas Central/West' },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getWeekDates(weekOffset: number = 0): { start: Date; end: Date; dates: Date[] } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(today)
  monday.setDate(monday.getDate() - mondayOffset + (weekOffset * 7))

  const friday = new Date(monday)
  friday.setDate(friday.getDate() + 4)

  const dates: Date[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }

  return { start: monday, end: friday, dates }
}

interface DailyInput {
  branchCode: string
  date: string
  pccInField: string
  tapLeads: string
  inspPrp: string
  lobsPrp: string
  lobsSold: string
  dollarsSold: string
  nextDayConf: string
  pcNoTcConversions: boolean
}

export default function DailyCadencePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>('R16')
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const [showTapLeads, setShowTapLeads] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])
  const [existingEntries, setExistingEntries] = useState<DailySalesEntry[]>([])
  const [inputs, setInputs] = useState<Record<string, DailyInput>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    initializeDailySalesData()
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const regionBranches = getBranchesByRegion(selectedRegion)
    setBranches(regionBranches)

    // Load existing entries for the selected date
    const entries = getDailyEntries().filter(e => e.date === selectedDate)
    setExistingEntries(entries)

    // Initialize inputs from existing entries
    const newInputs: Record<string, DailyInput> = {}
    regionBranches.forEach(branch => {
      const existing = entries.find(e => e.branchCode === branch.code)
      newInputs[branch.code] = {
        branchCode: branch.code,
        date: selectedDate,
        pccInField: existing?.metrics.pccInField?.toString() || '',
        tapLeads: existing?.metrics.tapLeads?.toString() || '',
        inspPrp: existing?.metrics.inspPrp?.toString() || '',
        lobsPrp: existing?.metrics.lobsPrp?.toString() || '',
        lobsSold: existing?.metrics.lobsSold?.toString() || '',
        dollarsSold: existing?.metrics.dollarsSold?.toString() || '',
        nextDayConf: existing?.metrics.nextDayConf?.toString() || '',
        pcNoTcConversions: existing?.metrics.pcNoTcConversions || false,
      }
    })
    setInputs(newInputs)
  }, [selectedRegion, selectedDate])

  const handleInputChange = (branchCode: string, field: keyof DailyInput, value: string | boolean) => {
    setInputs(prev => ({
      ...prev,
      [branchCode]: {
        ...prev[branchCode],
        [field]: value,
      }
    }))
  }

  const handleSaveRow = async (branchCode: string) => {
    const input = inputs[branchCode]
    if (!input) return

    setSaving(prev => ({ ...prev, [branchCode]: true }))

    const branch = branches.find(b => b.code === branchCode)
    const metrics: DailySalesMetrics = {
      pccInField: parseInt(input.pccInField) || 0,
      inspPrp: parseInt(input.inspPrp) || 0,
      lobsPrp: parseInt(input.lobsPrp) || 0,
      lobsSold: parseInt(input.lobsSold) || 0,
      dollarsSold: parseFloat(input.dollarsSold) || 0,
      nextDayConf: parseInt(input.nextDayConf) || 0,
      pcNoTcConversions: input.pcNoTcConversions,
    }

    if (showTapLeads) {
      metrics.tapLeads = parseInt(input.tapLeads) || 0
    }

    addDailyEntry(branchCode, selectedDate, metrics, branch?.branchManager || 'Unknown')

    // Refresh entries
    setExistingEntries([...getDailyEntries().filter(e => e.date === selectedDate)])

    setTimeout(() => {
      setSaving(prev => ({ ...prev, [branchCode]: false }))
    }, 500)
  }

  const handleExportCSV = () => {
    const headers = ['Branch Code', 'Branch Name', 'Manager', '# PCCs', showTapLeads ? 'TAP Leads' : '', 'INSP PRP', 'LOBs PRP', 'LOBs Sold', 'Dollars Sold', 'Next Day Conf', 'PC/TC Conv'].filter(Boolean)
    const rows = branches.map(branch => {
      const input = inputs[branch.code]
      return [
        branch.code,
        branch.name,
        branch.branchManager,
        input?.pccInField || '0',
        showTapLeads ? (input?.tapLeads || '0') : '',
        input?.inspPrp || '0',
        input?.lobsPrp || '0',
        input?.lobsSold || '0',
        input?.dollarsSold || '0',
        input?.nextDayConf || '0',
        input?.pcNoTcConversions ? 'Yes' : 'No',
      ].filter((_, i) => showTapLeads || i !== 4)
    })

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-cadence-${selectedRegion}-${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  const regionSummary = getRegionSummary(selectedRegion, selectedDate)
  const week = getWeekDates(weekOffset)

  // Calculate goal attainment for display
  const getGoalStatus = (actual: number, pccCount: number, goalPerPcc: number) => {
    if (pccCount === 0) return 'neutral'
    const target = pccCount * goalPerPcc
    const percentage = (actual / target) * 100
    if (percentage >= 100) return 'success'
    if (percentage >= 80) return 'warning'
    return 'danger'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Sales Cadence</h1>
          <p className="text-gray-500 dark:text-gray-400">Branch Manager daily metrics entry</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as RegionCode)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select Region" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                Week of {week.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {week.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(w => w + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {week.dates.map(date => {
                const dateStr = formatDate(date)
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === formatDate(new Date())
                const hasData = existingEntries.some(e => e.date === dateStr)

                return (
                  <Button
                    key={dateStr}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-w-[80px] ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span>{date.getDate()}</span>
                      {hasData && <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-0.5" />}
                    </div>
                  </Button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showTapLeads}
                  onCheckedChange={(checked) => setShowTapLeads(!!checked)}
                />
                Show TAP Leads
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Region Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500">Total PCCs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{regionSummary.totalPccInField}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">INSP/PRP</span>
            </div>
            <p className="text-2xl font-bold mt-1">{regionSummary.totalInspPrp}</p>
            <p className="text-xs text-gray-400">Goal: {(regionSummary.totalPccInField * DEFAULT_DAILY_GOALS.inspPrpPerPcc).toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-500">LOBs Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{regionSummary.totalLobsSold}</p>
            <p className="text-xs text-gray-400">Goal: {(regionSummary.totalPccInField * DEFAULT_DAILY_GOALS.lobsSoldPerPcc).toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500">Dollars Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(regionSummary.totalDollarsSold)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">Goal Attainment</span>
            </div>
            <p className="text-2xl font-bold mt-1">{regionSummary.avgGoalAttainment.toFixed(0)}%</p>
            <p className="text-xs text-gray-400">
              {regionSummary.branchesOnTrack} on track, {regionSummary.branchesOffTrack} off track
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Goals Reference */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-blue-900 dark:text-blue-100">Daily Goals per PCC</h3>
            <div className="flex gap-6 text-sm">
              <span className="text-blue-700 dark:text-blue-300">
                <strong>INSP/PRP:</strong> {DEFAULT_DAILY_GOALS.inspPrpPerPcc}
              </span>
              <span className="text-blue-700 dark:text-blue-300">
                <strong>LOBs PRP:</strong> {DEFAULT_DAILY_GOALS.lobsPrpPerPcc}
              </span>
              <span className="text-blue-700 dark:text-blue-300">
                <strong>LOBs Sold:</strong> {DEFAULT_DAILY_GOALS.lobsSoldPerPcc}
              </span>
              <span className="text-blue-700 dark:text-blue-300">
                <strong>Next Day Conf:</strong> {DEFAULT_DAILY_GOALS.nextDayConfPerPcc}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead className="min-w-[150px]">Branch</TableHead>
                  <TableHead className="min-w-[140px]">Manager</TableHead>
                  <TableHead className="w-[80px] text-center"># PCCs</TableHead>
                  {showTapLeads && <TableHead className="w-[80px] text-center">TAP Leads</TableHead>}
                  <TableHead className="w-[90px] text-center">INSP PRP</TableHead>
                  <TableHead className="w-[90px] text-center">LOBs PRP</TableHead>
                  <TableHead className="w-[90px] text-center">LOBs Sold</TableHead>
                  <TableHead className="w-[100px] text-center">Dollars SLD</TableHead>
                  <TableHead className="w-[90px] text-center">Next Day</TableHead>
                  <TableHead className="w-[70px] text-center">PC/TC</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => {
                  const input = inputs[branch.code]
                  const pccCount = parseInt(input?.pccInField || '0')
                  const hasEntry = existingEntries.some(e => e.branchCode === branch.code)

                  return (
                    <TableRow key={branch.code} className={hasEntry ? 'bg-green-50/50 dark:bg-green-950/20' : ''}>
                      <TableCell className="font-mono text-sm">{branch.code}</TableCell>
                      <TableCell>
                        <p className="font-medium truncate max-w-[140px]">{branch.name}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{branch.branchManager}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-16 text-center"
                          value={input?.pccInField || ''}
                          onChange={(e) => handleInputChange(branch.code, 'pccInField', e.target.value)}
                          placeholder="0"
                        />
                      </TableCell>
                      {showTapLeads && (
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-16 text-center"
                            value={input?.tapLeads || ''}
                            onChange={(e) => handleInputChange(branch.code, 'tapLeads', e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-col items-center">
                          <Input
                            type="number"
                            min="0"
                            className={`h-8 w-16 text-center ${getGoalStatus(parseInt(input?.inspPrp || '0'), pccCount, DEFAULT_DAILY_GOALS.inspPrpPerPcc) === 'success' ? 'border-green-500' : getGoalStatus(parseInt(input?.inspPrp || '0'), pccCount, DEFAULT_DAILY_GOALS.inspPrpPerPcc) === 'warning' ? 'border-yellow-500' : ''}`}
                            value={input?.inspPrp || ''}
                            onChange={(e) => handleInputChange(branch.code, 'inspPrp', e.target.value)}
                            placeholder="0"
                          />
                          {pccCount > 0 && (
                            <span className="text-xs text-gray-400 mt-0.5">/{(pccCount * DEFAULT_DAILY_GOALS.inspPrpPerPcc).toFixed(0)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-16 text-center"
                            value={input?.lobsPrp || ''}
                            onChange={(e) => handleInputChange(branch.code, 'lobsPrp', e.target.value)}
                            placeholder="0"
                          />
                          {pccCount > 0 && (
                            <span className="text-xs text-gray-400 mt-0.5">/{(pccCount * DEFAULT_DAILY_GOALS.lobsPrpPerPcc).toFixed(0)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center">
                          <Input
                            type="number"
                            min="0"
                            className={`h-8 w-16 text-center ${getGoalStatus(parseInt(input?.lobsSold || '0'), pccCount, DEFAULT_DAILY_GOALS.lobsSoldPerPcc) === 'success' ? 'border-green-500' : ''}`}
                            value={input?.lobsSold || ''}
                            onChange={(e) => handleInputChange(branch.code, 'lobsSold', e.target.value)}
                            placeholder="0"
                          />
                          {pccCount > 0 && (
                            <span className="text-xs text-gray-400 mt-0.5">/{(pccCount * DEFAULT_DAILY_GOALS.lobsSoldPerPcc).toFixed(0)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 w-20 text-center"
                          value={input?.dollarsSold || ''}
                          onChange={(e) => handleInputChange(branch.code, 'dollarsSold', e.target.value)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-16 text-center"
                          value={input?.nextDayConf || ''}
                          onChange={(e) => handleInputChange(branch.code, 'nextDayConf', e.target.value)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={input?.pcNoTcConversions || false}
                          onCheckedChange={(checked) => handleInputChange(branch.code, 'pcNoTcConversions', !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveRow(branch.code)}
                          disabled={saving[branch.code]}
                          className="h-8 w-8 p-0"
                        >
                          {saving[branch.code] ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
                <div className="w-4 h-4 bg-green-100 dark:bg-green-950 border-2 border-green-400 dark:border-green-700 rounded" />
                <span>Entry saved</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>Below 80% goal</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>At or above goal</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Click Save icon to save individual rows | Goals shown below each input
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
