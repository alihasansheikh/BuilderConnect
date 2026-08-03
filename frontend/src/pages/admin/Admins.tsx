import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { superAdminApi, getApiErrorMessage } from '@/services/api'
import type { User } from '@/types'
import ReasonDialog from '@/components/ui/ReasonDialog'
import { ShieldCheck, UserPlus } from 'lucide-react'

// Self-registration only allows CLIENT/BUILDER/SUPPLIER, so this page is the
// only way team accounts get created.
type TeamRole = 'ADMIN' | 'SUPPORT_AGENT'

interface CreateAdminForm {
  name: string
  email: string
  phone: string
  password: string
  role: TeamRole
}

const emptyForm: CreateAdminForm = { name: '', email: '', phone: '', password: '', role: 'ADMIN' }

export default function AdminsManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [form, setForm] = useState<CreateAdminForm>(emptyForm)
  const [suspendingId, setSuspendingId] = useState<number | null>(null)

  const { data: admins, isLoading } = useQuery({
    queryKey: ['super-admin-admins'],
    queryFn: () => superAdminApi.listAdmins().then((r) => r.data),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['super-admin-admins'] })
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone?: string; password: string; role: TeamRole }) =>
      superAdminApi.createAdmin(data),
    onSuccess: () => {
      toast.success('Team account created')
      setForm(emptyForm)
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create account')),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      superAdminApi.suspendAdmin(id, reason),
    onSuccess: () => {
      toast.success('Admin suspended')
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to suspend admin')),
  })

  const unsuspendMutation = useMutation({
    mutationFn: (id: number) => superAdminApi.unsuspendAdmin(id),
    onSuccess: () => {
      toast.success('Admin unsuspended')
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to unsuspend admin')),
  })

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    createMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      role: form.role,
    })
  }

  const handleSuspendConfirm = (reason: string) => {
    if (suspendingId !== null) {
      suspendMutation.mutate({ id: suspendingId, reason })
      setSuspendingId(null)
    }
  }

  const canSuspend = (admin: User) =>
    admin.role !== 'SUPER_ADMIN' && admin.id !== currentUser?.id

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const adminList: User[] = admins || []

  return (
    <div>
      <ReasonDialog
        isOpen={suspendingId !== null}
        title="Suspend Admin"
        placeholder="Reason for suspending this admin..."
        onConfirm={handleSuspendConfirm}
        onCancel={() => setSuspendingId(null)}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Team Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create and manage admin and support agent accounts. Only super admins can access this page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Admin Form */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold dark:text-white">Create Team Member</h2>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as TeamRole }))}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPPORT_AGENT">Support Agent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Admin name"
                required
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="admin@builderconnect.pk"
                required
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+92 300 0000000"
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending || !form.name || !form.email || !form.password}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Admin List */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 p-6 pb-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold dark:text-white">Team Members ({adminList.length})</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : adminList.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No admin accounts found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Admin</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Role</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Joined</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {adminList.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="font-medium dark:text-white">
                        {admin.name}
                        {admin.id === currentUser?.id && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">You</span>
                        )}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{admin.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          admin.role === 'SUPER_ADMIN'
                            ? 'bg-red-200 text-red-900'
                            : admin.role === 'SUPPORT_AGENT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          admin.suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}
                        title={admin.suspended ? admin.suspensionReason || undefined : undefined}
                      >
                        {admin.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {admin.createdAt ? formatDate(admin.createdAt) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canSuspend(admin) ? (
                        admin.suspended ? (
                          <button
                            onClick={() => unsuspendMutation.mutate(admin.id)}
                            disabled={unsuspendMutation.isPending}
                            className="text-green-600 hover:underline disabled:opacity-50"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspendingId(admin.id)}
                            disabled={suspendMutation.isPending}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
