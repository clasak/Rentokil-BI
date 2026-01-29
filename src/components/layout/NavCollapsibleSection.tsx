"use client"

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavSection } from '@/lib/navigation-config'
import { Role } from '@/types'

interface NavCollapsibleSectionProps {
  section: NavSection
  currentRole: Role
  isCollapsed: boolean
  isExpanded: boolean
  onToggle: (sectionName: string) => void
  isPreview?: boolean
  onNavigate?: () => void
}

/**
 * Shared collapsible navigation section component
 * Used by Sidebar for RTX Reports sections
 * Memoized for performance optimization
 */
export const NavCollapsibleSection = memo(function NavCollapsibleSection({
  section,
  currentRole,
  isCollapsed,
  isExpanded,
  onToggle,
  isPreview = false,
  onNavigate,
}: NavCollapsibleSectionProps) {
  const pathname = usePathname()

  // Check if any child route is active in this section
  const isSectionActive = () => {
    return section.children.some(child =>
      pathname === child.href ||
      (child.href !== '/' && !child.href.includes('?') && pathname.startsWith(child.href))
    )
  }

  const sectionIsActive = isSectionActive()
  const SectionIcon = section.icon

  // Filter sections by role
  if (section.allowedRoles && !section.allowedRoles.includes(currentRole)) {
    return null
  }

  return (
    <div className="space-y-1">
      {/* Section Header Button */}
      <button
        onClick={() => onToggle(section.name)}
        className={cn(
          'nav-item group w-full justify-between',
          sectionIsActive && 'bg-gray-100 dark:bg-gray-800',
          isCollapsed && 'justify-center px-2'
        )}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${section.name} section`}
      >
        <div className="flex items-center gap-3">
          <SectionIcon className={cn(
            'h-5 w-5 flex-shrink-0',
            sectionIsActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
          )} />
          {!isCollapsed && (
            <span className={cn(
              'text-sm font-medium',
              sectionIsActive ? 'text-primary' : 'text-gray-700 dark:text-gray-200'
            )}>
              {section.name}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform duration-200',
            isExpanded && 'transform rotate-180'
          )} />
        )}
      </button>

      {/* Section Children (when expanded) */}
      {!isCollapsed && isExpanded && (
        <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 space-y-1">
          {section.children.map((child) => {
            const isChildActive = pathname === child.href ||
              (child.href !== '/' && !child.href.includes('?') && pathname.startsWith(child.href))
            const ChildIcon = child.icon

            const childClassName = cn(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
              isChildActive && !isPreview
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              isPreview && 'cursor-default'
            )

            const childContent = (
              <>
                {ChildIcon && (
                  <ChildIcon className={cn(
                    'h-4 w-4',
                    isChildActive && !isPreview ? 'text-primary' : 'text-gray-400'
                  )} />
                )}
                {child.name}
              </>
            )

            // In preview mode, render as div instead of Link
            if (isPreview) {
              return (
                <div key={child.href} className={childClassName}>
                  {childContent}
                </div>
              )
            }

            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={childClassName}
              >
                {childContent}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
})
