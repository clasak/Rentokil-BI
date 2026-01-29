"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground mb-4", className)}
    >
      <Link
        href="/"
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="flex items-center space-x-1.5 hover:text-foreground transition-colors"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  "flex items-center space-x-1.5",
                  isLast && "text-foreground font-medium"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// Mobile-responsive breadcrumb that collapses to show only last 2 items on small screens
export function ResponsiveBreadcrumb({ items, className }: BreadcrumbProps) {
  const showCollapsed = items.length > 2

  return (
    <>
      {/* Full breadcrumb on medium screens and up */}
      <div className="hidden md:block">
        <Breadcrumb items={items} className={className} />
      </div>

      {/* Collapsed breadcrumb on small screens */}
      <div className="md:hidden">
        {showCollapsed ? (
          <Breadcrumb
            items={[
              { label: "...", href: "/" },
              items[items.length - 1],
            ]}
            className={className}
          />
        ) : (
          <Breadcrumb items={items} className={className} />
        )}
      </div>
    </>
  )
}
