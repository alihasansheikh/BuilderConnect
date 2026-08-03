import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supportTicketApi, disputeApi } from '@/services/api'
import type { SupportTicket, Dispute } from '@/types'
import { formatDate } from '@/lib/formatters'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  MessageSquare,
  Clock,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Search,
  Scale,
  Ticket,
  Gavel,
  Bell,
} from 'lucide-react'

const ticketPriorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  NORMAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function SupportDashboard() {
  const { user } = useAuth()

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['support-tickets-dashboard'],
    queryFn: async () => {
      const response = await supportTicketApi.getTickets({ size: 100 })
      return response.data
    },
  })

  const { data: disputesData, isLoading: disputesLoading } = useQuery({
    queryKey: ['support-disputes-dashboard'],
    queryFn: async () => {
      const response = await disputeApi.getDisputes({ size: 100 })
      return response.data
    },
  })

  const tickets: SupportTicket[] = ticketsData?.content || []
  const disputes: Dispute[] = disputesData?.content || []

  // Compute ticket stats
  const ticketStats = {
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    waitingCustomer: tickets.filter((t) => t.status === 'WAITING_CUSTOMER').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
  }

  // Compute dispute stats
  const disputeStats = {
    filed: disputes.filter((d) => d.status === 'FILED').length,
    underReview: disputes.filter((d) => d.status === 'UNDER_REVIEW').length,
    mediation: disputes.filter((d) => d.status === 'MEDIATION').length,
    resolved: disputes.filter((d) => d.status === 'RESOLVED').length,
  }

  const isLoading = ticketsLoading || disputesLoading

  return (
    <div>
      {/* Gradient Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white animate-slide-up">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 animate-fade-in delay-100">
          Here is your support agent overview for today.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" label="Loading dashboard..." fullPage />
      ) : (
        <>
          {/* Ticket Stats */}
          <div className="mb-6 animate-fade-in delay-100">
            <h2 className="text-lg font-semibold dark:text-white mb-3">Ticket Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Open"
                value={ticketStats.open}
                icon={<MessageSquare className="h-5 w-5 text-white" />}
                colorClass="bg-blue-500"
                className="animate-slide-up delay-100"
              />
              <StatCard
                title="In Progress"
                value={ticketStats.inProgress}
                icon={<Clock className="h-5 w-5 text-white" />}
                colorClass="bg-indigo-500"
                className="animate-slide-up delay-200"
              />
              <StatCard
                title="Waiting Customer"
                value={ticketStats.waitingCustomer}
                icon={<UserCheck className="h-5 w-5 text-white" />}
                colorClass="bg-amber-500"
                className="animate-slide-up delay-300"
              />
              <StatCard
                title="Resolved"
                value={ticketStats.resolved}
                icon={<CheckCircle className="h-5 w-5 text-white" />}
                colorClass="bg-emerald-500"
                className="animate-slide-up delay-400"
              />
            </div>
          </div>

          {/* Dispute Stats */}
          <div className="mb-6 animate-fade-in delay-200">
            <h2 className="text-lg font-semibold dark:text-white mb-3">Dispute Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Filed"
                value={disputeStats.filed}
                icon={<AlertTriangle className="h-5 w-5 text-white" />}
                colorClass="bg-blue-500"
                className="animate-slide-up delay-100"
              />
              <StatCard
                title="Under Review"
                value={disputeStats.underReview}
                icon={<Search className="h-5 w-5 text-white" />}
                colorClass="bg-yellow-500"
                className="animate-slide-up delay-200"
              />
              <StatCard
                title="Mediation"
                value={disputeStats.mediation}
                icon={<Scale className="h-5 w-5 text-white" />}
                colorClass="bg-purple-500"
                className="animate-slide-up delay-300"
              />
              <StatCard
                title="Resolved"
                value={disputeStats.resolved}
                icon={<CheckCircle className="h-5 w-5 text-white" />}
                colorClass="bg-emerald-500"
                className="animate-slide-up delay-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in delay-300">
            {/* Recent Tickets */}
            <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold dark:text-white">Recent Tickets</h2>
                <Link to="/support/tickets" className="text-sm text-primary hover:underline">
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                {tickets.length === 0 ? (
                  <EmptyState
                    icon={<Ticket className="h-10 w-10 text-gray-400" />}
                    title="No tickets found"
                    description="Support tickets will appear here when submitted."
                    className="py-6"
                  />
                ) : (
                  tickets.slice(0, 5).map((ticket: SupportTicket) => (
                    <Link
                      key={ticket.id}
                      to={`/support/tickets/${ticket.id}`}
                      className="block border-b dark:border-gray-700 pb-4 last:border-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 py-1 rounded transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {ticket.ticketNumber}
                          </p>
                          <p className="font-medium dark:text-gray-200 truncate">
                            {ticket.subject}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            ticketPriorityColors[ticket.priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <StatusBadge status={ticket.status} domain="ticket" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(ticket.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Recent Disputes */}
            <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold dark:text-white">Recent Disputes</h2>
                <Link to="/support/disputes" className="text-sm text-primary hover:underline">
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                {disputes.length === 0 ? (
                  <EmptyState
                    icon={<Gavel className="h-10 w-10 text-gray-400" />}
                    title="No disputes found"
                    description="Disputes will appear here when filed."
                    className="py-6"
                  />
                ) : (
                  disputes.slice(0, 5).map((dispute: Dispute) => (
                    <div
                      key={dispute.id}
                      className="border-b dark:border-gray-700 pb-4 last:border-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 py-1 rounded transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {dispute.disputeNumber}
                          </p>
                          <p className="font-medium dark:text-gray-200 truncate">
                            {dispute.title}
                          </p>
                        </div>
                        <StatusBadge status={dispute.status} domain="dispute" className="flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {dispute.disputeType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 mt-6 animate-fade-in delay-400">
            <h2 className="text-lg font-semibold dark:text-white mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/support/tickets"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                <Ticket className="h-4 w-4" /> View All Tickets
              </Link>
              <Link
                to="/support/disputes"
                className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
              >
                <Gavel className="h-4 w-4" /> View All Disputes
              </Link>
              <Link
                to="/support/messages"
                className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
              >
                <MessageSquare className="h-4 w-4" /> Messages
              </Link>
              <Link
                to="/support/notifications"
                className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
              >
                <Bell className="h-4 w-4" /> Notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
