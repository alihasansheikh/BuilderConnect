import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ReasonDialogProps {
  isOpen: boolean
  title: string
  placeholder?: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export default function ReasonDialog({ isOpen, title, placeholder = 'Enter reason...', onConfirm, onCancel }: ReasonDialogProps) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim())
      setReason('')
    }
  }

  const handleCancel = () => {
    setReason('')
    onCancel()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-card rounded-2xl shadow-card w-full max-w-md mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold dark:text-white">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Provide a reason for this action</Dialog.Description>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close asChild>
              <button className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleConfirm}
              disabled={!reason.trim()}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
