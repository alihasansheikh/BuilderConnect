import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImagePlus, X } from 'lucide-react'
import { materialApi, getApiErrorMessage } from '@/services/api'
import { ModalShell } from '@/components/ui/ModalShell'
import { FIELD_CLASSES, LABEL_CLASSES } from '@/lib/form-styles'
import { MaterialImageManager } from '@/components/supplier/MaterialImageManager'
import type { Material } from '@/types'

// Keep in sync with MaterialImageManager — same rules, staged client-side before the
// material exists (the upload endpoint needs a material id).
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024
const MAX_STAGED = 6

interface StagedImage {
  file: File
  preview: string
}

interface MaterialFormData {
  name: string
  sku: string
  brand: string
  unit: string
  unitPrice: string
  minOrderQuantity: string
  stockQuantity: string
  description: string
  isAvailable: boolean
}

const emptyForm: MaterialFormData = {
  name: '',
  sku: '',
  brand: '',
  unit: '',
  unitPrice: '',
  minOrderQuantity: '1',
  stockQuantity: '0',
  description: '',
  isAvailable: true,
}

function fromMaterial(material: Material): MaterialFormData {
  return {
    name: material.name,
    sku: material.sku || '',
    brand: material.brand || '',
    unit: material.unit,
    unitPrice: String(material.unitPrice),
    minOrderQuantity: String(material.minOrderQuantity),
    stockQuantity: String(material.stockQuantity),
    description: material.description || '',
    isAvailable: material.isAvailable,
  }
}

const commonUnits = ['piece', 'kg', 'ton', 'bag', 'litre', 'metre', 'sq ft', 'sq m', 'cubic m', 'bundle', 'box', 'roll']

interface MaterialFormModalProps {
  open: boolean
  onClose: () => void
  /** null = create mode */
  material: Material | null
}

/**
 * Add/edit material dialog. After a successful CREATE the modal stays open in edit mode on the
 * new material so the supplier can attach photos immediately; EDIT mode shows the image manager
 * below the fields.
 */
export function MaterialFormModal({ open, onClose, material }: MaterialFormModalProps) {
  const queryClient = useQueryClient()
  const stagedInputRef = useRef<HTMLInputElement>(null)
  const [createdMaterial, setCreatedMaterial] = useState<Material | null>(null)
  const [formData, setFormData] = useState<MaterialFormData>(emptyForm)
  // Photos picked in CREATE mode, held locally until the material exists to upload against.
  const [staged, setStaged] = useState<StagedImage[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // Material being edited: freshly created one wins over the prop.
  const editing = createdMaterial ?? material

  const clearStaged = () => {
    setStaged((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.preview))
      return []
    })
  }

  useEffect(() => {
    if (!open) return
    setCreatedMaterial(null)
    setFormData(material ? fromMaterial(material) : emptyForm)
    clearStaged()
  }, [open, material])

  // Release preview object URLs when the component unmounts mid-stage.
  useEffect(() => () => {
    setStaged((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.preview))
      return prev
    })
  }, [])

  const invalidateCatalog = () => {
    queryClient.invalidateQueries({ queryKey: ['supplier-catalog'] })
  }

  function addStagedFiles(list: FileList | null) {
    if (!list) return
    const next: StagedImage[] = []
    for (const file of Array.from(list)) {
      if (staged.length + next.length >= MAX_STAGED) {
        toast.error(`You can attach up to ${MAX_STAGED} photos`)
        break
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, GIF or WebP images`)
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name}: image must be under 10MB`)
        continue
      }
      next.push({ file, preview: URL.createObjectURL(file) })
    }
    if (next.length) setStaged((prev) => [...prev, ...next])
  }

  function removeStaged(index: number) {
    setStaged((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  /**
   * Create, then upload any staged photos against the new id. Full success closes the modal;
   * a partial photo failure flips into edit mode so the image manager offers a retry path.
   */
  async function createWithPhotos(payload: Omit<Material, 'id' | 'supplierId' | 'supplierName' | 'createdAt'>) {
    setIsCreating(true)
    try {
      const created = (await materialApi.create(payload)).data
      let latest = created
      let failed = 0
      for (const s of staged) {
        try {
          latest = (await materialApi.uploadImage(created.id, s.file)).data ?? latest
        } catch {
          failed++
        }
      }
      invalidateCatalog()
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['material', created.id] })
      clearStaged()
      if (failed > 0) {
        toast.warning(`Material created, but ${failed} photo${failed > 1 ? 's' : ''} failed to upload — retry below.`)
        setCreatedMaterial(latest)
        setFormData(fromMaterial(latest))
      } else {
        toast.success(staged.length > 0 ? 'Material and photos added to catalog' : 'Material added to catalog')
        onClose()
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to add material'))
    } finally {
      setIsCreating(false)
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<Material, 'id' | 'supplierId' | 'supplierName' | 'createdAt'>> }) =>
      materialApi.update(id, payload),
    onSuccess: () => {
      toast.success('Material updated successfully')
      invalidateCatalog()
      onClose()
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Failed to update material')),
  })

  const isSaving = isCreating || updateMutation.isPending

  function setField<K extends keyof MaterialFormData>(key: K, value: MaterialFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      brand: formData.brand.trim() || undefined,
      unit: formData.unit.trim(),
      unitPrice: parseFloat(formData.unitPrice),
      minOrderQuantity: parseInt(formData.minOrderQuantity, 10),
      stockQuantity: parseInt(formData.stockQuantity, 10),
      description: formData.description.trim() || undefined,
      isAvailable: formData.isAvailable,
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      void createWithPhotos(payload)
    }
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={editing ? 'Edit Material' : 'Add New Material'}
      size="lg"
      closeDisabled={isSaving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            {createdMaterial ? 'Close' : 'Cancel'}
          </button>
          <button
            type="submit"
            form="material-form"
            disabled={isSaving}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isCreating && staged.length > 0
              ? 'Uploading photos...'
              : isSaving
                ? 'Saving...'
                : editing
                  ? 'Save Changes'
                  : 'Add Material'}
          </button>
        </>
      }
    >
      <form id="material-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="md:col-span-2">
            <label className={LABEL_CLASSES}>
              Material Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Red Bricks (Standard)"
              className={FIELD_CLASSES}
            />
          </div>

          {/* SKU (required — backend enforces NOT NULL + per-supplier uniqueness) */}
          <div>
            <label className={LABEL_CLASSES}>
              SKU / Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setField('sku', e.target.value)}
              placeholder="e.g. BRK-001"
              className={FIELD_CLASSES}
            />
          </div>

          {/* Brand */}
          <div>
            <label className={LABEL_CLASSES}>Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setField('brand', e.target.value)}
              placeholder="e.g. Lucky Cement (optional)"
              className={FIELD_CLASSES}
            />
          </div>

          {/* Unit */}
          <div>
            <label className={LABEL_CLASSES}>
              Unit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              list="unit-list"
              value={formData.unit}
              onChange={(e) => setField('unit', e.target.value)}
              placeholder="e.g. piece, kg, bag"
              className={FIELD_CLASSES}
            />
            <datalist id="unit-list">
              {commonUnits.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

          {/* Unit Price */}
          <div>
            <label className={LABEL_CLASSES}>
              Unit Price (PKR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setField('unitPrice', e.target.value)}
              placeholder="0.00"
              className={FIELD_CLASSES}
            />
          </div>

          {/* Min Order Qty */}
          <div>
            <label className={LABEL_CLASSES}>
              Minimum Order Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={formData.minOrderQuantity}
              onChange={(e) => setField('minOrderQuantity', e.target.value)}
              className={FIELD_CLASSES}
            />
          </div>

          {/* Stock Quantity */}
          <div>
            <label className={LABEL_CLASSES}>
              Stock Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={formData.stockQuantity}
              onChange={(e) => setField('stockQuantity', e.target.value)}
              className={FIELD_CLASSES}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className={LABEL_CLASSES}>Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Material specifications, grades, notes..."
              className={`${FIELD_CLASSES} resize-none`}
            />
          </div>

          {/* Availability */}
          <div className="md:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="material-is-available"
              checked={formData.isAvailable}
              onChange={(e) => setField('isAvailable', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="material-is-available" className="text-sm text-gray-700 dark:text-gray-300">
              Mark as available (visible to buyers)
            </label>
          </div>
        </div>
      </form>

      {/* Photos. Edit mode uploads directly; create mode stages files locally and uploads them
          right after the material is created (the endpoint needs a material id). */}
      {editing ? (
        <div className="mt-6 border-t dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Photos</h3>
          {createdMaterial && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
              Some photos didn't upload — add them again below.
            </p>
          )}
          <div className="mt-2">
            <MaterialImageManager material={editing} />
          </div>
        </div>
      ) : (
        <div className="mt-6 border-t dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Photos</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Up to {MAX_STAGED} photos — they upload automatically when you add the material.
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {staged.map((s, index) => (
              <div
                key={s.preview}
                className="group relative h-20 overflow-hidden rounded-lg border dark:border-gray-600"
              >
                <img src={s.preview} alt={s.file.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeStaged(index)}
                  disabled={isSaving}
                  aria-label={`Remove ${s.file.name}`}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {staged.length < MAX_STAGED && (
              <button
                type="button"
                onClick={() => stagedInputRef.current?.click()}
                disabled={isSaving}
                className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-gray-600"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
              </button>
            )}
          </div>
          <input
            ref={stagedInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={(e) => {
              addStagedFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </ModalShell>
  )
}
