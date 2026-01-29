"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Command, Search, Navigation, Zap, Settings, HelpCircle,
  Keyboard
} from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
  category: 'general' | 'navigation' | 'actions' | 'view'
}

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false)
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  // Listen for custom event to open help
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('show-shortcuts-help', handler)
    return () => window.removeEventListener('show-shortcuts-help', handler)
  }, [])

  const shortcuts: Shortcut[] = [
    // General
    {
      keys: [isMac ? '⌘' : 'Ctrl', 'K'],
      description: 'Open command palette',
      category: 'general'
    },
    {
      keys: ['?'],
      description: 'Show keyboard shortcuts',
      category: 'general'
    },
    {
      keys: ['Esc'],
      description: 'Close dialog or cancel',
      category: 'general'
    },
    {
      keys: ['/'],
      description: 'Focus search',
      category: 'general'
    },

    // Navigation
    {
      keys: ['G', 'H'],
      description: 'Go to Command Center',
      category: 'navigation'
    },
    {
      keys: ['G', 'S'],
      description: 'Go to Sales',
      category: 'navigation'
    },
    {
      keys: ['G', 'O'],
      description: 'Go to Operations',
      category: 'navigation'
    },
    {
      keys: ['G', 'F'],
      description: 'Go to Finance',
      category: 'navigation'
    },
    {
      keys: ['G', 'P'],
      description: 'Go to People',
      category: 'navigation'
    },
    {
      keys: ['G', 'G'],
      description: 'Go to Governance',
      category: 'navigation'
    },

    // Actions
    {
      keys: ['R'],
      description: 'Refresh data',
      category: 'actions'
    },
    {
      keys: [isMac ? '⌘' : 'Ctrl', 'R'],
      description: 'Hard refresh (clear cache)',
      category: 'actions'
    },
    {
      keys: [isMac ? '⌘' : 'Ctrl', 'P'],
      description: 'Print current page',
      category: 'actions'
    },

    // View
    {
      keys: [isMac ? '⌘' : 'Ctrl', '+'],
      description: 'Zoom in',
      category: 'view'
    },
    {
      keys: [isMac ? '⌘' : 'Ctrl', '-'],
      description: 'Zoom out',
      category: 'view'
    },
    {
      keys: [isMac ? '⌘' : 'Ctrl', '0'],
      description: 'Reset zoom',
      category: 'view'
    },
  ]

  const groupedShortcuts = {
    general: shortcuts.filter(s => s.category === 'general'),
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    actions: shortcuts.filter(s => s.category === 'actions'),
    view: shortcuts.filter(s => s.category === 'view'),
  }

  const ShortcutRow = ({ shortcut }: { shortcut: Shortcut }) => (
    <div className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-700 dark:text-gray-200">
        {shortcut.description}
      </span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <span key={index} className="flex items-center gap-1">
            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
              {key}
            </kbd>
            {index < shortcut.keys.length - 1 && (
              <span className="text-gray-400 text-xs">then</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate faster and boost your productivity
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general" className="gap-2">
              <Command className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="navigation" className="gap-2">
              <Navigation className="h-4 w-4" />
              Navigation
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <Zap className="h-4 w-4" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-2">
              <Settings className="h-4 w-4" />
              View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-1">
            {groupedShortcuts.general.map((shortcut, index) => (
              <ShortcutRow key={index} shortcut={shortcut} />
            ))}
          </TabsContent>

          <TabsContent value="navigation" className="mt-4 space-y-1">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> Navigation shortcuts use a two-key sequence. Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-blue-950 border rounded text-xs">G</kbd> followed by the destination key.
              </p>
            </div>
            {groupedShortcuts.navigation.map((shortcut, index) => (
              <ShortcutRow key={index} shortcut={shortcut} />
            ))}
          </TabsContent>

          <TabsContent value="actions" className="mt-4 space-y-1">
            {groupedShortcuts.actions.map((shortcut, index) => (
              <ShortcutRow key={index} shortcut={shortcut} />
            ))}
          </TabsContent>

          <TabsContent value="view" className="mt-4 space-y-1">
            {groupedShortcuts.view.map((shortcut, index) => (
              <ShortcutRow key={index} shortcut={shortcut} />
            ))}
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Pro Tips
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border rounded text-xs">{isMac ? '⌘' : 'Ctrl'} K</kbd> anytime to open the command palette and search for any action</li>
                <li>Use <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border rounded text-xs">Tab</kbd> and <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border rounded text-xs">Shift Tab</kbd> to navigate between interactive elements</li>
                <li>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border rounded text-xs">Esc</kbd> to close any dialog or cancel an action</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
