'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  BookOpen,
  Layers,
  BarChart3,
  HelpCircle,
  ArrowRight,
  Sparkles,
  FileText,
  Users,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react'

const HELP_SECTIONS = [
  {
    title: 'Getting Started',
    description: 'New to Rentokil BI? Learn how to navigate the platform, understand KPIs, and make the most of your dashboard.',
    href: '/help/getting-started',
    icon: BookOpen,
    badge: 'Start Here',
    badgeVariant: 'default' as const,
    topics: ['Login & Authentication', 'Dashboard Navigation', 'Understanding KPIs', 'Using Filters', 'Exporting Data']
  },
  {
    title: 'Modules',
    description: 'Explore all available modules including Leads, SALTI, Sales, Finance, HR, Termite, and Workforce management.',
    href: '/help/modules',
    icon: Layers,
    badge: '7 Modules',
    badgeVariant: 'secondary' as const,
    topics: ['Lead Service Engine', 'SALTI Analytics', 'Sales Dashboard', 'Finance & AR', 'HR & People', 'Operations']
  },
  {
    title: 'KPI Glossary',
    description: 'Complete reference of all KPI definitions, formulas, data sources, and calculation methodologies.',
    href: '/help/kpi-glossary',
    icon: BarChart3,
    badge: '60+ KPIs',
    badgeVariant: 'secondary' as const,
    topics: ['Revenue Metrics', 'Sales Metrics', 'Operations Metrics', 'Finance Metrics', 'Lead Funnel Metrics']
  },
  {
    title: 'FAQ',
    description: 'Frequently asked questions about data, calculations, permissions, troubleshooting, and best practices.',
    href: '/help/faq',
    icon: HelpCircle,
    badge: 'Popular',
    badgeVariant: 'outline' as const,
    topics: ['Data Sources', 'Calculations', 'Permissions', 'Troubleshooting', 'Best Practices']
  }
]

const QUICK_LINKS = [
  { label: 'What is a KPI?', href: '/help/kpi-glossary', icon: BarChart3 },
  { label: 'How do I export data?', href: '/help/getting-started#export', icon: FileText },
  { label: 'Understanding my role', href: '/help/faq#roles', icon: Users },
  { label: 'Data refresh schedule', href: '/help/faq#data', icon: TrendingUp },
  { label: 'Permission levels', href: '/help/faq#permissions', icon: Shield },
  { label: 'Keyboard shortcuts', href: '/help/faq#shortcuts', icon: Zap }
]

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSections = HELP_SECTIONS.filter(section => {
    const query = searchQuery.toLowerCase()
    return (
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.topics.some(topic => topic.toLowerCase().includes(query))
    )
  })

  const filteredQuickLinks = QUICK_LINKS.filter(link =>
    link.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold dark:text-gray-100">Help Center</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Welcome to the Rentokil BI Help Center. Find guides, documentation, and answers to help you get the most out of your dashboard.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {section.title}
                          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardTitle>
                      </div>
                    </div>
                    <Badge variant={section.badgeVariant}>{section.badge}</Badge>
                  </div>
                  <CardDescription className="mt-2">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {section.topics.map((topic) => (
                      <span
                        key={topic}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Links */}
      {(searchQuery === '' || filteredQuickLinks.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold dark:text-gray-100">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(searchQuery ? filteredQuickLinks : QUICK_LINKS).map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.label} href={link.href}>
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{link.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchQuery && filteredSections.length === 0 && filteredQuickLinks.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No results found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try searching with different keywords or browse the sections above.
          </p>
        </div>
      )}

      {/* Contact Support */}
      <Card className="bg-gray-50 dark:bg-gray-800/50 border-dashed">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium dark:text-gray-100">Need more help?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Contact your administrator or the BI support team for additional assistance.
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              bi-support@rentokil.com
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500">
        Rentokil BI Platform Help Center v1.0
      </div>
    </div>
  )
}
