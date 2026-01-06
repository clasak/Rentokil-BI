"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getOpportunityById, getActivitiesByOpportunity, getUserById, getAccountById } from '@/lib/data'
import { Opportunity, Activity, Account, User } from '@/types'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  ArrowLeft, Building, User as UserIcon, Calendar, Clock,
  AlertTriangle, CheckCircle, Phone, Mail, MapPin, Zap
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export default function OpportunityDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [account, setAccount] = useState<Account | null>(null)
  const [owner, setOwner] = useState<User | null>(null)

  useEffect(() => {
    const opp = getOpportunityById(id)
    setOpportunity(opp || null)

    if (opp) {
      setActivities(getActivitiesByOpportunity(id))
      setAccount(getAccountById(opp.accountId) || null)
      setOwner(getUserById(opp.ownerId) || null)
    }
  }, [id])

  if (!opportunity) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Opportunity Not Found</h2>
          <Button asChild className="mt-4">
            <Link href="/sales">Back to Sales</Link>
          </Button>
        </div>
      </div>
    )
  }

  const stageProgress: Record<string, number> = {
    prospect: 20,
    qualified: 40,
    proposal: 60,
    negotiation: 80,
    closed_won: 100,
    closed_lost: 0,
  }

  const getNextBestAction = (): string => {
    if (opportunity.isStalled) {
      if (opportunity.daysInStage > 30) {
        return 'Schedule executive sponsor call to unblock this opportunity'
      }
      return 'Follow up with decision maker - no activity in 14+ days'
    }
    if (opportunity.stage === 'prospect') {
      return 'Qualify budget, authority, need, and timeline (BANT)'
    }
    if (opportunity.stage === 'qualified') {
      return 'Prepare and send formal proposal with pricing options'
    }
    if (opportunity.stage === 'proposal') {
      return 'Schedule demo or site visit to address concerns'
    }
    if (opportunity.stage === 'negotiation') {
      return 'Finalize contract terms and get verbal commitment'
    }
    return 'Review opportunity and update next steps'
  }

  const riskReasons: string[] = []
  if (opportunity.isStalled) riskReasons.push('Stalled - no activity in 14+ days')
  if (opportunity.daysInStage > 21) riskReasons.push(`In current stage for ${opportunity.daysInStage} days`)
  if (!opportunity.nextStepDate) riskReasons.push('Missing next step date')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{opportunity.name}</h1>
              <Badge variant={
                opportunity.stage === 'closed_won' ? 'success' :
                opportunity.stage === 'closed_lost' ? 'danger' :
                opportunity.isStalled ? 'warning' : 'secondary'
              } className="capitalize">
                {opportunity.stage.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {opportunity.accountName}
              </span>
              <span className="flex items-center gap-1">
                <UserIcon className="h-4 w-4" />
                {opportunity.ownerName}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{formatCurrency(opportunity.amount)}</div>
          <div className="text-sm text-gray-500">
            {formatPercent(opportunity.probability)} probability
          </div>
        </div>
      </div>

      {/* Risk Banner */}
      {riskReasons.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Risk Factors Detected</h3>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  {riskReasons.map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Best Action */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Next Best Action</h3>
              <p className="text-sm text-blue-700 mt-1">{getNextBestAction()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Stage Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="flex justify-between mb-2">
                  {['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Won'].map((stage, i) => (
                    <div key={stage} className="text-center flex-1">
                      <div className={`text-xs ${
                        stageProgress[opportunity.stage] >= (i + 1) * 20
                          ? 'text-primary font-medium'
                          : 'text-gray-400'
                      }`}>
                        {stage}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${stageProgress[opportunity.stage]}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div className="font-medium">{format(opportunity.createdDate, 'MMM d, yyyy')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Expected Close</div>
                  <div className="font-medium">{format(opportunity.closeDate, 'MMM d, yyyy')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Days in Stage</div>
                  <div className={`font-medium ${opportunity.daysInStage > 21 ? 'text-red-600' : ''}`}>
                    {opportunity.daysInStage} days
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>{activities.length} activities logged</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No activities logged yet</p>
                  </div>
                ) : (
                  activities.slice(0, 10).map((activity, index) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === 'call' ? 'bg-green-100' :
                          activity.type === 'email' ? 'bg-blue-100' :
                          activity.type === 'visit' ? 'bg-purple-100' :
                          'bg-gray-100'
                        }`}>
                          {activity.type === 'call' && <Phone className="h-4 w-4 text-green-600" />}
                          {activity.type === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'visit' && <MapPin className="h-4 w-4 text-purple-600" />}
                          {activity.type === 'meeting' && <Calendar className="h-4 w-4 text-gray-600" />}
                        </div>
                        {index < activities.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{activity.type}</span>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.notes}</p>
                        {activity.outcome && (
                          <Badge variant="outline" className="mt-2 text-xs">{activity.outcome}</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Opportunity Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Opportunity ID</div>
                <div className="font-mono text-sm">{opportunity.id}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-gray-500">Amount</div>
                <div className="text-xl font-bold">{formatCurrency(opportunity.amount)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Probability</div>
                <div className="font-medium">{formatPercent(opportunity.probability)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Weighted Value</div>
                <div className="font-medium">{formatCurrency(opportunity.amount * opportunity.probability)}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-gray-500">Next Step</div>
                <div className="text-sm">{opportunity.nextStep}</div>
              </div>
              {opportunity.nextStepDate && (
                <div>
                  <div className="text-sm text-gray-500">Next Step Date</div>
                  <div className="font-medium">{format(opportunity.nextStepDate, 'MMM d, yyyy')}</div>
                </div>
              )}
              {opportunity.lostReason && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-gray-500">Lost Reason</div>
                    <Badge variant="danger">{opportunity.lostReason}</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Account Info */}
          {account && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Link href={`/account/${account.id}`} className="font-medium hover:underline">
                    {account.name}
                  </Link>
                  <div className="text-sm text-gray-500">{account.vertical}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    account.retentionRisk === 'high' ? 'danger' :
                    account.retentionRisk === 'medium' ? 'warning' : 'success'
                  }>
                    {account.retentionRisk} risk
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Contract Value: </span>
                  <span className="font-medium">{formatCurrency(account.contractValue)}</span>
                </div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={`/account/${account.id}`}>View Account</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Owner Info */}
          {owner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium">{owner.name}</div>
                <div className="text-sm text-gray-500">{owner.title}</div>
                <div className="text-sm text-gray-500">{owner.email}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
