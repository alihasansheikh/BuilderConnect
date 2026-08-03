// Platform domain types: support, disputes, materials,
// badges, reviews, profiles, admin, CMS, and API param shapes.
import type { User, BuilderProfile, SupplierProfile } from './core'

// Support Tickets
export interface SupportTicket {
  id: number
  ticketNumber: string
  userId: number
  userName?: string
  userEmail?: string
  projectId?: number
  orderId?: number
  category: string
  priority: string
  status: string
  escalated?: boolean
  subject: string
  description: string
  resolution?: string
  resolvedBy?: number
  resolvedAt?: string
  satisfactionRating?: number
  responseCount?: number
  createdAt: string
  updatedAt?: string
}

export interface TicketResponseRecord {
  id: number
  ticketId: number
  userId: number
  userName?: string
  userRole?: string
  message: string
  isInternal: boolean
  attachments?: string
  createdAt: string
}

// Disputes
export interface Dispute {
  id: number
  disputeNumber: string
  projectId: number
  projectTitle?: string
  milestoneId?: number
  filedById: number
  filedByName?: string
  filedAgainstId: number
  filedAgainstName?: string
  disputeType: string
  status: string
  title: string
  description: string
  evidence?: string
  disputedAmount?: number
  resolutionAmount?: number
  resolutionType?: string
  resolutionDetails?: string
  resolvedAt?: string
  commentCount?: number
  createdAt: string
  updatedAt?: string
}

export interface DisputeComment {
  id: number
  disputeId: number
  userId: number
  userName?: string
  userRole?: string
  comment: string
  isInternal: boolean
  attachments?: string
  createdAt: string
}

// Materials
export interface Material {
  id: number
  supplierId: number
  supplierName?: string
  supplierVerified?: boolean
  categoryId?: number
  name: string
  description?: string
  sku?: string
  unit: string
  unitPrice: number
  minOrderQuantity: number
  stockQuantity: number
  isAvailable: boolean
  images?: string
  specifications?: string
  averageRating?: number
  totalReviews?: number
  totalOrders?: number
  isFeatured?: boolean
  brand?: string
  thumbnailUrl?: string
  createdAt: string
}

export interface MaterialCategory {
  id: number
  name: string
  icon?: string
  displayOrder?: number
}

export type MaterialOrderStatus =
  | 'DRAFT'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'

export interface MaterialOrder {
  id: number
  orderNumber: string
  projectId?: number | null
  projectTitle?: string
  supplierId: number
  supplierName?: string
  orderedById: number
  orderedByName?: string
  status: string
  paymentStatus: string
  subtotal: number
  taxAmount: number
  deliveryFee: number
  totalAmount: number
  deliveryAddress?: string
  deliveryCity?: string
  deliveryContactName?: string
  deliveryContactPhone?: string
  deliveryInstructions?: string
  paymentMethod?: string
  cancellationReason?: string
  cancelledAt?: string
  deliveryDate?: string
  notes?: string
  itemCount?: number
  items?: MaterialOrderItem[]
  deliveries?: DeliveryRecord[]
  createdAt: string
  updatedAt?: string
}

export interface MaterialOrderItem {
  id: number
  materialId: number
  materialName?: string
  materialSku?: string
  unitOfMeasure?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
}

export interface CreateMaterialOrderRequest {
  supplierId: number
  projectId?: number
  deliveryAddress: string
  deliveryCity: string
  deliveryContactName?: string
  deliveryContactPhone?: string
  deliveryDate?: string
  notes?: string
  items: { materialId: number; quantity: number; notes?: string }[]
}

export interface CreateMaterialReviewRequest {
  overallRating: number
  title?: string
  comment?: string
}

export interface MaterialReviewCheck {
  hasReviewed: boolean
  canReview: boolean
  review?: Review | null
}

// GET /v1/projects/{id}/review/me — has the current user reviewed this project?
export interface ProjectReviewCheck {
  hasReviewed: boolean
  review?: Review | null
}

export interface UpdateSupplierProfileRequest {
  companyName: string
  description?: string
  businessRegistrationNumber?: string
  taxId?: string
  categories?: string[]
  warehouseAddress?: string
  deliveryAreas?: string[]
  minimumOrderValue?: number
}

// Favourites (marketplace hearts) — backed by the V33 favorites table
export type FavoriteEntityType = 'MATERIAL' | 'PROJECT'

export interface FavoriteToggleResult {
  favorited: boolean
}

// Supplier dashboard aggregates — GET /v1/supplier/me/stats
export interface SupplierStats {
  pendingOrders: number
  activeOrders: number
  deliveredOrders: number
  unpaidCodOrders: number
  revenue: number
  catalogItems: number
  lowStockItems: number
}

// Supplier revenue page — totals + monthly buckets from PAID marketplace orders
export interface SupplierRevenue {
  totalRevenue: number
  paidOrders: number
  thisMonthRevenue: number
  monthly: { month: string; orders: number; total: number }[]
}

export interface DeliveryRecord {
  id: number
  orderId: number
  deliveryNumber: string
  status: string
  deliveryMethod: string
  trackingNumber?: string
  driverName?: string
  driverPhone?: string
  estimatedDelivery?: string
  actualDelivery?: string
  notes?: string
  createdAt: string
}

// Badges
export interface BadgeRecord {
  id: number
  name: string
  code: string
  description?: string
  icon?: string
  category: string
  criteriaType: string
  leadCreditBonus: number
  isActive: boolean
  createdAt: string
}

export interface UserBadgeRecord {
  id: number
  badgeId: number
  badgeName: string
  badgeCode: string
  badgeDescription?: string
  badgeIcon?: string
  badgeCategory: string
  awardedAt: string
  awardedByName?: string
  notes?: string
}

// Review types
export interface Review {
  id: number
  projectId: number
  projectTitle?: string
  materialId?: number
  materialName?: string
  productName?: string
  reviewerId: number
  reviewerName?: string
  revieweeId: number
  revieweeName?: string
  reviewType: string
  isVerifiedPurchase?: boolean
  rating: number
  overallRating?: number
  title?: string
  comment: string
  qualityRating?: number
  communicationRating?: number
  timelinessRating?: number
  valueRating?: number
  status: string
  moderatedAt?: string
  response?: string
  isVerifiedProject?: boolean
  helpfulCount?: number
  notHelpfulCount?: number
  createdAt: string
  updatedAt?: string
}

// Helpful/not-helpful voting on reviews — POST /v1/reviews/{id}/helpful
export interface ReviewVoteResponse {
  helpfulCount: number
  notHelpfulCount: number
  myVote: 'HELPFUL' | 'NOT_HELPFUL' | null
}

export interface ReviewMyVote {
  reviewId: number
  helpful: boolean
}

// Profile: portfolio & certifications
export interface PortfolioItem {
  id: number
  userId: number
  title: string
  description?: string
  images: string[]
  projectCost?: number | null
  durationDays?: number | null
  year?: number | null
  externalUrl?: string
  createdAt: string
}

export interface PortfolioItemRequest {
  title: string
  description?: string
  images?: string[]
  projectCost?: number | null
  durationDays?: number | null
  year?: number | null
  externalUrl?: string
}

export interface Certification {
  id: number
  userId: number
  name: string
  issuingOrganization?: string
  issueDate?: string
  expiryDate?: string
  credentialId?: string
  credentialUrl?: string
  documentUrl?: string
  createdAt: string
}

export interface CertificationRequest {
  name: string
  issuingOrganization?: string
  issueDate?: string
  expiryDate?: string
  credentialId?: string
  credentialUrl?: string
  documentUrl?: string
}

/** A completed platform project auto-surfaced in a builder's portfolio. */
export interface CompletedProjectSummary {
  id: number
  title: string
  categoryName?: string
  city?: string
  finalBudget?: number | null
  actualCompletionDate?: string
}

/** Aggregate a viewer sees for any user's profile (contact fields null unless self/admin). */
export interface UserProfile {
  userId: number
  name: string
  role: string
  city?: string
  profileImageUrl?: string
  memberSince: string
  headline?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  isOwnProfile: boolean
  builderProfile?: BuilderProfile
  supplierProfile?: SupplierProfile
  portfolio: PortfolioItem[]
  completedProjects: CompletedProjectSummary[]
  certifications: Certification[]
  averageRating?: number
  totalReviews?: number
}

// Admin types

/** Lifecycle of a builder/supplier verification request (mirrors the backend enum). */
export type VerificationStatus = 'UNSUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED'

/** Body of POST /v1/{builder|supplier}/me/verification-request responses. */
export interface VerificationRequestResult {
  verificationStatus: VerificationStatus
  verificationRequestedAt: string
}

/** Row shape of GET /v1/admin/builders/pending (flat map from AdminController). */
export interface PendingBuilder {
  id: number
  userId: number
  name: string
  email: string
  city?: string | null
  companyName?: string | null
  yearsOfExperience: number
  ntnNumber?: string | null
  pecNumber?: string | null
  verificationStatus?: VerificationStatus
  verificationRequestedAt?: string | null
  documents?: string[]
  createdAt: string
}

/** Row shape of GET /v1/admin/suppliers/pending (flat map from AdminService). */
export interface PendingSupplier {
  id: number
  userId: number
  name: string
  email: string
  city?: string | null
  companyName?: string | null
  businessRegistrationNumber?: string | null
  verificationStatus?: VerificationStatus
  verificationRequestedAt?: string | null
  documents?: string[]
  createdAt: string
}

/**
 * Enriched GET /v1/admin/users/{id} — every UserResponse field plus
 * role-aware activity counts and earned badges.
 */
export interface AdminUserDetail extends User {
  projectCount: number
  bidCount: number
  activeSubscriptionTier?: string | null
  badges: UserBadgeRecord[]
}

export interface AdminMetrics {
  users: Record<string, number>
  projects: Record<string, number>
  bids: Record<string, number>
  subscriptions: Record<string, number>
  reviews: Record<string, number>
  tickets: Record<string, number>
  disputes: Record<string, number>
  verifiedBuilders: number
  pendingVerifications?: number
}

// Subscription revenue (Stripe payments recorded in subscription_payments)
export interface SubscriptionRevenueSummary {
  totalRevenue: number
  totalPayments: number
  revenueThisMonth: number
  monthlyTrends: { month: string; total: number; count: number }[]
  byTier: { tier: string; total: number; count: number }[]
  recentPayments: { id: number; builderName: string; tier: string; amount: number; paidAt: string }[]
}

export interface AuditLog {
  id: number
  userId?: number
  userName?: string
  userEmail?: string
  action: string
  actionCategory: string
  entityType?: string
  entityId?: number
  description?: string
  ipAddress?: string
  userAgent?: string
  status: string
  createdAt: string
}

export interface SystemSetting {
  id: number
  key: string
  value: string
  type: string
  description: string
  isPublic: boolean
  updatedAt: string | null
}

/** GET /v1/public/settings — maintenance banner + contact info (no auth). */
export interface PublicSettings {
  maintenanceBanner: boolean
  maintenanceMessage: string
  supportEmail: string
  supportPhone: string
  platformName: string
  /** Public FAQ chatbot is enabled AND a Gemini key is configured server-side. */
  chatbotEnabled: boolean
}

/** A single message in the public FAQ chatbot conversation. */
export interface ChatbotMessage {
  role: 'user' | 'assistant'
  content: string
}

/** POST /v1/public/chatbot/ask response. */
export interface ChatbotAnswer {
  answer: string
}

/** One message in the authenticated AI Assistant thread. */
export interface AiMessage {
  id: number
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string | null
}

/** GET /v1/assistant/messages — the user's saved thread + availability. */
export interface AssistantThread {
  enabled: boolean
  messages: AiMessage[]
}

// Floor Plan Studio — AI-generated editable vector plans (POST /v1/floorplan/generate)

/** Design brief posted to the Floor Plan generator (mirrors the backend FloorPlanBrief record). */
export interface FloorPlanBrief {
  plotValue: number
  unit: 'MARLA' | 'KANAL' | 'SQFT'
  bedrooms: number
  bathrooms: number
  kitchen: 'OPEN' | 'CLOSED'
  drawingRoom: boolean
  carPorch: boolean
  notes?: string
}

/**
 * POST /v1/floorplan/generate — the semantic plan program returned verbatim as a
 * raw JSON string. The client zod-validates + lays it out deterministically.
 */
export interface FloorPlanResponse {
  planJson: string
}

// CMS types
export interface CmsPage {
  id: number
  slug: string
  title: string
  content: string
  metaDescription?: string
  status: string
  isPublished?: boolean
  publishedAt?: string | null
  createdAt: string
  updatedAt?: string
}

/**
 * Published page payload from GET /v1/public/pages/{slug} — same map the
 * admin CRUD returns, guaranteed published. Alias kept as its own name so
 * public pages don't couple to the admin editor type.
 */
export type CmsPageContent = CmsPage

export interface BlogPost {
  id: number
  slug: string
  title: string
  excerpt?: string
  content: string
  category?: string
  tags?: string | null
  coverImageUrl?: string
  authorId?: number
  authorName?: string
  status: string
  isPublished?: boolean
  viewCount?: number
  publishedAt?: string
  createdAt: string
  updatedAt?: string
}

export interface EmailTemplate {
  id: number
  templateKey: string
  name: string
  subject: string
  body: string
  variables: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface BuilderAnalyticsMonthlyPoint {
  month: string
  bids: number
  won: number
  revenue: number
  avgRating: number
  reviews: number
}

export interface BuilderAnalyticsRatingBucket {
  rating: number
  count: number
}

export interface BuilderAnalytics {
  bids: {
    total: number
    submitted: number
    accepted: number
    rejected: number
    withdrawn: number
    winRate: number
  }
  projects: {
    total: number
    inProgress: number
    completed: number
    totalEarnings: number
  }
  profile: {
    averageRating: number
    totalReviews: number
    isVerified: boolean
    subscriptionTier: string
  }
  earningsReceived: number
  analyticsAccess: boolean
  // Present only when analyticsAccess is true (trends are gated server-side).
  monthly?: BuilderAnalyticsMonthlyPoint[]
  reviewDistribution?: BuilderAnalyticsRatingBucket[]
}

export interface LeadCreditBalance {
  credits: number
  tier?: string
  subscriptionTier?: string
  monthlyCredits?: number
}

// Request bodies and API query-param shapes live in a sibling module to keep
// this file under the line cap; re-exported so consumers are unaffected.
export * from './platform-requests'
