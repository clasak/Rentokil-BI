'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, TrendingUp, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { SalesforceAccount } from '@/lib/bigquery/queries/salesforce'

interface AccountCardProps {
  account: SalesforceAccount
}

export function AccountCard({ account }: AccountCardProps) {
  const cityState = [account.billing_city, account.billing_state]
    .filter(Boolean)
    .join(', ')

  return (
    <Link href={`/ae/accounts/${account.account_id}`}>
      <Card className="hover:border-blue-500 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">{account.account_name}</h3>
            </div>
            {account.strategic_account && (
              <Badge variant="default" className="bg-purple-500">
                Strategic
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Industry & Location */}
          <div className="flex flex-col gap-1 text-sm">
            {account.industry && (
              <div className="text-muted-foreground">{account.industry}</div>
            )}
            {cityState && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {cityState}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="font-medium">{account.opportunity_count}</span>
              <span className="text-muted-foreground">opps</span>
            </div>
            {account.number_of_locations > 0 && (
              <div className="text-muted-foreground">
                {account.number_of_locations} locations
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            {account.national_account && (
              <Badge variant="secondary">National</Badge>
            )}
            {account.pestpac_id && (
              <Badge variant="outline" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                PestPac
              </Badge>
            )}
            {account.brand && (
              <Badge variant="outline">{account.brand}</Badge>
            )}
          </div>

          {/* Last Activity */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last activity: {account.last_activity_date}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
