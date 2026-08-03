import { Suspense, lazy, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { usePublicSettings } from '@/hooks/usePublicSettings'

// Lazy so react-markdown + the panel stay out of the initial public bundle.
const ChatPanel = lazy(() =>
  import('./ChatPanel').then((m) => ({ default: m.ChatPanel })),
)

/**
 * Public FAQ chatbot: a floating bubble on the marketing pages that opens a
 * grounded assistant panel. Hidden entirely unless the server reports the
 * chatbot as enabled (admin toggle on AND a Gemini key configured).
 */
export function PublicChatWidget() {
  const { data } = usePublicSettings()
  const [open, setOpen] = useState(false)

  if (!data?.chatbotEnabled) return null

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <ChatPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open the help assistant'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[61] flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-white shadow-lg shadow-primary/30 transition-all hover:brightness-110"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && <span className="hidden text-sm font-semibold sm:inline">Need help?</span>}
      </button>
    </>
  )
}
