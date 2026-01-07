"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore, DEMO_MODE_CONFIG } from '@/store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronRight, ChevronLeft, X, Play, Target } from 'lucide-react'

export function DemoTour() {
  const router = useRouter()
  const pathname = usePathname()
  const { tourActive, setTourActive, tourStep, setTourStep, settings } = useAppStore()

  const config = DEMO_MODE_CONFIG[settings.demoMode]
  const steps = config.tourSteps
  const currentStep = steps[tourStep]
  const progress = ((tourStep + 1) / steps.length) * 100

  useEffect(() => {
    if (tourActive && currentStep && pathname !== currentStep.route) {
      router.push(currentStep.route)
    }
  }, [tourActive, currentStep, pathname, router])

  const handleNext = () => {
    if (tourStep < steps.length - 1) {
      setTourStep(tourStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (tourStep > 0) {
      setTourStep(tourStep - 1)
    }
  }

  const handleClose = () => {
    setTourActive(false)
    setTourStep(0)
  }

  if (!tourActive) return null

  return (
    <Dialog open={tourActive} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" />
              {config.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Step {tourStep + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
          <DialogTitle className="mt-4">{currentStep?.title}</DialogTitle>
          <DialogDescription className="text-base">
            {currentStep?.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">What to look for:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {tourStep === 0 && (
                <>
                  <li>• Top 10 KPI cards with trends and deltas</li>
                  <li>• Click any card to drill down</li>
                  <li>• Variance narrative explaining drivers</li>
                </>
              )}
              {tourStep === 1 && (
                <>
                  <li>• KPI detail with tabs: Overview, Drivers, Actions</li>
                  <li>• Reconciliation tab showing source vs. KPI total</li>
                  <li>• Click &ldquo;Lineage&rdquo; to see data flow</li>
                </>
              )}
              {tourStep === 2 && (
                <>
                  <li>• Scenario toggles (Base/Upside/Downside)</li>
                  <li>• Confidence bands on forecast</li>
                  <li>• Backtest results with error metrics</li>
                </>
              )}
              {tourStep === 3 && (
                <>
                  <li>• Full KPI dictionary with search</li>
                  <li>• Data quality dashboard</li>
                  <li>• Permissions matrix by role</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={tourStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button onClick={handleNext} className="gap-1">
            {tourStep === steps.length - 1 ? 'Finish' : 'Next'}
            {tourStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
