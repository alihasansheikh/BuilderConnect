import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileText, ImagePlus, Upload, X } from 'lucide-react'
import { getApiErrorMessage, projectApi } from '@/services/api'
import { Skeleton } from '@/components/ui/Skeleton'
import { resolveAssetUrl } from '@/lib/utils'

const BYTES_PER_MB = 1024 * 1024
const MAX_UPLOAD_BYTES = 10 * BYTES_PER_MB
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const DOC_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const DOC_EXTENSION_PATTERN = /\.(pdf|docx?)$/i
const IMAGE_PREFIX = 'image/'

/** Shape of a project attachment row from GET /v1/projects/{id}/images (untyped in the API helper). */
interface ProjectAttachment {
  id: number
  fileName?: string
  fileUrl: string
  fileType?: string
  fileSize?: number
}

function isImageAttachment(attachment: ProjectAttachment): boolean {
  return (attachment.fileType ?? '').startsWith(IMAGE_PREFIX)
}

function formatFileSize(bytes?: number): string | null {
  if (typeof bytes !== 'number') return null
  return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button
        className="absolute right-4 top-4 text-white hover:text-gray-300"
        onClick={onClose}
        aria-label="Close preview"
      >
        <X className="h-8 w-8" />
      </button>
      <img
        src={src}
        alt="Full size"
        loading="lazy"
        className="max-h-[90vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

function ImagesGrid({
  images,
  onPreview,
}: {
  images: ProjectAttachment[]
  onPreview: (src: string) => void
}) {
  if (images.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <ImagePlus className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p className="text-sm">No images uploaded yet.</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {images.map((img) => (
        <div key={img.id} className="overflow-hidden rounded-lg border dark:border-gray-700">
          <button type="button" onClick={() => onPreview(resolveAssetUrl(img.fileUrl))} className="block w-full">
            <img
              src={resolveAssetUrl(img.fileUrl)}
              alt={img.fileName || 'Project image'}
              loading="lazy"
              className="h-40 w-full cursor-pointer object-cover"
            />
          </button>
          {img.fileName && (
            <p className="truncate px-2 py-1 text-xs text-gray-500 dark:text-gray-400">{img.fileName}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function DocumentsList({ documents }: { documents: ProjectAttachment[] }) {
  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <FileText className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p className="text-sm">No documents uploaded yet.</p>
        <p className="mt-1 text-xs">Plans, BOQs, or specs (PDF, DOC, DOCX).</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const sizeText = formatFileSize(doc.fileSize)
        return (
          <div key={doc.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 dark:border-gray-700">
            <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
            <a
              href={resolveAssetUrl(doc.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-sm hover:text-primary hover:underline dark:text-gray-200"
            >
              {doc.fileName || 'Document'}
            </a>
            {sizeText && (
              <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">{sizeText}</span>
            )}
            <a
              href={resolveAssetUrl(doc.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-1.5 text-gray-500 hover:text-primary dark:text-gray-400"
              aria-label="Download document"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        )
      })}
    </div>
  )
}

/** The awarded builder may upload progress images and documents for a project. */
export default function ProjectFilesTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const { data: attachments = [], isLoading } = useQuery<ProjectAttachment[]>({
    queryKey: ['project-images', projectId],
    queryFn: () => projectApi.getImages(projectId).then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => projectApi.uploadImage(projectId, file),
    onSuccess: () => {
      toast.success('Image uploaded')
      queryClient.invalidateQueries({ queryKey: ['project-images', projectId] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to upload image')),
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: (file: File) => projectApi.uploadDocument(projectId, file),
    onSuccess: () => {
      toast.success('Document uploaded')
      queryClient.invalidateQueries({ queryKey: ['project-images', projectId] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to upload document')),
  })

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or GIF image')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Image must be under 10MB')
      return
    }
    uploadImageMutation.mutate(file)
  }

  const handleDocumentSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const okType = DOC_MIME_TYPES.includes(file.type) || DOC_EXTENSION_PATTERN.test(file.name)
    if (!okType) {
      toast.error('Please select a PDF, DOC, or DOCX file')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Document must be under 10MB')
      return
    }
    uploadDocumentMutation.mutate(file)
  }

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />
  }

  const images = attachments.filter(isImageAttachment)
  const documents = attachments.filter((a) => !isImageAttachment(a))

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold dark:text-white">Images</h3>
          <input
            ref={imageInputRef}
            type="file"
            accept={IMAGE_MIME_TYPES.join(',')}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadImageMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" />
            {uploadImageMutation.isPending ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
        <ImagesGrid images={images} onPreview={setLightboxImage} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold dark:text-white">Documents</h3>
          <input
            ref={docInputRef}
            type="file"
            accept={[...DOC_MIME_TYPES, '.pdf', '.doc', '.docx'].join(',')}
            onChange={handleDocumentSelect}
            className="hidden"
          />
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploadDocumentMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
        <DocumentsList documents={documents} />
      </section>

      {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  )
}
