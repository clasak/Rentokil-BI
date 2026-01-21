'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface LearnMoreLinkProps {
  href: string
  children?: React.ReactNode
  external?: boolean
  variant?: 'inline' | 'standalone'
  className?: string
}

export function LearnMoreLink({
  href,
  children = 'Learn more',
  external = false,
  variant = 'inline',
  className = '',
}: LearnMoreLinkProps) {
  const baseStyles = 'text-blue-600 dark:text-blue-400 hover:underline'
  const variantStyles = variant === 'standalone' ? 'block py-2 px-3' : 'inline-flex items-center gap-1'
  const combinedStyles = `${baseStyles} ${variantStyles} ${className}`.trim()

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={combinedStyles}
      >
        {children}
        <ExternalLink size={12} className="inline-block ml-1" />
      </a>
    )
  }

  return (
    <Link href={href} className={combinedStyles}>
      {children}
    </Link>
  )
}
