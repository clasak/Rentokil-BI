"use client"

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { Sidebar } from './Sidebar'
import { AdminSidebar } from './AdminSidebar'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'

interface SidebarWrapperProps {
  onNavigate?: () => void
  isMobile?: boolean
}

/**
 * SidebarWrapper conditionally renders either the AdminSidebar or regular Sidebar
 * based on whether the user is an admin and has admin mode enabled.
 *
 * Admin detection:
 * - Check if user email is in admin list (via isAdminEmail)
 * - Store isAdmin state in Zustand
 * - Admin can toggle adminModeEnabled in settings to switch between admin and regular sidebar
 */
export function SidebarWrapper({ onNavigate, isMobile }: SidebarWrapperProps) {
  const [isClient, setIsClient] = useState(false)
  const { isAdmin, setIsAdmin, adminModeEnabled } = useAppStore()
  const supabase = createClient()

  useEffect(() => {
    setIsClient(true)

    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.log('SidebarWrapper: Error getting user:', error)
          return
        }
        if (user?.email) {
          const userIsAdmin = isAdminEmail(user.email)
          console.log('SidebarWrapper: Admin check -', { email: user.email, userIsAdmin })
          setIsAdmin(userIsAdmin)
        } else {
          console.log('SidebarWrapper: No user email found')
        }
      } catch (e) {
        console.log('SidebarWrapper: Exception checking admin:', e)
      }
    }
    checkAdmin()
  }, [supabase, setIsAdmin])

  // Use default (regular sidebar) during SSR to avoid hydration mismatch
  if (!isClient) {
    return <Sidebar onNavigate={onNavigate} isMobile={isMobile} />
  }

  // Show AdminSidebar if user is admin AND has adminModeEnabled
  if (isAdmin && adminModeEnabled) {
    return <AdminSidebar onNavigate={onNavigate} isMobile={isMobile} />
  }

  // Otherwise show regular role-based sidebar
  return <Sidebar onNavigate={onNavigate} isMobile={isMobile} />
}
