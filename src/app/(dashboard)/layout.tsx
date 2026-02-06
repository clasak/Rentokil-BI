'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { MainLayout } from '@/components/layout/MainLayout'
import { AlphaFeedback } from '@/components/features/AlphaFeedback'
import { TestModeBanner } from '@/components/layout/TestModeBanner'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { KeyboardShortcutsProvider } from '@/components/keyboard-shortcuts/KeyboardShortcutsProvider'
import { KeyboardShortcutBadge } from '@/components/keyboard-shortcuts/KeyboardShortcutBadge'

// Lazy-load heavy components that are only used on demand
const DemoSpotlight = dynamic(() => import('@/components/features/DemoSpotlight').then(m => ({ default: m.DemoSpotlight })), { ssr: false })
const CommandMenu = dynamic(() => import('@/components/layout/CommandMenu').then(m => ({ default: m.CommandMenu })), { ssr: false })
const PresentationOverlay = dynamic(() => import('@/components/presentation/PresentationOverlay').then(m => ({ default: m.PresentationOverlay })), { ssr: false })

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
        <PresentationOverlay />
      </KeyboardShortcutsProvider>
    </AuthProvider>
  )
}
