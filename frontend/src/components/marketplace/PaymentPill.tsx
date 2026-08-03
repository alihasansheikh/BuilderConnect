import { Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentPillProps {
  paymentStatus: string
  className?: string
}

/**
 * COD payment pill: green once the supplier records the payment as received,
 * amber while cash-on-delivery payment is still pending.
 */
export function PaymentPill({ paymentStatus, className }: PaymentPillProps) {
  const paid = paymentStatus === 'PAID'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        paid
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        className
      )}
    >
      <Banknote className="h-3.5 w-3.5" />
      {paid ? 'Payment received' : 'Cash on Delivery · pending'}
    </span>
  )
}
