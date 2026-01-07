'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, CheckCircle, Save, X, FileText } from 'lucide-react'
import Link from 'next/link'
import { addSale, initializeAEData, getAEData, markProposalSold } from '@/lib/sales-tracker-data'
import { LeadType, ServiceType, JobType, Proposal } from '@/types/sales-tracker'

const LEAD_TYPES: LeadType[] = ['Inbound', 'Outbound', 'Referral', 'Self-Gen', 'Canvass']
const SERVICE_TYPES: ServiceType[] = ['Pest Control', 'Termite', 'Wildlife', 'Mosquito', 'Bed Bug', 'Commercial']
const JOB_TYPES: JobType[] = ['One-Time', 'Contract', 'Recurring']

export default function NewSalePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openProposals, setOpenProposals] = useState<(Proposal & { monthIndex: number })[]>([])
  const [selectedProposal, setSelectedProposal] = useState<string>('')

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    companyName: '',
    leadType: '' as LeadType,
    service: '' as ServiceType,
    jobType: '' as JobType,
    jobWorkPrice: '',
    termitePrice: '',
    contractPrice: '',
    started: true,
    paid: false,
    pestPacId: '',
  })

  useEffect(() => {
    // Load open proposals
    const aeData = getAEData() || initializeAEData('Cody Lytle')
    const proposals: (Proposal & { monthIndex: number })[] = []

    aeData.monthlyData.forEach((month, monthIndex) => {
      month.proposals
        .filter(p => !p.sold && !p.dead)
        .forEach(p => proposals.push({ ...p, monthIndex }))
    })

    setOpenProposals(proposals)
  }, [])

  const handleProposalSelect = (proposalId: string) => {
    setSelectedProposal(proposalId)
    const proposal = openProposals.find(p => p.id === proposalId)
    if (proposal) {
      setFormData({
        date: proposal.date,
        companyName: proposal.companyName,
        leadType: proposal.leadType,
        service: proposal.service,
        jobType: proposal.jobType,
        jobWorkPrice: proposal.jobWorkPrice.toString(),
        termitePrice: proposal.termitePrice.toString(),
        contractPrice: proposal.contractPrice.toString(),
        started: true,
        paid: false,
        pestPacId: '',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.companyName.trim()) {
        throw new Error('Company name is required')
      }
      if (!formData.leadType) {
        throw new Error('Lead type is required')
      }
      if (!formData.service) {
        throw new Error('Service type is required')
      }

      // Initialize data if needed
      if (!getAEData()) {
        initializeAEData('Cody Lytle')
      }

      // Parse prices
      const jobWorkPrice = parseFloat(formData.jobWorkPrice) || 0
      const termitePrice = parseFloat(formData.termitePrice) || 0
      const contractPrice = parseFloat(formData.contractPrice) || 0

      // Validate at least one price
      if (jobWorkPrice === 0 && termitePrice === 0 && contractPrice === 0) {
        throw new Error('At least one price field is required')
      }

      // Get month index from date
      const date = new Date(formData.date)
      const monthIndex = date.getMonth()

      // If converting from proposal, mark it as sold
      if (selectedProposal) {
        const proposal = openProposals.find(p => p.id === selectedProposal)
        if (proposal) {
          markProposalSold(proposal.monthIndex, proposal.id)
        }
      }

      // Add the sale
      addSale(monthIndex, {
        date: formData.date,
        companyName: formData.companyName.trim(),
        leadType: formData.leadType,
        service: formData.service,
        jobType: formData.jobType || 'One-Time',
        jobWorkPrice,
        termitePrice,
        contractPrice,
        started: formData.started,
        paid: formData.paid,
        pestPacId: formData.pestPacId.trim(),
      })

      // Navigate back to dashboard
      router.push('/ae')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalValue =
    (parseFloat(formData.jobWorkPrice) || 0) +
    (parseFloat(formData.termitePrice) || 0) +
    (parseFloat(formData.contractPrice) || 0) * 12

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ae">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log Sale</h1>
          <p className="text-gray-500">Record a completed sale</p>
        </div>
      </div>

      {/* Convert from Proposal */}
      {openProposals.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base text-green-900">Convert from Proposal</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              Select an open proposal to convert to a sale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedProposal} onValueChange={handleProposalSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a proposal to convert..." />
              </SelectTrigger>
              <SelectContent>
                {openProposals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.companyName} - {p.service} (${(p.jobWorkPrice + p.termitePrice + p.contractPrice * 12).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Sale Details</CardTitle>
                  <CardDescription>Enter the sale information</CardDescription>
                </div>
              </div>
              {totalValue > 0 && (
                <Badge className="text-lg px-3 py-1 bg-green-600">
                  ${totalValue.toLocaleString()}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button type="button" onClick={() => setError(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Date & Company */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company Name *</label>
                <Input
                  placeholder="Enter company or customer name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Lead Type & Service */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Lead Type *</label>
                <Select
                  value={formData.leadType}
                  onValueChange={(value: LeadType) => setFormData({ ...formData, leadType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Service *</label>
                <Select
                  value={formData.service}
                  onValueChange={(value: ServiceType) => setFormData({ ...formData, service: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Job Type & Pest Pac ID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Job Type</label>
                <Select
                  value={formData.jobType}
                  onValueChange={(value: JobType) => setFormData({ ...formData, jobType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pest Pac ID</label>
                <Input
                  placeholder="e.g., PP123456"
                  value={formData.pestPacId}
                  onChange={(e) => setFormData({ ...formData, pestPacId: e.target.value })}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Pricing</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Job Work Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      value={formData.jobWorkPrice}
                      onChange={(e) => setFormData({ ...formData, jobWorkPrice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Termite Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      value={formData.termitePrice}
                      onChange={(e) => setFormData({ ...formData, termitePrice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Contract Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      value={formData.contractPrice}
                      onChange={(e) => setFormData({ ...formData, contractPrice: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Monthly rate</p>
                </div>
              </div>
            </div>

            {/* Status Toggles */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Status</h3>
              <div className="flex gap-8">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.started}
                    onCheckedChange={(checked) => setFormData({ ...formData, started: checked })}
                  />
                  <label className="text-sm font-medium text-gray-700">Started</label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.paid}
                    onCheckedChange={(checked) => setFormData({ ...formData, paid: checked })}
                  />
                  <label className="text-sm font-medium text-gray-700">Paid</label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link href="/ae">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Log Sale
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
