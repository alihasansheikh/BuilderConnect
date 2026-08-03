import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, getApiErrorMessage } from '@/services/api'
import ReasonDialog from '@/components/ui/ReasonDialog'
import { resolveAssetUrl } from '@/lib/utils'
import type { PendingBuilder, PendingSupplier } from '@/types'
import { toast } from 'sonner'
import { CheckCircle, Clock, FileText } from 'lucide-react'

type VerificationTab = 'BUILDERS' | 'SUPPLIERS'

/** Unified row the table renders for both builder and supplier queues. */
interface VerificationRow {
  key: string
  userId: number
  name: string
  email: string
  companyName?: string | null
  city?: string | null
  credentials: { label: string; value?: string | null }[]
  documents: string[]
  requestedAt?: string | null
  createdAt: string
}

const toBuilderRow = (b: PendingBuilder): VerificationRow => ({
  key: `b-${b.id}`,
  userId: b.userId,
  name: b.name,
  email: b.email,
  companyName: b.companyName,
  city: b.city,
  credentials: [
    { label: 'NTN', value: b.ntnNumber },
    { label: 'PEC', value: b.pecNumber },
  ],
  documents: b.documents ?? [],
  requestedAt: b.verificationRequestedAt,
  createdAt: b.createdAt,
})

const toSupplierRow = (s: PendingSupplier): VerificationRow => ({
  key: `s-${s.id}`,
  userId: s.userId,
  name: s.name,
  email: s.email,
  companyName: s.companyName,
  city: s.city,
  credentials: [{ label: 'Reg #', value: s.businessRegistrationNumber }],
  documents: s.documents ?? [],
  requestedAt: s.verificationRequestedAt,
  createdAt: s.createdAt,
})

const TAB_BTN = (active: boolean) =>
  `px-4 py-2 rounded-lg text-sm font-medium ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-white dark:bg-card text-gray-600 dark:text-gray-300 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
  }`

const SUB_BTN = (active: boolean) =>
  `px-3 py-1.5 rounded-md text-xs font-medium ${
    active
      ? 'bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900'
      : 'bg-white dark:bg-card text-gray-600 dark:text-gray-300 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
  }`

export default function Verifications() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<VerificationTab>('BUILDERS')
  const [requested, setRequested] = useState(true)
  const [rejectTarget, setRejectTarget] = useState<{ userId: number; name: string } | null>(null)

  const buildersRequested = useQuery({
    queryKey: ['pending-verifications', true],
    queryFn: () => adminApi.getPendingVerifications({ size: 50, requested: true }).then((r) => r.data),
  })
  const buildersNotRequested = useQuery({
    queryKey: ['pending-verifications', false],
    queryFn: () => adminApi.getPendingVerifications({ size: 50, requested: false }).then((r) => r.data),
  })
  const suppliersRequested = useQuery({
    queryKey: ['pending-supplier-verifications', true],
    queryFn: () => adminApi.getPendingSuppliers({ size: 50, requested: true }).then((r) => r.data),
  })
  const suppliersNotRequested = useQuery({
    queryKey: ['pending-supplier-verifications', false],
    queryFn: () => adminApi.getPendingSuppliers({ size: 50, requested: false }).then((r) => r.data),
  })

  const isBuilders = activeTab === 'BUILDERS'
  const activeQuery = isBuilders
    ? requested ? buildersRequested : buildersNotRequested
    : requested ? suppliersRequested : suppliersNotRequested

  const rows: VerificationRow[] = isBuilders
    ? (requested ? buildersRequested : buildersNotRequested).data?.content?.map(toBuilderRow) ?? []
    : (requested ? suppliersRequested : suppliersNotRequested).data?.content?.map(toSupplierRow) ?? []

  const requestedCount = (isBuilders ? buildersRequested : suppliersRequested).data?.totalElements
  const notRequestedCount = (isBuilders ? buildersNotRequested : suppliersNotRequested).data?.totalElements

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-verifications'] })
    queryClient.invalidateQueries({ queryKey: ['pending-supplier-verifications'] })
    queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
  }

  const verifyMutation = useMutation({
    mutationFn: (userId: number) =>
      isBuilders ? adminApi.verifyBuilder(userId) : adminApi.verifySupplier(userId),
    onSuccess: () => {
      toast.success(isBuilders ? 'Builder verified successfully' : 'Supplier verified successfully')
      invalidate()
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, isBuilders ? 'Failed to verify builder' : 'Failed to verify supplier')),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      isBuilders
        ? adminApi.rejectBuilderVerification(userId, reason)
        : adminApi.rejectSupplierVerification(userId, reason),
    onSuccess: () => {
      toast.success('Verification request rejected')
      setRejectTarget(null)
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to reject verification request')),
  })

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Verifications</h1>
        <p className="text-gray-600 dark:text-gray-400">Review and approve builder and supplier verification requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('BUILDERS')} className={TAB_BTN(isBuilders)}>
          Builders ({buildersRequested.data?.totalElements ?? 0})
        </button>
        <button onClick={() => setActiveTab('SUPPLIERS')} className={TAB_BTN(!isBuilders)}>
          Suppliers ({suppliersRequested.data?.totalElements ?? 0})
        </button>
      </div>

      {/* Requested / Not requested sub-toggle */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setRequested(true)} className={SUB_BTN(requested)}>
          Requested{requestedCount != null ? ` (${requestedCount})` : ''}
        </button>
        <button onClick={() => setRequested(false)} className={SUB_BTN(!requested)}>
          Not requested{notRequestedCount != null ? ` (${notRequestedCount})` : ''}
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-5 mb-6 flex items-center gap-4">
        <div className="bg-yellow-100 text-yellow-700 p-3 rounded-lg">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold dark:text-white">{activeQuery.data?.totalElements ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {requested ? 'Pending' : 'Unverified'} {isBuilders ? 'Builders' : 'Suppliers'}
            {requested ? ' — verification requested' : ' — no request yet'}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden">
        {activeQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
            <p className="font-medium mb-1">All caught up!</p>
            <p className="text-sm">
              {requested ? 'No pending verification requests.' : 'No unverified accounts without a request.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                    {isBuilders ? 'Builder' : 'Supplier'}
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Company</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">City</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Credentials</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Documents</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                    {requested ? 'Requested' : 'Registered'}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {rows.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <Link
                        to={`/profile/${row.userId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{row.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {row.companyName || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {row.city || <span className="text-gray-400 italic">Unknown</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {row.credentials.some((c) => c.value) ? (
                        <div className="space-y-0.5">
                          {row.credentials.filter((c) => c.value).map((c) => (
                            <div key={c.label} className="whitespace-nowrap">
                              <span className="text-gray-400">{c.label}:</span> {c.value}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {row.documents.length > 0 ? (
                        <div className="space-y-0.5">
                          {row.documents.map((url, index) => (
                            <a
                              key={url}
                              href={resolveAssetUrl(url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" /> Document {index + 1}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {requested && row.requestedAt
                        ? formatDate(row.requestedAt)
                        : row.createdAt
                          ? formatDate(row.createdAt)
                          : '—'}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => verifyMutation.mutate(row.userId)}
                        disabled={verifyMutation.isPending}
                        className="px-4 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
                      </button>
                      {requested && (
                        <button
                          onClick={() => setRejectTarget({ userId: row.userId, name: row.name })}
                          disabled={rejectMutation.isPending}
                          className="ml-2 px-4 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReasonDialog
        isOpen={!!rejectTarget}
        title={`Reject verification request${rejectTarget ? ` — ${rejectTarget.name}` : ''}`}
        placeholder="Reason for rejection (shown to the user)..."
        onConfirm={(reason) => {
          if (rejectTarget) rejectMutation.mutate({ userId: rejectTarget.userId, reason })
        }}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  )
}
