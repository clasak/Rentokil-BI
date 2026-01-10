import { ReactNode } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { AlphaFeedback } from '@/components/features/AlphaFeedback'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <>
      <MainLayout>
        {children}
      </MainLayout>
      <AlphaFeedback />
    </>
  )
}
