import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import { Send, Trash2, Copy, Sparkles, Bot, Ruler } from 'lucide-react'
import { assistantApi, getApiErrorMessage } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import type { AiMessage, AssistantThread } from '@/types'

const GREETING =
  "Hi! I'm your BuilderConnect Assistant. Ask me anything about construction, budgeting, materials, timelines, or how to use the platform."
const STARTERS = [
  'Estimate a rough budget for my project',
  'How do I create and publish a project?',
  'Tips for hiring a reliable builder',
  'What materials & rough quantities do I need?',
]
const MAX_MESSAGE = 2000

/** A user message that reads like a request to design a house / floor plan. */
const FLOOR_PLAN_REQUEST = /design|floor ?plan|naqsha|house plan|\d+\s?marla|\d+\s?kanal|\d+\s?bed(room)?/i

interface FloorPlanPrefill {
  plotValue?: number
  plotUnit?: 'MARLA' | 'KANAL' | 'SQFT'
  bedrooms?: number
}

/** Pull plot size (marla/kanal) and bedroom count out of the request, when stated. */
function parseFloorPlanPrefill(text: string): FloorPlanPrefill | undefined {
  const prefill: FloorPlanPrefill = {}
  const marla = text.match(/(\d+(?:\.\d+)?)\s?marla/i)
  const kanal = text.match(/(\d+(?:\.\d+)?)\s?kanal/i)
  if (marla) {
    prefill.plotValue = Number(marla[1])
    prefill.plotUnit = 'MARLA'
  } else if (kanal) {
    prefill.plotValue = Number(kanal[1])
    prefill.plotUnit = 'KANAL'
  }
  const bed = text.match(/(\d+)\s?bed(?:room)?/i)
  if (bed) prefill.bedrooms = Number(bed[1])
  return Object.keys(prefill).length > 0 ? prefill : undefined
}

export default function AiAssistant() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const roleSegment = user?.role === 'BUILDER' ? 'builder' : 'client'

  const [messages, setMessages] = useState<AiMessage[]>([])
  const [enabled, setEnabled] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery<AssistantThread>({
    queryKey: ['assistant-thread'],
    queryFn: () => assistantApi.getThread().then((r) => r.data),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data) {
      setMessages(data.messages)
      setEnabled(data.enabled)
    }
  }, [data])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = async (raw: string) => {
    const message = raw.trim().slice(0, MAX_MESSAGE)
    if (!message || sending) return

    const optimistic: AiMessage = { id: Date.now(), role: 'USER', content: message, createdAt: null }
    setMessages((prev) => [...prev, optimistic])
    setInput('')
    setSending(true)
    try {
      const res = await assistantApi.sendMessage(message)
      setMessages((prev) => [...prev, res.data])
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const content =
        status === 503
          ? "I'm getting a lot of requests right now — please try again in a moment."
          : getApiErrorMessage(err, 'Something went wrong. Please try again.')
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ASSISTANT', content, createdAt: null }])
    } finally {
      setSending(false)
    }
  }

  const clearThread = async () => {
    if (messages.length === 0) return
    if (!window.confirm('Clear this conversation? This cannot be undone.')) return
    try {
      await assistantApi.clearThread()
      setMessages([])
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not clear the conversation.'))
    }
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Could not copy'),
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-primary px-4 py-3 text-white dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold leading-none">BuilderConnect Assistant</p>
            <p className="mt-1 text-[11px] text-white/80">AI assistant — verify important details</p>
          </div>
        </div>
        <button
          type="button"
          onClick={clearThread}
          disabled={messages.length === 0}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/15 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> Clear
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900/40">
        {isLoading && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">{GREETING}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={!enabled}
                  className="rounded-full border border-primary/30 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/5 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const requestText = prev?.content ?? ''
          const showFloorPlan =
            m.role === 'ASSISTANT' && prev?.role === 'USER' && FLOOR_PLAN_REQUEST.test(requestText)
          return (
            <div key={m.id} className={cn('flex', m.role === 'USER' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'group max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm',
                  m.role === 'USER'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white',
                )}
              >
                {m.role === 'ASSISTANT' ? (
                  <>
                    <div className="[&_a]:text-primary [&_a]:underline [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {showFloorPlan && (
                      <button
                        type="button"
                        onClick={() => {
                          const prefill = parseFloorPlanPrefill(requestText)
                          navigate(`/${roleSegment}/floor-plan`, prefill ? { state: prefill } : undefined)
                        }}
                        className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <Ruler className="h-3.5 w-3.5" /> Open Floor Plan Studio
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copy(m.content)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 dark:text-gray-400"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          )
        })}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-3.5 py-2.5 dark:bg-gray-700">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input / disabled notice */}
      {enabled ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_MESSAGE}
            placeholder="Ask about construction, budgeting, or the platform…"
            aria-label="Your message"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <div className="border-t border-gray-200 bg-white p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          The AI Assistant is currently unavailable. Please try again later.
        </div>
      )}
    </div>
  )
}
