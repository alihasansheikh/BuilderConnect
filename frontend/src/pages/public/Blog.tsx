import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Newspaper, CalendarDays, User } from 'lucide-react'
import { cmsPublicApi } from '@/services/api'
import { resolveAssetUrl } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav } from './PublicNav'
import type { BlogPost } from '@/types'

function formatPostDate(post: BlogPost): string {
  const date = post.publishedAt || post.createdAt
  try {
    return format(new Date(date), 'MMM d, yyyy')
  } catch {
    return ''
  }
}

export default function Blog() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-blog'],
    queryFn: () => cmsPublicApi.getBlog({ size: 50 }).then((r) => r.data),
  })

  const posts: BlogPost[] = data?.content || []

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">BuilderConnect Blog</h1>
          <p className="text-gray-600">
            Construction tips, industry insights, and platform updates from across Pakistan.
          </p>
        </div>

        {isLoading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner label="Loading posts..." />
          </div>
        ) : isError || posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-16 text-center">
            <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No posts yet</h2>
            <p className="text-gray-500">
              We're working on fresh content — check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="bg-white rounded-2xl shadow-card p-6 flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                {post.coverImageUrl && (
                  <img
                    src={resolveAssetUrl(post.coverImageUrl)}
                    alt={post.title}
                    loading="lazy"
                    className="w-full aspect-video object-cover rounded-xl mb-4"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                {post.category && (
                  <span className="self-start mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
                    {post.category}
                  </span>
                )}
                <h2 className="text-xl font-bold mb-2 hover:text-primary transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-4 text-xs text-gray-500">
                  {post.authorName && (
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {post.authorName}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatPostDate(post)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
