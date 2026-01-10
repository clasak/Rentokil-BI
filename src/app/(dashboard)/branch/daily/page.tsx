'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
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
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  Save,
  Flame,
} from 'lucide-react'
import {
  initializeDailySalesData,
  getBranches,
  getBranchByCode,
  getEntriesForBranch,
  getBranchDashboardStats,
  addDailyEntry,
  DEFAULT_DAILY_GOALS,
} from '@/lib/daily-sales-data'
import { Branch, DailySalesEntry, DailySalesInput } from '@/types/daily-sales-cadence'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function BranchDailyPage() {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [recentEntries, setRecentEntries] = useState<DailySalesEntry[]>([])

  const today = new Date().toISOString().split('T')[0]
  const hasTapLeads = new Date().getMonth() >= 3 // TAP Leads added after March

  const [formData, setFormData] = useState<DailySalesInput>({
    date: today,
    pccInField: '',
    tapLeads: '',
    inspPrp: '',
    lobsPrp: '',
    lobsSold: '',
    dollarsSold: '',
    nextDayConf: '',
    pcNoTcConversions: false,
  })

  useEffect(() => {
    initializeDailySalesData()
    const allBranches = getBranches()
    setBranches(allBranches)
    // Default to first branch for demo
    if (allBranches.length > 0) {
      setSelectedBranch(allBranches[0])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      const entries = getEntriesForBranch(selectedBranch.code)
      setRecentEntries(entries.slice(0, 7))

      // Check if today already has an entry
      const todayEntry = entries.find(e => e.date === today)
      if (todayEntry) {
        setFormData({
          date: today,
          pccInField: todayEntry.metrics.pccInField.toString(),
          tapLeads: todayEntry.metrics.tapLeads?.toString() || '',
          inspPrp: todayEntry.metrics.inspPrp.toString(),
          lobsPrp: todayEntry.metrics.lobsPrp.toString(),
          lobsSold: todayEntry.metrics.lobsSold.toString(),
          dollarsSold: todayEntry.metrics.dollarsSold.toString(),
          nextDayConf: todayEntry.metrics.nextDayConf.toString(),
          pcNoTcConversions: todayEntry.metrics.pcNoTcConversions,
        })
      } else {
        // Reset form
        setFormData({
          date: today,
          pccInField: '',
          tapLeads: '',
          inspPrp: '',
          lobsPrp: '',
          lobsSold: '',
          dollarsSold: '',
          nextDayConf: '',
          pcNoTcConversions: false,
        })
      }
    }
  }, [selectedBranch, today])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBranch) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const metrics = {
        pccInField: parseInt(formData.pccInField) || 0,
        tapLeads: hasTapLeads ? parseInt(formData.tapLeads) || 0 : undefined,
        inspPrp: parseInt(formData.inspPrp) || 0,
        lobsPrp: parseInt(formData.lobsPrp) || 0,
        lobsSold: parseInt(formData.lobsSold) || 0,
        dollarsSold: parseFloat(formData.dollarsSold.replace(/[^0-9.]/g, '')) || 0,
        nextDayConf: parseInt(formData.nextDayConf) || 0,
        pcNoTcConversions: formData.pcNoTcConversions,
      }

      addDailyEntry(selectedBranch.code, formData.date, metrics, selectedBranch.branchManager)

      // Refresh entries
      setRecentEntries(getEntriesForBranch(selectedBranch.code).slice(0, 7))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  const stats = selectedBranch ? getBranchDashboardStats(selectedBranch.code) : null
  const pccCount = parseInt(formData.pccInField) || 0

  // Calculate expected values based on goals
  const expectedInsp = pccCount * DEFAULT_DAILY_GOALS.inspPrpPerPcc
  const expectedLobs = pccCount * DEFAULT_DAILY_GOALS.lobsPrpPerPcc
  const expectedSold = pccCount * DEFAULT_DAILY_GOALS.lobsSoldPerPcc
  const expectedConf = pccCount * DEFAULT_DAILY_GOALS.nextDayConfPerPcc

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Sales Cadence</h1>
          <p className="text-gray-500">Branch Manager daily activity tracker</p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedBranch?.code || ''}
            onValueChange={(code) => setSelectedBranch(getBranchByCode(code) || null)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select your branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.code} value={branch.code}>
                  {branch.code} - {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedBranch && (
        <>
          {/* Branch Info & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{selectedBranch.name}</h3>
                  <p className="text-sm text-gray-500">{selectedBranch.branchManager}</p>
                  <Badge variant="outline" className="mt-2">{selectedBranch.region}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Week Inspections</p>
                    <p className="text-2xl font-bold">{stats?.weekToDate.inspPrp || 0}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
                <Progress value={stats?.goalProgress.inspPrp || 0} className="mt-3 h-2" />
                <p className="text-xs text-gray-500 mt-1">{(stats?.goalProgress.inspPrp || 0).toFixed(0)}% of goal</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Week LOBs Sold</p>
                    <p className="text-2xl font-bold">{stats?.weekToDate.lobsSold || 0}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
                <Progress value={stats?.goalProgress.lobsSold || 0} className="mt-3 h-2" />
                <p className="text-xs text-gray-500 mt-1">{(stats?.goalProgress.lobsSold || 0).toFixed(0)}% of goal</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Week Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats?.weekToDate.dollarsSold || 0)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-amber-500" />
                </div>
                {stats && stats.streak > 0 && (
                  <div className="flex items-center gap-1 mt-3 text-orange-600">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-medium">{stats.streak} day streak!</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Entry Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today&apos;s Entry
                  </CardTitle>
                  <CardDescription>Enter your daily sales activity metrics</CardDescription>
                </div>
                {saveSuccess && (
                  <Badge className="bg-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Saved!
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  {/* PCCs in Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium"># PCCs in Field</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.pccInField}
                      onChange={(e) => setFormData({ ...formData, pccInField: e.target.value })}
                    />
                  </div>

                  {/* TAP Leads - Only show if applicable */}
                  {hasTapLeads && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">TAP Leads</label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.tapLeads}
                        onChange={(e) => setFormData({ ...formData, tapLeads: e.target.value })}
                      />
                    </div>
                  )}

                  {/* INSP PRP */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      INSP PRP
                      {pccCount > 0 && (
                        <span className="text-xs text-gray-400 ml-1">(goal: {expectedInsp.toFixed(1)})</span>
                      )}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.inspPrp}
                      onChange={(e) => setFormData({ ...formData, inspPrp: e.target.value })}
                      className={parseInt(formData.inspPrp) >= expectedInsp ? 'border-green-500' : ''}
                    />
                  </div>

                  {/* LOBs PRP */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      LOBs PRP
                      {pccCount > 0 && (
                        <span className="text-xs text-gray-400 ml-1">(goal: {expectedLobs.toFixed(0)})</span>
                      )}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.lobsPrp}
                      onChange={(e) => setFormData({ ...formData, lobsPrp: e.target.value })}
                      className={parseInt(formData.lobsPrp) >= expectedLobs ? 'border-green-500' : ''}
                    />
                  </div>

                  {/* LOBs Sold */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      LOBs Sold
                      {pccCount > 0 && (
                        <span className="text-xs text-gray-400 ml-1">(goal: {expectedSold.toFixed(0)})</span>
                      )}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.lobsSold}
                      onChange={(e) => setFormData({ ...formData, lobsSold: e.target.value })}
                      className={parseInt(formData.lobsSold) >= expectedSold ? 'border-green-500' : ''}
                    />
                  </div>

                  {/* Dollars Sold */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dollars Sold</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="text"
                        placeholder="0.00"
                        className="pl-7"
                        value={formData.dollarsSold}
                        onChange={(e) => setFormData({ ...formData, dollarsSold: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Next Day Conf */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Next Day CONF
                      {pccCount > 0 && (
                        <span className="text-xs text-gray-400 ml-1">(goal: {expectedConf.toFixed(1)})</span>
                      )}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.nextDayConf}
                      onChange={(e) => setFormData({ ...formData, nextDayConf: e.target.value })}
                    />
                  </div>

                  {/* PC NO TC Conversions */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">PC NO TC Conversions</label>
                    <div className="flex items-center gap-2 h-10">
                      <Switch
                        checked={formData.pcNoTcConversions}
                        onCheckedChange={(checked) => setFormData({ ...formData, pcNoTcConversions: checked })}
                      />
                      <span className="text-sm text-gray-500">
                        {formData.pcNoTcConversions ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Entry
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Recent Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Entries</CardTitle>
              <CardDescription>Your last 7 daily submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">PCCs</TableHead>
                    {hasTapLeads && <TableHead className="text-center">TAP</TableHead>}
                    <TableHead className="text-center">INSP</TableHead>
                    <TableHead className="text-center">LOBs PRP</TableHead>
                    <TableHead className="text-center">LOBs Sold</TableHead>
                    <TableHead className="text-right">Dollars</TableHead>
                    <TableHead className="text-center">Next Day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={hasTapLeads ? 8 : 7} className="text-center text-gray-500 py-8">
                        No entries yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentEntries.map((entry) => {
                      const goal = entry.metrics.pccInField * DEFAULT_DAILY_GOALS.inspPrpPerPcc
                      const onTrack = entry.metrics.inspPrp >= goal * 0.8
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                          <TableCell className="text-center">{entry.metrics.pccInField}</TableCell>
                          {hasTapLeads && (
                            <TableCell className="text-center">{entry.metrics.tapLeads || '-'}</TableCell>
                          )}
                          <TableCell className="text-center">
                            <span className={onTrack ? 'text-green-600 font-medium' : 'text-red-600'}>
                              {entry.metrics.inspPrp}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{entry.metrics.lobsPrp}</TableCell>
                          <TableCell className="text-center">{entry.metrics.lobsSold}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.metrics.dollarsSold)}</TableCell>
                          <TableCell className="text-center">{entry.metrics.nextDayConf}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Goals Reference */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h4 className="font-medium text-blue-900 mb-3">Daily Goals (per PCC)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">INSP PRP:</span>{' '}
                  <span className="font-semibold">{DEFAULT_DAILY_GOALS.inspPrpPerPcc}</span>
                </div>
                <div>
                  <span className="text-blue-600">LOBs PRP:</span>{' '}
                  <span className="font-semibold">{DEFAULT_DAILY_GOALS.lobsPrpPerPcc}</span>
                </div>
                <div>
                  <span className="text-blue-600">LOBs Sold:</span>{' '}
                  <span className="font-semibold">{DEFAULT_DAILY_GOALS.lobsSoldPerPcc}</span>
                </div>
                <div>
                  <span className="text-blue-600">Next Day CONF:</span>{' '}
                  <span className="font-semibold">{DEFAULT_DAILY_GOALS.nextDayConfPerPcc}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
