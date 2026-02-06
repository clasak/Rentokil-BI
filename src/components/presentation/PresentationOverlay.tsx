'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/store'
import { PRESENTATION_FLOW, type PresentationStep } from '@/lib/presentation-flow'
import { DemoConfigurator, type DemoConfigSelections } from '@/components/presentation/DemoConfigurator'
import {
  X, ChevronLeft, ChevronRight, Play,
  Eye, StickyNote, ArrowRight,
} from 'lucide-react'

/**
 * Builds a self-contained HTML string for the presenter notes popup.
 * No React, no routing -- just styled HTML injected by the parent window.
 */
function renderNotesHTML(step: PresentationStep, stepIndex: number, totalSteps: number, activeTalkingPoint: number): string {
  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const talkingPointsHTML = step.talkingPoints
    .map((tp, i) => {
      const isActive = i === activeTalkingPoint
      const bgStyle = isActive ? 'background:#1e3a8a;border-radius:6px;padding:8px 10px;margin:-4px -6px;' : 'padding:4px 6px;margin:-4px -6px;border-radius:6px;'
      const hoverStyle = isActive ? '' : 'onmouseover="this.style.background=\'#1f2937\'" onmouseout="this.style.background=\'transparent\'"'
      const textStyle = isActive ? 'color:#bfdbfe;font-size:15px;' : 'color:#d1d5db;'
      return `<div style="display:flex;gap:10px;margin-bottom:12px;cursor:pointer;${bgStyle}" ${hoverStyle} onclick="var idx=${i};if(window.opener&&window.opener.presenterControls){setTimeout(function(){window.opener.presenterControls.setTalkingPoint(idx)},0)}"><span style="color:${isActive ? '#93c5fd' : '#60a5fa'};font-weight:700;flex-shrink:0;">${i + 1}.</span><span style="${textStyle}line-height:1.6;">${escHtml(tp)}</span></div>`
    })
    .join('')

  const audienceHTML = step.audienceResonance
    .map(a => `<div style="display:flex;gap:8px;margin-bottom:8px;font-size:12px;color:#9ca3af;"><span style="color:#22c55e;flex-shrink:0;">&#9678;</span><span>${escHtml(a)}</span></div>`)
    .join('')

  const drillHTML = step.drillRoute
    ? `<div style="margin-top:16px;padding:10px 12px;background:#451a03;border:1px solid #78350f;border-radius:8px;">
        <div style="font-size:11px;font-weight:600;color:#fbbf24;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Drill Down</div>
        <div style="font-size:13px;color:#fde68a;">Navigate to ${escHtml(step.drillRoute)}</div>
       </div>`
    : ''

  const avoidHTML = step.avoidNotes && step.avoidNotes.length > 0
    ? `<div style="margin-top:16px;padding:10px 12px;background:#450a0a;border:1px solid #991b1b;border-radius:8px;">
        <div style="font-size:11px;font-weight:600;color:#f87171;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">&#9888; Avoid</div>
        ${step.avoidNotes.map(n => `<div style="font-size:13px;color:#fca5a5;">${escHtml(n)}</div>`).join('')}
       </div>`
    : ''

  // Progress dots
  const dots = Array.from({ length: totalSteps }, (_, i) => {
    const color = i === stepIndex ? '#3b82f6' : i < stepIndex ? '#1e40af' : '#374151'
    return `<div style="flex:1;height:6px;border-radius:3px;background:${color};"></div>`
  }).join('')

  return `<!DOCTYPE html>
<html><head><title>Presenter Notes</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#111827; color:#e5e7eb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:14px; padding:20px; overflow-y:auto; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:#1f2937; }
  ::-webkit-scrollbar-thumb { background:#4b5563; border-radius:3px; }
</style></head>
<body>
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
    <div style="width:36px;height:36px;border-radius:50%;background:#2563eb;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">
      ${stepIndex + 1}
    </div>
    <div>
      <div style="font-weight:600;font-size:16px;color:#f3f4f6;">${escHtml(step.title)}</div>
      <div style="font-size:12px;color:#6b7280;">${escHtml(step.subtitle)}</div>
    </div>
  </div>

  <!-- Progress -->
  <div style="display:flex;gap:4px;margin-bottom:20px;">${dots}</div>

  <!-- Business Question -->
  <div style="padding:12px;background:#172554;border:1px solid #1e3a8a;border-radius:8px;margin-bottom:16px;">
    <div style="font-size:11px;font-weight:600;color:#60a5fa;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Business Question</div>
    <div style="font-size:14px;font-weight:600;color:#bfdbfe;">${escHtml(step.businessQuestion)}</div>
  </div>

  <!-- Talking Points -->
  <div style="margin-bottom:16px;">
    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Talking Points <span style="color:#60a5fa;font-size:10px;">(Press T to cycle)</span></div>
    ${talkingPointsHTML}
  </div>

  <!-- Audience Resonance -->
  <div style="margin-bottom:16px;">
    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Audience Resonance</div>
    ${audienceHTML}
  </div>

  <!-- Positioning -->
  <div style="padding:12px;background:#052e16;border:1px solid #166534;border-radius:8px;margin-bottom:4px;">
    <div style="font-size:11px;font-weight:600;color:#4ade80;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Positioning</div>
    <div style="font-size:13px;color:#bbf7d0;line-height:1.6;">${escHtml(step.positioning)}</div>
  </div>

  ${drillHTML}
  ${avoidHTML}

  <!-- Transition -->
  ${step.transition ? `<div style="margin-top:16px;padding:12px;background:#1f2937;border:1px solid #374151;border-radius:8px;">
    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Transition to Next</div>
    <div style="font-size:13px;color:#9ca3af;font-style:italic;line-height:1.6;">&ldquo;${escHtml(step.transition)}&rdquo;</div>
  </div>` : ''}

  <!-- Navigation Controls -->
  <div style="margin-top:20px;padding-top:16px;border-top:1px solid #374151;display:flex;align-items:center;gap:8px;">
    <button onclick="if(window.opener&&window.opener.presenterControls){setTimeout(function(){window.opener.presenterControls.prevStep()},0)}" ${stepIndex === 0 ? 'disabled' : ''} style="padding:6px 14px;font-size:13px;font-weight:600;background:${stepIndex === 0 ? '#1f2937' : '#374151'};color:${stepIndex === 0 ? '#4b5563' : '#e5e7eb'};border:1px solid ${stepIndex === 0 ? '#374151' : '#4b5563'};border-radius:6px;cursor:${stepIndex === 0 ? 'not-allowed' : 'pointer'};">&larr; Prev</button>
    <button onclick="if(window.opener&&window.opener.presenterControls){setTimeout(function(){window.opener.presenterControls.nextStep()},0)}" ${stepIndex >= totalSteps - 1 ? 'disabled' : ''} style="padding:6px 14px;font-size:13px;font-weight:600;background:${stepIndex >= totalSteps - 1 ? '#1f2937' : '#2563eb'};color:${stepIndex >= totalSteps - 1 ? '#4b5563' : '#ffffff'};border:1px solid ${stepIndex >= totalSteps - 1 ? '#374151' : '#3b82f6'};border-radius:6px;cursor:${stepIndex >= totalSteps - 1 ? 'not-allowed' : 'pointer'};">Next &rarr;</button>
    ${step.drillRoute ? `<button onclick="if(window.opener&&window.opener.presenterControls){setTimeout(function(){window.opener.presenterControls.drill('${escHtml(step.drillRoute)}')},0)}" style="padding:6px 14px;font-size:13px;font-weight:600;background:#451a03;color:#fbbf24;border:1px solid #78350f;border-radius:6px;cursor:pointer;margin-left:auto;">Drill &rarr;</button>` : ''}
  </div>
</body></html>`
}

/**
 * PresentationOverlay
 *
 * Renders NOTHING when presentationModeEnabled === false.
 * No event listeners, no DOM elements, no performance impact.
 *
 * When enabled, provides:
 * - DemoConfigurator modal (pre-tour context gathering)
 * - Floating control bar (bottom center) for starting guided tour + spotlight toggle
 * - Popout presenter notes window (only visible on presenter's screen)
 * - Spotlight overlay (mouse-following radial gradient dimmer)
 * - Element highlight ring (blue pulsing border on focused elements)
 * - Sub-step navigation via T key and dot indicators
 * - Drill-down button for steps with drillRoute
 * - Keyboard shortcuts: Arrow keys (nav), S (spotlight), T (talking points), Esc (exit)
 */
export function PresentationOverlay() {
  const {
    presentationModeEnabled,
    setPresentationModeEnabled,
    presentationGuidedActive,
    setPresentationGuidedActive,
    presentationGuidedStep,
    setPresentationGuidedStep,
    nextPresentationGuidedStep,
    prevPresentationGuidedStep,
    presentationManualTool,
    setPresentationManualTool,
    presentationSpotlightIntensity,
    presentationTalkingPointIndex,
    setPresentationTalkingPointIndex,
    setDemoConfigSelections,
  } = useAppStore()

  const router = useRouter()
  const pathname = usePathname()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [highlightRect, setHighlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const notesWindowRef = useRef<Window | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Expose control functions on window for popup communication
  useEffect(() => {
    if (!presentationModeEnabled) return
    const win = window as unknown as Record<string, unknown>
    win.presenterControls = {
      setTalkingPoint: (index: number) => setPresentationTalkingPointIndex(index),
      nextStep: () => nextPresentationGuidedStep(),
      prevStep: () => prevPresentationGuidedStep(),
      drill: (route: string) => router.push(route),
    }
    return () => {
      delete win.presenterControls
    }
  }, [presentationModeEnabled, setPresentationTalkingPointIndex, nextPresentationGuidedStep, prevPresentationGuidedStep, router])

  // Compute current focus target
  const currentFocus = useMemo(() => {
    if (!presentationGuidedActive) return null
    const step = PRESENTATION_FLOW[presentationGuidedStep]
    if (!step?.talkingPointFocus) return null
    return step.talkingPointFocus[presentationTalkingPointIndex] || null
  }, [presentationGuidedActive, presentationGuidedStep, presentationTalkingPointIndex])

  // Track and highlight focused element
  useEffect(() => {
    if (!currentFocus) { setHighlightRect(null); return }
    let scrolled = false
    const updatePosition = (shouldScroll: boolean) => {
      const el = document.getElementById(currentFocus.elementId)
      if (el) {
        const rect = el.getBoundingClientRect()
        setHighlightRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
        if (shouldScroll && !scrolled && currentFocus.scrollIntoView !== false) {
          scrolled = true
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        }
      } else {
        setHighlightRect(null)
      }
    }
    // Position immediately for rect, but delay scroll to let elements render
    updatePosition(false)
    const timers = [
      setTimeout(() => updatePosition(true), 300),
      setTimeout(() => updatePosition(false), 600),
      setTimeout(() => updatePosition(false), 1200),
    ]
    const handler = () => updatePosition(false)
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler)
    }
  }, [currentFocus])

  // Open (or focus) the presenter notes popup
  const openPresenterNotes = useCallback(() => {
    if (notesWindowRef.current && !notesWindowRef.current.closed) {
      notesWindowRef.current.focus()
      return
    }
    const popup = window.open(
      '',
      'presenter-notes',
      'width=420,height=700,left=100,top=100,resizable=yes,scrollbars=yes'
    )
    if (popup) {
      notesWindowRef.current = popup
      const step = PRESENTATION_FLOW[presentationGuidedStep] || PRESENTATION_FLOW[0]
      popup.document.open()
      popup.document.write(renderNotesHTML(step, presentationGuidedStep, PRESENTATION_FLOW.length, presentationTalkingPointIndex))
      popup.document.close()
    }
  }, [presentationGuidedStep, presentationTalkingPointIndex])

  // Update popup content when step or talking point changes
  useEffect(() => {
    if (!presentationGuidedActive || !mounted || !presentationModeEnabled) return
    if (!notesWindowRef.current || notesWindowRef.current.closed) return
    const step = PRESENTATION_FLOW[presentationGuidedStep] || PRESENTATION_FLOW[0]
    notesWindowRef.current.document.open()
    notesWindowRef.current.document.write(renderNotesHTML(step, presentationGuidedStep, PRESENTATION_FLOW.length, presentationTalkingPointIndex))
    notesWindowRef.current.document.close()
  }, [presentationGuidedStep, presentationTalkingPointIndex, presentationGuidedActive, mounted, presentationModeEnabled])

  // Close popup when guided mode ends
  useEffect(() => {
    if (!presentationGuidedActive && notesWindowRef.current && !notesWindowRef.current.closed) {
      notesWindowRef.current.close()
      notesWindowRef.current = null
    }
  }, [presentationGuidedActive])

  // Navigate to step route when guided step changes (skip empty routes for closing step)
  useEffect(() => {
    if (!presentationGuidedActive || !mounted || !presentationModeEnabled) return
    const step = PRESENTATION_FLOW[presentationGuidedStep]
    if (step && step.route && step.route !== pathname) {
      router.push(step.route)
    }
  }, [presentationGuidedStep, presentationGuidedActive, mounted, presentationModeEnabled, router, pathname])

  // Mouse tracking for spotlight
  useEffect(() => {
    if (!presentationModeEnabled || presentationManualTool !== 'spotlight') return
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [presentationModeEnabled, presentationManualTool])

  // Keyboard shortcuts - only registered when enabled
  useEffect(() => {
    if (!presentationModeEnabled) return
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const state = useAppStore.getState()

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          if (state.presentationGuidedActive) {
            e.preventDefault()
            const maxStep = PRESENTATION_FLOW.length - 1
            if (state.presentationGuidedStep < maxStep) {
              state.setPresentationGuidedStep(state.presentationGuidedStep + 1)
            }
          }
          break
        case 'ArrowLeft':
          if (state.presentationGuidedActive) {
            e.preventDefault()
            if (state.presentationGuidedStep > 0) {
              state.setPresentationGuidedStep(state.presentationGuidedStep - 1)
            }
          }
          break
        case 'Escape':
          if (state.presentationGuidedActive) {
            state.setPresentationGuidedActive(false)
          } else if (state.presentationManualTool !== 'none') {
            state.setPresentationManualTool('none')
          }
          break
        case 's':
        case 'S':
          state.setPresentationManualTool(
            state.presentationManualTool === 'spotlight' ? 'none' : 'spotlight'
          )
          break
        case 't':
        case 'T': {
          if (state.presentationGuidedActive) {
            e.preventDefault()
            const step = PRESENTATION_FLOW[state.presentationGuidedStep]
            const max = step.talkingPoints.length - 1
            const next = state.presentationTalkingPointIndex < max
              ? state.presentationTalkingPointIndex + 1 : 0
            state.setPresentationTalkingPointIndex(next)
          }
          break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [presentationModeEnabled])

  // ZERO IMPACT: Don't render anything when disabled
  if (!mounted || !presentationModeEnabled) return null

  const currentStep = PRESENTATION_FLOW[presentationGuidedStep] || PRESENTATION_FLOW[0]
  const canGoNext = presentationGuidedStep < PRESENTATION_FLOW.length - 1
  const canGoPrev = presentationGuidedStep > 0

  const handleStartGuided = () => {
    setShowConfigurator(true)
  }

  const handleConfiguratorStart = (selections: DemoConfigSelections) => {
    setDemoConfigSelections(selections)
    setShowConfigurator(false)
    // Start the guided tour
    setPresentationGuidedActive(true)
    setPresentationGuidedStep(0)
    router.push(PRESENTATION_FLOW[0].route)
    // Open notes popup on the user gesture (avoids popup blockers)
    setTimeout(() => {
      const popup = window.open(
        '',
        'presenter-notes',
        'width=420,height=700,left=100,top=100,resizable=yes,scrollbars=yes'
      )
      if (popup) {
        notesWindowRef.current = popup
        const step = PRESENTATION_FLOW[0]
        popup.document.open()
        popup.document.write(renderNotesHTML(step, 0, PRESENTATION_FLOW.length, 0))
        popup.document.close()
      }
    }, 0)
  }

  const handleNextStep = () => {
    if (canGoNext) {
      setPresentationGuidedStep(presentationGuidedStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (canGoPrev) {
      setPresentationGuidedStep(presentationGuidedStep - 1)
    }
  }

  const handleExitPresentationMode = () => {
    setPresentationGuidedActive(false)
    setPresentationManualTool('none')
    setPresentationModeEnabled(false)
  }

  const spotlightOpacity = {
    subtle: 0.3,
    medium: 0.5,
    prominent: 0.7,
  }[presentationSpotlightIntensity]

  return (
    <>
      {/* DemoConfigurator Modal */}
      <DemoConfigurator
        open={showConfigurator}
        onOpenChange={setShowConfigurator}
        onStart={handleConfiguratorStart}
      />

      {/* Spotlight Overlay */}
      {presentationManualTool === 'spotlight' && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity"
          style={{
            zIndex: 9998,
            background: `radial-gradient(circle 180px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, transparent 50%, rgba(0,0,0,${spotlightOpacity}) 100%)`,
          }}
        />
      )}

      {/* Element Highlight Ring + Page Dimming */}
      {presentationGuidedActive && highlightRect && (
        <>
          <style>{`
            @keyframes pres-pulse {
              0%, 100% { box-shadow: 0 0 0 2px rgba(59,130,246,0.3), 0 0 20px rgba(59,130,246,0.2); }
              50% { box-shadow: 0 0 0 4px rgba(59,130,246,0.5), 0 0 30px rgba(59,130,246,0.3); }
            }
          `}</style>
          {/* Clip-path dimming overlay */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: 9996,
              backgroundColor: 'rgba(0,0,0,0.7)',
              clipPath: `polygon(0% 0%, 0% 100%, ${highlightRect.left - 8}px 100%, ${highlightRect.left - 8}px ${highlightRect.top - 8}px, ${highlightRect.left + highlightRect.width + 8}px ${highlightRect.top - 8}px, ${highlightRect.left + highlightRect.width + 8}px ${highlightRect.top + highlightRect.height + 8}px, ${highlightRect.left - 8}px ${highlightRect.top + highlightRect.height + 8}px, ${highlightRect.left - 8}px 100%, 100% 100%, 100% 0%)`,
              transition: 'clip-path 0.5s ease',
            }}
          />
          <div
            className="fixed pointer-events-none"
            style={{
              zIndex: 9997,
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              borderRadius: '12px',
              border: '2px solid rgba(59,130,246,0.8)',
              animation: 'pres-pulse 2s infinite',
              transition: 'top 0.5s ease, left 0.5s ease, width 0.5s ease, height 0.5s ease',
            }}
          />
          {currentFocus?.label && (
            <div
              className="fixed pointer-events-none text-xs font-medium text-blue-400 bg-gray-900/90 px-2 py-1 rounded shadow-lg border border-blue-800/50"
              style={{
                zIndex: 9998,
                top: highlightRect.top - 32,
                left: highlightRect.left,
                transition: 'top 0.5s ease, left 0.5s ease',
              }}
            >
              {currentFocus.label}
            </div>
          )}
        </>
      )}

      {/* Bottom Control Bar */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-2xl border border-gray-700"
        style={{ zIndex: 9999 }}
      >
        {!presentationGuidedActive ? (
          <button
            onClick={handleStartGuided}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            Start Guided Tour
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevStep}
              disabled={!canGoPrev}
              className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-400 font-medium px-1">
              {presentationGuidedStep + 1}/{PRESENTATION_FLOW.length}
            </span>
            <button
              onClick={handleNextStep}
              disabled={!canGoNext}
              className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Talking Point Dots */}
            {currentStep.talkingPoints.length > 1 && (
              <div className="flex items-center gap-0.5 px-1">
                {currentStep.talkingPoints.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPresentationTalkingPointIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === presentationTalkingPointIndex ? 'bg-blue-400' : 'bg-gray-500 hover:bg-gray-400'
                    }`}
                    title={`Talking point ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Drill Button */}
            {currentStep.drillRoute && (
              <>
                <div className="w-px h-5 bg-gray-600" />
                <button
                  onClick={() => router.push(currentStep.drillRoute!)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                  title={`Navigate to ${currentStep.drillRoute}`}
                >
                  <ArrowRight className="h-3 w-3" />
                  Drill
                </button>
              </>
            )}
          </div>
        )}

        <div className="w-px h-5 bg-gray-600" />

        {/* Notes Button (only in guided mode) */}
        {presentationGuidedActive && (
          <>
            <button
              onClick={openPresenterNotes}
              className="p-1.5 text-gray-400 hover:text-white rounded-full transition-colors"
              title="Open Presenter Notes"
            >
              <StickyNote className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-gray-600" />
          </>
        )}

        {/* Spotlight Toggle */}
        <button
          onClick={() => setPresentationManualTool(
            presentationManualTool === 'spotlight' ? 'none' : 'spotlight'
          )}
          className={`p-1.5 rounded-full transition-colors ${
            presentationManualTool === 'spotlight'
              ? 'text-yellow-400 bg-yellow-400/20'
              : 'text-gray-400 hover:text-white'
          }`}
          title="Toggle Spotlight (S)"
        >
          <Eye className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-gray-600" />

        {/* Exit */}
        <button
          onClick={handleExitPresentationMode}
          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
          title="Exit Presentation Mode"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
