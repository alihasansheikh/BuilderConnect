import { useState } from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Package, Search, X } from 'lucide-react'
import { materialApi, getApiErrorMessage } from '@/services/api'
import { formatCurrency } from '@/lib/formatters'
import { stockLevel, firstMaterialImage } from '@/components/marketplace/marketplace-utils'
import { MaterialImage } from '@/components/marketplace/MaterialImage'
import { MaterialFormModal } from '@/components/supplier/MaterialFormModal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { Material } from '@/types'

const PAGE_SIZE = 12

export default function SupplierCatalog() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['supplier-catalog', { search: debouncedSearch, page }],
    queryFn: () =>
      materialApi
        .getSupplierCatalog({ search: debouncedSearch || undefined, page, size: PAGE_SIZE })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => materialApi.delete(id),
    onSuccess: () => {
      toast.success('Material removed from catalog')
      queryClient.invalidateQueries({ queryKey: ['supplier-catalog'] })
      setDeleteConfirmId(null)
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Failed to delete material')),
  })

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: number; isAvailable: boolean }) =>
      materialApi.update(id, { isAvailable }),
    onSuccess: (_, vars) => {
      toast.success(vars.isAvailable ? 'Material marked as available' : 'Material marked as unavailable')
      queryClient.invalidateQueries({ queryKey: ['supplier-catalog'] })
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Failed to update availability')),
  })

  const materials: Material[] = data?.content || []
  const totalMaterials = data?.totalElements ?? 0

  function openAddForm() {
    setEditingMaterial(null)
    setShowForm(true)
  }

  function openEditForm(material: Material) {
    setEditingMaterial(material)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingMaterial(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Material Catalog</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your materials, pricing, and stock
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
        >
          + Add Material
        </button>
      </div>

      {/* Add / Edit Modal */}
      <MaterialFormModal open={showForm} onClose={closeForm} material={editingMaterial} />

      {/* Search */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4 mb-6">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search by name or SKU..."
            className="flex-1 bg-transparent outline-none dark:text-white dark:placeholder-gray-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setPage(0)
              }}
              aria-label="Clear search"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner size="lg" label="Loading catalog..." className="py-12" />
      ) : isError ? (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card">
          <EmptyState
            icon={<AlertTriangle className="h-10 w-10 text-red-400" />}
            title="Failed to load catalog"
            description="Please refresh the page to try again."
          />
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card">
          <EmptyState
            icon={<Package className="h-10 w-10 text-gray-400" />}
            title={search ? 'No materials match your search' : 'Your catalog is empty'}
            description={
              search
                ? 'Try a different search term or clear the filter.'
                : 'Add materials to start receiving orders from builders and clients.'
            }
            action={search ? undefined : { label: 'Add First Material', onClick: openAddForm }}
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {totalMaterials} material{totalMaterials !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {materials.map((material) => (
              <div
                key={material.id}
                className="bg-white dark:bg-card rounded-2xl shadow-card border dark:border-gray-700 flex flex-col overflow-hidden"
              >
                {/* Cover photo (same fallback behavior as the marketplace cards) */}
                <div className="h-32 w-full bg-gray-100 dark:bg-gray-800">
                  <MaterialImage
                    src={firstMaterialImage(material.images)}
                    alt={material.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5 flex flex-1 flex-col">
                {/* Top: name + availability toggle */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold dark:text-white truncate">{material.name}</h3>
                    {material.sku && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        SKU: {material.sku}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      toggleAvailabilityMutation.mutate({
                        id: material.id,
                        isAvailable: !material.isAvailable,
                      })
                    }
                    disabled={toggleAvailabilityMutation.isPending}
                    title={material.isAvailable ? 'Mark unavailable' : 'Mark available'}
                    className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                      material.isAvailable ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        material.isAvailable ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Description */}
                {material.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {material.description}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Unit Price</p>
                    <p className="font-semibold dark:text-white">
                      {formatCurrency(material.unitPrice)}
                      <span className="text-gray-400 font-normal"> /{material.unit}</span>
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">In Stock</p>
                    <p
                      className={`font-semibold ${
                        stockLevel(material) === 'out'
                          ? 'text-red-600 dark:text-red-400'
                          : stockLevel(material) === 'low'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'dark:text-white'
                      }`}
                    >
                      {material.stockQuantity} {material.unit}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Min. Order</p>
                    <p className="font-medium dark:text-white">
                      {material.minOrderQuantity} {material.unit}
                    </p>
                  </div>
                </div>

                {/* Availability + stock badges */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      material.isAvailable
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {material.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  {stockLevel(material) === 'out' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Out of stock
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => openEditForm(material)}
                    className="flex-1 px-3 py-1.5 border dark:border-gray-600 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                  >
                    Edit
                  </button>
                  {deleteConfirmId === material.id ? (
                    <div className="flex gap-1 flex-1">
                      <button
                        onClick={() => deleteMutation.mutate(material.id)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 px-3 py-1.5 border dark:border-gray-600 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(material.id)}
                      className="flex-1 px-3 py-1.5 border border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  )}
                </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            onPageChange={setPage}
            className="pt-4"
          />
        </>
      )}
    </div>
  )
}
