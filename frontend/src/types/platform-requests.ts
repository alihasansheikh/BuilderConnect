// Request bodies and API query-param shapes. Split out of platform.ts to keep
// each file under the line cap; re-exported from platform.ts so `@/types` and
// `@/types/platform` consumers are unaffected.

// Request types
export interface RegisterRequest {
  name: string
  email: string
  password: string
  role: string
  phone?: string
  city?: string
  companyName?: string
}

export interface CreateProjectRequest {
  title: string
  description: string
  projectType?: string
  propertyType?: string
  categoryId?: number | null
  province?: string
  locationArea?: string
  areaValue?: number
  areaUnit?: string
  areaSqFt?: number | null
  floors?: number
  rooms?: number
  units?: number
  materialsProvidedBy?: string
  structureCondition?: string
  city: string
  locationAddress?: string
  budgetType?: string
  budgetMin?: number
  budgetMax?: number
  preferredStartDate?: string
  deadline?: string | null
  biddingDeadline?: string | null
  estimatedDurationDays?: number | null
  requiredSkills?: string[]
  trades?: string[]
  specialRequirements?: string | null
  isUrgent?: boolean
  verifiedBuildersOnly?: boolean
  allowPartialBids?: boolean
  isPublic?: boolean
  attachmentUrls?: string[] | null
}

export interface CreateBidRequest {
  projectId: number
  amount: number
  proposal: string
  workPlan?: string
  estimatedDurationDays: number
  laborCost?: number
  materialCost?: number
  otherCost?: number
  validUntil?: string
}

export interface CreateReviewRequest {
  overallRating: number
  qualityRating?: number
  communicationRating?: number
  timelinessRating?: number
  title?: string
  comment?: string
}

export interface UpdateBuilderProfileRequest {
  companyName?: string
  bio?: string
  yearsOfExperience?: number
  specializations?: string[]
  skills?: string[]
  serviceAreas?: string[]
  hourlyRate?: number
  minimumProjectValue?: number
  isAvailable?: boolean
  primaryTrade?: string
  secondaryTrades?: string[]
  experiencePerTrade?: string
  ntnNumber?: string
  pecNumber?: string
  teamMembers?: string
  serviceAreaRadius?: number
}

// Pagination params
export interface PaginationParams {
  page?: number
  size?: number
  sort?: string
  status?: string
  [key: string]: string | number | boolean | undefined
}

export interface ProjectSearchParams extends PaginationParams {
  search?: string
  city?: string
  propertyType?: string
  province?: string
  minBudget?: number
  maxBudget?: number
  category?: string
  categoryId?: number
}

export interface AdminUserParams extends PaginationParams {
  role?: string
  search?: string
  status?: string
}

export interface AuditLogParams extends PaginationParams {
  actionCategory?: string
  category?: string
  action?: string
  status?: string
  userId?: number
  startDate?: string
  endDate?: string
}

export interface ModerationQueueParams extends PaginationParams {
  reviewType?: string
  minRating?: number
  maxRating?: number
}
