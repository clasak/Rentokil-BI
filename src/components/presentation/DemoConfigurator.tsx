'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Play, Compass, Target, AlertTriangle } from 'lucide-react'

export interface DemoConfigSelections {
  audience: string[]
  decisions: string[]
  painPoints: string[]
}

interface DemoConfiguratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStart: (selections: DemoConfigSelections) => void
}

const FOCUS_OPTIONS = [
  'Executive Overview',
  'Daily Operations',
  'Financial Health',
  'Lead Pipeline',
  'Sales Execution',
  'Data Governance',
]

const DECISION_OPTIONS = [
  'Daily operations',
  'Weekly reviews',
  'Strategic planning',
]

const PAIN_POINT_OPTIONS = [
  'Stale data',
  'Too many reports',
  'No drill-down',
  'Inconsistent definitions',
  'No end-to-end visibility',
]

export function DemoConfigurator({ open, onOpenChange, onStart }: DemoConfiguratorProps) {
  const [audience, setAudience] = useState<string[]>([])
  const [decisions, setDecisions] = useState<string[]>([])
  const [painPoints, setPainPoints] = useState<string[]>([])

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(
      list.includes(item)
        ? list.filter((i) => i !== item)
        : [...list, item]
    )
  }

  const handleStart = () => {
    onStart({ audience, decisions, painPoints })
    // Reset for next time
    setAudience([])
    setDecisions([])
    setPainPoints([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Configure Demo Context</DialogTitle>
          <DialogDescription className="text-sm text-gray-400 italic">
            Ask: &ldquo;Before I show you anything, I want to make sure I&rsquo;m oriented to what matters to you.&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Focus Areas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
              <Compass className="h-4 w-4 text-blue-400" />
              What would you like to focus on?
            </div>
            <div className="space-y-2 pl-6">
              {FOCUS_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <Checkbox
                    checked={audience.includes(option)}
                    onCheckedChange={() => toggleItem(audience, setAudience, option)}
                    className="border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* Decisions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
              <Target className="h-4 w-4 text-green-400" />
              What decisions should this enable?
            </div>
            <div className="space-y-2 pl-6">
              {DECISION_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <Checkbox
                    checked={decisions.includes(option)}
                    onCheckedChange={() => toggleItem(decisions, setDecisions, option)}
                    className="border-gray-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* Pain Points */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              What&rsquo;s not working today?
            </div>
            <div className="space-y-2 pl-6">
              {PAIN_POINT_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <Checkbox
                    checked={painPoints.includes(option)}
                    onCheckedChange={() => toggleItem(painPoints, setPainPoints, option)}
                    className="border-gray-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleStart}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Play className="h-4 w-4" />
            Start Demo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
