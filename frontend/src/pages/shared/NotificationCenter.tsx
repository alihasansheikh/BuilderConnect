import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { notificationApi } from '@/services/api'
import { formatDate, formatRelativeTime } from '@/lib/formatters'
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react'

type FilterTab = 'all' | 'unread'

export default function NotificationCenter() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', activeTab, page],
    queryFn: () => notificationApi.getNotifications({
      page,
      size: 20,
      ...(activeTab === 'unread' && { isRead: false }),
    }).then(r => r.data),
  })

  const { data: countData } = useQuery({
    queryKey: ['notification-count'],
    queryFn: () => notificationApi.getUnreadCount().then(r => r.data),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })

  const notifications = data?.content || []
  const totalPages = data?.totalPages || 0
  const unreadCount = countData?.count || 0

  // Group notifications by date
  const grouped: Record<string, any[]> = {}
  for (const notif of notifications) {
    const dateKey = notif.createdAt ? formatDate(notif.createdAt) : 'Unknown'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(notif)
  }

  const typeIcons: Record<string, string> = {
    NEW_BID: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    BID_ACCEPTED: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    BID_REJECTED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    BID_SHORTLISTED: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    PROJECT_AWARDED: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    MILESTONE_COMPLETED: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    MILESTONE_APPROVED: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    PAYMENT_RELEASED: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    NEW_MESSAGE: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    NEW_REVIEW: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    ORDER_PLACED: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    ORDER_CONFIRMED: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    ORDER_STATUS_UPDATED: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    ORDER_DELIVERED: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    ORDER_CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    PRODUCT_REVIEW: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    SYSTEM_ANNOUNCEMENT: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    ACCOUNT_VERIFIED: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    DISPUTE_OPENED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    DISPUTE_RESOLVED: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    SUBSCRIPTION_EXPIRING: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    VERIFICATION_REQUESTED: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    TICKET_CREATED: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  }

  /** Row activation: mark unread as read, then follow the notification's deep link. */
  const openNotification = (notification: any) => {
    if (!notification.actionUrl) return
    if (!notification.isRead) markAsReadMutation.mutate(notification.id)
    navigate(notification.actionUrl)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card mb-6">
        <div className="border-b dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => { setActiveTab('all'); setPage(0) }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setActiveTab('unread'); setPage(0) }}
              className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'unread'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, notifs]) => (
                <div key={date}>
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">{date}</h3>
                  <div className="space-y-2">
                    {notifs.map((notification: any) => (
                      <div
                        key={notification.id}
                        role={notification.actionUrl ? 'button' : undefined}
                        tabIndex={notification.actionUrl ? 0 : undefined}
                        onClick={() => openNotification(notification)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') openNotification(notification)
                        }}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }${notification.actionUrl ? ' cursor-pointer' : ''}`}
                      >
                        <div className={`p-2 rounded-full ${typeIcons[notification.notificationType] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.isRead ? 'font-medium dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{notification.message}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {notification.createdAt ? formatRelativeTime(notification.createdAt) : ''}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsReadMutation.mutate(notification.id)
                            }}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-primary rounded hover:bg-white dark:hover:bg-gray-700"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 border rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 border rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
