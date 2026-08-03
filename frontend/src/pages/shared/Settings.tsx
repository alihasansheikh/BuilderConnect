import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { userApi, notificationApi, getApiErrorMessage } from '@/services/api'
import { resolveAssetUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { Bell, Shield, User as UserIcon, Camera, Trash2, Loader2 } from 'lucide-react'
import DeleteAccountDialog from '@/components/settings/DeleteAccountDialog'
import type { NotificationPreference } from '@/types'

const PRIVILEGED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT']

interface NotificationToggle {
  key: keyof NotificationPreference
  label: string
  desc: string
}

export default function Settings() {
  const queryClient = useQueryClient()
  const { user, refreshAuth } = useAuth()
  // Builders and suppliers manage their profile on the dedicated Profile page; every other role
  // manages basic profile info here in Settings.
  const showProfileTab = user?.role !== 'BUILDER' && user?.role !== 'SUPPLIER'
  // Admins and support agents don't bid or run projects — they only get message notifications,
  // and platform accounts cannot self-delete.
  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState(showProfileTab ? 'profile' : 'notifications')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || '',
    address: user?.address || '',
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Notification preferences — loaded from backend
  const { data: prefData, isLoading: prefsLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationApi.getPreferences().then((res) => res.data),
  })

  const [notifications, setNotifications] = useState({
    emailNewBid: true,
    emailProjectUpdate: true,
    emailMessages: true,
    emailOrderUpdate: true,
    emailMarketing: false,
    pushNewBid: true,
    pushProjectUpdate: true,
    pushMessages: true,
  })

  useEffect(() => {
    if (prefData) {
      setNotifications({
        emailNewBid: prefData.emailNewBid,
        emailProjectUpdate: prefData.emailProjectUpdate,
        emailMessages: prefData.emailMessages,
        emailOrderUpdate: prefData.emailOrderUpdate,
        emailMarketing: prefData.emailMarketing,
        pushNewBid: prefData.pushNewBid,
        pushProjectUpdate: prefData.pushProjectUpdate,
        pushMessages: prefData.pushMessages,
      })
    }
  }, [prefData])

  const prefsMutation = useMutation({
    mutationFn: () => notificationApi.updatePreferences(notifications),
    onSuccess: () => {
      toast.success('Notification preferences saved')
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to save preferences'))
    },
  })

  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: () =>
      userApi.changePassword(passwordData.currentPassword, passwordData.newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to change password'))
    },
  })

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('All password fields are required')
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    passwordMutation.mutate()
  }

  // Profile mutations (basic personal info + avatar) — only surfaced for roles without a
  // dedicated Profile page.
  const profileMutation = useMutation({
    mutationFn: () => userApi.updateProfile(profileData),
    onSuccess: async () => {
      toast.success('Profile updated')
      await refreshAuth()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to update profile'))
    },
  })

  const avatarUploadMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadProfileImage(file),
    onSuccess: async () => {
      toast.success('Profile picture updated')
      await refreshAuth()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to upload picture'))
    },
  })

  const avatarRemoveMutation = useMutation({
    mutationFn: () => userApi.deleteProfileImage(),
    onSuccess: async () => {
      toast.success('Profile picture removed')
      await refreshAuth()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to remove picture'))
    },
  })

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, or GIF image')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }
    avatarUploadMutation.mutate(file)
  }

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileData.name.trim()) {
      toast.error('Name is required')
      return
    }
    profileMutation.mutate()
  }

  const tabs = [
    ...(showProfileTab ? [{ id: 'profile', label: 'Profile', icon: UserIcon }] : []),
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  // Only the email notifications the platform actually sends are offered, scoped to what each
  // role receives. Push notifications aren't delivered, so they're only kept for privileged
  // accounts whose reduced settings are left unchanged.
  const roleEmailToggles: Record<string, NotificationToggle[]> = {
    CLIENT: [
      { key: 'emailNewBid', label: 'New bids on my projects', desc: 'Email me when a builder bids on one of my projects' },
      { key: 'emailProjectUpdate', label: 'Project updates', desc: 'Email me about status changes and milestone activity on my projects' },
    ],
    BUILDER: [
      { key: 'emailProjectUpdate', label: 'Project updates', desc: 'Email me about status changes and milestone activity on my projects' },
      { key: 'emailOrderUpdate', label: 'Marketplace order updates', desc: 'Email me when the status of a material order changes' },
    ],
    SUPPLIER: [
      { key: 'emailOrderUpdate', label: 'Marketplace order updates', desc: 'Email me when a buyer places or updates an order' },
    ],
  }

  const defaultEmailToggles: NotificationToggle[] = [
    { key: 'emailMessages', label: 'Direct Messages', desc: 'Email me when I receive a new direct message' },
  ]

  const emailToggles: NotificationToggle[] = isPrivileged
    ? defaultEmailToggles
    : roleEmailToggles[user?.role ?? ''] ?? defaultEmailToggles

  const pushToggles: NotificationToggle[] = [
    { key: 'pushMessages', label: 'Direct Messages', desc: 'Browser notifications for new direct messages' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl shadow-card">
        {/* Tabs */}
        <div className="border-b dark:border-gray-700">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && showProfileTab && (
            <div className="max-w-2xl space-y-8">
              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-primary/10">
                  {user?.profileImageUrl ? (
                    <img
                      src={resolveAssetUrl(user.profileImageUrl)}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium dark:text-white">Profile picture</p>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">JPG, PNG or GIF, up to 10MB</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploadMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      {avatarUploadMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      Change
                    </button>
                    {user?.profileImageUrl && (
                      <button
                        type="button"
                        onClick={() => avatarRemoveMutation.mutate()}
                        disabled={avatarRemoveMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                </div>
              </div>

              <hr className="dark:border-gray-700" />

              {/* Personal info */}
              <form onSubmit={handleProfileSave} className="space-y-4">
                <h3 className="font-medium dark:text-white">Personal Information</h3>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full cursor-not-allowed rounded-md border bg-gray-50 px-4 py-2 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+92 3XX XXXXXXX"
                    className="w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    City
                  </label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    placeholder="e.g. Karachi"
                    className="w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  <textarea
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    rows={2}
                    placeholder="Street, area, city"
                    className="w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profileMutation.isPending}
                    className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="font-medium dark:text-white mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  {emailToggles.map(({ key, label, desc }) => (
                    <label key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium dark:text-white">{label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications[key as keyof typeof notifications]}
                        onChange={(e) =>
                          setNotifications({ ...notifications, [key]: e.target.checked })
                        }
                        className="w-5 h-5 text-primary rounded focus:ring-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {isPrivileged && (
                <>
                  <hr className="dark:border-gray-700" />

                  <div>
                    <h3 className="font-medium dark:text-white mb-4">Push Notifications</h3>
                    <div className="space-y-4">
                      {pushToggles.map(({ key, label, desc }) => (
                        <label key={key} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium dark:text-white">{label}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifications[key as keyof typeof notifications]}
                            onChange={(e) =>
                              setNotifications({ ...notifications, [key]: e.target.checked })
                            }
                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => prefsMutation.mutate()}
                  disabled={prefsMutation.isPending || prefsLoading}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  {prefsMutation.isPending ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-8">
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <h3 className="font-medium dark:text-white">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </form>

              {!isPrivileged && (
                <>
                  <hr className="dark:border-gray-700" />

                  <div>
                    <h3 className="font-medium text-red-600 mb-4">Danger Zone</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                      onClick={() => setDeleteDialogOpen(true)}
                      className="px-6 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Delete Account
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <DeleteAccountDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} />
    </div>
  )
}
