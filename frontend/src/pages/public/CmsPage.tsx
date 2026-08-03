import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { ArrowLeft, FileText } from 'lucide-react'
import { cmsPublicApi } from '@/services/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav, renderPublicContent } from './PublicNav'

export default function CmsPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['public-cms-page', slug],
    queryFn: () => cmsPublicApi.getPage(slug as string).then((r) => r.data),
    enabled: !!slug,
    retry: false,
  })

  useEffect(() => {
    if (!page) return
    const previousTitle = document.title
    document.title = `${page.title} | BuilderConnect`

    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const createdMeta = !meta && !!page.metaDescription
    const previousDescription = meta?.content ?? ''
    if (page.metaDescription) {
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = page.metaDescription
    }

    return () => {
      document.title = previousTitle
      if (!page.metaDescription || !meta) return
      if (createdMeta) {
        meta.remove()
      } else {
        meta.content = previousDescription
      }
    }
  }, [page])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased">
      <PublicNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {isLoading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner label="Loading page..." />
          </div>
        ) : isError || !page ? (
          <div className="bg-white rounded-2xl shadow-card p-16 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Page coming soon</h1>
            <p className="text-gray-500 mb-6">
              This page isn't published yet — check back soon.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold hover:brightness-110 transition-all"
            >
              Go to homepage
            </Link>
          </div>
        ) : (
          <article className="bg-white rounded-2xl shadow-card p-8 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight pb-6 mb-6 border-b border-gray-100">
              {page.title}
            </h1>
            {renderPublicContent(page.content, (html) => DOMPurify.sanitize(html))}
          </article>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
