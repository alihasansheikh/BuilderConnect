import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { locationApi } from '@/services/api'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

interface LocalityAutocompleteProps {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Biases suggestions to this city (Pakistan-restricted). */
  city?: string
  placeholder?: string
  className?: string
}

/**
 * Locality/area field with Google Places suggestions (via the backend proxy).
 * Free-text friendly: users can type anything; suggestions are optional help and
 * never block input. If the key is missing or the API errors, the field simply
 * behaves as a plain text input.
 */
export function LocalityAutocomplete({
  id,
  value,
  onChange,
  city,
  placeholder = 'e.g., DHA Phase 5',
  className,
}: LocalityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  // Skip the fetch immediately after a suggestion is picked (value === typed).
  const justPickedRef = useRef(false)
  const debounced = useDebounce(value, 300)

  useEffect(() => {
    if (justPickedRef.current) {
      justPickedRef.current = false
      return
    }
    const q = debounced.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    let active = true
    locationApi
      .autocomplete(q, city)
      .then((r) => {
        if (active) setSuggestions(r.data.suggestions ?? [])
      })
      .catch(() => {
        if (active) setSuggestions([])
      })
    return () => {
      active = false
    }
  }, [debounced, city])

  const pick = (s: string) => {
    justPickedRef.current = true
    onChange(s)
    setSuggestions([])
    setOpen(false)
  }

  const showList = open && suggestions.length > 0 && suggestions[0] !== value

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          placeholder={placeholder}
          className={cn(className, 'pl-9')}
        />
      </div>
      {showList && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
