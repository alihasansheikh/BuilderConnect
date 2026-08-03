import { AlertCircle, Check } from 'lucide-react'
import { formatStatus } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'PENDING_CONFIRMATION', label: 'Order placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const

/** Where each order status sits on the 5-step happy path. */
const STATUS_INDEX: Record<string, number> = {
  DRAFT: 0,
  PENDING_CONFIRMATION: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  READY_FOR_DELIVERY: 2,
  OUT_FOR_DELIVERY: 3,
  PARTIALLY_DELIVERED: 3,
  DELIVERED: 4,
}

/** Intermediate statuses that share a step get a clarifying sub-label under it. */
const SUB_LABELS: Record<string, string> = {
  READY_FOR_DELIVERY: 'Ready for delivery',
  PARTIALLY_DELIVERED: 'Partially delivered',
}

interface OrderStatusStepperProps {
  status: string
}

/**
 * Horizontal progress stepper for a material order. Terminal failure states
 * (CANCELLED/RETURNED) replace the stepper with a red banner.
 */
export function OrderStatusStepper({ status }: OrderStatusStepperProps) {
  if (status === 'CANCELLED' || status === 'RETURNED') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Order {formatStatus(status)}
        </p>
      </div>
    )
  }

  const activeIndex = STATUS_INDEX[status] ?? 0
  const delivered = status === 'DELIVERED'
  const subLabel = SUB_LABELS[status]

  return (
    <ol className="flex items-start" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const done = index < activeIndex || (delivered && index <= activeIndex)
        const current = !delivered && index === activeIndex

        return (
          <li
            key={step.key}
            className={cn('flex flex-col items-center', index < STEPS.length - 1 && 'flex-1')}
            aria-current={current ? 'step' : undefined}
          >
            <div className="flex w-full items-center">
              {/* Left connector (invisible spacer on the first step keeps circles aligned). */}
              <div
                className={cn(
                  'h-0.5 flex-1',
                  index === 0
                    ? 'bg-transparent'
                    : done || current
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  done
                    ? 'border-green-500 bg-green-500 text-white'
                    : current
                      ? 'border-primary bg-white text-primary ring-4 ring-primary/20 dark:bg-card'
                      : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-card dark:text-gray-500'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div
                className={cn(
                  'h-0.5 flex-1',
                  index === STEPS.length - 1
                    ? 'bg-transparent'
                    : done
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            </div>

            <div className="mt-2 px-1 text-center">
              <p
                className={cn(
                  'text-xs font-medium',
                  done || current
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {step.label}
              </p>
              {current && subLabel && (
                <p className="mt-0.5 text-[11px] text-primary">{subLabel}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
