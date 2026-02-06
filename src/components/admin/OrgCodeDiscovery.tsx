'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, RefreshCw, CheckCircle2 } from 'lucide-react'

interface DiscoveredCodes {
  summary: {
    total_markets: number
    total_regions: number
    total_branches: number
  }
  recommended_codes: {
    SAMPLE_MARKET: string
    SAMPLE_MARKET_NAME: string
    SAMPLE_REGION: string
    SAMPLE_REGION_NAME: string
    SAMPLE_BRANCH: string
    SAMPLE_BRANCH_NAME: string
  }
  sample_hierarchy: {
    market: string
    region: string
    branch: string
  } | null
  all_markets: Array<{
    code: string
    name: string
    regions: number
    branches: number
  }>
}

export function OrgCodeDiscovery() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DiscoveredCodes | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchCodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/organization/discover-codes')
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch codes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!data) return
    const code = `// Update these codes in src/store/index.ts (line ~224)
const SAMPLE_MARKET = '${data.recommended_codes.SAMPLE_MARKET}'  // ${data.recommended_codes.SAMPLE_MARKET_NAME}
const SAMPLE_REGION = '${data.recommended_codes.SAMPLE_REGION}'  // ${data.recommended_codes.SAMPLE_REGION_NAME}
const SAMPLE_BRANCH = '${data.recommended_codes.SAMPLE_BRANCH}'  // ${data.recommended_codes.SAMPLE_BRANCH_NAME}
`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Code Discovery</CardTitle>
        <CardDescription>
          Find the correct Market, Region, and Branch codes from your BigQuery data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={fetchCodes} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Discovering Codes...' : 'Discover Codes from BigQuery'}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {data.summary.total_markets}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Markets</div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {data.summary.total_regions}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">Regions</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {data.summary.total_branches}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">Branches</div>
              </div>
            </div>

            {/* Recommended Codes */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Recommended Preview User Codes</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-7"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="font-mono text-xs space-y-1 bg-white dark:bg-gray-900 p-3 rounded border">
                <div>
                  <span className="text-gray-500">const</span> SAMPLE_MARKET ={' '}
                  <span className="text-green-600">&apos;{data.recommended_codes.SAMPLE_MARKET}&apos;</span>
                  <span className="text-gray-400 ml-2">
                    {/* {data.recommended_codes.SAMPLE_MARKET_NAME} */}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">const</span> SAMPLE_REGION ={' '}
                  <span className="text-green-600">&apos;{data.recommended_codes.SAMPLE_REGION}&apos;</span>
                  <span className="text-gray-400 ml-2">
                    {/* {data.recommended_codes.SAMPLE_REGION_NAME} */}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">const</span> SAMPLE_BRANCH ={' '}
                  <span className="text-green-600">&apos;{data.recommended_codes.SAMPLE_BRANCH}&apos;</span>
                  <span className="text-gray-400 ml-2">
                    {/* {data.recommended_codes.SAMPLE_BRANCH_NAME} */}
                  </span>
                </div>
              </div>
            </div>

            {/* Sample Hierarchy */}
            {data.sample_hierarchy && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                <div className="font-medium mb-2">Sample Hierarchy Path:</div>
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-blue-600">Market</Badge>
                    <span>{data.sample_hierarchy.market}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="default" className="bg-purple-600">Region</Badge>
                    <span>{data.sample_hierarchy.region}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <Badge variant="default" className="bg-green-600">Branch</Badge>
                    <span>{data.sample_hierarchy.branch}</span>
                  </div>
                </div>
              </div>
            )}

            {/* All Markets */}
            <div>
              <h3 className="font-semibold text-sm mb-2">All Available Markets</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {data.all_markets.map((market, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-mono">
                      <span className="font-semibold">{market.code}</span>
                      <span className="text-gray-500 ml-2">-</span>
                      <span className="ml-2">{market.name}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>{market.regions}R</span>
                      <span>{market.branches}B</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
              <div className="font-semibold mb-1">Next Steps:</div>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Copy the recommended codes above</li>
                <li>
                  Open <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">src/store/index.ts</code>
                </li>
                <li>Find line ~224 with the <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">createPreviewUserForRole</code> function</li>
                <li>Replace the SAMPLE_MARKET, SAMPLE_REGION, and SAMPLE_BRANCH constants</li>
                <li>Save and refresh the page</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
