import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import DOMPurify from 'dompurify'
import { ArrowLeft, CalendarDays, Newspaper, User } from 'lucide-react'
import { cmsPublicApi } from '@/services/api'
import { resolveAssetUrl } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav, renderPublicContent } from './PublicNav'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['public-blog-post', slug],
    queryFn: () => cmsPublicApi.getBlogPost(slug as string).then((r) => r.data),
    enabled: !!slug,
    retry: false,
  })

  const publishedDate = (() => {
    if (!post) return ''
    try {
      return format(new Date(post.publishedAt || post.createdAt), 'MMMM d, yyyy')
    } catch {
      return ''
    }
  })()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased">
      <PublicNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        {isLoading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner label="Loading post..." />
          </div>
        ) : isError || !post ? (
          <div className="bg-white rounded-2xl shadow-card p-16 text-center">
            <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Post not found</h1>
            <p className="text-gray-500 mb-6">
              This post may have been removed or is not published yet.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold hover:brightness-110 transition-all"
            >
              Browse all posts
            </Link>
          </div>
        ) : (
          <article className="bg-white rounded-2xl shadow-card p-8 sm:p-10">
            {post.category && (
              <span className="inline-block mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
                {post.category}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">{post.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 pb-6 mb-6 border-b border-gray-100">
              {post.authorName && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {post.authorName}
                </span>
              )}
              {publishedDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {publishedDate}
                </span>
              )}
            </div>
            {post.coverImageUrl && (
              <img
                src={resolveAssetUrl(post.coverImageUrl)}
                alt={post.title}
                loading="lazy"
                className="w-full aspect-video object-cover rounded-xl mb-6"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            {renderPublicContent(post.content, (html) => DOMPurify.sanitize(html))}
          </article>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
