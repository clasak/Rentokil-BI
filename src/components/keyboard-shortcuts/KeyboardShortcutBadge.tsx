"use client"

import { useState, useEffect } from 'react'
import { HelpCircle, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Floating badge that promotes keyboard shortcuts
 * Shows "Press ? for shortcuts" and triggers the help modal
 */
export function KeyboardShortcutBadge() {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if user has dismissed the badge before
    const isDismissed = localStorage.getItem('keyboard-shortcut-badge-dismissed') === 'true'
    setDismissed(isDismissed)
  }, [])

  if (!mounted || dismissed) return null

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('show-shortcuts-help'))
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed(true)
    localStorage.setItem('keyboard-shortcut-badge-dismissed', 'true')
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="group relative">
        <Button
          onClick={handleClick}
          className="shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 text-white"
          size="lg"
        >
          <Keyboard className="h-5 w-5 mr-2" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold">Keyboard Shortcuts</span>
            <span className="text-xs opacity-90">Press ? to view all</span>
          </div>
        </Button>

        {/* Dismiss button - separate from Button to avoid nesting */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          title="Dismiss"
          aria-label="Dismiss keyboard shortcuts hint"
        >
          ×
        </button>
      </div>
    </div>
  )
}
