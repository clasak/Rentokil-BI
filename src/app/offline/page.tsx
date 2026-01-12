"use client"

import { WifiOff, RefreshCw, Home, Database, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-md">
        {/* Offline icon */}
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <WifiOff className="h-12 w-12 text-gray-500 dark:text-gray-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          It looks like you&apos;ve lost your internet connection.
          Check your connection and try again.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button
            onClick={handleRefresh}
            className="gap-2 h-12"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            asChild
            className="gap-2 h-12"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Available offline features */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
          <h2 className="font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Available While Offline
          </h2>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>View previously cached dashboard data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Access saved PDF documents</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Review KPI snapshots from last sync</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Changes will sync when you&apos;re back online</span>
            </li>
          </ul>
        </div>

        {/* Cached pages hint */}
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-6">
          <FileText className="h-3 w-3 inline mr-1" />
          Pages you&apos;ve visited before may still be available from cache
        </p>
      </div>
    </div>
  )
}
