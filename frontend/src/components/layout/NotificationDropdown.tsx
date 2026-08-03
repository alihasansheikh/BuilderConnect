import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isSoundMuted, setSoundMuted } from '@/lib/notificationSound'
import { Bell, Check, Volume2, VolumeX } from 'lucide-react'
import type { Notification } from '@/types'

// Notifications routes are role-prefixed; map the current role to its route segment.
const roleToSegment: Record<string, string> = {
  CLIENT: 'client', BUILDER: 'builder', SUPPLIER: 'supplier',
  SUPPORT_AGENT: 'support', ADMIN: 'admin', SUPER_ADMIN: 'admin',
}

export default function NotificationDropdown() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [soundMuted, setSoundMutedState] = useState(() => isSoundMuted())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationsPath = `/${roleToSegment[user?.role ?? ''] ?? 'client'}/notifications`

  const { data: countData } = useQuery({
    queryKey: ['notification-count'],
    queryFn: () => notificationApi.getUnreadCount().then(r => r.data),
    refetchInterval: 120000, // Fallback only — WebSocket handles real-time updates
  })

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-preview'],
    queryFn: () => notificationApi.getNotifications({ size: 5 }).then(r => r.data),
    enabled: open,
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] })
    },
  })

  const unreadCount = countData?.count || 0
  const notifications = notificationsData?.content || []

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const toggleSound = () => {
    const next = !soundMuted
    setSoundMuted(next)
    setSoundMutedState(next)
  }

  // Clicking a notification marks it read and follows its deep-link (when it has one).
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id)
    }
    setOpen(false)
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    } else {
      navigate(notificationsPath)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium animate-pulse" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 backdrop-blur-xl bg-white/95 dark:bg-card/95 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 z-50 animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="font-semibold text-sm dark:text-white">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-primary hover:text-primary/80 font-medium px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors duration-150"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={toggleSound}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                aria-label={soundMuted ? 'Unmute notification sound' : 'Mute notification sound'}
                title={soundMuted ? 'Unmute notification sound' : 'Mute notification sound'}
              >
                {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <ul role="list" className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-gray-400 text-sm animate-fade-in">
                No notifications yet
              </li>
            ) : (
              notifications.map((notification: Notification, index: number) => (
                <li
                  key={notification.id}
                  className={`border-b last:border-0 animate-slide-up opacity-0 ${
                    !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-2 border-l-primary' : ''
                  }`}
                  style={{
                    animationDelay: `${index * 60}ms`,
                    animationFillMode: 'forwards',
                  }}
                >
                  <div className="flex justify-between items-start gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      aria-label={`Open notification: ${notification.title}`}
                    >
                      <p className={`text-sm ${!notification.isRead ? 'font-medium dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{notification.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {notification.createdAt ? formatTime(notification.createdAt) : ''}
                      </p>
                    </button>
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsReadMutation.mutate(notification.id)
                        }}
                        className="p-1 text-gray-400 hover:text-primary rounded"
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="px-4 py-2.5 border-t border-gray-200/50 dark:border-gray-700/50 text-center">
            <Link
              to={notificationsPath}
              onClick={() => setOpen(false)}
              className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 transition-colors duration-150"
            >
              View all notifications
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
