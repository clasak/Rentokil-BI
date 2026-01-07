'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { ArrowLeft, FileText, Save, X, AlertCircle } from 'lucide-react'
import { addNewStart } from '@/lib/new-start-data'
import {
  NewStartAEInput,
  ServiceType,
  FrequencyType,
  YesNo,
  MonthName,
} from '@/types/new-start-log'

const MONTHS: MonthName[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const FREQUENCIES: { value: FrequencyType; label: string }[] = [
  { value: '1', label: '1x (One-Time)' },
  { value: '2', label: '2x per year' },
  { value: '4', label: '4x per year (Quarterly)' },
  { value: '6', label: '6x per year (Bi-Monthly)' },
  { value: '12', label: '12x per year (Monthly)' },
  { value: '24', label: '24x per year (Bi-Weekly)' },
]

export default function NewStartEntryPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<NewStartAEInput>({
    soldDate: new Date().toISOString().split('T')[0],
    accountName: '',
    serviceAddress: '',
    salesRepsInvolved: '',
    initialJobPrice: '',
    maintenancePrice: '',
    serviceType: '',
    frequency: '',
    logBookNeeded: '',
    tapLeadOrSpecialist: '',
    pestPacLocNumber: '',
    customerRequestedStartMonth: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.accountName.trim()) {
        throw new Error('Account name is required')
      }
      if (!formData.serviceAddress.trim()) {
        throw new Error('Service address is required')
      }
      if (!formData.serviceType) {
        throw new Error('Service type is required')
      }
      if (!formData.pestPacLocNumber.trim()) {
        throw new Error('PestPac Location # is required')
      }

      const initialPrice = parseFloat(formData.initialJobPrice) || 0
      const maintenancePrice = parseFloat(formData.maintenancePrice) || 0

      if (initialPrice === 0 && maintenancePrice === 0) {
        throw new Error('At least one price is required')
      }

      // Add the new start
      addNewStart({
        soldDate: formData.soldDate,
        accountName: formData.accountName.trim(),
        serviceAddress: formData.serviceAddress.trim(),
        salesRepsInvolved: formData.salesRepsInvolved.trim() || 'Cody',
        initialJobPrice: initialPrice,
        maintenancePrice: maintenancePrice,
        serviceType: formData.serviceType as ServiceType,
        frequency: formData.frequency || '1',
        logBookNeeded: formData.logBookNeeded || 'N',
        tapLeadOrSpecialist: formData.tapLeadOrSpecialist.trim(),
        pestPacLocNumber: formData.pestPacLocNumber.trim(),
        customerRequestedStartMonth: formData.customerRequestedStartMonth || '',
      })

      router.push('/ae/new-starts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalValue =
    (parseFloat(formData.initialJobPrice) || 0) +
    (parseFloat(formData.maintenancePrice) || 0) * 12

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ae/new-starts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Start Entry</h1>
          <p className="text-gray-500">Log a new sale for Operations handoff</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Sales (RED) Fields</p>
            <p className="text-sm text-red-700">
              Fill in all fields below. Operations will complete their section after you submit.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle>Sale Details</CardTitle>
                  <CardDescription>Account Executive section</CardDescription>
                </div>
              </div>
              {totalValue > 0 && (
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  Total: ${totalValue.toLocaleString()}
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

            {/* Date & Account */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sold Date *</label>
                <Input
                  type="date"
                  value={formData.soldDate}
                  onChange={(e) => setFormData({ ...formData, soldDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Account Name *</label>
                <Input
                  placeholder="Company or customer name"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Address *</label>
              <Input
                placeholder="Full address including city and zip"
                value={formData.serviceAddress}
                onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
                required
              />
            </div>

            {/* Sales Rep */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sales Rep(s) Involved</label>
              <Input
                placeholder="Your name or multiple reps"
                value={formData.salesRepsInvolved}
                onChange={(e) => setFormData({ ...formData, salesRepsInvolved: e.target.value })}
              />
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Initial / Job 1X Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      value={formData.initialJobPrice}
                      onChange={(e) => setFormData({ ...formData, initialJobPrice: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Including merchandise</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Maintenance (Contract) Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      value={formData.maintenancePrice}
                      onChange={(e) => setFormData({ ...formData, maintenancePrice: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Monthly contract rate</p>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Service Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Type *</label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value as ServiceType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Contract or Job 1x" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Job 1x">Job 1x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Frequency</label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value as FrequencyType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="# of annual visits" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Log Book Needed</label>
                  <Select
                    value={formData.logBookNeeded}
                    onValueChange={(value) => setFormData({ ...formData, logBookNeeded: value as YesNo })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Yes or No" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Y">Yes</SelectItem>
                      <SelectItem value="N">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">TAP Lead / Specialist Name</label>
                  <Input
                    placeholder="If applicable"
                    value={formData.tapLeadOrSpecialist}
                    onChange={(e) => setFormData({ ...formData, tapLeadOrSpecialist: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* PestPac & Scheduling */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">System & Scheduling</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">PestPac Location # *</label>
                  <Input
                    placeholder="Copy from PestPac"
                    value={formData.pestPacLocNumber}
                    onChange={(e) => setFormData({ ...formData, pestPacLocNumber: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">Blue number from PestPac</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Customer Requested Start Month</label>
                  <Select
                    value={formData.customerRequestedStartMonth}
                    onValueChange={(value) => setFormData({ ...formData, customerRequestedStartMonth: value as MonthName })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link href="/ae/new-starts">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Submit to Operations
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Info */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-yellow-900 mb-2">What happens next?</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>1. Your entry appears in the New Start Log with status &quot;Pending Ops&quot;</li>
            <li>2. Operations Manager assigns a specialist and schedules the start date</li>
            <li>3. You can track progress from your New Starts page</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
