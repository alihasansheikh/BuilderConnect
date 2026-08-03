import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi, getApiErrorMessage } from '@/services/api'
import type { SystemSetting } from '@/types'
import { Megaphone, Save } from 'lucide-react'

/**
 * Every remaining system_settings row is live: the maintenance banner/message
 * feed GET /v1/public/settings, the bid/lead/image limits are enforced by the
 * backend services, and the contact fields render in the public footer.
 */
const MAINTENANCE_KEY = 'maintenance_mode'
const MAINTENANCE_MESSAGE_KEY = 'maintenance_message'

const EDITABLE_KEYS = [
  'min_bid_amount',
  'max_bid_amount',
  'default_lead_credits',
  'max_project_images',
  'bid_validity_days',
  'support_email',
  'support_phone',
  'platform_name',
]

const KEY_LABELS: Record<string, string> = {
  min_bid_amount: 'Minimum Bid Amount (PKR)',
  max_bid_amount: 'Maximum Bid Amount (PKR)',
  default_lead_credits: 'Default Lead Credits',
  max_project_images: 'Max Project Images',
  bid_validity_days: 'Bid Validity (days)',
  support_email: 'Support Email',
  support_phone: 'Support Phone',
  platform_name: 'Platform Name',
}

interface SaveHandler {
  (key: string, value: string): void
}

function SettingCard({
  setting,
  onSave,
  saving,
}: {
  setting: SystemSetting
  onSave: SaveHandler
  saving: boolean
}) {
  const [value, setValue] = useState(setting.value ?? '')
  const isNumber = setting.type === 'NUMBER'
  const isBoolean = setting.type === 'BOOLEAN'
  const dirty = value !== (setting.value ?? '')

  const handleSave = () => {
    if (isNumber && (value.trim() === '' || Number.isNaN(Number(value.trim())))) {
      toast.error(`${KEY_LABELS[setting.key] ?? setting.key} must be a number`)
      return
    }
    onSave(setting.key, value.trim())
  }

  if (isBoolean) {
    const on = setting.value === 'true'
    return (
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 flex items-start justify-between">
        <div>
          <h3 className="font-semibold dark:text-white">{KEY_LABELS[setting.key] ?? setting.key}</h3>
          {setting.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{setting.description}</p>
          )}
        </div>
        <button
          onClick={() => onSave(setting.key, on ? 'false' : 'true')}
          disabled={saving}
          role="switch"
          aria-checked={on}
          aria-label={`Toggle ${KEY_LABELS[setting.key] ?? setting.key}`}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            on ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              on ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
      <h3 className="font-semibold dark:text-white">{KEY_LABELS[setting.key] ?? setting.key}</h3>
      {setting.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{setting.description}</p>
      )}
      <div className="mt-3 flex gap-2">
        <input
          type={isNumber ? 'number' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={KEY_LABELS[setting.key] ?? setting.key}
          className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  )
}

function MaintenanceMessageEditor({
  setting,
  onSave,
  saving,
}: {
  setting: SystemSetting
  onSave: SaveHandler
  saving: boolean
}) {
  const [message, setMessage] = useState(setting.value ?? '')
  const dirty = message !== (setting.value ?? '')

  return (
    <div className="mt-4">
      <label htmlFor="maintenance-message" className="block text-sm font-medium dark:text-gray-300">
        Banner message
      </label>
      <textarea
        id="maintenance-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        onClick={() => onSave(MAINTENANCE_MESSAGE_KEY, message.trim())}
        disabled={saving || !dirty || message.trim() === ''}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        Save Message
      </button>
    </div>
  )
}

export default function SystemSettings() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery<SystemSetting[]>({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings().then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.updateSetting(key, value),
    onSuccess: (_, variables) => {
      toast.success(
        variables.key === MAINTENANCE_KEY
          ? `Maintenance banner ${variables.value === 'true' ? 'enabled' : 'disabled'}`
          : `Setting "${variables.key}" updated`
      )
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update setting')),
  })

  const handleSave: SaveHandler = (key, value) => updateMutation.mutate({ key, value })

  const maintenanceSetting = settings?.find(s => s.key === MAINTENANCE_KEY)
  const maintenanceMessageSetting = settings?.find(s => s.key === MAINTENANCE_MESSAGE_KEY)
  const editableSettings = EDITABLE_KEYS
    .map(key => settings?.find(s => s.key === key))
    .filter((s): s is SystemSetting => Boolean(s))

  const maintenanceOn = maintenanceSetting?.value === 'true'

  const handleToggleMaintenance = () => {
    updateMutation.mutate({ key: MAINTENANCE_KEY, value: maintenanceOn ? 'false' : 'true' })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Live platform configuration — every setting here changes platform behavior immediately.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      ) : (
        <>
          {/* Maintenance banner toggle + message */}
          <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 text-amber-700 p-2.5 rounded-lg">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold dark:text-white">Maintenance Banner</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Live</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Shows a site-wide maintenance notice to all visitors. Takes effect immediately.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Last updated: {formatDate(maintenanceSetting?.updatedAt ?? null)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleMaintenance}
                disabled={updateMutation.isPending || !maintenanceSetting}
                role="switch"
                aria-checked={maintenanceOn}
                aria-label="Toggle maintenance banner"
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  maintenanceOn ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    maintenanceOn ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {maintenanceOn && (
              <p className="mt-4 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg p-3">
                The maintenance banner is currently visible to all users.
              </p>
            )}
            {maintenanceMessageSetting && (
              <MaintenanceMessageEditor
                setting={maintenanceMessageSetting}
                onSave={handleSave}
                saving={updateMutation.isPending}
              />
            )}
          </div>

          {/* Platform limits + contact settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editableSettings.map((setting) => (
              <SettingCard
                key={`${setting.id}-${setting.value}`}
                setting={setting}
                onSave={handleSave}
                saving={updateMutation.isPending}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
