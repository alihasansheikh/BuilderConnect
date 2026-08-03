# Domain Model (Extracted from Entity Classes)

> Every field, relationship, and annotation below is extracted directly from JPA entity source code. Nothing is assumed.
>
> For SQL column definitions and constraints, see [05-database-schema.md](05-database-schema.md).
> For status transitions and business rules, see [01-product-requirements.md](01-product-requirements.md).

---

## BaseEntity (MappedSuperclass)

All entities marked "extends BaseEntity" inherit these fields:

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| id | Long | id | false | `@Id @GeneratedValue(IDENTITY)` |
| createdAt | LocalDateTime | created_at | false | `@CreatedDate`, not updatable |
| updatedAt | LocalDateTime | updated_at | true | `@LastModifiedDate` |

---

## Entity: User

| Aspect | Value |
|--------|-------|
| Table | `users` |
| Extends | BaseEntity |
| Implements | UserDetails (Spring Security) |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| email | String | email | false | unique, length=100 |
| password | String | password | false | BCrypt encoded |
| name | String | name | false | length=100 |
| phone | String | phone | true | length=20 |
| role | UserRole | role | false | @Enumerated(STRING) |
| city | String | city | true | length=100 |
| address | String | address | true | length=500 |
| profileImageUrl | String | profile_image_url | true | length=500 |
| active | Boolean | active | false | default=true |
| suspended | Boolean | suspended | false | default=false |
| suspensionReason | String | suspension_reason | true | length=500 |
| emailVerified | Boolean | email_verified | false | default=false |
| emailVerificationToken | String | email_verification_token | true | length=100 |
| emailVerificationExpiresAt | LocalDateTime | email_verification_expires_at | true | |
| twoFactorEnabled | Boolean | two_factor_enabled | false | default=false |
| twoFactorSecret | String | two_factor_secret | true | length=100 |
| failedLoginAttempts | Integer | failed_login_attempts | false | default=0 |
| accountLockedUntil | LocalDateTime | account_locked_until | true | |
| refreshToken | String | refresh_token | true | length=500 |
| refreshTokenExpiresAt | LocalDateTime | refresh_token_expires_at | true | |
| lastLogin | LocalDateTime | last_login | true | |
| passwordResetToken | String | password_reset_token | true | length=100 |
| passwordResetExpiresAt | LocalDateTime | password_reset_expires_at | true | |
| deleted | Boolean | deleted | false | default=false |
| deletedAt | LocalDateTime | deleted_at | true | |

**Relationships:**

| Type | Target | Cascade | Fetch | MappedBy |
|------|--------|---------|-------|----------|
| @OneToOne | BuilderProfile | ALL | LAZY | user |
| @OneToOne | SupplierProfile | ALL | LAZY | user |

**Helper Methods:** `isAdmin()`, `isServiceProvider()`, `getFullName()`, `isAccountNonLocked()` (checks suspended + lockout), `isEnabled()` (checks active + deleted)

---

## Entity: Project

| Aspect | Value |
|--------|-------|
| Table | `projects` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| projectNumber | String | project_number | false | unique, length=20 |
| title | String | title | false | length=200 |
| description | String | description | false | TEXT |
| categoryId | Long | category_id | true | |
| categoryName | String | category_name | true | length=100 |
| city | String | city | false | length=100 |
| locationAddress | String | location_address | true | length=500 |
| locationLatitude | BigDecimal | location_latitude | true | precision=10, scale=8 |
| locationLongitude | BigDecimal | location_longitude | true | precision=11, scale=8 |
| budgetMin | BigDecimal | budget_min | true | DECIMAL(15,2) |
| budgetMax | BigDecimal | budget_max | true | DECIMAL(15,2) |
| finalBudget | BigDecimal | final_budget | true | DECIMAL(15,2) |
| deadline | LocalDate | deadline | true | |
| estimatedDurationDays | Integer | estimated_duration_days | true | |
| requiredSkills | String | required_skills | true | JSON column |
| attachments | String | attachments | true | JSON column |
| specialRequirements | String | special_requirements | true | TEXT |
| status | ProjectStatus | status | false | @Enumerated(STRING), default=DRAFT |
| isUrgent | Boolean | is_urgent | true | default=false |
| isFeatured | Boolean | is_featured | true | default=false |
| allowPartialBids | Boolean | allow_partial_bids | true | default=false |
| progressPercentage | Integer | progress_percentage | true | default=0 |
| currentMilestoneId | Long | current_milestone_id | true | |
| publishedAt | LocalDateTime | published_at | true | |
| biddingDeadline | LocalDateTime | bidding_deadline | true | |
| awardedAt | LocalDateTime | awarded_at | true | |
| startedAt | LocalDateTime | started_at | true | |
| expectedCompletionDate | LocalDate | expected_completion_date | true | |
| actualCompletionDate | LocalDate | actual_completion_date | true | |
| cancelledAt | LocalDateTime | cancelled_at | true | |
| cancellationReason | String | cancellation_reason | true | TEXT |
| contractSignedAt | LocalDateTime | contract_signed_at | true | |
| contractDocumentUrl | String | contract_document_url | true | length=500 |
| isPublic | Boolean | is_public | true | default=true |
| deleted | Boolean | deleted | true | default=false |
| deletedAt | LocalDateTime | deleted_at | true | |

**Relationships:**

| Type | Target | Column/MappedBy | Cascade | Fetch |
|------|--------|-----------------|---------|-------|
| @ManyToOne | User (client) | client_id | — | LAZY |
| @ManyToOne | User (awardedBuilder) | awarded_builder_id | — | LAZY |
| @OneToMany | Bid | mappedBy=project | PERSIST, MERGE | LAZY |
| @OneToMany | Milestone | mappedBy=project | PERSIST, MERGE | LAZY |
| @OneToOne | EscrowAccount | mappedBy=project | PERSIST, MERGE | LAZY |

**Helper Methods:** `isOpen()`, `isActive()`, `canReceiveBids()`, `publish()`, `award()`, `start()`, `complete()`, `cancel()`

---

## Entity: Bid

| Aspect | Value |
|--------|-------|
| Table | `bids` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| bidNumber | String | bid_number | false | unique, length=20 |
| amount | BigDecimal | amount | false | DECIMAL(15,2) |
| proposal | String | proposal | false | TEXT |
| workPlan | String | work_plan | true | TEXT |
| estimatedDurationDays | Integer | estimated_duration_days | true | |
| laborCost | BigDecimal | labor_cost | true | DECIMAL(15,2) |
| materialCost | BigDecimal | material_cost | true | DECIMAL(15,2) |
| otherCost | BigDecimal | other_cost | true | DECIMAL(15,2) |
| attachments | String | attachments | true | JSON column |
| status | BidStatus | status | false | @Enumerated(STRING), default=DRAFT |
| clientNotes | String | client_notes | true | TEXT |
| rejectionReason | String | rejection_reason | true | TEXT |
| validUntil | LocalDateTime | valid_until | true | |
| submittedAt | LocalDateTime | submitted_at | true | |
| reviewedAt | LocalDateTime | reviewed_at | true | |
| acceptedAt | LocalDateTime | accepted_at | true | |
| withdrawnAt | LocalDateTime | withdrawn_at | true | |

**Relationships:**

| Type | Target | Column | Cascade | Fetch |
|------|--------|--------|---------|-------|
| @ManyToOne | Project | project_id | — | LAZY |
| @ManyToOne | User (builder) | builder_id | — | LAZY |

**Helper Methods:** `isActive()`, `isFinal()`, `submit()`, `shortlist()`, `accept()`, `reject()`, `withdraw()`

---

## Entity: Milestone

| Aspect | Value |
|--------|-------|
| Table | `milestones` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| title | String | title | false | length=200 |
| description | String | description | true | TEXT |
| sequenceOrder | Integer | sequence_order | false | |
| paymentAmount | BigDecimal | payment_amount | true | DECIMAL(15,2) |
| paymentPercentage | BigDecimal | payment_percentage | true | DECIMAL(5,2) |
| startDate | LocalDate | start_date | true | |
| dueDate | LocalDate | due_date | true | |
| completedAt | LocalDateTime | completed_at | true | |
| approvedAt | LocalDateTime | approved_at | true | |
| approvedBy | Long | approved_by | true | |
| status | MilestoneStatus | status | false | @Enumerated(STRING), default=PENDING |
| progressPercentage | Integer | progress_percentage | true | default=0 |
| deliverables | String | deliverables | true | JSON column |
| completionEvidence | String | completion_evidence | true | JSON column |
| rejectionReason | String | rejection_reason | true | TEXT |
| paymentTransactionId | Long | payment_transaction_id | true | |

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @ManyToOne | Project | project_id | LAZY |

**Helper Methods:** `canBeCompleted()`, `canBeApproved()`, `requiresPayment()`, `isOverdue()`, `markComplete()`, `approve()`, `reject()`, `start()`

---

## Entity: EscrowAccount

| Aspect | Value |
|--------|-------|
| Table | `escrow_accounts` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| totalFunded | BigDecimal | total_funded | true | DECIMAL(15,2), default=0 |
| totalReleased | BigDecimal | total_released | true | DECIMAL(15,2), default=0 |
| totalRefunded | BigDecimal | total_refunded | true | DECIMAL(15,2), default=0 |
| currentBalance | BigDecimal | current_balance | true | DECIMAL(15,2), default=0 |
| pendingRelease | BigDecimal | pending_release | true | DECIMAL(15,2), default=0 |
| currency | String | currency | true | length=3, default="PKR" |
| isActive | Boolean | is_active | true | default=true |

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @OneToOne | Project | project_id | LAZY |
| @ManyToOne | User (client) | client_id | LAZY |

**Helper Methods:** `fund()`, `release()`, `refund()`, `canRelease()`, `getAvailableBalance()`

---

## Entity: EscrowTransaction

| Aspect | Value |
|--------|-------|
| Table | `escrow_transactions` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| transactionReference | String | transaction_reference | false | unique, length=30 |
| transactionType | TransactionType | transaction_type | false | @Enumerated(STRING) |
| amount | BigDecimal | amount | false | DECIMAL(15,2) |
| feeAmount | BigDecimal | fee_amount | true | DECIMAL(15,2), default=0 |
| netAmount | BigDecimal | net_amount | true | DECIMAL(15,2) |
| balanceBefore | BigDecimal | balance_before | true | DECIMAL(15,2) |
| balanceAfter | BigDecimal | balance_after | true | DECIMAL(15,2) |
| milestoneId | Long | milestone_id | true | |
| description | String | description | true | length=500 |
| status | TransactionStatus | status | false | @Enumerated(STRING), default=PENDING |
| initiatedBy | Long | initiated_by | true | |
| initiatedAt | LocalDateTime | initiated_at | true | |
| completedAt | LocalDateTime | completed_at | true | |

**Inner Enums:**
- `TransactionType`: FUND, RELEASE, REFUND, HOLD, DISPUTE_HOLD, DISPUTE_RELEASE, FEE, ADJUSTMENT
- `TransactionStatus`: PENDING, COMPLETED, FAILED, REVERSED

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @ManyToOne | EscrowAccount | escrow_account_id | LAZY |

---

## Entity: Contract

| Aspect | Value |
|--------|-------|
| Table | `contracts` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| contractNumber | String | contract_number | false | unique, length=20 |
| status | ContractStatus | status | false | @Enumerated(STRING), default=DRAFT |
| totalAmount | BigDecimal | total_amount | true | DECIMAL(15,2) |
| paymentTerms | String | payment_terms | true | TEXT |
| scopeOfWork | String | scope_of_work | true | TEXT |
| termsAndConditions | String | terms_and_conditions | true | TEXT |
| specialClauses | String | special_clauses | true | TEXT |
| startDate | LocalDate | start_date | true | |
| endDate | LocalDate | end_date | true | |
| clientSignedAt | LocalDateTime | client_signed_at | true | |
| clientIpAddress | String | client_ip_address | true | length=50 |
| builderSignedAt | LocalDateTime | builder_signed_at | true | |
| builderIpAddress | String | builder_ip_address | true | length=50 |

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @ManyToOne | Project | project_id | LAZY |
| @ManyToOne | User (client) | client_id | LAZY |
| @ManyToOne | User (builder) | builder_id | LAZY |

**Helper Methods:** `isFullySigned()`, `signByClient()`, `signByBuilder()`

---

## Entity: ChatRoom

| Aspect | Value |
|--------|-------|
| Table | `chat_rooms` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| roomCode | String | room_code | false | unique, length=50 |
| roomType | RoomType | room_type | false | @Enumerated(STRING) |
| name | String | name | true | length=200 |
| projectId | Long | project_id | true | |
| createdBy | Long | created_by | true | |
| lastMessageAt | LocalDateTime | last_message_at | true | |
| lastMessagePreview | String | last_message_preview | true | length=500 |
| isActive | Boolean | is_active | true | default=true |
| supportTicketId | Long | support_ticket_id | true | |

**Inner Enum:** `RoomType`: PROJECT, BID, SUPPORT, DIRECT, GROUP

**Relationships:**

| Type | Target | MappedBy | Cascade | Fetch |
|------|--------|----------|---------|-------|
| @OneToMany | ChatMessage | chatRoom | ALL | LAZY |

---

## Entity: ChatMessage

| Aspect | Value |
|--------|-------|
| Table | `chat_messages` |
| Does NOT extend BaseEntity | Has own id + createdAt + updatedAt |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| id | Long | id | false | @Id @GeneratedValue |
| messageType | MessageType | message_type | false | @Enumerated(STRING), default=TEXT |
| content | String | content | false | TEXT |
| attachmentUrl | String | attachment_url | true | length=500 |
| attachmentName | String | attachment_name | true | length=200 |
| isEdited | Boolean | is_edited | true | default=false |
| isDeleted | Boolean | is_deleted | true | default=false |
| createdAt | LocalDateTime | created_at | false | |
| updatedAt | LocalDateTime | updated_at | true | |

**Inner Enum:** `MessageType`: TEXT, IMAGE, FILE, SYSTEM, MILESTONE_UPDATE, PAYMENT_NOTIFICATION

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @ManyToOne | ChatRoom | chat_room_id | LAZY |
| @ManyToOne | User (sender) | sender_id | LAZY |

---

## Entity: ChatRoomParticipant

| Aspect | Value |
|--------|-------|
| Table | `chat_room_participants` |
| Does NOT extend BaseEntity | Has own id, no createdAt/updatedAt |
| Unique constraint | (chat_room_id, user_id) |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| id | Long | id | false | @Id @GeneratedValue |
| chatRoomId | Long | chat_room_id | false | |
| userId | Long | user_id | false | |
| joinedAt | LocalDateTime | joined_at | true | default=now() |
| lastReadAt | LocalDateTime | last_read_at | true | |
| role | ParticipantRole | role | true | @Enumerated(STRING), default=MEMBER |
| isMuted | Boolean | is_muted | true | default=false |
| leftAt | LocalDateTime | left_at | true | |
| isActive | Boolean | is_active | true | default=true |

**Inner Enum:** `ParticipantRole`: OWNER, ADMIN, MEMBER, OBSERVER

**Note:** Uses Long IDs instead of entity relationships for chatRoomId and userId.

---

## Entity: BuilderProfile

| Aspect | Value |
|--------|-------|
| Table | `builder_profiles` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| companyName | String | company_name | true | length=200 |
| yearsOfExperience | Integer | years_of_experience | true | default=0 |
| bio | String | bio | true | TEXT |
| specializations | String | specializations | true | JSON column |
| skills | String | skills | true | JSON column |
| serviceAreas | String | service_areas | true | JSON column |
| isVerified | Boolean | is_verified | true | default=false |
| verifiedAt | LocalDateTime | verified_at | true | |
| verifiedBy | Long | verified_by | true | |
| isAvailable | Boolean | is_available | true | default=true |
| hourlyRate | BigDecimal | hourly_rate | true | DECIMAL(10,2) |
| minimumProjectValue | BigDecimal | minimum_project_value | true | DECIMAL(15,2) |
| portfolioImages | String | portfolio_images | true | JSON column |
| portfolioDescription | String | portfolio_description | true | TEXT |
| totalProjectsCompleted | Integer | total_projects_completed | true | default=0 |
| totalEarnings | BigDecimal | total_earnings | true | DECIMAL(15,2), default=0 |
| averageRating | BigDecimal | average_rating | true | DECIMAL(3,2), default=0 |
| totalReviews | Integer | total_reviews | true | default=0 |
| subscriptionTier | String | subscription_tier | true | length=20, default="FREE" |
| subscriptionExpiresAt | LocalDateTime | subscription_expires_at | true | |
| leadCredits | Integer | lead_credits | true | default=5 |
| primaryTrade | String | primary_trade | true | length=100 |
| secondaryTrades | String | secondary_trades | true | JSON column |
| experiencePerTrade | String | experience_per_trade | true | JSON column |
| ntnNumber | String | ntn_number | true | length=50 |
| pecNumber | String | pec_number | true | length=50 |
| teamMembers | String | team_members | true | JSON column |
| serviceAreaRadius | Integer | service_area_radius | true | |
| bannerImageUrl | String | banner_image_url | true | length=500 |

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @OneToOne | User | user_id | LAZY |

**Helper Methods:** `hasLeadCredits()`, `useLeadCredit()`, `updateRating()`

---

## Entity: Review

| Aspect | Value |
|--------|-------|
| Table | `reviews` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| projectId | Long | project_id | true | |
| reviewType | ReviewType | review_type | false | @Enumerated(STRING) |
| overallRating | Integer | rating | false | mapped to "rating" column |
| qualityRating | Integer | quality_rating | true | |
| communicationRating | Integer | communication_rating | true | |
| timelinessRating | Integer | timeliness_rating | true | |
| title | String | title | true | length=200 |
| comment | String | comment | true | TEXT |
| status | ReviewStatus | status | false | @Enumerated(STRING), default=PENDING |
| isVerifiedPurchase | Boolean | is_verified_purchase | true | default=false |
| response | String | response | true | TEXT (builder's response) |
| moderatedAt | LocalDateTime | moderated_at | true | |

**Inner Enums:**
- `ReviewType`: CLIENT_TO_BUILDER, BUILDER_TO_CLIENT, CLIENT_TO_SUPPLIER, BUILDER_TO_SUPPLIER, MATERIAL_REVIEW
- `ReviewStatus`: PENDING, APPROVED, REJECTED, FLAGGED, HIDDEN

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @ManyToOne | User (reviewer) | reviewer_id | LAZY |
| @ManyToOne | User (reviewee) | reviewee_id | LAZY |

---

## Entity: Payment

| Aspect | Value |
|--------|-------|
| Table | `payments` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| paymentReference | String | payment_reference | false | unique, length=30 |
| paymentType | PaymentType | payment_type | false | @Enumerated(STRING) |
| amount | BigDecimal | amount | false | DECIMAL(15,2) |
| feeAmount | BigDecimal | fee_amount | true | DECIMAL(15,2), default=0 |
| netAmount | BigDecimal | net_amount | true | DECIMAL(15,2) |
| currency | String | currency | true | length=3, default="PKR" |
| paymentMethod | PaymentMethod | payment_method | true | @Enumerated(STRING) |
| status | PaymentStatus | status | false | @Enumerated(STRING), default=PENDING |
| failureReason | String | failure_reason | true | TEXT |
| initiatedAt | LocalDateTime | initiated_at | true | |
| completedAt | LocalDateTime | completed_at | true | |

**Inner Enums:**
- `PaymentType`: ESCROW_FUND, MILESTONE_RELEASE, REFUND, SUBSCRIPTION, LEAD_CREDIT_PURCHASE, PLATFORM_FEE
- `PaymentMethod`: MOCK, STRIPE, PAYPAL, BANK_TRANSFER, CASH

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @ManyToOne | User (payer) | payer_id | LAZY |
| @ManyToOne | User (payee) | payee_id | LAZY |
| @ManyToOne | Project | project_id | LAZY |
| @ManyToOne | Milestone | milestone_id | LAZY |
| @ManyToOne | EscrowTransaction | escrow_transaction_id | LAZY |

---

## Entity: Notification

| Aspect | Value |
|--------|-------|
| Table | `notifications` |
| Extends | BaseEntity |

**Fields:**

| Field | Type | Column | Nullable | Notes |
|-------|------|--------|----------|-------|
| notificationType | NotificationType | notification_type | false | @Enumerated(STRING) — V21 converted to VARCHAR(50) |
| title | String | title | false | length=200 |
| message | String | message | false | TEXT |
| icon | String | icon | true | length=50 |
| relatedEntityType | String | related_entity_type | true | length=50 |
| relatedEntityId | Long | related_entity_id | true | |
| actionUrl | String | action_url | true | length=500 |
| isRead | Boolean | is_read | true | default=false |
| readAt | LocalDateTime | read_at | true | |
| priority | String | priority | true | length=10, default="NORMAL" |

**Relationships:**

| Type | Target | Column | Fetch |
|------|--------|--------|-------|
| @ManyToOne | User | user_id | LAZY |

---

## Entity: SupportTicket

| Aspect | Value |
|--------|-------|
| Table | `support_tickets` |
| Extends | BaseEntity |

**Key Fields:** ticketNumber (unique), category (enum), priority (enum), status (enum), subject, description, resolution (TEXT), satisfactionRating (Integer)

**Relationships:** User (ManyToOne), AssignedTo User (ManyToOne, optional), Project (ManyToOne, optional)

---

## Entity: Dispute

| Aspect | Value |
|--------|-------|
| Table | `disputes` |
| Extends | BaseEntity |

**Key Fields:** disputeNumber (unique), disputeType (enum), status (enum), title, description, evidence (TEXT), disputedAmount (DECIMAL), resolutionType, resolutionDetails, resolutionAmount, resolvedAt

**Relationships:** Project (ManyToOne), FiledBy User, FiledAgainst User, AssignedMediator User (optional), Milestone (optional)

---

## Entity: MaterialOrder

| Aspect | Value |
|--------|-------|
| Table | `material_orders` |
| Extends | BaseEntity |

**Key Fields:** orderNumber (unique), status (enum), paymentStatus (enum), subtotal, taxAmount, deliveryFee, totalAmount (all DECIMAL), deliveryAddress, notes

**Relationships:** Project (ManyToOne), Supplier User (ManyToOne), OrderedBy User (ManyToOne)

---

## Entity: SubscriptionPlan

| Aspect | Value |
|--------|-------|
| Table | `subscription_plans` |
| Extends | BaseEntity |

**Fields:** name, tier, price (DECIMAL), billingCycle, leadCreditsPerMonth, maxActiveBids, maxPortfolioImages, featuredListing (Boolean), prioritySupport (Boolean), analyticsAccess (Boolean), badgeLabel, description, isActive

---

## Remaining Entities (Abbreviated)

| Entity | Table | Extends BaseEntity | Key Fields |
|--------|-------|--------------------|------------|
| ContractVersion | contract_versions | Yes | versionNumber, scopeOfWork, termsAndConditions, totalAmount, changeSummary |
| MilestoneUpdate | milestone_updates | Yes | updateType (enum), message, progressPercentage, attachments |
| ChangeRequest | change_requests | Yes | changeType (enum), title, description, proposedValue, currentValue, status |
| Invoice | invoices | Yes | invoiceNumber, invoiceType, subtotal, taxAmount, totalAmount, status, lineItems (JSON) |
| Material | materials | Yes | name, sku, unit, unitPrice, minOrderQuantity, stockQuantity, isAvailable |
| MaterialOrderItem | material_order_items | Yes | quantity, unitPrice, totalPrice, notes |
| MaterialCategory | material_categories | Yes | name, description, parentCategoryId |
| Delivery | deliveries | Yes | deliveryNumber, status, deliveryMethod, trackingNumber, driverName, driverPhone |
| Badge | badges | Yes | name, code (unique), description, icon, category, criteriaType, leadCreditBonus |
| UserBadge | user_badges | Yes | awardedAt, awardedBy, notes |
| ProjectAttachment | project_attachments | Yes | fileName, fileUrl, fileSize, mimeType, attachmentType |
| Announcement | announcements | Yes | title, content, announcementType, displayPosition, isActive, expiresAt |
| AuditLog | audit_logs | Yes | action, actionCategory, entityType, entityId, description, ipAddress, userAgent, status |
| SystemSetting | system_settings | Yes | key (unique), value, type, description, isPublic |
| CmsPage | cms_pages | Yes | slug (unique), title, content, metaDescription, status |
| BlogPost | blog_posts | Yes | slug (unique), title, excerpt, content, category, coverImageUrl, status, publishedAt |
| EmailTemplate | email_templates | Yes | templateKey (unique), name, subject, body, variables, isActive |
| LeadTransaction | lead_transactions | Yes | transactionType (enum), amount, balanceAfter, referenceType, referenceId, description |
| NotificationPreference | notification_preferences | Yes | emailNewBid, emailProjectUpdate, emailMessages, emailMarketing, pushNewBid, pushProjectUpdate, pushMessages (all Boolean) |
| SupplierProfile | supplier_profiles | Yes | companyName, description, categories (JSON), isVerified, warehouseAddress, deliveryAreas (JSON), minimumOrderValue |
| TicketResponse | ticket_responses | Yes | message, isInternal (Boolean), attachments |
| DisputeComment | dispute_comments | Yes | comment, isInternal (Boolean), attachments |

---

## Relationships Overview

```
User ──┬── 1:1 ── BuilderProfile
       ├── 1:1 ── SupplierProfile
       ├── 1:N ── Project (as client)
       ├── 1:N ── Project (as awardedBuilder)
       ├── 1:N ── Bid (as builder)
       ├── 1:N ── Notification
       ├── 1:1 ── NotificationPreference
       ├── 1:N ── Review (as reviewer)
       ├── 1:N ── Review (as reviewee)
       ├── 1:N ── Payment (as payer)
       ├── 1:N ── Payment (as payee)
       ├── 1:N ── ChatMessage (as sender)
       └── 1:N ── SupportTicket

Project ──┬── 1:N ── Bid
          ├── 1:N ── Milestone
          ├── 1:1 ── EscrowAccount
          ├── 1:N ── Contract (via projectId)
          ├── 1:N ── ChangeRequest
          ├── 1:N ── MaterialOrder
          ├── 1:N ── Dispute
          └── 1:N ── ProjectAttachment

Bid ──── N:1 ── Project
     ──── N:1 ── User (builder)

Milestone ──── N:1 ── Project
          ──── 1:N ── MilestoneUpdate

EscrowAccount ──── 1:1 ── Project
              ──── N:1 ── User (client)
              ──── 1:N ── EscrowTransaction

ChatRoom ──── 1:N ── ChatMessage
ChatRoomParticipant ──── refs ── ChatRoom (by ID)
                    ──── refs ── User (by ID)

MaterialOrder ──── 1:N ── MaterialOrderItem
              ──── 1:N ── Delivery
              ──── N:1 ── Material.supplier
```

---

## Inconsistencies

| Issue | Details |
|-------|---------|
| **JSON columns as String** | `specializations`, `skills`, `serviceAreas`, `requiredSkills`, `attachments`, `deliverables`, `completionEvidence`, `portfolioImages`, `teamMembers`, `checklistItems`, `photos` — all stored as `String` with `columnDefinition = "JSON"`. JPA reads them as plain strings, causing multi-layer JSON encoding when serialized by Jackson. Frontend requires `parseJsonArray()` to unwrap. |
| **ChatRoomParticipant uses Long IDs** | Unlike other entities that use `@ManyToOne` relationships, ChatRoomParticipant stores `chatRoomId` and `userId` as raw Long fields instead of entity references. |
| **ChatMessage does not extend BaseEntity** | Has its own `id`, `createdAt`, `updatedAt` fields instead of inheriting from BaseEntity. |
| **Review.overallRating maps to "rating" column** | The Java field is `overallRating` but the column is `rating` — inconsistent naming. |
| **SubscriptionTier in BuilderProfile is String** | Stored as `String` (length=20, default="FREE") instead of using an @Enumerated enum. The enum values (FREE/BASIC/PROFESSIONAL/ENTERPRISE) are checked in SubscriptionService but not enforced at the entity level. |
| **Project has contractSignedAt + contractDocumentUrl** | These fields exist on Project entity but contracts are managed through the separate Contract entity. Possible duplication or legacy fields. |
| **Project.currentMilestoneId is Long** | References a Milestone by ID instead of using a proper @ManyToOne relationship. |
| **Multiple timestamp patterns** | Some entities use `LocalDateTime`, others use `LocalDate` for calendar dates, but most timestamps are `LocalDateTime`. |
| **Cascade removed from Project** | Project → Bid, Milestone, EscrowAccount use `{PERSIST, MERGE}` only (no DELETE). This is intentional (audit trail preservation) but means orphan cleanup must be manual. |

---

## Unknowns

1. **Are JSON columns indexed?** No JSON-specific indexes found in migrations. Full-text search on JSON fields will be slow.
2. **Is `currentMilestoneId` on Project auto-updated?** Only set during `startProject()`. No evidence it advances when milestones complete.
3. **Why does ChatMessage not extend BaseEntity?** UNKNOWN — may be historical or intentional for performance.
4. **Are `contractSignedAt`/`contractDocumentUrl` on Project entity used?** The Contract entity manages signing separately. These Project fields may be legacy.
5. **Is `SupplierProfile` ever fully populated?** Only `companyName` and `warehouseAddress` are set during registration. Other fields (categories, deliveryAreas, minimumOrderValue) have no known setter.
6. **How many entities have proper FK constraints in SQL?** Entity annotations define relationships but SQL constraints depend on migration scripts. Some may be missing.
