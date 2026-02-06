'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'

interface SalesRepData {
  id: string
  name: string
  revenue: number
  deals: number
  winRate: number
  previousRank: number
  currentRank?: number
  region?: string
  avatar?: string
}

interface SalesLadderProps {
  data?: SalesRepData[]
  title?: string
  showTop?: number
  sortBy?: 'revenue' | 'deals' | 'winRate'
}

const defaultData: SalesRepData[] = [
  { id: '1', name: 'Sarah Johnson', revenue: 285000, deals: 42, winRate: 68, previousRank: 2, region: 'Northeast' },
  { id: '2', name: 'Michael Chen', revenue: 268000, deals: 38, winRate: 72, previousRank: 1, region: 'West' },
  { id: '3', name: 'Emily Rodriguez', revenue: 245000, deals: 35, winRate: 65, previousRank: 5, region: 'Southeast' },
  { id: '4', name: 'James Wilson', revenue: 232000, deals: 40, winRate: 58, previousRank: 3, region: 'Midwest' },
  { id: '5', name: 'Amanda Foster', revenue: 218000, deals: 32, winRate: 71, previousRank: 6, region: 'Northeast' },
  { id: '6', name: 'David Kim', revenue: 205000, deals: 28, winRate: 75, previousRank: 4, region: 'West' },
  { id: '7', name: 'Jessica Martinez', revenue: 198000, deals: 31, winRate: 62, previousRank: 8, region: 'Southeast' },
  { id: '8', name: 'Robert Taylor', revenue: 185000, deals: 27, winRate: 67, previousRank: 7, region: 'Midwest' },
  { id: '9', name: 'Lisa Anderson', revenue: 172000, deals: 25, winRate: 70, previousRank: 10, region: 'Northeast' },
  { id: '10', name: 'Kevin Brown', revenue: 165000, deals: 24, winRate: 63, previousRank: 9, region: 'West' },
]

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value}`
}

const getRankChangeIcon = (current: number, previous: number) => {
  const diff = previous - current
  if (diff > 0) {
    return (
      <span className="flex items-center text-green-600 dark:text-green-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        <span className="text-xs ml-0.5">{diff}</span>
      </span>
    )
  } else if (diff < 0) {
    return (
      <span className="flex items-center text-red-600 dark:text-red-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-xs ml-0.5">{Math.abs(diff)}</span>
      </span>
    )
  }
  return (
    <span className="flex items-center text-gray-400 dark:text-gray-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    </span>
  )
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getRankBadgeColor = (rank: number) => {
  if (rank === 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
  if (rank === 2) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
  if (rank === 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700'
  return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
}

export function SalesLadder({
  data = defaultData,
  title = 'Sales Rep Leaderboard',
  showTop = 10,
  sortBy = 'revenue',
}: SalesLadderProps) {
  const [activeSortBy, setActiveSortBy] = useState(sortBy)

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      switch (activeSortBy) {
        case 'deals':
          return b.deals - a.deals
        case 'winRate':
          return b.winRate - a.winRate
        case 'revenue':
        default:
          return b.revenue - a.revenue
      }
    }).slice(0, showTop)

    return sorted.map((rep, index) => ({
      ...rep,
      currentRank: index + 1,
    }))
  }, [data, activeSortBy, showTop])

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['revenue', 'deals', 'winRate'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setActiveSortBy(option)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeSortBy === option
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {option === 'winRate' ? 'Win Rate' : option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rep</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deals</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Win Rate</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((rep) => (
              <tr
                key={rep.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border ${getRankBadgeColor(rep.currentRank || 0)}`}>
                    {rep.currentRank}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {rep.avatar ? (
                        <Image className="h-10 w-10 rounded-full" src={rep.avatar} alt={rep.name} width={40} height={40} />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {getInitials(rep.name)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{rep.name}</p>
                      {rep.region && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{rep.region}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className={`text-sm font-semibold ${activeSortBy === 'revenue' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {formatCurrency(rep.revenue)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className={`text-sm font-semibold ${activeSortBy === 'deals' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {rep.deals}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className={`text-sm font-semibold ${activeSortBy === 'winRate' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {rep.winRate}%
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {getRankChangeIcon(rep.currentRank || 0, rep.previousRank)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SalesLadder
