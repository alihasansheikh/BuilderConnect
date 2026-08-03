import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SlidersHorizontal, X, GitCompareArrows, SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { builderApi, chatApi, getApiErrorMessage } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'
import { parseJsonArray, resolveAssetUrl } from '@/lib/utils'
import { roleToSegment } from '@/lib/roleSegment'
import type { BuilderSummary } from '@/types'

const CITIES = ['All Cities', 'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan']

const SPECIALIZATIONS = [
  'General Contracting',
  'Residential',
  'Commercial',
  'Renovation',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Roofing',
  'Landscaping',
  'Interior Design',
]

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'projects', label: 'Most Projects' },
  { value: 'reviews', label: 'Most Reviews' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

const SEARCH_DEBOUNCE_MS = 400

interface BuilderDirectoryProps {
  /** Base path the compare CTA navigates to (ids are appended as a query string). */
  compareLinkBase: string
  /** Optional override for the Contact action; defaults to opening a direct chat room. */
  onContact?: (builderUserId: number) => void
}

function renderStars(rating: number) {
  const r = rating || 0
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.floor(r) ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
      <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">{r.toFixed(1)}</span>
    </div>
  )
}

export function BuilderDirectory({ compareLinkBase, onContact }: BuilderDirectoryProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [contactingId, setContactingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('All Cities')
  const [sortBy, setSortBy] = useState<SortValue>('rating')
  const [showFilters, setShowFilters] = useState(false)
  const [compareIds, setCompareIds] = useState<number[]>([])
  const [selectedSpecialization, setSelectedSpecialization] = useState('')
  const [minExperience, setMinExperience] = useState('')
  const [maxExperience, setMaxExperience] = useState('')
  const [minRating, setMinRating] = useState('')
  // Available-only by default (matches the directory's server default); uncheck to include
  // builders who are not currently accepting work.
  const [availableOnly, setAvailableOnly] = useState(true)

  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)
  const cityParam = selectedCity === 'All Cities' ? undefined : selectedCity
  const textParam = debouncedSearch.trim() || undefined
  const hasAdvancedFilters =
    !!selectedSpecialization || !!minExperience || !!maxExperience || !!minRating || !availableOnly

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      'builders',
      cityParam,
      textParam,
      selectedSpecialization,
      minExperience,
      maxExperience,
      minRating,
      availableOnly,
    ],
    queryFn: () =>
      builderApi
        .searchBuilders({
          city: cityParam,
          text: textParam,
          specialization: selectedSpecialization || undefined,
          minExperience: minExperience ? Number(minExperience) : undefined,
          maxExperience: maxExperience ? Number(maxExperience) : undefined,
          minRating: minRating ? Number(minRating) : undefined,
          isAvailable: availableOnly,
          size: 50,
        })
        .then((r) => r.data),
  })

  const builders: BuilderSummary[] = data?.content || []

  const sortedBuilders = [...builders].sort((a, b) => {
    if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0)
    if (sortBy === 'projects') return (b.totalProjectsCompleted || 0) - (a.totalProjectsCompleted || 0)
    return (b.totalReviews || 0) - (a.totalReviews || 0)
  })

  const toggleCompare = (id: number) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  const clearFilters = () => {
    setSelectedSpecialization('')
    setMinExperience('')
    setMaxExperience('')
    setMinRating('')
    setAvailableOnly(true)
    setSelectedCity('All Cities')
    setSearchTerm('')
  }

  const handleContact = async (builderUserId: number) => {
    if (onContact) {
      onContact(builderUserId)
      return
    }
    if (!user) {
      navigate('/login')
      return
    }
    setContactingId(builderUserId)
    try {
      const { data: room } = await chatApi.createDirectRoom(builderUserId)
      // The room list is cached, so a brand-new room is absent until something marks it stale.
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
      navigate(`/${roleToSegment(user.role)}/messages?roomId=${room.id}`)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to start conversation'))
    } finally {
      setContactingId(null)
    }
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
            <div className="flex gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    sortBy === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${
              showFilters || hasAdvancedFilters
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasAdvancedFilters && (
              <span className="ml-1 bg-white text-primary rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                !
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Specialization</label>
                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Specializations</option>
                  {SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Experience (years)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    min="0"
                    value={minExperience}
                    onChange={(e) => setMinExperience(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    min="0"
                    value={maxExperience}
                    onChange={(e) => setMaxExperience(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Any Rating</option>
                  <option value="3">3+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-3 py-2 border dark:border-gray-600 rounded-md cursor-pointer w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Available only
                </label>
              </div>
            </div>
            {hasAdvancedFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <X className="h-3.5 w-3.5" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Compare Bar */}
      {compareIds.length > 0 && (
        <div className="bg-primary text-primary-foreground rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {compareIds.length} builder{compareIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCompareIds([])}
              className="px-3 py-1 text-sm border border-white/30 rounded hover:bg-white/10"
            >
              Clear
            </button>
            <button
              onClick={() => navigate(`${compareLinkBase}?ids=${compareIds.join(',')}`)}
              disabled={compareIds.length < 2}
              className="flex items-center gap-1.5 px-3 py-1 text-sm bg-white text-primary rounded font-medium disabled:opacity-50"
            >
              <GitCompareArrows className="h-4 w-4" />
              Compare
            </button>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {isLoading
          ? 'Loading...'
          : `Showing ${sortedBuilders.length} builder${sortedBuilders.length !== 1 ? 's' : ''}`}
      </div>

      {/* States */}
      {isLoading ? (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading builders...</p>
        </div>
      ) : isError ? (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-12 text-center">
          <p className="text-red-500">Failed to load builders. Please try again.</p>
        </div>
      ) : sortedBuilders.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-12 text-center">
          <SearchX className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="text-lg font-medium mb-2 dark:text-white">No builders found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your search filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBuilders.map((builder) => {
            const specs = parseJsonArray(builder.specializations)
            return (
              <div
                key={builder.id}
                className={`bg-white dark:bg-card rounded-2xl shadow-card hover:shadow-md transition-shadow overflow-hidden ${
                  compareIds.includes(builder.id) ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {builder.profileImageUrl ? (
                        <img
                          src={resolveAssetUrl(builder.profileImageUrl)}
                          alt={builder.name}
                          loading="lazy"
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">
                          👷
                        </div>
                      )}
                      <input
                        type="checkbox"
                        checked={compareIds.includes(builder.id)}
                        onChange={() => toggleCompare(builder.id)}
                        className="absolute -top-1 -left-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        title="Select to compare"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate dark:text-white">
                          {builder.companyName || builder.name}
                        </h3>
                        {builder.isVerified && (
                          <span className="text-blue-500 flex-shrink-0" title="Verified">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{builder.name}</p>
                      {builder.city && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">📍 {builder.city}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    {renderStars(builder.averageRating)}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {builder.totalReviews || 0} reviews • {builder.totalProjectsCompleted || 0} projects completed
                      {builder.yearsOfExperience > 0 && <> • {builder.yearsOfExperience} yrs exp</>}
                    </p>
                  </div>

                  {specs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {specs.slice(0, 3).map((spec) => (
                        <span
                          key={spec}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300"
                        >
                          {spec}
                        </span>
                      ))}
                      {specs.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-500 dark:text-gray-400">
                          +{specs.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t dark:border-gray-700 flex gap-2">
                    <Link
                      to={`/profile/${builder.userId}`}
                      className="flex-1 text-center px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm dark:text-gray-300"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => handleContact(builder.userId)}
                      disabled={contactingId === builder.userId}
                      className="flex-1 text-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 text-sm"
                    >
                      {contactingId === builder.userId ? 'Connecting...' : 'Contact'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
