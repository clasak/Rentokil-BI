"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/store'
import { CommandPalette } from './CommandPalette'
import { ShortcutsHelp } from './ShortcutsHelp'

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { refreshData } = useAppStore()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [gPressed, setGPressed] = useState(false)

  // Handle global keyboard shortcuts
  useEffect(() => {
    let gPressTimeout: NodeJS.Timeout

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except special cases)
      const target = event.target as HTMLElement
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // Command Palette: ⌘K / Ctrl+K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(true)
        return
      }

      // Help: ? (when not in input)
      if (event.key === '?' && !isInputField && !event.shiftKey) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('show-shortcuts-help'))
        return
      }

      // Don't process other shortcuts when typing
      if (isInputField) return

      // Navigation shortcuts (G followed by key)
      if (event.key.toLowerCase() === 'g' && !gPressed) {
        event.preventDefault()
        setGPressed(true)
        // Reset G state after 2 seconds
        gPressTimeout = setTimeout(() => setGPressed(false), 2000)
        return
      }

      // Handle G + key navigation
      if (gPressed) {
        event.preventDefault()
        clearTimeout(gPressTimeout)
        setGPressed(false)

        switch (event.key.toLowerCase()) {
          case 'h': router.push('/'); break
          case 's': router.push('/sales'); break
          case 'o': router.push('/ops'); break
          case 'f': router.push('/finance'); break
          case 'p': router.push('/people'); break
          case 'g': router.push('/governance'); break
        }
        return
      }

      // Refresh: R
      if (event.key.toLowerCase() === 'r' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        refreshData()
        window.location.reload()
        return
      }

      // Search: /
      if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(gPressTimeout)
    }
  }, [router, refreshData, gPressed])

  // Visual feedback for G key press
  useEffect(() => {
    if (gPressed) {
      // Create a temporary notification
      const notification = document.createElement('div')
      notification.textContent = 'Press a key: H (Home) • S (Sales) • O (Ops) • F (Finance) • P (People) • G (Governance)'
      notification.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-4 py-2 rounded-lg shadow-lg z-[9999] transition-opacity'
      document.body.appendChild(notification)

      return () => {
        notification.style.opacity = '0'
        setTimeout(() => document.body.removeChild(notification), 200)
      }
    }
  }, [gPressed])

  return (
    <>
      {children}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <ShortcutsHelp />
    </>
  )
}
