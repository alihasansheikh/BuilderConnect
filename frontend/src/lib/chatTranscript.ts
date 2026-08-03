import type { ChatbotMessage } from '@/types'

/**
 * Browser-local persistence for the public FAQ chatbot conversation. Nothing is
 * sent to the server — the transcript lives only in this browser so the chat
 * survives navigation and reloads. All access is wrapped in try/catch because
 * localStorage can throw (private mode / quota / disabled).
 */
const STORAGE_KEY = 'bc-chatbot-transcript'

export function loadTranscript(): ChatbotMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is ChatbotMessage =>
        !!m &&
        typeof m === 'object' &&
        ((m as ChatbotMessage).role === 'user' || (m as ChatbotMessage).role === 'assistant') &&
        typeof (m as ChatbotMessage).content === 'string',
    )
  } catch {
    return []
  }
}

export function saveTranscript(messages: ChatbotMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // storage unavailable — non-fatal, the conversation just won't persist
  }
}

export function clearTranscript(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // non-fatal
  }
}
