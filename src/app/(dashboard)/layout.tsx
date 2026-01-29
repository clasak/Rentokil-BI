'use client'

import { ReactNode } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { AlphaFeedback } from '@/components/features/AlphaFeedback'
import { DemoSpotlight } from '@/components/features/DemoSpotlight'
import { TestModeBanner } from '@/components/layout/TestModeBanner'
import { CommandMenu } from '@/components/layout/CommandMenu'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { KeyboardShortcutsProvider } from '@/components/keyboard-shortcuts/KeyboardShortcutsProvider'
import { KeyboardShortcutBadge } from '@/components/keyboard-shortcuts/KeyboardShortcutBadge'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthProvider>
      <KeyboardShortcutsProvider>
        <TestModeBanner />
        <MainLayout>
          {children}
        </MainLayout>
        <CommandMenu />
        <AlphaFeedback />
        <DemoSpotlight />
        <KeyboardShortcutBadge />
      </KeyboardShortcutsProvider>
    </AuthProvider>
  )
}
