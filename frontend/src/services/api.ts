import api, { multipartConfig } from './apiClient'
import type { ChatbotMessage, ChatbotAnswer, AiMessage, AssistantThread, FloorPlanBrief, FloorPlanResponse } from '@/types'
import type {
  AuthResponse,
  RegisterRequest,
  User,
  UserProfile,
  PortfolioItem,
  PortfolioItemRequest,
  Certification,
  CertificationRequest,
  Project,
  CreateProjectRequest,
  ProjectSearchParams,
  PageResponse,
  Bid,
  BidExists,
  BidStats,
  CreateBidRequest,
  Milestone,
  MilestoneUpdate,
  ChangeRequest,
  ContractVersion,
  Contract,
  ContractDraftRequest,
  CreateMilestoneRequest,
  ChatRoom,
  ChatMessage,
  Review,
  CreateReviewRequest,
  Notification,
  NotificationPreference,
  BuilderProfile,
  UpdateBuilderProfileRequest,
  BuilderAnalytics,
  LeadTransaction,
  LeadCreditBalance,
  SubscriptionPlan,
  AdminMetrics,
  AdminUserDetail,
  PendingBuilder,
  PendingSupplier,
  BuilderData,
  BuilderSummary,
  CmsPageContent,
  SubscriptionRevenueSummary,
  CheckoutSessionResponse,
  ConfirmCheckoutResponse,
  AuditLog,
  AuditLogParams,
  AdminUserParams,
  ModerationQueueParams,
  SystemSetting,
  PublicSettings,
  CmsPage,
  BlogPost,
  EmailTemplate,
  SupportTicket,
  TicketResponseRecord,
  Dispute,
  DisputeComment,
  Material,
  MaterialCategory,
  MaterialOrder,
  CreateMaterialOrderRequest,
  CreateMaterialReviewRequest,
  MaterialReviewCheck,
  ProjectReviewCheck,
  ReviewVoteResponse,
  ReviewMyVote,
  SupplierProfile,
  UpdateSupplierProfileRequest,
  SupplierStats,
  SupplierRevenue,
  FavoriteEntityType,
  FavoriteToggleResult,
  BadgeRecord,
  UserBadgeRecord,
  PaginationParams,
  VerificationRequestResult,
} from '@/types'

// Axios instance, interceptors and error helpers live in apiClient.ts — re-exported here so
// existing `@/services/api` imports keep working unchanged.
export { getApiErrorMessage, getApiValidationErrors } from './apiClient'
export { default } from './apiClient'

// Typed API helpers
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/v1/auth/login', { email, password }),
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/v1/auth/register', data),
  logout: () =>
    api.post('/v1/auth/logout'),
  refreshToken: (refreshToken: string) =>
    api.post<AuthResponse>('/v1/auth/refresh', { refreshToken }),
  getCurrentUser: () =>
    api.get<User>('/v1/auth/me'),
  verifyEmail: (token: string) =>
    api.post('/v1/auth/verify-email', { token }),
  resendVerification: (email: string) =>
    api.post('/v1/auth/resend-verification', { email }),
  forgotPassword: (email: string) =>
    api.post('/v1/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/v1/auth/reset-password', { token, newPassword }),
}

export const projectApi = {
  create: (data: CreateProjectRequest) =>
    api.post<Project>('/v1/client/projects', data),
  getClientProjects: (params?: PaginationParams) =>
    api.get<PageResponse<Project>>('/v1/client/projects', { params }),
  getBuilderProjects: (params?: PaginationParams) =>
    api.get<PageResponse<Project>>('/v1/builder/projects', { params }),
  getProject: (id: number) =>
    api.get<Project>(`/v1/projects/${id}`),
  publish: (id: number) =>
    api.post<Project>(`/v1/client/projects/${id}/publish`),
  award: (projectId: number, bidId: number) =>
    api.post(`/v1/client/projects/${projectId}/award/${bidId}`),
  cancel: (id: number, reason: string) =>
    api.post<Project>(`/v1/client/projects/${id}/cancel`, { reason }),
  getCategories: () =>
    api.get<{ id: number; name: string; slug: string; icon: string }[]>('/v1/categories'),
  searchProjects: (params?: ProjectSearchParams) =>
    api.get<PageResponse<Project>>('/v1/projects', { params }),
  uploadImage: (projectId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/v1/projects/${projectId}/images`, formData, multipartConfig)
  },
  getImages: (projectId: number) =>
    api.get(`/v1/projects/${projectId}/images`),
  deleteImage: (projectId: number, attachmentId: number) =>
    api.delete(`/v1/projects/${projectId}/images/${attachmentId}`),
  uploadDocument: (projectId: number, file: File, attachmentType = 'DESIGN') => {
    const form = new FormData()
    form.append('file', file)
    form.append('attachmentType', attachmentType)
    return api.post(`/v1/projects/${projectId}/documents`, form, multipartConfig)
  },
}

export const bidApi = {
  create: (data: CreateBidRequest) =>
    api.post<Bid>('/v1/builder/bids', data),
  getBuilderBids: (params?: PaginationParams) =>
    api.get<PageResponse<Bid>>('/v1/builder/bids', { params }),
  getProjectBids: (projectId: number) =>
    api.get<Bid[]>(`/v1/projects/${projectId}/bids`),
  withdraw: (id: number) =>
    api.post(`/v1/builder/bids/${id}/withdraw`),
  shortlist: (id: number) =>
    api.post(`/v1/client/bids/${id}/shortlist`),
  exists: (projectId: number) =>
    api.get<BidExists>('/v1/builder/bids/exists', { params: { projectId } }),
  stats: () =>
    api.get<BidStats>('/v1/builder/bids/stats'),
}

export const milestoneApi = {
  getProjectMilestones: (projectId: number) =>
    api.get<Milestone[]>(`/v1/projects/${projectId}/milestones`),
  // Backend reads a single string under the key "evidence" (@RequestBody Map<String,String>);
  // the old string[] shape 500s on deserialization. Callers pass {} (no evidence) today.
  complete: (id: number, body: { evidence?: string } = {}) =>
    api.post(`/v1/milestones/${id}/complete`, body),
  approve: (id: number) =>
    api.post(`/v1/milestones/${id}/approve`),
  reject: (id: number, reason: string) =>
    api.post(`/v1/milestones/${id}/reject`, { reason }),
  addUpdate: (id: number, data: { message: string; updateType?: string; progressPercentage?: number; attachments?: string }) =>
    api.post<MilestoneUpdate>(`/v1/milestones/${id}/updates`, data),
  // Builder defines the payment schedule; each milestone appears in the client's tab immediately.
  create: (projectId: number, data: CreateMilestoneRequest) =>
    api.post<Milestone>(`/v1/projects/${projectId}/milestones`, data),
  update: (id: number, data: CreateMilestoneRequest) =>
    api.put<Milestone>(`/v1/milestones/${id}`, data),
  remove: (id: number) =>
    api.delete(`/v1/milestones/${id}`),
  getUpdates: (id: number) =>
    api.get<MilestoneUpdate[]>(`/v1/milestones/${id}/updates`),
  // Direct milestone payment: client marks a milestone paid with proof (image/PDF);
  // proof is multipart so the browser sets the multipart boundary itself (see multipartConfig).
  pay: (milestoneId: number, proof: File, note?: string) => {
    const form = new FormData()
    form.append('proof', proof)
    if (note) form.append('note', note)
    return api.post<Milestone>(`/v1/milestones/${milestoneId}/pay`, form, multipartConfig)
  },
  // Builder confirms the payment recorded against a milestone was received (→ CONFIRMED).
  confirmPayment: (milestoneId: number) =>
    api.post<Milestone>(`/v1/milestones/${milestoneId}/confirm-payment`),
}

export const changeRequestApi = {
  getByProject: (projectId: number) =>
    api.get<ChangeRequest[]>(`/v1/projects/${projectId}/change-requests`),
  submit: (projectId: number, data: { changeType: string; title: string; description: string; proposedValue?: string }) =>
    api.post<ChangeRequest>(`/v1/projects/${projectId}/change-requests`, data),
  approve: (projectId: number, id: number) =>
    api.post(`/v1/projects/${projectId}/change-requests/${id}/approve`),
  reject: (projectId: number, id: number, reason: string) =>
    api.post(`/v1/projects/${projectId}/change-requests/${id}/reject`, { reason }),
}

export const contractVersionApi = {
  getVersionHistory: (projectId: number) =>
    api.get<ContractVersion[]>(`/v1/projects/${projectId}/contract/versions`),
  createVersion: (projectId: number, changeSummary: string) =>
    api.post<ContractVersion>(`/v1/projects/${projectId}/contract/versions`, { changeSummary }),
}

export const chatApi = {
  getRooms: (params?: PaginationParams) =>
    api.get<PageResponse<ChatRoom>>('/v1/chat/rooms', { params }),
  // Project chat room shared by the client and the awarded builder (created on first use).
  getProjectRoom: (projectId: number) =>
    api.post<ChatRoom>(`/v1/chat/rooms/project/${projectId}`),
  getMessages: (roomId: number, params?: PaginationParams) =>
    api.get<PageResponse<ChatMessage>>(`/v1/chat/rooms/${roomId}/messages`, { params }),
  sendMessage: (roomId: number, content: string) =>
    api.post<ChatMessage>(`/v1/chat/rooms/${roomId}/messages`, { content }),
  createDirectRoom: (userId: number) =>
    api.post<ChatRoom>(`/v1/chat/rooms/direct/${userId}`),
  markAsRead: (roomId: number) =>
    api.post(`/v1/chat/rooms/${roomId}/read`),
  editMessage: (messageId: number, content: string) =>
    api.put<ChatMessage>(`/v1/chat/messages/${messageId}`, { content }),
  deleteMessage: (messageId: number) =>
    api.delete(`/v1/chat/messages/${messageId}`),
  getUnreadCount: () =>
    api.get<{ unreadCount: number }>('/v1/chat/unread-count'),
}

export const reviewApi = {
  createReview: (projectId: number, data: CreateReviewRequest) =>
    api.post<Review>(`/v1/projects/${projectId}/review`, data),
  getMyProjectReview: (projectId: number) =>
    api.get<ProjectReviewCheck>(`/v1/projects/${projectId}/review/me`),
  getBuilderReviews: (builderUserId: number, params?: PaginationParams) =>
    api.get<PageResponse<Review>>(`/v1/builders/${builderUserId}/reviews`, { params }),
  getMyReviews: (params?: PaginationParams) =>
    api.get<PageResponse<Review>>('/v1/builder/reviews', { params }),
  // Product reviews (marketplace) — instant-approved, open to any signed-in user
  getMaterialReviews: (materialId: number, params?: PaginationParams) =>
    api.get<PageResponse<Review>>(`/v1/materials/${materialId}/reviews`, { params }),
  createMaterialReview: (materialId: number, data: CreateMaterialReviewRequest) =>
    api.post<Review>(`/v1/materials/${materialId}/reviews`, data),
  getMyMaterialReview: (materialId: number) =>
    api.get<MaterialReviewCheck>(`/v1/materials/${materialId}/reviews/me`),
  // Helpful/not-helpful voting — toggle semantics (same vote again removes it)
  voteHelpful: (reviewId: number, helpful: boolean) =>
    api.post<ReviewVoteResponse>(`/v1/reviews/${reviewId}/helpful`, { helpful }),
  getMyVotes: (materialId: number) =>
    api.get<ReviewMyVote[]>(`/v1/materials/${materialId}/reviews/my-votes`),
}

export const notificationApi = {
  getNotifications: (params?: PaginationParams) =>
    api.get<PageResponse<Notification>>('/v1/notifications', { params }),
  markAsRead: (id: number) =>
    api.post(`/v1/notifications/${id}/read`),
  markAllAsRead: () =>
    api.post('/v1/notifications/read-all'),
  getUnreadCount: () =>
    api.get<{ count: number }>('/v1/notifications/unread-count'),
  getPreferences: () =>
    api.get<NotificationPreference>('/v1/notifications/preferences'),
  updatePreferences: (data: Partial<NotificationPreference>) =>
    api.put('/v1/notifications/preferences', data),
}

export const contractApi = {
  getContract: (projectId: number) =>
    api.get<Contract>(`/v1/projects/${projectId}/contract`),
  // Builder authors the contract; the client sees "waiting for contract" until this succeeds.
  create: (projectId: number, data: ContractDraftRequest) =>
    api.post<Contract>(`/v1/projects/${projectId}/contract`, data),
  update: (projectId: number, data: ContractDraftRequest) =>
    api.put<Contract>(`/v1/projects/${projectId}/contract`, data),
  signContract: (projectId: number) =>
    api.post<Contract>(`/v1/projects/${projectId}/contract/sign`),
  downloadPdf: (projectId: number) =>
    api.get(`/v1/projects/${projectId}/contract/pdf`, { responseType: 'blob' }),
}

export const builderApi = {
  searchBuilders: (params?: {
    city?: string
    minExperience?: number
    maxExperience?: number
    minRating?: number
    isAvailable?: boolean
    specialization?: string
    text?: string
    page?: number
    size?: number
  }) =>
    api.get<PageResponse<BuilderSummary>>('/v1/builders', { params }),
  getBuilder: (id: number) =>
    api.get<BuilderData>(`/v1/builders/${id}`),
  getMyProfile: () =>
    api.get<BuilderProfile>('/v1/builder/me/profile'),
  updateMyProfile: (data: UpdateBuilderProfileRequest) =>
    api.put<BuilderProfile>('/v1/builder/me/profile', data),
  getAnalytics: () =>
    api.get<BuilderAnalytics>('/v1/builder/me/analytics'),
  uploadBannerImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/v1/builder/me/banner-image', formData, multipartConfig)
  },
  deleteBannerImage: () =>
    api.delete('/v1/builder/me/banner-image'),
  requestVerification: (data?: { note?: string; documentUrls?: string[] }) =>
    api.post<VerificationRequestResult>('/v1/builder/me/verification-request', data ?? {}),
  uploadVerificationDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string }>('/v1/builder/me/verification-request/document', form, multipartConfig)
  },
}

export const leadApi = {
  getCreditBalance: () =>
    api.get<LeadCreditBalance>('/v1/builder/leads/credits'),
  getTransactions: (params?: PaginationParams) =>
    api.get<PageResponse<LeadTransaction>>('/v1/builder/leads/transactions', { params }),
}

export const subscriptionApi = {
  getPlans: () =>
    api.get<SubscriptionPlan[]>('/v1/subscriptions/plans'),
  getMySubscription: () =>
    api.get('/v1/builder/subscription'),
  // Stripe hosted Checkout: create a session, redirect to checkoutUrl, then confirm on return.
  createCheckout: (tier: string) =>
    api.post<CheckoutSessionResponse>('/v1/builder/subscription/checkout', { tier }),
  confirmCheckout: (sessionId: string) =>
    api.post<ConfirmCheckoutResponse>('/v1/builder/subscription/confirm', { sessionId }),
  selectFreePlan: () =>
    api.post<{ tier: string }>('/v1/builder/subscription/select-free'),
}

export const userApi = {
  updateProfile: (data: { name?: string; phone?: string; city?: string; address?: string }) =>
    api.put<User>('/v1/users/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/v1/users/me/change-password', { currentPassword, newPassword }),
  uploadProfileImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/v1/users/me/profile-image', formData, multipartConfig)
  },
  deleteProfileImage: () =>
    api.delete('/v1/users/me/profile-image'),
  deleteAccount: (password: string) =>
    api.delete('/v1/users/me', { data: { password } }),
}

export const adminApi = {
  getMetrics: () =>
    api.get<AdminMetrics>('/v1/admin/metrics'),
  getUsers: (params?: AdminUserParams) =>
    api.get<PageResponse<User>>('/v1/admin/users', { params }),
  // Enriched detail: UserResponse fields + projectCount/bidCount/activeSubscriptionTier/badges
  getUser: (id: number) =>
    api.get<AdminUserDetail>(`/v1/admin/users/${id}`),
  verifyBuilder: (userId: number) =>
    api.post(`/v1/admin/verify-builder`, { userId }),
  verifySupplier: (userId: number) =>
    api.post('/v1/admin/verify-supplier', { userId }),
  suspendUser: (userId: number, reason: string) =>
    api.post('/v1/admin/suspend-user', { userId, reason }),
  unsuspendUser: (userId: number) =>
    api.post('/v1/admin/unsuspend-user', { userId }),
  getPendingVerifications: (params?: PaginationParams & { requested?: boolean }) =>
    api.get<PageResponse<PendingBuilder>>('/v1/admin/builders/pending', { params }),
  getPendingSuppliers: (params?: PaginationParams & { requested?: boolean }) =>
    api.get<PageResponse<PendingSupplier>>('/v1/admin/suppliers/pending', { params }),
  rejectBuilderVerification: (userId: number, reason: string) =>
    api.post('/v1/admin/reject-builder-verification', { userId, reason }),
  rejectSupplierVerification: (userId: number, reason: string) =>
    api.post('/v1/admin/reject-supplier-verification', { userId, reason }),
  getRevenueSummary: () =>
    api.get<SubscriptionRevenueSummary>('/v1/admin/revenue-summary'),
  getAuditLogs: (params?: AuditLogParams) =>
    api.get<PageResponse<AuditLog>>('/v1/admin/audit-logs', { params }),
  getModerationQueue: (params?: ModerationQueueParams) =>
    api.get<PageResponse<Review>>('/v1/admin/moderation-queue', { params }),
  moderateReview: (id: number, action: string, notes?: string) =>
    api.post(`/v1/admin/reviews/${id}/moderate`, { action, notes }),
  getSettings: () =>
    api.get<SystemSetting[]>('/v1/admin/settings'),
  updateSetting: (key: string, value: string) =>
    api.put(`/v1/admin/settings/${key}`, { value }),
  // CMS
  getCmsPages: (params?: PaginationParams) =>
    api.get<PageResponse<CmsPage>>('/v1/admin/cms/pages', { params }),
  createCmsPage: (data: { slug: string; title: string; content: string; metaDescription?: string }) =>
    api.post<CmsPage>('/v1/admin/cms/pages', data),
  updateCmsPage: (id: number, data: { slug?: string; title?: string; content?: string; metaDescription?: string; status?: string; publish?: boolean }) =>
    api.put<CmsPage>(`/v1/admin/cms/pages/${id}`, data),
  deleteCmsPage: (id: number) =>
    api.delete(`/v1/admin/cms/pages/${id}`),
  getBlogPosts: (params?: PaginationParams) =>
    api.get<PageResponse<BlogPost>>('/v1/admin/cms/blog', { params }),
  createBlogPost: (data: { slug: string; title: string; excerpt?: string; content: string; category?: string; coverImageUrl?: string }) =>
    api.post<BlogPost>('/v1/admin/cms/blog', data),
  updateBlogPost: (id: number, data: { slug?: string; title?: string; excerpt?: string; content?: string; category?: string; coverImageUrl?: string; status?: string; publish?: boolean }) =>
    api.put<BlogPost>(`/v1/admin/cms/blog/${id}`, data),
  deleteBlogPost: (id: number) =>
    api.delete(`/v1/admin/cms/blog/${id}`),
  getEmailTemplates: () =>
    api.get<EmailTemplate[]>('/v1/admin/cms/email-templates'),
  updateEmailTemplate: (id: number, data: { subject?: string; body?: string; isActive?: boolean }) =>
    api.put<EmailTemplate>(`/v1/admin/cms/email-templates/${id}`, data),
}

// Super-admin exclusive team-account management (/v1/super-admin/** — SUPER_ADMIN only)
export const superAdminApi = {
  createAdmin: (data: {
    name: string
    email: string
    phone?: string
    password: string
    role?: 'ADMIN' | 'SUPPORT_AGENT'
  }) =>
    api.post<User>('/v1/super-admin/users/admins', data),
  listAdmins: () =>
    api.get<User[]>('/v1/super-admin/users/admins'),
  suspendAdmin: (id: number, reason: string) =>
    api.post<User>(`/v1/super-admin/users/${id}/suspend`, { reason }),
  unsuspendAdmin: (id: number) =>
    api.post<User>(`/v1/super-admin/users/${id}/unsuspend`),
}

// Public platform settings (no auth) — maintenance banner + footer contact info
export const publicApi = {
  getSettings: () =>
    api.get<PublicSettings>('/v1/public/settings'),
}

// Public FAQ chatbot (no auth) — grounded assistant bubble on the marketing pages
export const chatbotApi = {
  ask: (question: string, history: ChatbotMessage[]) =>
    api.post<ChatbotAnswer>('/v1/public/chatbot/ask', { question, history }),
}

// Locality/area autocomplete (server-side Google Places proxy)
export const locationApi = {
  autocomplete: (query: string, city?: string) =>
    api.get<{ suggestions: string[] }>('/v1/locations/autocomplete', { params: { query, city } }),
}

// Authenticated AI Assistant (client + builder) — one saved thread per user
export const assistantApi = {
  getThread: () => api.get<AssistantThread>('/v1/assistant/messages'),
  sendMessage: (message: string) => api.post<AiMessage>('/v1/assistant/messages', { message }),
  clearThread: () => api.delete('/v1/assistant/messages'),
}

// Floor Plan Studio (client + builder) — AI generates the semantic room program;
// the client lays it out and renders an editable vector plan.
export const floorPlanApi = {
  generate: (brief: FloorPlanBrief) =>
    api.post<FloorPlanResponse>('/v1/floorplan/generate', brief),
}

// Public CMS content (no auth) — published pages + blog rendered on the public site
export const cmsPublicApi = {
  getPage: (slug: string) =>
    api.get<CmsPageContent>(`/v1/public/pages/${slug}`),
  getBlog: (params?: PaginationParams & { category?: string }) =>
    api.get<PageResponse<BlogPost>>('/v1/public/blog', { params }),
  getBlogPost: (slug: string) =>
    api.get<BlogPost>(`/v1/public/blog/${slug}`),
}

// Support Tickets
export const supportTicketApi = {
  create: (data: { category: string; priority?: string; subject: string; description: string; projectId?: number; orderId?: number }) =>
    api.post<SupportTicket>('/v1/support/tickets', data),
  getTickets: (params?: PaginationParams) =>
    api.get<PageResponse<SupportTicket>>('/v1/support/tickets', { params }),
  getTicket: (id: number) =>
    api.get<SupportTicket>(`/v1/support/tickets/${id}`),
  escalate: (id: number) =>
    api.post<SupportTicket>(`/v1/support/tickets/${id}/escalate`),
  updateStatus: (id: number, status: string) =>
    api.post(`/v1/support/tickets/${id}/status`, { status }),
  resolve: (id: number, resolution: string) =>
    api.post(`/v1/support/tickets/${id}/resolve`, { resolution }),
  reopen: (id: number) =>
    api.post(`/v1/support/tickets/${id}/reopen`),
  addResponse: (id: number, data: { message: string; isInternal?: boolean }) =>
    api.post<TicketResponseRecord>(`/v1/support/tickets/${id}/responses`, data),
  // Backend returns a bare array (not paginated) — internal notes are already filtered out server-side.
  getResponses: (id: number) =>
    api.get<TicketResponseRecord[]>(`/v1/support/tickets/${id}/responses`),
}

// Disputes
export const disputeApi = {
  // filedAgainstId is optional — the backend infers the respondent as the project counterpart (6a).
  file: (projectId: number, data: { filedAgainstId?: number; disputeType: string; title: string; description: string; milestoneId?: number; evidence?: string; disputedAmount?: number }) =>
    api.post<Dispute>(`/v1/projects/${projectId}/disputes`, data),
  getDisputes: (params?: PaginationParams) =>
    api.get<PageResponse<Dispute>>('/v1/disputes', { params }),
  getDispute: (id: number) =>
    api.get<Dispute>(`/v1/disputes/${id}`),
  escalate: (id: number) =>
    api.post<Dispute>(`/v1/disputes/${id}/escalate`),
  updateStatus: (id: number, status: string) =>
    api.post(`/v1/disputes/${id}/status`, { status }),
  resolve: (id: number, data: { resolutionType?: string; resolutionDetails: string; resolutionAmount?: number }) =>
    api.post(`/v1/disputes/${id}/resolve`, data),
  addComment: (id: number, data: { comment: string; isInternal?: boolean }) =>
    api.post<DisputeComment>(`/v1/disputes/${id}/comments`, data),
  // Backend returns a bare array (not paginated) — internal notes are already filtered out server-side.
  getComments: (id: number) =>
    api.get<DisputeComment[]>(`/v1/disputes/${id}/comments`),
}

// Materials
export const materialApi = {
  browse: (params?: PaginationParams & {
    query?: string
    categoryId?: number
    supplierId?: number
    minPrice?: number
    maxPrice?: number
    inStock?: boolean
    sort?: string
  }) =>
    api.get<PageResponse<Material>>('/v1/materials', { params }),
  getMaterial: (id: number) =>
    api.get<Material>(`/v1/materials/${id}`),
  getCategories: () =>
    api.get<MaterialCategory[]>('/v1/materials/categories'),
  getSupplierCatalog: (params?: PaginationParams & { search?: string }) =>
    api.get<PageResponse<Material>>('/v1/supplier/materials', { params }),
  create: (data: Omit<Material, 'id' | 'supplierId' | 'supplierName' | 'createdAt'>) =>
    api.post<Material>('/v1/supplier/materials', data),
  update: (id: number, data: Partial<Omit<Material, 'id' | 'supplierId' | 'supplierName' | 'createdAt'>>) =>
    api.put<Material>(`/v1/supplier/materials/${id}`, data),
  delete: (id: number) =>
    api.delete(`/v1/supplier/materials/${id}`),
  uploadImage: (materialId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Material>(`/v1/supplier/materials/${materialId}/images`, form, multipartConfig)
  },
  deleteImage: (materialId: number, imageUrl: string) =>
    api.delete<Material>(`/v1/supplier/materials/${materialId}/images`, { params: { url: imageUrl } }),
}

// Material Orders
export const materialOrderApi = {
  create: (data: CreateMaterialOrderRequest) =>
    api.post<MaterialOrder>('/v1/material-orders', data),
  getOrder: (id: number) =>
    api.get<MaterialOrder>(`/v1/material-orders/${id}`),
  getMyOrders: (params?: PaginationParams & { status?: string; search?: string }) =>
    api.get<PageResponse<MaterialOrder>>('/v1/material-orders/my', { params }),
  getProjectOrders: (projectId: number, params?: PaginationParams) =>
    api.get<PageResponse<MaterialOrder>>(`/v1/projects/${projectId}/material-orders`, { params }),
  getSupplierOrders: (params?: PaginationParams & {
    status?: string
    paymentStatus?: string
    search?: string
    dateFrom?: string
    dateTo?: string
  }) =>
    api.get<PageResponse<MaterialOrder>>('/v1/supplier/orders', { params }),
  confirm: (id: number) =>
    api.post(`/v1/material-orders/${id}/confirm`),
  cancel: (id: number, reason: string) =>
    api.post<MaterialOrder>(`/v1/material-orders/${id}/cancel`, { reason }),
  decline: (id: number, reason: string) =>
    api.post<MaterialOrder>(`/v1/material-orders/${id}/decline`, { reason }),
  markPaid: (id: number) =>
    api.post<MaterialOrder>(`/v1/material-orders/${id}/mark-paid`),
  updateStatus: (id: number, status: string) =>
    api.post(`/v1/material-orders/${id}/status`, { status }),
  createDelivery: (id: number, data: { deliveryMethod: string; trackingNumber?: string; driverName?: string; driverPhone?: string; estimatedDelivery?: string; notes?: string }) =>
    api.post(`/v1/material-orders/${id}/deliveries`, data),
  updateDeliveryStatus: (id: number, status: string) =>
    api.post(`/v1/deliveries/${id}/status`, { status }),
}

// Supplier's own business profile (edit surface for the supplier profile page)
export const supplierApi = {
  getMyProfile: () =>
    api.get<SupplierProfile>('/v1/supplier/me/profile'),
  updateMyProfile: (data: UpdateSupplierProfileRequest) =>
    api.put<SupplierProfile>('/v1/supplier/me/profile', data),
  getMyStats: () =>
    api.get<SupplierStats>('/v1/supplier/me/stats'),
  // Revenue from paid marketplace orders (totals + monthly buckets + paged order list)
  getRevenue: () =>
    api.get<SupplierRevenue>('/v1/supplier/me/revenue'),
  getRevenueOrders: (params: { page?: number; size?: number }) =>
    api.get<PageResponse<MaterialOrder>>('/v1/supplier/me/revenue/orders', { params }),
  requestVerification: (data?: { note?: string; documentUrls?: string[] }) =>
    api.post<VerificationRequestResult>('/v1/supplier/me/verification-request', data ?? {}),
  uploadVerificationDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string }>('/v1/supplier/me/verification-request/document', form, multipartConfig)
  },
}

// Favourites (marketplace hearts) — user-scoped, MATERIAL or PROJECT targets
export const favoriteApi = {
  toggle: (entityType: FavoriteEntityType, entityId: number) =>
    api.post<FavoriteToggleResult>('/v1/favorites/toggle', { entityType, entityId }),
  getIds: (type: FavoriteEntityType) =>
    api.get<number[]>('/v1/favorites/ids', { params: { type } }),
  listMaterials: () =>
    api.get<Material[]>('/v1/favorites', { params: { type: 'MATERIAL' } }),
  listProjects: () =>
    api.get<Project[]>('/v1/favorites', { params: { type: 'PROJECT' } }),
}

// Badges
export const badgeApi = {
  getAll: () =>
    api.get<BadgeRecord[]>('/v1/badges'),
  getUserBadges: (userId: number) =>
    api.get<UserBadgeRecord[]>(`/v1/users/${userId}/badges`),
  award: (badgeId: number, data: { userId: number; notes?: string }) =>
    api.post(`/v1/admin/badges/${badgeId}/award`, data),
  revoke: (userId: number, badgeId: number) =>
    api.delete(`/v1/admin/badges/${userId}/${badgeId}/revoke`),
}

// Profile aggregate — one call returns the role-aware profile a viewer sees (contact fields
// are null unless the viewer is the owner or an admin). Requires authentication.
export const profileApi = {
  getUserProfile: (userId: number) =>
    api.get<UserProfile>(`/v1/users/${userId}/profile`),
}

// Builder portfolio (self-managed showcase items). Images are uploaded first, then their urls
// are saved on the item.
export const portfolioApi = {
  list: (userId: number) =>
    api.get<PortfolioItem[]>(`/v1/users/${userId}/portfolio`),
  create: (data: PortfolioItemRequest) =>
    api.post<PortfolioItem>('/v1/builder/me/portfolio', data),
  update: (id: number, data: PortfolioItemRequest) =>
    api.put<PortfolioItem>(`/v1/builder/me/portfolio/${id}`, data),
  remove: (id: number) =>
    api.delete(`/v1/builder/me/portfolio/${id}`),
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string }>('/v1/builder/me/portfolio/images', form, multipartConfig)
  },
}

// Certifications (self-declared credentials, LinkedIn-style). Builders and suppliers share the
// same service; suppliers must use the role-neutral /v1/users/me/... path because the
// /v1/builder/** URL rule 403s them before @PreAuthorize runs. Omitting role keeps existing
// builder call sites unchanged.
const certificationBase = (role?: string) =>
  role === 'SUPPLIER' ? '/v1/users/me/certifications' : '/v1/builder/me/certifications'

export const certificationApi = {
  list: (userId: number) =>
    api.get<Certification[]>(`/v1/users/${userId}/certifications`),
  create: (data: CertificationRequest, role?: string) =>
    api.post<Certification>(certificationBase(role), data),
  update: (id: number, data: CertificationRequest, role?: string) =>
    api.put<Certification>(`${certificationBase(role)}/${id}`, data),
  remove: (id: number, role?: string) =>
    api.delete(`${certificationBase(role)}/${id}`),
  uploadDocument: (file: File, role?: string) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string }>(`${certificationBase(role)}/document`, form, multipartConfig)
  },
}
