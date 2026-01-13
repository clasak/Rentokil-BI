"use client"

import { ReactNode, useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { DataQualityBanner } from '@/components/features/DataQualityBanner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Tutorial } from '@/components/features/Tutorial'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar - slides in from left */}
        <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} isMobile />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            mobileMenuOpen={mobileMenuOpen}
          />
          <DataQualityBanner />
          {/* Main content with bottom padding for mobile nav */}
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 pb-24 lg:pb-6 dark:bg-gray-950">
            {children}
          </main>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <BottomNavigation />
      </div>
      {/* Tutorial overlay */}
      <Tutorial />
    </TooltipProvider>
  )
}
