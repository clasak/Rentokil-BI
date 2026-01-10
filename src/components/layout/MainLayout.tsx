"use client"

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { DataQualityBanner } from '@/components/features/DataQualityBanner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Tutorial } from '@/components/features/Tutorial'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <DataQualityBanner />
          <main className="flex-1 overflow-auto p-6 dark:bg-gray-950">
            {children}
          </main>
        </div>
      </div>
      {/* Tutorial overlay */}
      <Tutorial />
    </TooltipProvider>
  )
}
