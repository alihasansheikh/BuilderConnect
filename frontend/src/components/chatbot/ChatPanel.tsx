import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Trash2, X, Sparkles } from 'lucide-react'
import { chatbotApi, getApiErrorMessage } from '@/services/api'
import { usePublicSettings } from '@/hooks/usePublicSettings'
import { loadTranscript, saveTranscript, clearTranscript } from '@/lib/chatTranscript'
import { cn } from '@/lib/utils'
import type { ChatbotMessage } from '@/types'

const GREETING =
  "Hi! I'm the BuilderConnect Assistant. Ask me anything about using the platform — creating a project, getting verified, ordering materials, and more."
const STARTERS = [
  'How do I create a project?',
  'How do builders get verified?',
  'How do lead credits & subscriptions work?',
  'How do I order materials?',
]
const MAX_QUESTION = 500
const MAX_HISTORY = 6

interface ChatPanelProps {
  onClose: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const { data: settings } = usePublicSettings()
  const [messages, setMessages] = useState<ChatbotMessage[]>(() => loadTranscript())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveTranscript(messages)
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (raw: string) => {
    const question = raw.trim().slice(0, MAX_QUESTION)
    if (!question || loading) return

    const history = messages.slice(-MAX_HISTORY)
    const userMsg: ChatbotMessage = { role: 'user', content: question }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chatbotApi.ask(question, history)
      const botMsg: ChatbotMessage = { role: 'assistant', content: res.data.answer }
      setMessages((prev) => [...prev, botMsg])
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const contact = settings?.supportPhone
        ? `${settings.supportEmail} or ${settings.supportPhone}`
        : settings?.supportEmail ?? 'our support team'
      const content =
        status === 503
          ? `I'm getting a lot of questions right now — please try again in a moment, or contact support at **${contact}**.`
          : getApiErrorMessage(err, 'Something went wrong. Please try again in a moment.')
      setMessages((prev) => [...prev, { role: 'assistant', content }])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    clearTranscript()
    setMessages([])
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[560px] sm:max-h-[80vh] sm:w-[380px] sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-card sm:overflow-hidden">
      <div className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold leading-none">BuilderConnect Assistant</p>
            <p className="mt-1 text-[11px] text-white/80">AI assistant — answers may be inaccurate</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear conversation"
            title="Clear conversation"
            className="rounded-lg p-1.5 transition-colors hover:bg-white/15"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="rounded-lg p-1.5 transition-colors hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
            {GREETING}
          </div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-primary/30 px-3 py-1.5 text-left text-xs text-primary transition-colors hover:bg-primary/5"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                m.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900',
              )}
            >
              {m.role === 'assistant' ? (
                <div className="text-sm [&_a]:text-primary [&_a]:underline [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-3 py-2 text-gray-500">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2 border-t border-gray-200 bg-white p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={MAX_QUESTION}
          placeholder="Ask a question…"
          aria-label="Your question"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="bg-white pb-1 text-center text-[10px] text-gray-400">Powered by AI</p>
    </div>
  )
}
