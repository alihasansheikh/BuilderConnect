import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage, materialOrderApi, projectApi } from '@/services/api'
import { formatCurrency } from '@/lib/formatters'
import { CITIES, stockLevel, useMarketBase } from './marketplace-utils'
import type { ReorderState } from './marketplace-utils'
import type { CreateMaterialOrderRequest, Material, PageResponse, Project } from '@/types'

const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const LABEL = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const ERROR_TEXT = 'mt-1 text-xs text-red-600 dark:text-red-400'

/** Unwrap a project list response that may be a Spring page or a bare array. */
function unwrapProjects(data: PageResponse<Project> | Project[] | undefined | null): Project[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.content ?? []
}

interface OrderNowPanelProps {
  material: Material
}

/**
 * Direct COD order form on the product detail page (no cart). Orders are standalone
 * with a delivery address; the buyer may optionally attach one of their projects.
 */
export function OrderNowPanel({ material }: OrderNowPanelProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const base = useMarketBase()

  // "Order again" navigations carry the previous order's details as location state.
  const reorder: ReorderState = (location.state as ReorderState | null) ?? {}

  const minQty = Math.max(1, material.minOrderQuantity || 1)
  const outOfStock = stockLevel(material) === 'out'
  const defaultCity =
    user?.city && (CITIES as readonly string[]).includes(user.city) ? user.city : ''
  const reorderCity =
    reorder.city && (CITIES as readonly string[]).includes(reorder.city) ? reorder.city : ''

  const [quantityInput, setQuantityInput] = useState(
    typeof reorder.quantity === 'number' && reorder.quantity > 0
      ? String(reorder.quantity)
      : String(minQty)
  )
  const [address, setAddress] = useState(reorder.deliveryAddress ?? '')
  const [city, setCity] = useState(reorderCity || defaultCity)
  const [contactName, setContactName] = useState(reorder.contactName ?? user?.name ?? '')
  const [contactPhone, setContactPhone] = useState(reorder.contactPhone ?? user?.phone ?? '')
  const [projectId, setProjectId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const role = user?.role
  const { data: projectOptions = [] } = useQuery({
    queryKey: ['order-project-options', role],
    enabled: role === 'CLIENT' || role === 'BUILDER',
    queryFn: async () => {
      const res =
        role === 'BUILDER'
          ? await projectApi.getBuilderProjects({ size: 100 })
          : await projectApi.getClientProjects({ size: 100 })
      return unwrapProjects(res.data)
    },
  })

  const quantity = Number.parseInt(quantityInput, 10)
  const quantityError = useMemo(() => {
    if (Number.isNaN(quantity) || quantity < minQty) {
      return `Minimum order is ${minQty} ${material.unit}`
    }
    if (quantity > material.stockQuantity) {
      return `Only ${material.stockQuantity} in stock`
    }
    return ''
  }, [quantity, minQty, material.unit, material.stockQuantity])

  const addressError = submitAttempted && !address.trim() ? 'Delivery address is required' : ''
  const cityError = submitAttempted && !city ? 'Delivery city is required' : ''
  const validQuantity = !quantityError && !Number.isNaN(quantity)

  const createOrder = useMutation({
    mutationFn: (data: CreateMaterialOrderRequest) => materialOrderApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['material'] })
      queryClient.invalidateQueries({ queryKey: ['my-material-orders'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] })
      toast.success('Order placed — the supplier will confirm it shortly')
      navigate(`${base}/orders/${res.data.id}`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not place the order'))
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitAttempted(true)
    if (outOfStock || !validQuantity || !address.trim() || !city) return

    const request: CreateMaterialOrderRequest = {
      supplierId: material.supplierId,
      deliveryAddress: address.trim(),
      deliveryCity: city,
      items: [{ materialId: material.id, quantity }],
      ...(projectId ? { projectId: Number(projectId) } : {}),
      ...(contactName.trim() ? { deliveryContactName: contactName.trim() } : {}),
      ...(contactPhone.trim() ? { deliveryContactPhone: contactPhone.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }
    createOrder.mutate(request)
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold dark:text-white">
        <ShoppingCart className="h-5 w-5 text-primary" />
        Order now
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <div>
          <label htmlFor="order-quantity" className={LABEL}>
            Quantity ({material.unit})
          </label>
          <input
            id="order-quantity"
            type="number"
            min={minQty}
            max={material.stockQuantity}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            disabled={outOfStock}
            className={INPUT}
          />
          {quantityError && !outOfStock && <p className={ERROR_TEXT}>{quantityError}</p>}
        </div>

        <div>
          <label htmlFor="order-address" className={LABEL}>
            Delivery address <span className="text-red-500">*</span>
          </label>
          <textarea
            id="order-address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={outOfStock}
            placeholder="Street address, area, landmark"
            className={INPUT}
          />
          {addressError && <p className={ERROR_TEXT}>{addressError}</p>}
        </div>

        <div>
          <label htmlFor="order-city" className={LABEL}>
            City <span className="text-red-500">*</span>
          </label>
          <select
            id="order-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={outOfStock}
            className={INPUT}
          >
            <option value="">Select a city</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {cityError && <p className={ERROR_TEXT}>{cityError}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="order-contact-name" className={LABEL}>
              Contact name
            </label>
            <input
              id="order-contact-name"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              disabled={outOfStock}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="order-contact-phone" className={LABEL}>
              Contact phone
            </label>
            <input
              id="order-contact-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={outOfStock}
              placeholder="03xx-xxxxxxx"
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <label htmlFor="order-project" className={LABEL}>
            Project (optional)
          </label>
          <select
            id="order-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={outOfStock}
            className={INPUT}
          >
            <option value="">No project (standalone order)</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="order-notes" className={LABEL}>
            Notes (optional)
          </label>
          <textarea
            id="order-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={outOfStock}
            placeholder="Anything the supplier should know"
            className={INPUT}
          />
        </div>

        {validQuantity && !outOfStock && (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-700/40">
            <span className="text-muted-foreground">
              {quantity} × {formatCurrency(material.unitPrice)}
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {formatCurrency(quantity * material.unitPrice)}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
          <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Cash on Delivery — pay cash when your order is delivered.
          </p>
        </div>

        <button
          type="submit"
          disabled={outOfStock || createOrder.isPending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {outOfStock ? 'Out of stock' : createOrder.isPending ? 'Placing order...' : 'Place order'}
        </button>
      </form>
    </div>
  )
}
