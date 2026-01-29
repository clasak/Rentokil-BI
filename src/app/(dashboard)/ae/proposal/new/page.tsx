'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, FileText, Save, X } from 'lucide-react'
import Link from 'next/link'
import { addProposal, initializeAEData, getAEData } from '@/lib/sales-tracker-data'
import { LeadType, ServiceType, JobType } from '@/types/sales-tracker'

const LEAD_TYPES: LeadType[] = ['Inbound', 'TAP', 'Creative']
const SERVICE_TYPES: ServiceType[] = ['Pest Control', 'Termite', 'Wildlife', 'Mosquito', 'Bed Bug', 'Commercial']
const JOB_TYPES: JobType[] = ['One-Time', 'Contract', 'Recurring']

export default function NewProposalPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    companyName: '',
    leadType: '' as LeadType,
    service: '' as ServiceType,
    jobType: '' as JobType,
    jobWorkPrice: '',
    termitePrice: '',
    contractPrice: '',
  })

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

      // Add the proposal
      addProposal(monthIndex, {
        date: formData.date,
        companyName: formData.companyName.trim(),
        leadType: formData.leadType,
        service: formData.service,
        jobType: formData.jobType || 'One-Time',
        sold: false,
        dead: false,
        jobWorkPrice,
        termitePrice,
        contractPrice,
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
          <h1 className="text-2xl font-bold text-gray-900">New Proposal</h1>
          <p className="text-gray-500">Add a new proposal to your tracker</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Proposal Details</CardTitle>
                  <CardDescription>Enter the proposal information</CardDescription>
                </div>
              </div>
              {totalValue > 0 && (
                <Badge variant="secondary" className="text-lg px-3 py-1">
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

            {/* Job Type */}
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
                  <p className="text-xs text-gray-500">One-time service work</p>
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
                  <p className="text-xs text-gray-500">Termite treatment</p>
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
                  <p className="text-xs text-gray-500">Monthly contract rate</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link href="/ae">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Proposal
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-blue-900 mb-2">Pricing Guide</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Job Work Price:</strong> One-time services like cleanouts, treatments</li>
            <li>• <strong>Termite Price:</strong> Termite inspections, treatments, warranties</li>
            <li>• <strong>Contract Price:</strong> Monthly recurring service agreements (annualized in reports)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
