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
 *
 * Role Preview:
 * - When an admin is previewing a role, show the regular Sidebar with that role's navigation
 * - This allows admins to see exactly what a user in that role would see
 */
export function SidebarWrapper({ onNavigate, isMobile }: SidebarWrapperProps) {
  const [isClient, setIsClient] = useState(false)
  const { isAdmin, setIsAdmin, adminModeEnabled, isPreviewingRole, previewedRole } = useAppStore()
  const supabase = createClient()

  useEffect(() => {
    setIsClient(true)

    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          return
        }
        if (user?.email) {
          const userIsAdmin = isAdminEmail(user.email)
          setIsAdmin(userIsAdmin)
        }
      } catch (e) {
        // Silent error handling
      }
    }
    checkAdmin()
  }, [supabase, setIsAdmin])

  // Use default (regular sidebar) during SSR to avoid hydration mismatch
  if (!isClient) {
    return <Sidebar onNavigate={onNavigate} isMobile={isMobile} />
  }

  // When admin is previewing a role, show the role's sidebar instead of admin sidebar
  // This gives the admin the full experience of what that role sees
  if (isAdmin && adminModeEnabled && isPreviewingRole && previewedRole) {
    return <Sidebar onNavigate={onNavigate} isMobile={isMobile} previewRole={previewedRole} />
  }

  // Show AdminSidebar if user is admin AND has adminModeEnabled (and NOT previewing)
  if (isAdmin && adminModeEnabled) {
    return <AdminSidebar onNavigate={onNavigate} isMobile={isMobile} />
  }

  // Otherwise show regular role-based sidebar
  return <Sidebar onNavigate={onNavigate} isMobile={isMobile} />
}
