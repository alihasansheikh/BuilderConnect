import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'
import { CITIES } from '@/components/marketplace/marketplace-utils'
import { materialApi, supplierApi, userApi, getApiErrorMessage } from '@/services/api'
import { FIELD_CLASSES, LABEL_CLASSES } from '@/lib/form-styles'
import { cn, parseJsonArray } from '@/lib/utils'
import type { UpdateSupplierProfileRequest } from '@/types'

interface SupplierEditModalProps {
  open: boolean
  onClose: () => void
  /** Called after both the user and supplier profiles saved successfully. */
  onSaved: () => void
  userName: string
  userCity?: string
}

const FORM_ID = 'supplier-edit-form'
const PRIMARY_BTN =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
const CHIP_BASE = 'rounded-full border px-3 py-1 text-sm font-medium transition-colors'
const CHIP_ON = 'border-primary bg-primary/10 text-primary'
const CHIP_OFF =
  'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700/40 dark:text-gray-300 dark:hover:border-gray-500'

interface FormState {
  name: string
  city: string
  companyName: string
  description: string
  warehouseAddress: string
  deliveryAreas: string[]
  minimumOrderValue: string
  businessRegistrationNumber: string
  taxId: string
  categories: string[]
}

const EMPTY_FORM: FormState = {
  name: '',
  city: '',
  companyName: '',
  description: '',
  warehouseAddress: '',
  deliveryAreas: [],
  minimumOrderValue: '',
  businessRegistrationNumber: '',
  taxId: '',
  categories: [],
}

/** Normalize a list field that may arrive as string[] or a JSON-encoded string. */
function toList(value?: string[] | string): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.length > 0)
  return parseJsonArray(value)
}

const toggle = (list: string[], item: string): string[] =>
  list.includes(item) ? list.filter((v) => v !== item) : [...list, item]

/**
 * Owner edit surface for the supplier profile: identity fields (name/city) save through
 * userApi while the business fields save through supplierApi — both in one submit.
 */
export function SupplierEditModal({ open, onClose, onSaved, userName, userCity }: SupplierEditModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const { data: myProfile } = useQuery({
    queryKey: ['supplier-profile-me'],
    queryFn: () => supplierApi.getMyProfile().then((r) => r.data),
    enabled: open,
  })

  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => materialApi.getCategories().then((r) => r.data),
    staleTime: Infinity,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setForm({
      name: userName ?? '',
      city: userCity ?? '',
      companyName: myProfile?.companyName ?? '',
      description: myProfile?.description ?? '',
      warehouseAddress: myProfile?.warehouseAddress ?? '',
      deliveryAreas: toList(myProfile?.deliveryAreas),
      minimumOrderValue:
        myProfile?.minimumOrderValue && myProfile.minimumOrderValue > 0 ? String(myProfile.minimumOrderValue) : '',
      businessRegistrationNumber: myProfile?.businessRegistrationNumber ?? '',
      taxId: myProfile?.taxId ?? '',
      categories: toList(myProfile?.categories),
    })
  }, [open, myProfile, userName, userCity])

  const save = useMutation({
    mutationFn: () => {
      const payload: UpdateSupplierProfileRequest = {
        companyName: form.companyName.trim(),
        description: form.description.trim() || undefined,
        warehouseAddress: form.warehouseAddress.trim() || undefined,
        deliveryAreas: form.deliveryAreas,
        minimumOrderValue: form.minimumOrderValue ? Number(form.minimumOrderValue) : undefined,
        businessRegistrationNumber: form.businessRegistrationNumber.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        categories: form.categories,
      }
      return Promise.all([
        userApi.updateProfile({ name: form.name.trim(), city: form.city.trim() || undefined }),
        supplierApi.updateMyProfile(payload),
      ])
    },
    onSuccess: () => {
      toast.success('Profile updated')
      queryClient.invalidateQueries({ queryKey: ['supplier-profile-me'] })
      onSaved()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update profile')),
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (save.isPending) return
    if (!form.name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    if (!form.companyName.trim()) {
      toast.error('Company name is required')
      return
    }
    const minValue = form.minimumOrderValue ? Number(form.minimumOrderValue) : 0
    if (Number.isNaN(minValue) || minValue < 0) {
      toast.error('Minimum order value must be a positive number')
      return
    }
    save.mutate()
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={save.isPending}
        className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      <button type="submit" form={FORM_ID} disabled={save.isPending} className={PRIMARY_BTN}>
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {save.isPending ? 'Saving...' : 'Save'}
      </button>
    </>
  )

  return (
    <ModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Edit profile"
      size="lg"
      closeDisabled={save.isPending}
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="se-name" className={LABEL_CLASSES}>
              Full name <span className="text-red-500">*</span>
            </label>
            <input id="se-name" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={FIELD_CLASSES} />
          </div>
          <div>
            <label htmlFor="se-city" className={LABEL_CLASSES}>City</label>
            <select id="se-city" value={form.city} onChange={(e) => set('city', e.target.value)} className={FIELD_CLASSES}>
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="se-company" className={LABEL_CLASSES}>
            Company name <span className="text-red-500">*</span>
          </label>
          <input id="se-company" type="text" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="e.g. Karachi Building Materials" className={FIELD_CLASSES} />
        </div>

        <div>
          <label htmlFor="se-description" className={LABEL_CLASSES}>Description</label>
          <textarea id="se-description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Tell buyers about your business, product range and service quality" className={FIELD_CLASSES} />
        </div>

        <div>
          <label htmlFor="se-warehouse" className={LABEL_CLASSES}>Warehouse address</label>
          <input id="se-warehouse" type="text" value={form.warehouseAddress} onChange={(e) => set('warehouseAddress', e.target.value)} placeholder="Street, area, city" className={FIELD_CLASSES} />
        </div>

        <div>
          <p className={LABEL_CLASSES}>Delivery areas</p>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={form.deliveryAreas.includes(c)}
                onClick={() => set('deliveryAreas', toggle(form.deliveryAreas, c))}
                className={cn(CHIP_BASE, form.deliveryAreas.includes(c) ? CHIP_ON : CHIP_OFF)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="se-minorder" className={LABEL_CLASSES}>Minimum order (PKR)</label>
            <input id="se-minorder" type="number" min={0} value={form.minimumOrderValue} onChange={(e) => set('minimumOrderValue', e.target.value)} placeholder="e.g. 5000" className={FIELD_CLASSES} />
          </div>
          <div>
            <label htmlFor="se-regno" className={LABEL_CLASSES}>Registration #</label>
            <input id="se-regno" type="text" value={form.businessRegistrationNumber} onChange={(e) => set('businessRegistrationNumber', e.target.value)} placeholder="Business registration" className={FIELD_CLASSES} />
          </div>
          <div>
            <label htmlFor="se-taxid" className={LABEL_CLASSES}>Tax ID</label>
            <input id="se-taxid" type="text" value={form.taxId} onChange={(e) => set('taxId', e.target.value)} placeholder="NTN / tax number" className={FIELD_CLASSES} />
          </div>
        </div>

        <div>
          <p className={LABEL_CLASSES}>Categories</p>
          {categoryOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={form.categories.includes(category.name)}
                  onClick={() => set('categories', toggle(form.categories, category.name))}
                  className={cn(CHIP_BASE, form.categories.includes(category.name) ? CHIP_ON : CHIP_OFF)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  )
}
