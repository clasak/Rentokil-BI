/**
 * Transaction List Component
 *
 * Displays individual transactions in a table with add/edit capabilities.
 * Shows Date, Company Name, Lead Type, Category, Amount, Status.
 */

'use client'

import {
  Transaction,
  formatCurrency,
  formatDisplayDate,
  getLeadTypeBadgeColor,
} from '@/types/sales-tracker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit, Plus } from 'lucide-react'

// =============================================================================
// Component Props
// =============================================================================

interface TransactionListProps {
  transactions: Transaction[]
  isLoading?: boolean
  onAddTransaction?: () => void
  onEditTransaction?: (transaction: Transaction) => void
  monthName?: string // Display name for the month (e.g., "January")
}

// =============================================================================
// Component
// =============================================================================

export function TransactionList({
  transactions,
  isLoading = false,
  onAddTransaction,
  onEditTransaction,
  monthName,
}: TransactionListProps) {
  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  // Group by type
  const proposals = sortedTransactions.filter(t => t.type === 'proposal')
  const sales = sortedTransactions.filter(t => t.type === 'sale')

  const title = monthName ? `${monthName} Tracker` : 'Transaction Details'

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Loading transactions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {transactions.length} total transactions
              {' '}
              ({proposals.length} proposals, {sales.length} sales)
            </CardDescription>
          </div>
          {onAddTransaction && (
            <Button onClick={onAddTransaction} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Transaction
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No transactions found for this month.</p>
            {onAddTransaction && (
              <Button
                onClick={onAddTransaction}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Transaction
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Proposals Section */}
            {proposals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-blue-600 dark:text-blue-400">
                  Proposals ({proposals.length})
                </h3>
                <TransactionTable
                  transactions={proposals}
                  onEdit={onEditTransaction}
                  type="proposal"
                />
              </div>
            )}

            {/* Sales Section */}
            {sales.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-green-600 dark:text-green-400">
                  Sales ({sales.length})
                </h3>
                <TransactionTable
                  transactions={sales}
                  onEdit={onEditTransaction}
                  type="sale"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Transaction Table Sub-Component
// =============================================================================

interface TransactionTableProps {
  transactions: Transaction[]
  onEdit?: (transaction: Transaction) => void
  type: 'proposal' | 'sale'
}

function TransactionTable({ transactions, onEdit, type }: TransactionTableProps) {
  const totalAmount = (t: Transaction) => t.jobWorkPrice + t.termitePrice + t.contractPrice

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Date</TableHead>
            <TableHead className="min-w-[150px]">Company</TableHead>
            <TableHead>Lead Type</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Job Type</TableHead>
            {/* Proposal-specific columns */}
            {type === 'proposal' && (
              <>
                <TableHead className="text-center">Sold</TableHead>
                <TableHead className="text-center">Dead</TableHead>
              </>
            )}
            {/* Price columns */}
            <TableHead className="text-right">Job Work</TableHead>
            <TableHead className="text-right">Termite</TableHead>
            <TableHead className="text-right">Contract</TableHead>
            <TableHead className="text-right font-semibold">Total</TableHead>
            {/* Sales-specific columns */}
            {type === 'sale' && (
              <>
                <TableHead className="text-center">Started</TableHead>
                <TableHead className="text-center">Paid</TableHead>
              </>
            )}
            <TableHead>PestPac ID</TableHead>
            <TableHead>Source</TableHead>
            {onEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow
              key={transaction.id}
              className={transaction.type === 'proposal' ? 'bg-blue-50/30 dark:bg-blue-950/10' : 'bg-green-50/30 dark:bg-green-950/10'}
            >
              <TableCell className="font-medium">
                {formatDisplayDate(transaction.date)}
              </TableCell>
              <TableCell className="font-medium">{transaction.companyName}</TableCell>
              <TableCell>
                <Badge className={getLeadTypeBadgeColor(transaction.leadType)}>
                  {transaction.leadType}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{transaction.service}</TableCell>
              <TableCell className="text-sm">{transaction.jobType}</TableCell>

              {/* Sold/Dead (proposals only) */}
              {type === 'proposal' && (
                <>
                  <TableCell className="text-center">
                    {transaction.sold && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        ✓
                      </Badge>
                    )}
                    {!transaction.sold && '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {transaction.dead && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        ✓
                      </Badge>
                    )}
                    {!transaction.dead && '-'}
                  </TableCell>
                </>
              )}

              {/* Prices */}
              <TableCell className="text-right font-mono text-sm">
                {transaction.jobWorkPrice > 0 ? formatCurrency(transaction.jobWorkPrice) : '-'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {transaction.termitePrice > 0 ? formatCurrency(transaction.termitePrice) : '-'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {transaction.contractPrice > 0 ? formatCurrency(transaction.contractPrice) : '-'}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatCurrency(totalAmount(transaction))}
              </TableCell>

              {/* Started/Paid (sales only) */}
              {type === 'sale' && (
                <>
                  <TableCell className="text-center">
                    {transaction.started && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        ✓
                      </Badge>
                    )}
                    {!transaction.started && '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {transaction.paid && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        ✓
                      </Badge>
                    )}
                    {!transaction.paid && '-'}
                  </TableCell>
                </>
              )}

              {/* PestPac ID */}
              <TableCell className="font-mono text-xs">
                {transaction.pestPacId || '-'}
              </TableCell>

              {/* Source */}
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    transaction.source === 'bigquery'
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                      : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                  }
                >
                  {transaction.source === 'bigquery' ? 'BQ' : 'Manual'}
                </Badge>
              </TableCell>

              {onEdit && (
                <TableCell className="text-right">
                  <Button
                    onClick={() => onEdit(transaction)}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
