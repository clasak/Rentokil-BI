'use client'

import { Building2, User, MapPin, Mail, DollarSign, Calendar, Package, Wrench, Bug, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SalesforceQuoteDraft, ParseValidationResult } from '@/types/salesforce-quote'

interface ParsedDataPreviewProps {
  draft: SalesforceQuoteDraft
  validation?: ParseValidationResult
  onApply: () => void
  onDiscard: () => void
  className?: string
}

export function ParsedDataPreview({
  draft,
  validation,
  onApply,
  onDiscard,
  className
}: ParsedDataPreviewProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const hasEquipment = draft.equipment && (
    draft.equipment.multCatchQty > 0 ||
    draft.equipment.rbsQty > 0 ||
    draft.equipment.iltQty > 0 ||
    draft.equipment.otherEquipment.length > 0
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Validation warnings/errors */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((error, idx) => (
            <div key={`error-${idx}`} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-red-700 dark:text-red-400">{error.field}:</span>
                <span className="text-sm text-red-600 dark:text-red-300 ml-1">{error.message}</span>
              </div>
            </div>
          ))}
          {validation.warnings.map((warning, idx) => (
            <div key={`warning-${idx}`} className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{warning.field}:</span>
                <span className="text-sm text-yellow-600 dark:text-yellow-300 ml-1">{warning.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success indicator */}
      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <span className="text-sm font-medium text-green-700 dark:text-green-400">
          Quote parsed successfully! Review the data below.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account & Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Account Name</label>
              <p className="text-sm font-medium">{draft.accountName || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Contact Name</label>
              <p className="text-sm font-medium">{draft.contactName || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{draft.contactEmail || '—'}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-1" />
              <span className="text-sm text-muted-foreground">{draft.serviceAddress || '—'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Pricing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Equipment One-Time</label>
                <p className="text-sm font-medium">{formatCurrency(draft.equipmentOneTimeTotal)}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Initial Service</label>
                <p className="text-sm font-medium">{formatCurrency(draft.servicesInitialTotal)}</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Combined Initial Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(draft.combinedInitialTotal)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-3">
              <div>
                <label className="text-xs text-muted-foreground">Monthly Cost</label>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {formatCurrency(draft.servicesMonthlyTotal)}/mo
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Annual Cost</label>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {formatCurrency(draft.annualCost)}/yr
                </p>
              </div>
            </div>
            {draft.jobType && (
              <div className="pt-2">
                <Badge variant="secondary">{draft.jobType}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Equipment
            </CardTitle>
            {draft.equipment.summary && (
              <CardDescription className="text-xs">
                {draft.equipment.summary}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {hasEquipment ? (
              <div className="space-y-2">
                {draft.equipment.multCatchQty > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border">
                    <span className="text-sm">Multi-Catch Traps (MRT)</span>
                    <Badge variant="outline">{draft.equipment.multCatchQty}</Badge>
                  </div>
                )}
                {draft.equipment.rbsQty > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border">
                    <span className="text-sm">Rodent Bait Stations (RBS)</span>
                    <Badge variant="outline">{draft.equipment.rbsQty}</Badge>
                  </div>
                )}
                {draft.equipment.iltQty > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border">
                    <span className="text-sm">Insect Light Traps (ILT)</span>
                    <Badge variant="outline">{draft.equipment.iltQty}</Badge>
                  </div>
                )}
                {draft.equipment.otherEquipment.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 border-b border-border">
                    <span className="text-sm">{item.name}</span>
                    <Badge variant="outline">{item.quantity}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No equipment detected</p>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {draft.services.length > 0 ? (
              <div className="space-y-2">
                {draft.services.map((service, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 border-b border-border">
                    <div>
                      <p className="text-sm font-medium">{service.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{service.category}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {service.frequencyLabel}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {service.servicesPerYear}x/year
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No services detected</p>
            )}
          </CardContent>
        </Card>

        {/* Covered Pests */}
        {draft.coveredPests.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4 text-muted-foreground" />
                Covered Pests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {draft.coveredPests.map((pest, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {pest}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule & Descriptions */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Schedule & Descriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Requested Start Date</label>
                <p className="text-sm font-medium">{draft.requestedStartDate || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Start Month</label>
                <p className="text-sm font-medium">{draft.startMonth || '—'}</p>
              </div>
            </div>
            {draft.initialServiceDescription && (
              <div>
                <label className="text-xs text-muted-foreground">Initial Service Description</label>
                <p className="text-sm bg-muted p-2 rounded border">
                  {draft.initialServiceDescription}
                </p>
              </div>
            )}
            {draft.maintenanceScopeDescription && (
              <div>
                <label className="text-xs text-muted-foreground">Maintenance Scope</label>
                <p className="text-sm bg-muted p-2 rounded border">
                  {draft.maintenanceScopeDescription}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AE Information */}
        {(draft.aeName || draft.aeEmail) && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Account Executive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {draft.aeName && (
                  <span className="text-sm font-medium">{draft.aeName}</span>
                )}
                {draft.aeEmail && (
                  <span className="text-sm text-muted-foreground">{draft.aeEmail}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onDiscard}>
          Discard & Start Over
        </Button>
        <Button onClick={onApply}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Apply to Form
        </Button>
      </div>
    </div>
  )
}
