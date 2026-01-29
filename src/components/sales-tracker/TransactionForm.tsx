/**
 * Transaction Form Component
 *
 * Modal form for adding/editing sales tracker transactions (proposals and sales).
 * Supports separate entry flows for proposals vs sales with different field sets.
 */

'use client'

import { useState, useEffect } from 'react'
import { Transaction, TransactionFormData, LEAD_TYPES, LEAD_TYPE_LABELS } from '@/types/sales-tracker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// =============================================================================
// Component Props
// =============================================================================

interface TransactionFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: TransactionFormData) => void
  transaction?: Transaction | null // For editing existing transaction
  defaultType?: 'proposal' | 'sale'
}

// =============================================================================
// Service and Job Type Options
// =============================================================================

const SERVICE_TYPES = [
  'Pest Control',
  'Termite',
  'Termite (Res)',
  'Wildlife',
  'Mosquito',
  'Bed Bug',
  'Commercial',
  'Rodent Control',
  'Gen Pest',
  'Exclusion',
  'Insulation',
] as const

const JOB_TYPES = ['One-Time', 'Contract', 'Recurring'] as const

// =============================================================================
// Component
// =============================================================================

export function TransactionForm({
  open,
  onClose,
  onSave,
  transaction,
  defaultType = 'proposal',
}: TransactionFormProps) {
  const isEditing = !!transaction

  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    date: transaction?.date || new Date().toISOString().split('T')[0],
    companyName: transaction?.companyName || '',
    leadType: transaction?.leadType || 'Inbound',
    service: transaction?.service || 'Pest Control',
    jobType: transaction?.jobType || 'One-Time',
    type: transaction?.type || defaultType,
    sold: transaction?.sold || false,
    dead: transaction?.dead || false,
    jobWorkPrice: transaction?.jobWorkPrice || 0,
    termitePrice: transaction?.termitePrice || 0,
    contractPrice: transaction?.contractPrice || 0,
    started: transaction?.started || false,
    paid: transaction?.paid || false,
    pestPacId: transaction?.pestPacId || '',
  })

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date,
        companyName: transaction.companyName,
        leadType: transaction.leadType,
        service: transaction.service,
        jobType: transaction.jobType,
        type: transaction.type,
        sold: transaction.sold || false,
        dead: transaction.dead || false,
        jobWorkPrice: transaction.jobWorkPrice,
        termitePrice: transaction.termitePrice,
        contractPrice: transaction.contractPrice,
        started: transaction.started || false,
        paid: transaction.paid || false,
        pestPacId: transaction.pestPacId || '',
      })
    } else {
      // Reset to defaults
      setFormData({
        date: new Date().toISOString().split('T')[0],
        companyName: '',
        leadType: 'Inbound',
        service: 'Pest Control',
        jobType: 'One-Time',
        type: defaultType,
        sold: false,
        dead: false,
        jobWorkPrice: 0,
        termitePrice: 0,
        contractPrice: 0,
        started: false,
        paid: false,
        pestPacId: '',
      })
    }
  }, [transaction, defaultType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  const updateField = <K extends keyof TransactionFormData>(
    field: K,
    value: TransactionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const totalAmount = formData.jobWorkPrice + formData.termitePrice + formData.contractPrice

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
          <DialogDescription>
            Enter transaction details below. All price fields are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={formData.type} onValueChange={(v) => updateField('type', v as 'proposal' | 'sale')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="proposal">Proposal</TabsTrigger>
              <TabsTrigger value="sale">Sale</TabsTrigger>
            </TabsList>

            {/* PROPOSAL FORM */}
            <TabsContent value="proposal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    required
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                {/* Lead Type */}
                <div className="space-y-2">
                  <Label htmlFor="leadType">Lead Type *</Label>
                  <Select value={formData.leadType} onValueChange={(v) => updateField('leadType', v as any)}>
                    <SelectTrigger id="leadType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {LEAD_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service */}
                <div className="space-y-2">
                  <Label htmlFor="service">Service *</Label>
                  <Select value={formData.service} onValueChange={(v) => updateField('service', v as any)}>
                    <SelectTrigger id="service">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Job Type */}
                <div className="space-y-2">
                  <Label htmlFor="jobType">Job Type *</Label>
                  <Select value={formData.jobType} onValueChange={(v) => updateField('jobType', v as any)}>
                    <SelectTrigger id="jobType">
                      <SelectValue />
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

                {/* Sold/Dead Checkboxes */}
                <div className="space-y-2 flex items-center gap-4 pt-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sold"
                      checked={formData.sold}
                      onCheckedChange={(checked) => updateField('sold', !!checked)}
                    />
                    <Label htmlFor="sold" className="cursor-pointer">
                      Sold
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dead"
                      checked={formData.dead}
                      onCheckedChange={(checked) => updateField('dead', !!checked)}
                    />
                    <Label htmlFor="dead" className="cursor-pointer">
                      Dead
                    </Label>
                  </div>
                </div>

                {/* Job Work Price */}
                <div className="space-y-2">
                  <Label htmlFor="jobWorkPrice">Job Work Price</Label>
                  <Input
                    id="jobWorkPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.jobWorkPrice}
                    onChange={(e) => updateField('jobWorkPrice', parseFloat(e.target.value) || 0)}
                    placeholder="$0.00"
                  />
                </div>

                {/* Termite Price */}
                <div className="space-y-2">
                  <Label htmlFor="termitePrice">Termite Price</Label>
                  <Input
                    id="termitePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.termitePrice}
                    onChange={(e) => updateField('termitePrice', parseFloat(e.target.value) || 0)}
                    placeholder="$0.00"
                  />
                </div>

                {/* Contract Price */}
                <div className="space-y-2">
                  <Label htmlFor="contractPrice">Contract Price</Label>
                  <Input
                    id="contractPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.contractPrice}
                    onChange={(e) => updateField('contractPrice', parseFloat(e.target.value) || 0)}
                    placeholder="$0.00"
                  />
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Amount:</span>
                  <span className="text-lg font-bold">
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* SALES FORM */}
            <TabsContent value="sale" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date-sale">Date *</Label>
                  <Input
                    id="date-sale"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    required
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName-sale">Company Name *</Label>
                  <Input
                    id="companyName-sale"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                {/* Lead Type */}
                <div className="space-y-2">
                  <Label htmlFor="leadType-sale">Lead Type *</Label>
                  <Select value={formData.leadType} onValueChange={(v) => updateField('leadType', v as any)}>
                    <SelectTrigger id="leadType-sale">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {LEAD_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service */}
                <div className="space-y-2">
                  <Label htmlFor="service-sale">Service *</Label>
                  <Select value={formData.service} onValueChange={(v) => updateField('service', v as any)}>
                    <SelectTrigger id="service-sale">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Job Type */}
                <div className="space-y-2">
                  <Label htmlFor="jobType-sale">Job Type *</Label>
                  <Select value={formData.jobType} onValueChange={(v) => updateField('jobType', v as any)}>
                    <SelectTrigger id="jobType-sale">
                      <SelectValue />
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

                {/* Job Work Price */}
                <div className="space-y-2">
                  <Label htmlFor="jobWorkPrice-sale">Job Work Price</Label>
                  <Input
                    id="jobWorkPrice-sale"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.jobWorkPrice}
                    onChange={(e) => updateField('jobWorkPrice', parseFloat(e.target.value) || 0)}
                    placeholder="$0.00"
                  />
                </div>

                {/* Termite Price */}
                <div className="space-y-2">
                  <Label htmlFor="termitePrice-sale">Termite Price</Label>
                  <Input
                    id="termitePrice-sale"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.termitePrice}
                    onChange={(e) => updateField('termitePrice', parseFloat(e.target.value) || 0)}
                    placeholder="$0.00"
                  />
                </div>

                {/* Contract Price */}
                <div className="space-y-2">
                  <Label htmlFor="contractPrice-sale">Contract Price</Label>
                  <Input
                    id="contractPrice-sale"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.contractPrice}
                    onChange={(e) => updateField('contractPrice', parseFloat(e.target.value) || 0)}
                    placeholder="$0.00"
                  />
                </div>

                {/* Started/Paid Checkboxes */}
                <div className="space-y-2 flex items-center gap-4 pt-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="started"
                      checked={formData.started}
                      onCheckedChange={(checked) => updateField('started', !!checked)}
                    />
                    <Label htmlFor="started" className="cursor-pointer">
                      Started
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="paid"
                      checked={formData.paid}
                      onCheckedChange={(checked) => updateField('paid', !!checked)}
                    />
                    <Label htmlFor="paid" className="cursor-pointer">
                      Paid
                    </Label>
                  </div>
                </div>

                {/* PestPac ID */}
                <div className="space-y-2">
                  <Label htmlFor="pestPacId">PestPac ID</Label>
                  <Input
                    id="pestPacId"
                    value={formData.pestPacId || ''}
                    onChange={(e) => updateField('pestPacId', e.target.value)}
                    placeholder="Enter PestPac ID"
                  />
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Amount:</span>
                  <span className="text-lg font-bold">
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
