"use client"

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface KeyboardShortcut {
  id: string
  key: string
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[]
  description: string
  action: () => void
  category: 'navigation' | 'actions' | 'search' | 'view'
  condition?: () => boolean // Optional condition to enable/disable shortcut
}

interface UseKeyboardShortcutsOptions {
  shortcuts?: KeyboardShortcut[]
  enabled?: boolean
}

/**
 * Hook to manage keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       id: 'save',
 *       key: 's',
 *       modifiers: ['meta'],
 *       description: 'Save changes',
 *       action: () => handleSave(),
 *       category: 'actions'
 *     }
 *   ]
 * })
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { shortcuts = [], enabled = true } = options
  const router = useRouter()
  const shortcutsRef = useRef(shortcuts)

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Exception: Allow Escape key in inputs
      if (event.key !== 'Escape') return
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

      const modifiersMatch = shortcut.modifiers?.every(modifier => {
        switch (modifier) {
          case 'ctrl': return event.ctrlKey
          case 'meta': return event.metaKey
          case 'shift': return event.shiftKey
          case 'alt': return event.altKey
          default: return false
        }
      }) ?? true

      // Check if extra modifiers are pressed
      const noExtraModifiers =
        (!event.ctrlKey || shortcut.modifiers?.includes('ctrl')) &&
        (!event.metaKey || shortcut.modifiers?.includes('meta')) &&
        (!event.shiftKey || shortcut.modifiers?.includes('shift')) &&
        (!event.altKey || shortcut.modifiers?.includes('alt'))

      // Check condition if present
      const conditionMet = shortcut.condition ? shortcut.condition() : true

      return keyMatch && modifiersMatch && noExtraModifiers && conditionMet
    })

    if (matchingShortcut) {
      event.preventDefault()
      matchingShortcut.action()
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])

  return { shortcuts: shortcutsRef.current }
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  const parts: string[] = []

  if (shortcut.modifiers?.includes('meta')) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (shortcut.modifiers?.includes('ctrl') && !shortcut.modifiers?.includes('meta')) {
    parts.push('Ctrl')
  }
  if (shortcut.modifiers?.includes('shift')) {
    parts.push('⇧')
  }
  if (shortcut.modifiers?.includes('alt')) {
    parts.push(isMac ? '⌥' : 'Alt')
  }

  parts.push(shortcut.key.toUpperCase())

  return parts.join(isMac ? '' : '+')
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
export function matchesShortcut(
  event: KeyboardEvent,
  key: string,
  modifiers: ('ctrl' | 'meta' | 'shift' | 'alt')[] = []
): boolean {
  const keyMatch = event.key.toLowerCase() === key.toLowerCase()

  const modifiersMatch = modifiers.every(modifier => {
    switch (modifier) {
      case 'ctrl': return event.ctrlKey
      case 'meta': return event.metaKey
      case 'shift': return event.shiftKey
      case 'alt': return event.altKey
      default: return false
    }
  })

  const noExtraModifiers =
    (!event.ctrlKey || modifiers.includes('ctrl')) &&
    (!event.metaKey || modifiers.includes('meta')) &&
    (!event.shiftKey || modifiers.includes('shift')) &&
    (!event.altKey || modifiers.includes('alt'))

  return keyMatch && modifiersMatch && noExtraModifiers
}
