import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { materialApi, getApiErrorMessage } from '@/services/api'
import { resolveAssetUrl } from '@/lib/utils'
import type { Material } from '@/types'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

/**
 * Parse the material's images JSON into the RAW entries exactly as stored (not resolved URLs).
 * Deletion sends these raw strings back so the backend can match them in the stored JSON.
 */
function parseRawImages(images?: string): string[] {
  if (!images) return []
  const raw = images.trim()
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw) as unknown[]
      return arr.filter((v): v is string => typeof v === 'string' && v.length > 0)
    } catch {
      return []
    }
  }
  return [raw]
}

interface MaterialImageManagerProps {
  material: Material
}

/** Thumbnail grid with per-image delete plus an upload tile, for the supplier catalog form. */
export function MaterialImageManager({ material }: MaterialImageManagerProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Local copy so the grid reflects uploads/deletes immediately (the parent's material prop
  // is a snapshot; both mutations return the updated Material).
  const [images, setImages] = useState<string | undefined>(material.images)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)

  useEffect(() => {
    setImages(material.images)
  }, [material.id, material.images])

  const rawImages = parseRawImages(images)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['supplier-catalog'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['material', material.id] })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => materialApi.uploadImage(material.id, file),
    onSuccess: (res) => {
      toast.success('Image uploaded')
      setImages(res.data?.images)
      invalidate()
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Failed to upload image')),
  })

  const deleteMutation = useMutation({
    mutationFn: (rawUrl: string) => materialApi.deleteImage(material.id, rawUrl),
    onSuccess: (res) => {
      toast.success('Image removed')
      setImages(res.data?.images)
      invalidate()
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Failed to remove image')),
    onSettled: () => setDeletingUrl(null),
  })

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, GIF, or WebP images are allowed')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Image must be 10MB or smaller')
      return
    }
    uploadMutation.mutate(file)
  }

  function handleDelete(rawUrl: string) {
    if (deleteMutation.isPending) return
    setDeletingUrl(rawUrl)
    deleteMutation.mutate(rawUrl)
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {rawImages.map((rawUrl) => (
          <div
            key={rawUrl}
            className="group relative rounded-lg border dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700/50"
          >
            <img
              src={resolveAssetUrl(rawUrl)}
              alt={material.name}
              className="h-24 w-full object-cover"
            />
            {deletingUrl === rawUrl && deleteMutation.isPending ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleDelete(rawUrl)}
                title="Remove image"
                aria-label="Remove image"
                className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center h-7 w-7 rounded-full bg-red-600 text-white shadow hover:bg-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* Upload tile */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex h-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed dark:border-gray-600 text-gray-400 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <span className="text-xs">{uploadMutation.isPending ? 'Uploading...' : 'Add photo'}</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        JPG, PNG, GIF, or WebP up to 10MB.
      </p>
    </div>
  )
}
