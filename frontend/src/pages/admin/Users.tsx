import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { User, UserRole } from '@/types'
import { adminApi, badgeApi, getApiErrorMessage } from '@/services/api'
import ReasonDialog from '@/components/ui/ReasonDialog'

const roleColors: Record<UserRole, string> = {
  CLIENT: 'bg-blue-100 text-blue-800',
  BUILDER: 'bg-green-100 text-green-800',
  SUPPLIER: 'bg-purple-100 text-purple-800',
  SUPPORT_AGENT: 'bg-cyan-100 text-cyan-800',
  ADMIN: 'bg-red-100 text-red-800',
  SUPER_ADMIN: 'bg-red-200 text-red-900',
}

export default function UsersManagement() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [page, setPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [suspendingUser, setSuspendingUser] = useState<User | null>(null)
  const [awardBadgeId, setAwardBadgeId] = useState('')

  // Fetch users from API (role + search combine server-side)
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', roleFilter, searchTerm, page],
    queryFn: async () => {
      const params: { page: number; size: number; role?: UserRole; search?: string } = { page, size: 10 }
      if (roleFilter) params.role = roleFilter
      if (searchTerm) params.search = searchTerm
      const response = await adminApi.getUsers(params)
      return response.data
    },
  })

  // Enriched detail for the View modal (projects/bids/subscription/badges/suspension reason)
  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user-detail', selectedUser?.id],
    queryFn: () => adminApi.getUser(selectedUser!.id).then((r) => r.data),
    enabled: showModal && selectedUser !== null,
  })

  // All badges (for the award dropdown in the detail modal)
  const { data: allBadges } = useQuery({
    queryKey: ['all-badges'],
    queryFn: () => badgeApi.getAll().then((r) => r.data),
    enabled: showModal,
  })

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] })
  }

  // Suspend user mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      return adminApi.suspendUser(userId, reason)
    },
    onSuccess: () => {
      toast.success('User suspended successfully')
      invalidateUsers()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to suspend user'))
    },
  })

  // Unsuspend user mutation
  const unsuspendMutation = useMutation({
    mutationFn: async (userId: number) => {
      return adminApi.unsuspendUser(userId)
    },
    onSuccess: () => {
      toast.success('User unsuspended successfully')
      invalidateUsers()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to unsuspend user'))
    },
  })

  // Verify builder mutation
  const verifyMutation = useMutation({
    mutationFn: async (userId: number) => {
      return adminApi.verifyBuilder(userId)
    },
    onSuccess: () => {
      toast.success('Builder verified successfully')
      invalidateUsers()
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to verify builder'))
    },
  })

  // Badge award/revoke mutations (detail modal)
  const awardBadgeMutation = useMutation({
    mutationFn: ({ badgeId, userId }: { badgeId: number; userId: number }) =>
      badgeApi.award(badgeId, { userId }),
    onSuccess: () => {
      toast.success('Badge awarded')
      setAwardBadgeId('')
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to award badge'))
    },
  })

  const revokeBadgeMutation = useMutation({
    mutationFn: ({ userId, badgeId }: { userId: number; badgeId: number }) =>
      badgeApi.revoke(userId, badgeId),
    onSuccess: () => {
      toast.success('Badge revoked')
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to revoke badge'))
    },
  })

  const users = data?.content || []
  const totalElements = data?.totalElements || 0
  const totalPages = data?.totalPages || 0

  const earnedBadgeIds = new Set((userDetail?.badges || []).map((b) => b.badgeId))
  const awardableBadges = (allBadges || []).filter((b) => b.isActive && !earnedBadgeIds.has(b.id))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const handleSuspendUser = (user: User) => {
    setSuspendingUser(user)
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowModal(true)
  }

  const closeDetailModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setAwardBadgeId('')
  }

  const handleConfirmSuspend = (reason: string) => {
    if (suspendingUser !== null) {
      suspendMutation.mutate({ userId: suspendingUser.id, reason })
      setSuspendingUser(null)
    }
  }

  const isAdminRole = (role: UserRole) => role === 'ADMIN' || role === 'SUPER_ADMIN'

  return (
    <div>
      <ReasonDialog
        isOpen={suspendingUser !== null}
        title="Suspend User"
        placeholder="Reason for suspension..."
        onConfirm={handleConfirmSuspend}
        onCancel={() => setSuspendingUser(null)}
      />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage platform users and their roles</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
          <p className="text-2xl font-bold dark:text-white">{totalElements}</p>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Page</p>
          <p className="text-2xl font-bold dark:text-white">{page + 1} / {Math.max(1, totalPages)}</p>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Showing</p>
          <p className="text-2xl font-bold dark:text-white">{users.length} users</p>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Filter</p>
          <p className="text-2xl font-bold dark:text-white">{roleFilter || 'All'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(0)
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as UserRole | '')
              setPage(0)
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Roles</option>
            {Object.keys(roleColors).map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>
          <div></div>
          <button
            onClick={() => {
              setSearchTerm('')
              setRoleFilter('')
              setPage(0)
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading users...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">Failed to load users. Please try again.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center dark:text-gray-200">
                          {getInitials(user.name)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.suspended
                              ? 'bg-red-100 text-red-800'
                              : user.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.suspended ? 'Suspended' : user.active ? 'Active' : 'Inactive'}
                        </span>
                        {!user.emailVerified && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Unverified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="text-primary hover:underline mr-3"
                      >
                        View
                      </button>
                      {user.role === 'BUILDER' && !user.builderProfile?.isVerified && (
                        <button
                          onClick={() => verifyMutation.mutate(user.id)}
                          className="text-green-600 hover:underline mr-3"
                          disabled={verifyMutation.isPending}
                        >
                          Verify
                        </button>
                      )}
                      {!isAdminRole(user.role) && (
                        user.suspended ? (
                          <button
                            onClick={() => unsuspendMutation.mutate(user.id)}
                            className="text-green-600 hover:underline"
                            disabled={unsuspendMutation.isPending}
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspendUser(user)}
                            className="text-red-600 hover:underline"
                          >
                            Suspend
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No users found matching your criteria.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Previous
                </button>
                <span className="px-4 py-2 dark:text-gray-300">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 border dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Details Modal (enriched) */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold dark:text-white">User Details</h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xl dark:text-gray-200">
                    {getInitials(selectedUser.name)}
                  </div>
                  <div>
                    <h3 className="font-semibold dark:text-white">{selectedUser.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                    <p className="font-medium dark:text-white">{selectedUser.role.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium dark:text-white">{selectedUser.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <p className="font-medium dark:text-white">
                      {selectedUser.suspended ? 'Suspended' : selectedUser.active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email Verified</p>
                    <p className="font-medium dark:text-white">{selectedUser.emailVerified ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Joined</p>
                    <p className="font-medium dark:text-white">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>

                {/* Suspension reason */}
                {(userDetail?.suspended || selectedUser.suspended) && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Suspended</p>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {userDetail?.suspensionReason || 'No reason recorded'}
                    </p>
                  </div>
                )}

                {/* Activity summary (enriched detail) */}
                <div className="pt-4 border-t dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Activity</p>
                  {detailLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading activity...</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-lg font-bold dark:text-white">{userDetail?.projectCount ?? 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Projects</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-lg font-bold dark:text-white">{userDetail?.bidCount ?? 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bids</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-lg font-bold dark:text-white">{userDetail?.activeSubscriptionTier || '—'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Subscription</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Badges (earned + award/revoke controls) */}
                <div className="pt-4 border-t dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Badges</p>
                  {(userDetail?.badges || []).length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No badges earned.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(userDetail?.badges || []).map((badge) => (
                        <span
                          key={badge.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800"
                          title={badge.badgeDescription || badge.badgeName}
                        >
                          {badge.badgeName}
                          <button
                            onClick={() =>
                              revokeBadgeMutation.mutate({ userId: selectedUser.id, badgeId: badge.badgeId })
                            }
                            disabled={revokeBadgeMutation.isPending}
                            className="ml-0.5 text-amber-600 hover:text-red-600 disabled:opacity-50"
                            title="Revoke badge"
                            aria-label={`Revoke ${badge.badgeName}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <select
                      value={awardBadgeId}
                      onChange={(e) => setAwardBadgeId(e.target.value)}
                      className="flex-1 px-3 py-1.5 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select a badge to award...</option>
                      {awardableBadges.map((badge) => (
                        <option key={badge.id} value={badge.id}>
                          {badge.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (awardBadgeId) {
                          awardBadgeMutation.mutate({ badgeId: Number(awardBadgeId), userId: selectedUser.id })
                        }
                      }}
                      disabled={!awardBadgeId || awardBadgeMutation.isPending}
                      className="px-4 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:opacity-90 disabled:opacity-50"
                    >
                      {awardBadgeMutation.isPending ? 'Awarding...' : 'Award'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                {(selectedUser.role === 'BUILDER' || selectedUser.role === 'SUPPLIER') && (
                  <a
                    href={`/profile/${selectedUser.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                  >
                    View Profile
                  </a>
                )}
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
