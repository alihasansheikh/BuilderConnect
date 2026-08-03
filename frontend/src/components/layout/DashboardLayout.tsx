import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { chatApi } from '@/services/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { playNotificationChime } from '@/lib/notificationSound'
import { resolveAssetUrl } from '@/lib/utils'
import NotificationDropdown from './NotificationDropdown'
import ThemeToggle from '../ui/ThemeToggle'
import { Logo } from '../ui/Logo'
import {
  Home,
  Briefcase,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  BarChart3,
  ShoppingBag,
  ClipboardCheck,
  Crown,
  ScrollText,
  Shield,
  TrendingUp,
  Sliders,
  Newspaper,
  Mail,
  Bell,
  AlertTriangle,
  User,
  Store,
  Package,
  Star,
  ShieldCheck,
  Ticket,
  LifeBuoy,
  Sparkles,
  Ruler,
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

const menuItems = {
  CLIENT: [
    { path: '/client/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/client/assistant', icon: Sparkles, label: 'AI Assistant' },
    { path: '/client/floor-plan', icon: Ruler, label: 'Floor Plan' },
    { path: '/client/projects', icon: Briefcase, label: 'My Projects' },
    { path: '/client/projects/new', icon: FileText, label: 'New Project' },
    { path: '/client/builders', icon: Users, label: 'Builders' },
    { path: '/client/products', icon: Store, label: 'Product Marketplace' },
    { path: '/client/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/client/notifications', icon: Bell, label: 'Notifications' },
    { path: '/client/support', icon: LifeBuoy, label: 'Help & Support' },
    { path: '/client/settings', icon: Settings, label: 'Settings' },
  ],
  BUILDER: [
    { path: '/builder/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/builder/assistant', icon: Sparkles, label: 'AI Assistant' },
    { path: '/builder/floor-plan', icon: Ruler, label: 'Floor Plan' },
    { path: '/builder/marketplace', icon: ShoppingBag, label: 'Project Marketplace' },
    { path: '/builder/products', icon: Store, label: 'Product Marketplace' },
    { path: '/builder/orders', icon: Package, label: 'My Orders' },
    { path: '/builder/bids', icon: FileText, label: 'My Bids' },
    { path: '/builder/projects', icon: Briefcase, label: 'Active Projects' },
    { path: '/builder/reviews', icon: Star, label: 'Reviews' },
    { path: '/builder/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/builder/subscription', icon: Crown, label: 'Subscription' },
    { path: '/builder/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/builder/notifications', icon: Bell, label: 'Notifications' },
    { path: '/builder/support', icon: LifeBuoy, label: 'Help & Support' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/builder/settings', icon: Settings, label: 'Settings' },
  ],
  SUPPLIER: [
    { path: '/supplier/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/supplier/catalog', icon: ShoppingBag, label: 'Catalog' },
    { path: '/supplier/orders', icon: Package, label: 'Orders' },
    { path: '/supplier/revenue', icon: TrendingUp, label: 'Revenue' },
    { path: '/supplier/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/supplier/notifications', icon: Bell, label: 'Notifications' },
    { path: '/supplier/support', icon: LifeBuoy, label: 'Help & Support' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/supplier/settings', icon: Settings, label: 'Settings' },
  ],
  ADMIN: [
    { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/verifications', icon: ClipboardCheck, label: 'Verifications' },
    { path: '/admin/moderation', icon: Shield, label: 'Moderation' },
    { path: '/support/tickets', icon: Ticket, label: 'Tickets' },
    { path: '/support/disputes', icon: AlertTriangle, label: 'Disputes' },
    { path: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
    { path: '/admin/revenue', icon: TrendingUp, label: 'Revenue' },
    { path: '/admin/system-settings', icon: Sliders, label: 'System Settings' },
    { path: '/admin/cms-pages', icon: Newspaper, label: 'CMS Pages' },
    { path: '/admin/blog', icon: FileText, label: 'Blog' },
    { path: '/admin/email-templates', icon: Mail, label: 'Email Templates' },
    { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ],
  SUPER_ADMIN: [
    { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/admins', icon: ShieldCheck, label: 'Team' },
    { path: '/admin/verifications', icon: ClipboardCheck, label: 'Verifications' },
    { path: '/admin/moderation', icon: Shield, label: 'Moderation' },
    { path: '/support/tickets', icon: Ticket, label: 'Tickets' },
    { path: '/support/disputes', icon: AlertTriangle, label: 'Disputes' },
    { path: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
    { path: '/admin/revenue', icon: TrendingUp, label: 'Revenue' },
    { path: '/admin/system-settings', icon: Sliders, label: 'System Settings' },
    { path: '/admin/cms-pages', icon: Newspaper, label: 'CMS Pages' },
    { path: '/admin/blog', icon: FileText, label: 'Blog' },
    { path: '/admin/email-templates', icon: Mail, label: 'Email Templates' },
    { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ],
  SUPPORT_AGENT: [
    { path: '/support/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/support/tickets', icon: Ticket, label: 'Tickets' },
    { path: '/support/disputes', icon: AlertTriangle, label: 'Disputes' },
    { path: '/support/notifications', icon: Bell, label: 'Notifications' },
    { path: '/support/settings', icon: Settings, label: 'Settings' },
  ],
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const queryClient = useQueryClient()
  const { connected, subscribe } = useWebSocket()

  const { data: unreadData } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: () => chatApi.getUnreadCount().then((r) => r.data),
    refetchInterval: 120000, // Fallback only — WebSocket handles real-time updates
    enabled: !!user,
  })
  const chatUnreadCount: number = unreadData?.unreadCount || 0

  // Subscribe to user-specific notifications via WebSocket for real-time badge updates
  useEffect(() => {
    if (!connected) return

    const unsubNotif = subscribe('/user/queue/notifications', (msg) => {
      try {
        JSON.parse(msg.body) // validate payload

        // Increment notification count directly — no HTTP refetch needed
        queryClient.setQueryData(['notification-count'], (old: { count: number } | undefined) => {
          if (!old) return { count: 1 }
          return { ...old, count: (old.count || 0) + 1 }
        })
        // Invalidate preview list so dropdown shows new notification when opened
        queryClient.invalidateQueries({ queryKey: ['notifications-preview'] })
        // Prefix-matches every ['notifications', tab, page] variant on the Notification Center
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        // Chat messages arrive here as NEW_MESSAGE — stay silent when the user is already in chat
        if (!window.location.pathname.endsWith('/messages')) {
          playNotificationChime()
        }
      } catch (e) {
        console.error('[Notification] Failed to parse WebSocket notification:', e)
      }
    })

    // Subscribe to direct chat updates for real-time badge updates (cross-page)
    const unsubChat = subscribe('/user/queue/chat-updates', (_msg) => {
      try {
        // Increment chat unread count directly — no HTTP refetch
        queryClient.setQueryData(['chat-unread-count'], (old: { unreadCount: number } | undefined) => {
          if (!old) return { unreadCount: 1 }
          return { ...old, unreadCount: (old.unreadCount || 0) + 1 }
        })
        queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
      } catch (e) {
        console.error('[Chat] Failed to parse chat update:', e)
      }
    })

    return () => {
      unsubNotif()
      unsubChat()
    }
  }, [connected, subscribe, queryClient])

  const currentMenuItems = user?.role ? menuItems[user.role as keyof typeof menuItems] || [] : []

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const roleBadgeLabel = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())
    : ''

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-white dark:bg-card border-r border-dashed border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-[72px] px-5 shrink-0">
          <Logo to="/" size="md" />
          <button
            className="lg:hidden p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5" aria-label="Main navigation">
          {currentMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                  isActive
                    ? 'bg-primary/[0.08] text-primary font-semibold dark:bg-primary/[0.16]'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? '' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                <span className="flex-1 text-sm">{item.label}</span>
                {item.label === 'Messages' && chatUnreadCount > 0 && (
                  <span
                    className="ml-auto bg-red-500 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight"
                    aria-label={`${chatUnreadCount > 99 ? '99+' : chatUnreadCount} unread messages`}
                  >
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User card */}
        <div className="shrink-0 mx-4 mb-2 p-3 rounded-xl bg-gray-50 dark:bg-card/60">
          <div className="flex items-center gap-3">
            {user?.profileImageUrl ? (
              <img
                src={resolveAssetUrl(user.profileImageUrl)}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {userInitials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/[0.08] px-2 py-0.5 rounded">
              {roleBadgeLabel}
            </span>
          </div>
        </div>

        {/* Logout */}
        <div className="shrink-0 px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 text-sm"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[280px]">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-background/95 backdrop-blur-[6px] border-b border-transparent flex items-center justify-between px-4 md:px-6">
          <button
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationDropdown />

            <Link
              to="/profile"
              aria-label="View your profile"
              className="ml-2 flex items-center gap-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {user?.profileImageUrl ? (
                <img
                  src={resolveAssetUrl(user.profileImageUrl)}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                />
              ) : (
                <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold ring-2 ring-primary/20">
                  {userInitials}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
