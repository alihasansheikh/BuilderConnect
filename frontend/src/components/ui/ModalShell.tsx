import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
} as const

interface ModalShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Read to screen readers; also rendered under the title when provided. */
  description?: string
  size?: keyof typeof SIZE_CLASSES
  footer?: React.ReactNode
  /** Blocks ESC/backdrop/X while a mutation is in flight. */
  closeDisabled?: boolean
  children: React.ReactNode
}

/**
 * Centered Radix dialog shell. The Content is centered with `-translate-x-1/2 -translate-y-1/2`,
 * which lives on the `transform` property — so the entrance animation MUST be opacity-only.
 * A transform-animating class (animate-scale-in, animate-slide-up) with fill-mode `forwards`
 * permanently REPLACES the centering translate and displaces the dialog off-viewport; that is
 * exactly the bug this shell exists to make unrepeatable.
 */
export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  closeDisabled = false,
  children,
}: ModalShellProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next && closeDisabled) return
    onOpenChange(next)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'flex max-h-[90vh] w-[calc(100%-2rem)] flex-col',
            'rounded-2xl bg-white shadow-card animate-fade-in dark:bg-card',
            SIZE_CLASSES[size]
          )}
        >
          <div className="flex items-start justify-between border-b border-gray-100 px-6 pb-4 pt-6 dark:border-gray-700/50">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-bold dark:text-white">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                disabled={closeDisabled}
                aria-label="Close dialog"
                className="ml-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-700/50">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
