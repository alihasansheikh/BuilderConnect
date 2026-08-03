// Type-only import; the core<->platform cycle is erased at compile time.
import type { VerificationStatus } from './platform'

// User types
export interface User {
  id: number
  email: string
  name: string
  phone?: string
  role: UserRole
  city?: string
  address?: string
  profileImageUrl?: string
  active: boolean
  suspended?: boolean
  suspensionReason?: string | null
  emailVerified: boolean
  twoFactorEnabled: boolean
  lastLogin?: string
  createdAt: string
  builderProfile?: BuilderProfile
  supplierProfile?: SupplierProfile
}

export type UserRole =
  | 'CLIENT'
  | 'BUILDER'
  | 'SUPPLIER'
  | 'SUPPORT_AGENT'
  | 'ADMIN'
  | 'SUPER_ADMIN'

export interface BuilderProfile {
  id: number
  userId: number
  companyName?: string
  yearsOfExperience: number
  bio?: string
  specializations: string[]
  skills: string[]
  serviceAreas: string[]
  isVerified: boolean
  verificationStatus?: VerificationStatus
  verificationRequestedAt?: string | null
  verificationRejectionReason?: string | null
  isAvailable: boolean
  hourlyRate?: number
  minimumProjectValue?: number
  portfolioImages: string[]
  portfolioDescription?: string
  totalProjectsCompleted: number
  totalEarnings?: number
  averageRating: number
  totalReviews: number
  subscriptionTier: string
  leadCredits: number
  primaryTrade?: string
  secondaryTrades?: string[]
  experiencePerTrade?: string
  ntnNumber?: string
  pecNumber?: string
  teamMembers?: string
  serviceAreaRadius?: number
  bannerImageUrl?: string
}

/**
 * Builder card shape returned by GET /v1/builders (public search).
 * The backend serializes a flat map of user + profile fields — NOT a User object.
 */
export interface BuilderSummary {
  id: number
  userId: number
  name: string
  city?: string | null
  companyName?: string | null
  bio?: string | null
  yearsOfExperience: number
  specializations: string[]
  skills: string[]
  serviceAreas: string[]
  isVerified: boolean
  isAvailable: boolean
  averageRating: number
  totalReviews: number
  totalProjectsCompleted: number
  subscriptionTier: string
  hourlyRate?: number | null
  profileImageUrl?: string | null
  bannerImageUrl?: string | null
}

/**
 * Public builder profile shape returned by GET /v1/builders/{id}
 * (same flat map as search today) — used by BuilderDetail/BuilderComparison.
 */
export interface BuilderData extends BuilderSummary {
  /** Not currently returned by the endpoint; kept optional for comparison UI. */
  primaryTrade?: string | null
}

// Subscription types
export interface SubscriptionPlan {
  id: number
  name: string
  tier: string
  price: number
  billingCycle: string
  leadCreditsPerMonth: number
  maxActiveBids: number
  maxPortfolioImages: number
  featuredListing: boolean
  prioritySupport: boolean
  analyticsAccess: boolean
  badgeLabel?: string
  description?: string
}

// Stripe hosted Checkout (builder subscriptions)
export interface CheckoutSessionResponse {
  checkoutUrl: string
  sessionId: string
}

export interface ConfirmCheckoutResponse {
  applied: boolean
  alreadyProcessed?: boolean
  status?: string
  tier?: string
  expiresAt?: string
  creditsGranted?: number
}

export interface LeadTransaction {
  id: number
  transactionType: string
  amount: number
  balanceAfter: number
  referenceType?: string
  referenceId?: number
  description?: string
  createdAt: string
}

export interface SupplierProfile {
  id: number
  userId: number
  companyName: string
  description?: string
  categories: string[]
  isVerified: boolean
  verifiedAt?: string
  verificationStatus?: VerificationStatus
  verificationRequestedAt?: string | null
  verificationRejectionReason?: string | null
  businessRegistrationNumber?: string
  taxId?: string
  warehouseAddress?: string
  deliveryAreas: string[]
  minimumOrderValue: number
  totalOrdersCompleted: number
  totalReviews?: number
  averageRating: number
}

// Project types
export interface Project {
  id: number
  projectNumber: string
  title: string
  description: string
  categoryId?: number
  categoryName?: string
  propertyType?: string
  province?: string
  locationArea?: string
  areaValue?: number
  areaUnit?: string
  areaSqFt?: number
  floors?: number
  rooms?: number
  units?: number
  materialsProvidedBy?: string
  structureCondition?: string
  city: string
  locationAddress?: string
  budgetType?: string
  budgetMin?: number | null
  budgetMax?: number | null
  finalBudget?: number
  preferredStartDate?: string
  deadline?: string
  estimatedDurationDays?: number
  requiredSkills: string[]
  trades?: string[]
  attachments: string[]
  specialRequirements?: string
  status: ProjectStatus
  isUrgent: boolean
  isFeatured: boolean
  verifiedBuildersOnly?: boolean
  progressPercentage: number
  publishedAt?: string
  biddingDeadline?: string
  awardedAt?: string
  startedAt?: string
  expectedCompletionDate?: string
  actualCompletionDate?: string
  createdAt: string
  client?: User
  awardedBuilder?: User
  bidCount?: number
}

export type ProjectStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'BIDDING'
  | 'AWARDED'
  | 'CONTRACT_PENDING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'

// Bid types
export interface Bid {
  id: number
  bidNumber: string
  projectId: number
  projectTitle?: string
  projectCity?: string
  projectPropertyType?: string
  projectAreaValue?: number
  projectAreaUnit?: string
  projectBudgetMin?: number | null
  projectBudgetMax?: number | null
  builderId: number
  builderName?: string
  builderCompanyName?: string
  builderRating?: number
  builderProfileImageUrl?: string
  amount: number
  proposal: string
  workPlan?: string
  estimatedDurationDays: number
  laborCost?: number
  materialCost?: number
  otherCost?: number
  attachments: string[]
  status: BidStatus
  clientNotes?: string
  rejectionReason?: string
  validUntil?: string
  submittedAt?: string
  reviewedAt?: string
  acceptedAt?: string
  rejectedAt?: string
  withdrawnAt?: string
  createdAt: string
  builder?: User
  project?: Project
}

/** Unfiltered per-status bid totals for the MyBids stat tiles (GET /v1/builder/bids/stats). */
export interface BidStats {
  total: number
  submitted: number
  shortlisted: number
  accepted: number
  rejected: number
  withdrawn: number
}

/** O(1) duplicate-bid probe for the marketplace detail page (GET /v1/builder/bids/exists). */
export interface BidExists {
  exists: boolean
}

export type BidStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'

// Milestone types
export interface Milestone {
  id: number
  projectId: number
  title: string
  description?: string
  sequenceOrder: number
  paymentAmount: number
  paymentPercentage?: number
  startDate?: string
  dueDate?: string
  completedAt?: string
  approvedAt?: string
  status: MilestoneStatus
  progressPercentage: number
  deliverables: string[]
  /** Builder's optional completion note (plain string from the backend, not an array). */
  completionEvidence?: string
  rejectionReason?: string
  // Direct-payment fields (escrow removed): the client marks a milestone PAID with proof, the
  // builder confirms receipt (→ CONFIRMED).
  paidAt?: string
  paymentProofUrl?: string
  paymentConfirmedAt?: string
  paymentNote?: string
}

export type MilestoneStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_RELEASED'
  | 'DISPUTED'

// Chat types
export interface ChatRoom {
  id: number
  roomCode: string
  roomType: 'PROJECT' | 'BID' | 'SUPPORT' | 'DIRECT' | 'GROUP'
  projectId?: number
  name?: string
  lastMessageAt?: string
  lastMessagePreview?: string
  lastMessage?: string
  unreadCount?: number
  participants?: { id: number; name: string; profileImageUrl?: string }[]
  isActive: boolean
}

export interface ChatMessage {
  id: number
  chatRoomId: number
  senderId: number
  senderName?: string
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
  content: string
  attachmentUrl?: string
  attachmentName?: string
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  sender?: User
}

// Notification types
export interface Notification {
  id: number
  notificationType: string
  title: string
  message: string
  icon?: string
  relatedEntityType?: string
  relatedEntityId?: number
  actionUrl?: string
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface NotificationPreference {
  emailNewBid: boolean
  emailProjectUpdate: boolean
  emailMessages: boolean
  emailOrderUpdate: boolean
  emailMarketing: boolean
  pushNewBid: boolean
  pushProjectUpdate: boolean
  pushMessages: boolean
}

// API Response types
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

// Contract types
export interface Contract {
  id: number
  contractNumber: string
  projectId: number
  projectTitle: string
  status: ContractStatus
  client?: { id: number; name: string; email: string }
  builder?: { id: number; name: string; email: string }
  totalAmount: number
  paymentTerms?: string
  scopeOfWork?: string
  termsAndConditions?: string
  specialClauses?: string
  startDate: string
  endDate: string
  clientSignedAt?: string
  builderSignedAt?: string
  fullySigned: boolean
  createdAt: string
  updatedAt?: string
}

/** Contract terms authored by the awarded builder (create + edit while unsigned). */
export interface ContractDraftRequest {
  scopeOfWork: string
  paymentTerms: string
  termsAndConditions?: string
  specialClauses?: string
  startDate: string
  endDate: string
}

/** Milestone proposed by the awarded builder; amounts may not exceed the awarded budget in total. */
export interface CreateMilestoneRequest {
  title: string
  description?: string
  amount: number
  dueDate?: string
}

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_CLIENT'
  | 'PENDING_BUILDER'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'TERMINATED'
  | 'DISPUTED'

// Milestone Update types
export interface MilestoneUpdate {
  id: number
  milestoneId: number
  updateType: string
  message: string
  progressPercentage?: number
  attachments?: string
  createdBy?: { id: number; name: string; email: string }
  createdAt: string
}

// Change Request types
export interface ChangeRequest {
  id: number
  projectId: number
  changeType: string
  title: string
  description: string
  proposedValue?: string
  currentValue?: string
  status: string
  requestedBy?: { id: number; name: string; email: string }
  reviewedBy?: { id: number; name: string; email: string }
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
}

// Contract Version types
export interface ContractVersion {
  id: number
  contractId: number
  versionNumber: number
  scopeOfWork?: string
  termsAndConditions?: string
  totalAmount?: number
  startDate?: string
  endDate?: string
  changeSummary?: string
  createdBy?: { id: number; name: string; email: string }
  createdAt: string
}

// Escrow types
export interface EscrowBalance {
  projectId: number
  totalFunded: number
  totalReleased: number
  totalRefunded: number
  currentBalance: number
  pendingRelease: number
  currency: string
  isActive: boolean
  transactions: EscrowTransaction[]
}

export interface EscrowTransaction {
  id: number
  transactionReference: string
  transactionType: 'FUND' | 'RELEASE' | 'REFUND' | 'HOLD'
  amount: number
  netAmount: number
  balanceBefore: number
  balanceAfter: number
  description?: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: {
    id: number
    email: string
    name: string
    role: UserRole
    profileImageUrl?: string
    emailVerified: boolean
    twoFactorEnabled: boolean
  }
}

