'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Minus } from 'lucide-react'
import type { EquipmentDetails } from '@/types/new-start-log'
import { DEFAULT_EQUIPMENT } from '@/lib/supabase/new-start-ops'

interface EquipmentSelectorProps {
  value: EquipmentDetails
  onChange: (equipment: EquipmentDetails) => void
  onSave?: () => void
  onCancel?: () => void
  readOnly?: boolean
}

export function EquipmentSelector({
  value,
  onChange,
  onSave,
  onCancel,
  readOnly = false,
}: EquipmentSelectorProps) {
  const [activeTab, setActiveTab] = useState('general')

  // Helper to update quantity values
  const updateQuantity = (
    section: 'generalPest' | 'termite',
    field: string,
    delta: number
  ) => {
    if (readOnly) return

    const currentValue = (value[section] as any)[field] as number
    const newValue = Math.max(0, currentValue + delta)

    onChange({
      ...value,
      [section]: {
        ...value[section],
        [field]: newValue,
      },
    })
  }

  // Helper to update boolean values
  const updateBoolean = (
    section: 'generalPest' | 'termite',
    field: string,
    checked: boolean
  ) => {
    if (readOnly) return

    onChange({
      ...value,
      [section]: {
        ...value[section],
        [field]: checked,
      },
    })
  }

  // Helper to update notes
  const updateNotes = (notes: string) => {
    if (readOnly) return
    onChange({ ...value, notes })
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General Pest</TabsTrigger>
          <TabsTrigger value="termite">Termite</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Rodent Bait Stations */}
              <div className="flex items-center justify-between">
                <Label htmlFor="rbs">Rodent Bait Stations (RBS)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'rbsQty', -1)}
                    disabled={readOnly || value.generalPest.rbsQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="rbs"
                    type="number"
                    min="0"
                    value={value.generalPest.rbsQty}
                    onChange={(e) => {
                      if (!readOnly) {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0)
                        onChange({
                          ...value,
                          generalPest: { ...value.generalPest, rbsQty: newValue },
                        })
                      }
                    }}
                    className="w-20 text-center"
                    readOnly={readOnly}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'rbsQty', 1)}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Multi-Catch Traps */}
              <div className="flex items-center justify-between">
                <Label htmlFor="mrt">Multi-Catch Traps (MRT)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'mrtQty', -1)}
                    disabled={readOnly || value.generalPest.mrtQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="mrt"
                    type="number"
                    min="0"
                    value={value.generalPest.mrtQty}
                    onChange={(e) => {
                      if (!readOnly) {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0)
                        onChange({
                          ...value,
                          generalPest: { ...value.generalPest, mrtQty: newValue },
                        })
                      }
                    }}
                    className="w-20 text-center"
                    readOnly={readOnly}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'mrtQty', 1)}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Insect Light Traps */}
              <div className="flex items-center justify-between">
                <Label htmlFor="ilt">Insect Light Traps (ILT)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'iltQty', -1)}
                    disabled={readOnly || value.generalPest.iltQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="ilt"
                    type="number"
                    min="0"
                    value={value.generalPest.iltQty}
                    onChange={(e) => {
                      if (!readOnly) {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0)
                        onChange({
                          ...value,
                          generalPest: { ...value.generalPest, iltQty: newValue },
                        })
                      }
                    }}
                    className="w-20 text-center"
                    readOnly={readOnly}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'iltQty', 1)}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Door Sweeps */}
              <div className="flex items-center justify-between">
                <Label htmlFor="doorSweeps">Door Sweeps</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'doorSweepsQty', -1)}
                    disabled={readOnly || value.generalPest.doorSweepsQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="doorSweeps"
                    type="number"
                    min="0"
                    value={value.generalPest.doorSweepsQty}
                    onChange={(e) => {
                      if (!readOnly) {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0)
                        onChange({
                          ...value,
                          generalPest: { ...value.generalPest, doorSweepsQty: newValue },
                        })
                      }
                    }}
                    className="w-20 text-center"
                    readOnly={readOnly}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'doorSweepsQty', 1)}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Glue Boards */}
              <div className="flex items-center justify-between">
                <Label htmlFor="glueBoards">Glue Boards</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'glueBoardsQty', -1)}
                    disabled={readOnly || value.generalPest.glueBoardsQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="glueBoards"
                    type="number"
                    min="0"
                    value={value.generalPest.glueBoardsQty}
                    onChange={(e) => {
                      if (!readOnly) {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0)
                        onChange({
                          ...value,
                          generalPest: { ...value.generalPest, glueBoardsQty: newValue },
                        })
                      }
                    }}
                    className="w-20 text-center"
                    readOnly={readOnly}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'glueBoardsQty', 1)}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Fly Lights */}
              <div className="flex items-center justify-between">
                <Label htmlFor="flyLights">Fly Lights</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'flyLightsQty', -1)}
                    disabled={readOnly || value.generalPest.flyLightsQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="flyLights"
                    type="number"
                    min="0"
                    value={value.generalPest.flyLightsQty}
                    onChange={(e) => {
                      if (!readOnly) {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0)
                        onChange({
                          ...value,
                          generalPest: { ...value.generalPest, flyLightsQty: newValue },
                        })
                      }
                    }}
                    className="w-20 text-center"
                    readOnly={readOnly}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('generalPest', 'flyLightsQty', 1)}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Perimeter Spray */}
              <div className="flex items-center justify-between">
                <Label htmlFor="perimeterSpray">Perimeter Spray</Label>
                <Checkbox
                  id="perimeterSpray"
                  checked={value.generalPest.perimeterSpray}
                  onCheckedChange={(checked) =>
                    updateBoolean('generalPest', 'perimeterSpray', checked as boolean)
                  }
                  disabled={readOnly}
                />
              </div>

              {/* Interior Treatment */}
              <div className="flex items-center justify-between">
                <Label htmlFor="interiorTreatment">Interior Treatment</Label>
                <Checkbox
                  id="interiorTreatment"
                  checked={value.generalPest.interiorTreatment}
                  onCheckedChange={(checked) =>
                    updateBoolean('generalPest', 'interiorTreatment', checked as boolean)
                  }
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="termite" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Termite Bait Stations */}
              <div className="flex items-center justify-between">
                <Label htmlFor="termiteBait">Termite Bait Stations</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('termite', 'baitStationsQty', -1)}
                    disabled={readOnly || value.termite.baitStationsQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="termiteBait"
                    type="number"
                    min="0"
                    value={value.termite.baitStationsQty}
                    onChange={(e) => {
                      if (!readOnly) {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0)
                        onChange({
                          ...value,
                          termite: { ...value.termite, baitStationsQty: newValue },
                        })
                      }
                    }}
                    className="w-20 text-center"
                    readOnly={readOnly}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('termite', 'baitStationsQty', 1)}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Monitoring Stations */}
              <div className="flex items-center justify-between">
                <Label htmlFor="monitoring">Monitoring Stations</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('termite', 'monitoringStationsQty', -1)}
                    disabled={readOnly || value.termite.monitoringStationsQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="monitoring"
                    type="number"
                    min="0"
                    value={value.termite.monitoringStationsQty}
                    onChange={(e) => {
                      if (!readOnly) {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0)
                        onChange({
                          ...value,
                          termite: { ...value.termite, monitoringStationsQty: newValue },
                        })
                      }
                    }}
                    className="w-20 text-center"
                    readOnly={readOnly}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity('termite', 'monitoringStationsQty', 1)}
                    disabled={readOnly}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Liquid Treatment */}
              <div className="flex items-center justify-between">
                <Label htmlFor="liquidTreatment">Liquid Treatment</Label>
                <Checkbox
                  id="liquidTreatment"
                  checked={value.termite.liquidTreatment}
                  onCheckedChange={(checked) =>
                    updateBoolean('termite', 'liquidTreatment', checked as boolean)
                  }
                  disabled={readOnly}
                />
              </div>

              {/* Drilling Required */}
              <div className="flex items-center justify-between">
                <Label htmlFor="drilling">Drilling Required</Label>
                <Checkbox
                  id="drilling"
                  checked={value.termite.drillingRequired}
                  onCheckedChange={(checked) =>
                    updateBoolean('termite', 'drillingRequired', checked as boolean)
                  }
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notes Section */}
      <div className="space-y-2">
        <Label htmlFor="equipmentNotes">Equipment Notes</Label>
        <Textarea
          id="equipmentNotes"
          value={value.notes}
          onChange={(e) => updateNotes(e.target.value)}
          placeholder="Enter any special notes about equipment installation..."
          className="min-h-[100px]"
          maxLength={500}
          readOnly={readOnly}
        />
        <p className="text-xs text-muted-foreground text-right">
          {value.notes.length}/500 characters
        </p>
      </div>

      {/* Action Buttons */}
      {!readOnly && (onSave || onCancel) && (
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onSave && (
            <Button type="button" onClick={onSave}>
              Save Equipment
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
