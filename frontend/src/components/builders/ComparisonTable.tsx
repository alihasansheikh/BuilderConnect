import { Link, useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Star, CheckCircle, XCircle } from 'lucide-react'
import { builderApi } from '@/services/api'
import { parseJsonArray } from '@/lib/utils'
import type { BuilderData } from '@/types'

interface ComparisonTableProps {
  /** Where the "back"/"select builders" links point (the directory this comparison came from). */
  backTo: string
}

function formatPKR(amount: number | null | undefined): string {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function renderStars(rating: number) {
  const r = rating || 0
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= Math.floor(r) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">{r.toFixed(1)}</span>
    </div>
  )
}

function boolCell(val: boolean) {
  return val ? (
    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
  ) : (
    <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
  )
}

export function ComparisonTable({ backTo }: ComparisonTableProps) {
  const [searchParams] = useSearchParams()
  const idsParam = searchParams.get('ids') || ''
  const ids = idsParam
    .split(',')
    .map(Number)
    .filter((n) => n > 0)
    .slice(0, 4)

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['builder', id],
      queryFn: () => builderApi.getBuilder(id).then((r) => r.data as BuilderData),
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const builders = queries.map((q) => q.data).filter(Boolean) as BuilderData[]

  if (ids.length < 2) {
    return (
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-12 text-center max-w-md mx-auto">
        <h2 className="text-lg font-bold mb-2 dark:text-white">Select builders to compare</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Please select at least 2 builders to compare.</p>
        <Link to={backTo} className="text-primary hover:underline">
          Back to Builders
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading builder profiles...</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left px-4 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 font-medium text-gray-500 dark:text-gray-400 text-sm w-48">
              Attribute
            </th>
            {builders.map((b) => (
              <th
                key={b.id}
                className="text-center px-4 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 min-w-[200px]"
              >
                <div className="font-bold text-base dark:text-white">{b.companyName || b.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">{b.name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Rating
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3 text-center">
                <div className="flex justify-center">{renderStars(b.averageRating)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.totalReviews} reviews</div>
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              City
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3 text-center text-sm dark:text-gray-300">
                {b.city || '—'}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Experience
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3 text-center text-sm dark:text-gray-300">
                {b.yearsOfExperience > 0 ? `${b.yearsOfExperience} years` : '—'}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Primary Trade
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3 text-center text-sm dark:text-gray-300">
                {b.primaryTrade || '—'}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Projects Completed
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3 text-center text-sm font-semibold dark:text-gray-300">
                {b.totalProjectsCompleted}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Hourly Rate
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3 text-center text-sm dark:text-gray-300">
                {formatPKR(b.hourlyRate)}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Verified
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3">
                {boolCell(b.isVerified)}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Available Now
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3">
                {boolCell(b.isAvailable)}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Plan
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    b.subscriptionTier === 'ENTERPRISE'
                      ? 'bg-purple-100 text-purple-800'
                      : b.subscriptionTier === 'PROFESSIONAL'
                        ? 'bg-blue-100 text-blue-800'
                        : b.subscriptionTier === 'BASIC'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {b.subscriptionTier}
                </span>
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Specializations
            </td>
            {builders.map((b) => {
              const specs = parseJsonArray(b.specializations)
              return (
                <td key={b.id} className="px-4 py-3 text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {specs.length > 0 ? (
                      specs.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded text-xs"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>

          <tr>
            <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              Actions
            </td>
            {builders.map((b) => (
              <td key={b.id} className="px-4 py-3 text-center">
                <Link
                  to={`/profile/${b.userId}`}
                  className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
                >
                  View Profile
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
