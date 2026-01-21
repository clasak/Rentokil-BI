"use client"

import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { HelpCircle, ExternalLink, BookOpen } from 'lucide-react'

interface GlossaryLinkProps {
  term: string
  definition: string
  formula?: string
  source?: string
  seeAlso?: string[]
  linkToGlossary?: boolean
  glossaryUrl?: string
  className?: string
  children?: React.ReactNode
}

export function GlossaryLink({
  term,
  definition,
  formula,
  source,
  seeAlso,
  linkToGlossary = true,
  glossaryUrl = '/governance/data-dictionary',
  className,
  children,
}: GlossaryLinkProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={cn(
            'inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-4',
            'text-primary hover:text-primary/80 transition-colors',
            className
          )}>
            {children || term}
            <HelpCircle className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          <div className="space-y-2">
            <p className="font-medium">{term}</p>
            <p className="text-sm text-muted-foreground">{definition}</p>
            {formula && (
              <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                {formula}
              </p>
            )}
            {linkToGlossary && (
              <Link
                href={`${glossaryUrl}?term=${encodeURIComponent(term)}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View in glossary
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Popover version with more detail
interface GlossaryPopoverProps {
  term: string
  definition: string
  formula?: string
  source?: string
  seeAlso?: string[]
  linkToGlossary?: boolean
  glossaryUrl?: string
  className?: string
  children?: React.ReactNode
}

export function GlossaryPopover({
  term,
  definition,
  formula,
  source,
  seeAlso,
  linkToGlossary = true,
  glossaryUrl = '/governance/data-dictionary',
  className,
  children,
}: GlossaryPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className={cn(
          'inline-flex items-center gap-1 cursor-pointer underline decoration-dotted underline-offset-4',
          'text-primary hover:text-primary/80 transition-colors',
          className
        )}>
          {children || term}
          <BookOpen className="h-3 w-3" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium">{term}</h4>
            <p className="text-sm text-muted-foreground mt-1">{definition}</p>
          </div>

          {formula && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Formula
              </p>
              <code className="block text-xs bg-muted px-2 py-1.5 rounded mt-1">
                {formula}
              </code>
            </div>
          )}

          {source && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Source
              </p>
              <p className="text-sm mt-1">{source}</p>
            </div>
          )}

          {seeAlso && seeAlso.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Related Terms
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {seeAlso.map((relatedTerm) => (
                  <Link
                    key={relatedTerm}
                    href={`${glossaryUrl}?term=${encodeURIComponent(relatedTerm)}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {relatedTerm}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {linkToGlossary && (
            <Link
              href={`${glossaryUrl}?term=${encodeURIComponent(term)}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View full definition
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Simple icon-only trigger
interface GlossaryIconProps {
  term: string
  definition: string
  className?: string
}

export function GlossaryIcon({ term, definition, className }: GlossaryIconProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <HelpCircle className={cn(
            'h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors inline-block',
            className
          )} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          <p className="font-medium">{term}</p>
          <p className="text-sm text-muted-foreground">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
