import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { userApi, getApiErrorMessage } from '@/services/api'

interface DeleteAccountDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const { logout } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')

  const deleteMutation = useMutation({
    mutationFn: () => userApi.deleteAccount(password),
    onSuccess: () => {
      logout('Your account has been deleted')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to delete account'))
    },
  })

  const canConfirm = password.length > 0 && confirmText === 'DELETE' && !deleteMutation.isPending

  const handleClose = () => {
    if (deleteMutation.isPending) return
    setPassword('')
    setConfirmText('')
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-card rounded-2xl shadow-card w-full max-w-md mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This permanently deactivates your account. You will be signed out immediately and will
            no longer be able to log in. This action cannot be undone.
          </Dialog.Description>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type <span className="font-mono font-semibold text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close asChild>
              <button
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={!canConfirm}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
