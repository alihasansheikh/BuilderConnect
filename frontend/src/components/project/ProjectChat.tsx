import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/hooks/useWebSocket'
import { chatApi, getApiErrorMessage } from '@/services/api'
import type { ChatMessage } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatRelativeTime } from '@/lib/formatters'
import { resolveAssetUrl } from '@/lib/utils'
import { roleToSegment } from '@/lib/roleSegment'

interface ProjectChatProps {
  projectId: number
}

function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { connected, subscribe } = useWebSocket()

  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // The project chat room is created lazily and 400s until an awarded builder exists.
  const {
    data: room,
    isLoading: roomLoading,
    isError: roomError,
    error: roomErr,
  } = useQuery({
    queryKey: ['project-chat-room', projectId],
    queryFn: () => chatApi.getProjectRoom(projectId).then((r) => r.data),
    retry: false,
  })

  const roomId = room?.id ?? null

  const { data: messagesPage, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: () => chatApi.getMessages(roomId!, { size: 50 }).then((r) => r.data),
    enabled: roomId !== null,
  })

  // Backend returns newest-first; reverse so the newest sits at the bottom.
  const messages: ChatMessage[] = useMemo(
    () => (messagesPage?.content ? [...messagesPage.content].reverse() : []),
    [messagesPage?.content],
  )

  // Live updates for this room — append incoming from other users, deduped by id.
  useEffect(() => {
    if (!connected || roomId === null) return
    const unsub = subscribe(`/topic/chat/${roomId}`, (msg) => {
      try {
        const incoming = JSON.parse(msg.body) as ChatMessage
        if (incoming.senderId === user?.id) return
        queryClient.setQueryData(['chat-messages', roomId], (old: typeof messagesPage) => {
          if (!old?.content) return old
          if (old.content.some((m) => m.id === incoming.id)) return old
          return { ...old, content: [incoming, ...old.content] }
        })
      } catch {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] })
      }
    })
    return () => {
      try { unsub() } catch { /* ignore cleanup errors */ }
    }
  }, [connected, roomId, subscribe, queryClient, user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(roomId!, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] }),
  })

  const handleSend = () => {
    const content = draft.trim()
    if (!content || roomId === null) return
    setDraft('')
    sendMutation.mutate(content)
  }

  const panel = 'bg-white dark:bg-card rounded-2xl shadow-card p-6'

  if (roomLoading) {
    return (
      <div className={panel}>
        <LoadingSpinner label="Loading conversation..." />
      </div>
    )
  }

  if (roomError || !room) {
    const isNotAwarded = errorStatus(roomErr) === 400
    return (
      <div className={panel}>
        <EmptyState
          icon={<MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-600" />}
          title={isNotAwarded ? 'Chat not available yet' : 'Unable to load chat'}
          description={
            isNotAwarded
              ? 'Chat opens once the project is awarded.'
              : getApiErrorMessage(roomErr, 'Could not load the project conversation.')
          }
        />
      </div>
    )
  }

  return (
    <div className={panel}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold dark:text-white">Project conversation</h2>
          {connected && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Real-time connected" />
          )}
        </div>
        <Link
          to={`/${roleToSegment(user?.role)}/messages?roomId=${room.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Open in Messages
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 h-80 overflow-y-auto p-4 space-y-3">
        {messagesLoading ? (
          <LoadingSpinner size="sm" label="Loading messages..." />
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.id
            const avatar = message.sender?.profileImageUrl
            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                  avatar ? (
                    <img
                      src={resolveAssetUrl(avatar)}
                      alt={message.senderName || 'User'}
                      loading="lazy"
                      className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0 self-end dark:text-gray-200">
                      {message.senderName?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border dark:border-gray-600'
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-medium mb-0.5 opacity-70">{message.senderName}</p>
                  )}
                  {message.isDeleted ? (
                    <p className="italic opacity-60 text-sm">Message deleted</p>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-primary-foreground/70' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {formatRelativeTime(message.createdAt)}
                    {message.isEdited && ' (edited)'}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <textarea
          rows={2}
          value={draft}
          placeholder="Type a message..."
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          className="flex-1 resize-none px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || sendMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  )
}
