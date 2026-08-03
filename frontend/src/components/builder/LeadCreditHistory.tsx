import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { leadApi } from '@/services/api'
import { Pagination } from '@/components/ui/Pagination'
import { Coins, ArrowDownCircle, ArrowUpCircle, Gift, RefreshCw } from 'lucide-react'
import type { LeadTransaction, PageResponse } from '@/types'

const typeConfig: Record<string, { icon: typeof Coins; color: string; label: string }> = {
  DEBIT: { icon: ArrowDownCircle, color: 'text-red-500', label: 'Used' },
  CREDIT: { icon: ArrowUpCircle, color: 'text-green-500', label: 'Granted' },
  BONUS: { icon: Gift, color: 'text-purple-500', label: 'Bonus' },
  REFUND: { icon: RefreshCw, color: 'text-blue-500', label: 'Refunded' },
  SUBSCRIPTION_RENEWAL: { icon: ArrowUpCircle, color: 'text-green-500', label: 'Subscription' },
}

export function LeadCreditHistory() {
  const [page, setPage] = useState(0)

  const { data: txData, isLoading } = useQuery({
    queryKey: ['lead-transactions', page],
    queryFn: () => leadApi.getTransactions({ page, size: 20 }).then(r => r.data as PageResponse<LeadTransaction>),
  })

  const transactions = txData?.content || []

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card">
      <div className="px-4 py-3 border-b dark:border-gray-700">
        <h2 className="font-semibold dark:text-white">Credit History</h2>
      </div>

      {isLoading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 text-center">
          <Coins className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium dark:text-white mb-2">No transactions yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Your credit usage will appear here when you submit bids.</p>
        </div>
      ) : (
        <>
          <div className="divide-y dark:divide-gray-700">
            {transactions.map(tx => {
              const config = typeConfig[tx.transactionType] || typeConfig.DEBIT
              const Icon = config.icon
              return (
                <div key={tx.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-gray-200 truncate">{tx.description || config.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${tx.transactionType === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.transactionType === 'DEBIT' ? '-' : '+'}{tx.amount}
                    </p>
                    <p className="text-xs text-gray-400">Balance: {tx.balanceAfter}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {txData && txData.totalPages > 1 && (
            <div className="px-4 py-3 border-t dark:border-gray-700">
              <Pagination page={txData.number || 0} totalPages={txData.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
