import { ReactNode } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { AlphaFeedback } from '@/components/features/AlphaFeedback'
import { DemoSpotlight } from '@/components/features/DemoSpotlight'
import { TestModeBanner } from '@/components/layout/TestModeBanner'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <>
      <TestModeBanner />
      <MainLayout>
        {children}
      </MainLayout>
      <AlphaFeedback />
      <DemoSpotlight />
    </>
  )
}
