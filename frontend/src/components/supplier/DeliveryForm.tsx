import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { materialOrderApi, getApiErrorMessage } from '@/services/api'
import { FIELD_CLASSES, LABEL_CLASSES } from '@/lib/form-styles'

interface DeliveryFormProps {
  orderId: number
  onDone: () => void
}

/** Inline form for recording a delivery run against a supplier's order. */
export function DeliveryForm({ orderId, onDone }: DeliveryFormProps) {
  const queryClient = useQueryClient()
  const [deliveryMethod, setDeliveryMethod] = useState('SUPPLIER_DELIVERY')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [estimatedDelivery, setEstimatedDelivery] = useState('')
  const [notes, setNotes] = useState('')

  const createDeliveryMutation = useMutation({
    mutationFn: (payload: {
      deliveryMethod: string
      driverName?: string
      driverPhone?: string
      trackingNumber?: string
      estimatedDelivery?: string
      notes?: string
    }) => materialOrderApi.createDelivery(orderId, payload),
    onSuccess: () => {
      toast.success('Delivery created successfully')
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] })
      queryClient.invalidateQueries({ queryKey: ['material-order'] })
      queryClient.invalidateQueries({ queryKey: ['my-material-orders'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      onDone()
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Failed to create delivery')),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createDeliveryMutation.mutate({
      deliveryMethod,
      driverName: driverName.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      // The <input type="date"> yields "YYYY-MM-DD"; the backend field is a LocalDateTime, so
      // send start-of-day ISO (a bare date fails to deserialize).
      estimatedDelivery: estimatedDelivery ? `${estimatedDelivery}T00:00:00` : undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
      <h4 className="font-medium dark:text-white mb-3">Create Delivery</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASSES}>
              Delivery Method
            </label>
            <select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} className={FIELD_CLASSES}>
              <option value="SUPPLIER_DELIVERY">Supplier Delivery</option>
              <option value="THIRD_PARTY">Third Party</option>
              <option value="PICKUP">Pickup</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASSES}>
              Estimated Delivery Date
            </label>
            <input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} className={FIELD_CLASSES} />
          </div>
          <div>
            <label className={LABEL_CLASSES}>
              Driver Name
            </label>
            <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Optional" className={FIELD_CLASSES} />
          </div>
          <div>
            <label className={LABEL_CLASSES}>
              Driver Phone
            </label>
            <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="Optional" className={FIELD_CLASSES} />
          </div>
          <div>
            <label className={LABEL_CLASSES}>
              Tracking Number
            </label>
            <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Optional" className={FIELD_CLASSES} />
          </div>
          <div>
            <label className={LABEL_CLASSES}>
              Notes
            </label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={FIELD_CLASSES} />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={createDeliveryMutation.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {createDeliveryMutation.isPending ? 'Creating...' : 'Create Delivery'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 border dark:border-gray-600 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
