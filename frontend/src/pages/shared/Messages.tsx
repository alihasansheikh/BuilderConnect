import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { chatApi } from '@/services/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { resolveAssetUrl } from '@/lib/utils'
import {
  MessageSquare,
  Search,
  Send,
  ArrowLeft,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'

interface Participant {
  id: number
  name: string
  profileImageUrl?: string
}

interface ChatRoom {
  id: number
  name?: string
  roomType: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCount?: number
  participants?: Participant[]
}

interface ChatMessage {
  id: number
  senderId: number
  senderName?: string
  senderPhotoUrl?: string
  content: string
  createdAt: string
  editedAt?: string
  isEdited?: boolean
  isDeleted: boolean
}

export default function Messages() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { connected, subscribe, publish } = useWebSocket()

  const [searchParams, setSearchParams] = useSearchParams()
  const roomIdParam = searchParams.get('roomId')

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    roomIdParam && Number.isFinite(Number(roomIdParam)) ? Number(roomIdParam) : null
  )
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map())
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  // Fetch chat rooms
  const { data: roomsData, isLoading: roomsLoading, isError: roomsError, refetch: refetchRooms } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => chatApi.getRooms({ size: 100 }).then((r) => r.data),
    refetchInterval: 120000, // Fallback only — WebSocket /user/queue/chat-updates handles real-time
  })

  const rooms: ChatRoom[] = roomsData?.content || []
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null

  // Fetch messages for selected room (no polling — WebSocket handles real-time)
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', selectedRoomId],
    queryFn: () =>
      chatApi.getMessages(selectedRoomId!, { size: 50 }).then((r) => r.data),
    enabled: selectedRoomId !== null,
  })

  const messages: ChatMessage[] = useMemo(
    () => messagesData?.content ? [...messagesData.content].reverse() : [],
    [messagesData?.content]
  )

  // ==================== WebSocket Subscriptions ====================

  // Cross-room updates: listen for messages in ALL rooms this user participates in
  useEffect(() => {
    if (!connected) return

    const unsub = subscribe('/user/queue/chat-updates', (_msg) => {
      try {
        // Refresh rooms sidebar to show new message preview and unread count
        queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
      } catch (e) {
        console.error('[Chat] Failed to parse chat update:', e)
      }
    })

    return () => {
      try { unsub() } catch (e) { /* ignore cleanup errors */ }
    }
  }, [connected, subscribe, queryClient])

  // Selected room subscriptions
  useEffect(() => {
    if (!connected || !selectedRoomId) return

    const unsubs: (() => void)[] = []

    // New messages — insert directly into cache for instant rendering
    unsubs.push(
      subscribe(`/topic/chat/${selectedRoomId}`, (msg) => {
        const newMsg = JSON.parse(msg.body)
        // Only process messages from OTHER users (own messages handled by sendMutation)
        if (newMsg.senderId !== user?.id) {
          queryClient.setQueryData(
            ['chat-messages', selectedRoomId],
            (old: any) => {
              if (!old?.content) return old
              // Deduplicate by message ID
              if (old.content.some((m: any) => m.id === newMsg.id)) return old
              // Prepend to content array (raw data is newest-first; .reverse() in render puts it at bottom)
              return { ...old, content: [newMsg, ...old.content] }
            }
          )
          queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
          // Auto-read since user is viewing this room, then sync the sidebar badge
          chatApi.markAsRead(selectedRoomId).then(() => {
            queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] })
          }).catch(() => {})
        }
      })
    )

    // Edited messages
    unsubs.push(
      subscribe(`/topic/chat/${selectedRoomId}/edit`, (msg) => {
        const editedMsg = JSON.parse(msg.body)
        queryClient.setQueryData(
          ['chat-messages', selectedRoomId],
          (old: any) => {
            if (!old?.content) return old
            return {
              ...old,
              content: old.content.map((m: any) =>
                m.id === editedMsg.id ? editedMsg : m
              ),
            }
          }
        )
      })
    )

    // Deleted messages
    unsubs.push(
      subscribe(`/topic/chat/${selectedRoomId}/delete`, (msg) => {
        const deletedMsg = JSON.parse(msg.body)
        queryClient.setQueryData(
          ['chat-messages', selectedRoomId],
          (old: any) => {
            if (!old?.content) return old
            return {
              ...old,
              content: old.content.map((m: any) =>
                m.id === deletedMsg.id
                  ? { ...m, isDeleted: true, content: '' }
                  : m
              ),
            }
          }
        )
      })
    )

    // Typing indicators
    unsubs.push(
      subscribe(`/topic/chat/${selectedRoomId}/typing`, (msg) => {
        const data = JSON.parse(msg.body)
        if (data.userId === user?.id) return

        setTypingUsers((prev) => {
          const next = new Map(prev)
          if (data.typing) {
            next.set(data.userId, data.userName)
          } else {
            next.delete(data.userId)
          }
          return next
        })

        // Auto-clear typing after 3 seconds
        if (data.typing) {
          setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Map(prev)
              next.delete(data.userId)
              return next
            })
          }, 3000)
        }
      })
    )

    return () => unsubs.forEach((fn) => {
      try { fn() } catch (e) { /* ignore cleanup errors */ }
    })
  }, [connected, selectedRoomId, subscribe, queryClient, user?.id])

  // Mark as read when selecting a room
  useEffect(() => {
    if (selectedRoomId) {
      chatApi.markAsRead(selectedRoomId).catch(() => {})
      queryClient.setQueryData(['chat-rooms'], (old: any) => {
        if (!old?.content) return old
        const readRoom = old.content.find((r: any) => r.id === selectedRoomId)
        const readCount = readRoom?.unreadCount || 0
        const updated = {
          ...old,
          content: old.content.map((r: any) =>
            r.id === selectedRoomId ? { ...r, unreadCount: 0 } : r
          ),
        }
        // Decrement the sidebar badge by the number of messages just marked as read
        if (readCount > 0) {
          queryClient.setQueryData(['chat-unread-count'], (oldCount: any) => {
            if (!oldCount) return { unreadCount: 0 }
            return { ...oldCount, unreadCount: Math.max(0, (oldCount.unreadCount || 0) - readCount) }
          })
        }
        return updated
      })
    }
  }, [selectedRoomId, queryClient])

  // ==================== Mutations ====================

  const sendMutation = useMutation({
    mutationFn: ({ roomId, content }: { roomId: number; content: string }) =>
      chatApi.sendMessage(roomId, content),
  })

  const editMutation = useMutation({
    mutationFn: ({
      messageId,
      content,
    }: {
      messageId: number
      content: string
    }) => chatApi.editMessage(messageId, content),
    onSuccess: () => {
      setEditingMessageId(null)
      setEditContent('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (messageId: number) => chatApi.deleteMessage(messageId),
  })

  // ==================== Handlers ====================

  const handleSendMessage = () => {
    const content = newMessage.trim()
    if (!content || !selectedRoomId) return
    const roomId = selectedRoomId // capture current value
    setNewMessage('')
    sendMutation.mutate(
      { roomId, content },
      {
        onSuccess: (response) => {
          const savedMsg = response.data
          // Insert saved message directly into cache for instant rendering
          queryClient.setQueryData(
            ['chat-messages', roomId],
            (old: any) => {
              if (!old?.content) return old
              // Deduplicate by message ID
              if (old.content.some((m: any) => m.id === savedMsg.id)) return old
              // Prepend (raw data is newest-first)
              return { ...old, content: [savedMsg, ...old.content] }
            }
          )
          queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
        },
        onError: () => {
          // On error, refetch to ensure consistency
          queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] })
        },
      }
    )
    sendTypingStatus(false)
  }

  // Open the room named in `?roomId=` — this is how "Contact" on a builder page lands here.
  // The room may not be in `rooms` yet on the first render; the messages query keys off
  // selectedRoomId alone, and the list catches up once its refetch settles.
  useEffect(() => {
    if (!roomIdParam) return
    const id = Number(roomIdParam)
    if (!Number.isFinite(id)) return
    setSelectedRoomId(id)
    setShowMobileChat(true)
  }, [roomIdParam])

  const handleSelectRoom = (roomId: number) => {
    setSelectedRoomId(roomId)
    setShowMobileChat(true)
    setTypingUsers(new Map())
    setSearchParams({ roomId: String(roomId) }, { replace: true })
  }

  const handleBackToRooms = () => {
    setShowMobileChat(false)
  }

  // Typing indicator
  const sendTypingStatus = useCallback(
    (typing: boolean) => {
      if (!connected || !selectedRoomId) return
      publish(`/app/chat/${selectedRoomId}/typing`, { typing })
    },
    [connected, selectedRoomId, publish]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendTypingStatus(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      sendTypingStatus(false)
    }, 2000)
  }

  const handleEditStart = (message: ChatMessage) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
    setMenuOpenId(null)
  }

  const handleEditSave = () => {
    if (!editingMessageId || !editContent.trim()) return
    editMutation.mutate({
      messageId: editingMessageId,
      content: editContent.trim(),
    })
  }

  const handleEditCancel = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleDelete = (messageId: number) => {
    if (window.confirm('Delete this message?')) {
      deleteMutation.mutate(messageId)
      setMenuOpenId(null)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Close menu on outside click
  useEffect(() => {
    const handleClick = () => setMenuOpenId(null)
    if (menuOpenId !== null) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [menuOpenId])

  // ==================== Formatters ====================

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRoomTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    if (diffMs < 0) return 'Just now'
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return formatTime(dateString)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.name) return room.name
    const other = room.participants?.find((p) => p.id !== user?.id)
    return other?.name || 'Chat'
  }

  const getRoomImageUrl = (room: ChatRoom) => {
    const other = room.participants?.find((p) => p.id !== user?.id)
    return other?.profileImageUrl || null
  }

  const filteredRooms = rooms.filter((room) =>
    getRoomDisplayName(room).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const typingText =
    typingUsers.size > 0
      ? Array.from(typingUsers.values()).join(', ') +
        (typingUsers.size === 1 ? ' is typing...' : ' are typing...')
      : null

  // ==================== Render ====================

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Messages</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Communicate with builders and clients
            {connected && (
              <span
                className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full"
                title="Real-time connected"
              />
            )}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl shadow-card h-[calc(100%-4rem)] flex overflow-hidden border dark:border-gray-700">
        {/* ==================== Conversations List ==================== */}
        <div
          className={`w-full md:w-1/3 border-r dark:border-gray-700 flex flex-col ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Loading...
                </p>
              </div>
            ) : roomsError ? (
              <div className="text-center py-12 px-4">
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400 font-medium text-sm">Failed to load conversations</p>
                <button onClick={() => refetchRooms()} className="mt-2 text-sm text-primary hover:underline">Try again</button>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No conversations yet
                </p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleSelectRoom(room.id)}
                  className={`p-4 border-b dark:border-gray-700 cursor-pointer transition-colors ${
                    selectedRoomId === room.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getRoomImageUrl(room) ? (
                      <img src={resolveAssetUrl(getRoomImageUrl(room))} alt={getRoomDisplayName(room)} loading="lazy" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium flex-shrink-0">
                        {getRoomDisplayName(room).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium truncate dark:text-white">
                          {getRoomDisplayName(room)}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatRoomTime(room.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {room.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    {(room.unreadCount || 0) > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex-shrink-0">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ==================== Chat Area ==================== */}
        <div
          className={`flex-col flex-1 ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
                <button
                  onClick={handleBackToRooms}
                  className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <ArrowLeft className="h-5 w-5 dark:text-gray-300" />
                </button>
                {getRoomImageUrl(selectedRoom) ? (
                  <img src={resolveAssetUrl(getRoomImageUrl(selectedRoom))} alt={getRoomDisplayName(selectedRoom)} loading="lazy" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                    {getRoomDisplayName(selectedRoom).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-medium dark:text-white">
                    {getRoomDisplayName(selectedRoom)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {typingText || selectedRoom.roomType}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start the conversation!</p>
                    </div>
                  </div>
                ) : null}
                {messages.map((message) => {
                  const isOwn = message.senderId === user?.id
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                    >
                      {!isOwn && (
                        message.senderPhotoUrl ? (
                          <img src={resolveAssetUrl(message.senderPhotoUrl)} alt={message.senderName} loading="lazy" className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end" />
                        ) : (
                          <div className="w-7 h-7 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0 self-end dark:text-gray-200">
                            {message.senderName?.charAt(0).toUpperCase()}
                          </div>
                        )
                      )}
                      <div className="relative max-w-[70%]">
                        {/* Message actions menu (own messages only) */}
                        {isOwn &&
                          !message.isDeleted &&
                          editingMessageId !== message.id && (
                            <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMenuOpenId(
                                    menuOpenId === message.id
                                      ? null
                                      : message.id
                                  )
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              </button>
                              {menuOpenId === message.id && (
                                <div className="absolute right-0 top-8 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-10 py-1 min-w-[100px]">
                                  <button
                                    onClick={() => handleEditStart(message)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <Edit2 className="h-3 w-3" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(message.id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <Trash2 className="h-3 w-3" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                        <div
                          className={`px-4 py-2 rounded-lg ${
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {message.senderName}
                            </p>
                          )}
                          {message.isDeleted ? (
                            <p className="italic opacity-60">
                              Message deleted
                            </p>
                          ) : editingMessageId === message.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditSave()
                                  if (e.key === 'Escape') handleEditCancel()
                                }}
                                className="w-full px-2 py-1 rounded text-gray-900 bg-white dark:bg-gray-600 dark:text-white text-sm border-0 focus:ring-1 focus:ring-white/50"
                                autoFocus
                              />
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={handleEditCancel}
                                  className="p-1 hover:bg-white/20 rounded"
                                  title="Cancel"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={handleEditSave}
                                  className="p-1 hover:bg-white/20 rounded"
                                  title="Save"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p>{message.content}</p>
                          )}
                          <p
                            className={`text-xs mt-1 ${
                              isOwn
                                ? 'text-primary-foreground/70'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {formatTime(message.createdAt)}
                            {message.isEdited && ' (edited)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicator */}
              {typingText && (
                <div className="px-4 py-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {typingText}
                  </p>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      handleSendMessage()
                    }
                    className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={
                      !newMessage.trim() || sendMutation.isPending
                    }
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Select a conversation
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
