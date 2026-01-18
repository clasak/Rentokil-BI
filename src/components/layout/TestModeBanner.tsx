"use client"

import { useState, useEffect } from 'react'
import { FlaskConical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore, type TestScenario } from '@/store'
import { TEST_SCENARIOS } from '@/lib/mock/testScenarios'

export function TestModeBanner() {
  const { testModeEnabled, testScenario, setTestModeEnabled } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render during SSR or if test mode is disabled
  if (!mounted || !testModeEnabled) {
    return null
  }

  const scenarioConfig = TEST_SCENARIOS[testScenario]

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-5 w-5" />
        <div className="flex items-center gap-2">
          <span className="font-semibold">Test Mode:</span>
          <span className="font-medium">{scenarioConfig.name}</span>
          <span className="text-amber-800 hidden sm:inline">
            - {scenarioConfig.description}
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setTestModeEnabled(false)}
        className="bg-white/90 hover:bg-white text-amber-900 gap-1.5"
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">Exit Test Mode</span>
      </Button>
    </div>
  )
}
