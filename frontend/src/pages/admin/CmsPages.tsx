import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi, getApiErrorMessage } from '@/services/api'
import type { CmsPage } from '@/types'
import { Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CmsPages() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ slug: '', title: '', content: '', metaDescription: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cms-pages', page],
    queryFn: () => adminApi.getCmsPages({ page, size: 10 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createCmsPage(form),
    onSuccess: () => {
      toast.success('Page created')
      queryClient.invalidateQueries({ queryKey: ['admin-cms-pages'] })
      resetForm()
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to create page')),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; content?: string; metaDescription?: string }) => adminApi.updateCmsPage(editingId!, data),
    onSuccess: () => {
      toast.success('Page updated')
      queryClient.invalidateQueries({ queryKey: ['admin-cms-pages'] })
      resetForm()
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to update page')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCmsPage(id),
    onSuccess: () => {
      toast.success('Page deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-cms-pages'] })
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to delete page')),
  })

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      adminApi.updateCmsPage(id, { publish }),
    onSuccess: () => {
      toast.success('Page status updated')
      queryClient.invalidateQueries({ queryKey: ['admin-cms-pages'] })
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to update status')),
  })

  const pages = data?.content || []
  const totalPages = data?.totalPages || 0

  const resetForm = () => {
    setForm({ slug: '', title: '', content: '', metaDescription: '' })
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (p: CmsPage) => {
    setForm({ slug: p.slug, title: p.title, content: p.content, metaDescription: p.metaDescription || '' })
    setEditingId(p.id)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ title: form.title, content: form.content, metaDescription: form.metaDescription })
    } else {
      createMutation.mutate()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">CMS Pages</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage static pages (About, Terms, etc.)</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Page
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 mb-6">
          <h2 className="font-semibold mb-4 dark:text-white">{editingId ? 'Edit Page' : 'Create New Page'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="about-us"
                  required
                  className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Description</label>
              <input
                type="text"
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content (HTML)</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                required
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pages Table */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading pages...</div>
        ) : pages.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No pages yet. Create your first page.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300">Title</th>
                <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300">Slug</th>
                <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300 w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {pages.map((p: CmsPage) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-3 font-medium dark:text-white">{p.title}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">/{p.slug}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      p.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {p.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1">
                      {/* The public route only serves published pages — a draft link would 404 */}
                      {p.isPublished ? (
                        <a
                          href={`/pages/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-primary rounded"
                          title="View live"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span
                          className="p-1.5 text-gray-200 dark:text-gray-600 rounded cursor-not-allowed"
                          title="Publish to view live"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </span>
                      )}
                      <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-primary rounded" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => togglePublishMutation.mutate({ id: p.id, publish: !p.isPublished })}
                        className="p-1.5 text-gray-400 hover:text-primary rounded"
                        title={p.isPublished ? 'Unpublish' : 'Publish'}
                      >
                        {p.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this page?')) deleteMutation.mutate(p.id) }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
