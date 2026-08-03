# Product Requirements (Extracted from Code)

> Every item below is extracted directly from Java source code. Nothing is assumed or invented. Items marked **UNKNOWN** could not be determined from code alone.
>
> For entity field definitions, see [02-domain-model.md](02-domain-model.md).
> For endpoint details per feature, see [04-api-contracts.md](04-api-contracts.md).

---

## User Roles

**Source:** `UserRole.java`, `SecurityConfig.java`

| Role | Label | URL Prefix | Can Also Access |
|------|-------|------------|-----------------|
| `CLIENT` | Client | `/v1/client/**` | Shared endpoints |
| `BUILDER` | Builder/Contractor | `/v1/builder/**` | Shared endpoints |
| `SUPPLIER` | Material Supplier | `/v1/supplier/**` | Shared endpoints |
| `SUPPORT_AGENT` | Support Agent | `/v1/support/**` | Shared endpoints |
| `ADMIN` | Administrator | `/v1/admin/**` | All role endpoints |
| `SUPER_ADMIN` | Super Administrator | `/v1/super-admin/**` + `/v1/admin/**` | All role endpoints |

**Role Utility Methods (UserRole.java):**
- `isAdmin()`: true for ADMIN, SUPER_ADMIN
- `isServiceProvider()`: true for BUILDER, SUPPLIER

**Public Endpoints (no auth):**
- `/v1/auth/**`, `/v1/public/**`, `/ws/**`, `/uploads/**`
- `GET /v1/builders/**`, `GET /v1/categories/**`, `GET /v1/materials/**`, `GET /v1/badges/**`

---

## Features

### F1: Authentication & Account Management

**Source:** `AuthService.java`, `AuthController.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | All users |
| **Description** | JWT-based auth with email/password, token refresh, account lockout, email verification, password reset |

**Inputs/Outputs:**

| Operation | Input | Output | Business Rules |
|-----------|-------|--------|----------------|
| Register | name, email, password, role, phone?, city?, companyName? | AuthResponse (tokens + user) | Email must be unique (generic error to prevent enumeration). Creates BuilderProfile for BUILDER role, SupplierProfile for SUPPLIER role. Sends verification email. |
| Login | email, password | AuthResponse (tokens + user) | 5 failed attempts → 15-min lockout (`noRollbackFor` ensures counter persists). Suspended accounts blocked. 2FA auto-disabled (not implemented). |
| Refresh Token | refreshToken | AuthResponse (new tokens) | Validates signature, matches stored token, checks expiration. Generates new token pair. |
| Logout | (auth header) | success message | Clears refresh token from DB. |
| Verify Email | token | success message | Token must not be expired (24h TTL). Sets `emailVerified = true`. |
| Forgot Password | email | success message (always) | Silent if email not found (prevents enumeration). Generates reset token (1h TTL). |
| Reset Password | token, newPassword | success message | Token must not be expired. Encodes new password with BCrypt. |

**Account Lockout Rules:**
- Max failed attempts: **5**
- Lockout duration: **15 minutes**
- Expired lockouts auto-cleared on next login attempt
- Counter uses `@Transactional(noRollbackFor = UnauthorizedException.class)` to persist even when throwing

---

### F2: Project Management

**Source:** `ProjectService.java`, `ProjectController.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | CLIENT (create/manage), BUILDER (view/bid), public (search) |
| **Description** | Full project lifecycle from draft to completion |

**Inputs (Create):** title, description, categoryId, city, locationAddress, lat/long, budgetMin, budgetMax, deadline, estimatedDurationDays, requiredSkills (JSON), specialRequirements, isUrgent, allowPartialBids, isPublic, biddingDeadline, milestones[]

**Project Number Format:** `PRJ-{YEAR}-{SEQUENTIAL_5_DIGIT}`

**Status Transitions:**

```
DRAFT → OPEN → BIDDING → AWARDED → CONTRACT_PENDING → IN_PROGRESS → COMPLETED
                                                    ↘ ON_HOLD
                                    (any) → CANCELLED
                                    (any) → DISPUTED
```

| Transition | Trigger | Guard Conditions |
|-----------|---------|-----------------|
| DRAFT → OPEN | `publishProject()` | Only DRAFT projects can be published |
| OPEN → BIDDING | `createBid()` | Automatic when first bid received |
| OPEN/BIDDING → AWARDED | `awardProject()` | Project must be open; bid must be active; pessimistic lock |
| AWARDED → IN_PROGRESS | `startProject()` or contract fully signed | User must be client or awarded builder; status must be AWARDED or CONTRACT_PENDING |
| IN_PROGRESS → COMPLETED | `complete()` entity method | UNKNOWN — no service method found that calls this |

**Award Side Effects:**
1. Selected bid → ACCEPTED
2. All other active bids (SUBMITTED/SHORTLISTED/UNDER_REVIEW) → REJECTED with reason "Another bid was selected"
3. Escrow account created
4. Contract generated (status PENDING_BUILDER)
5. Builder notified + email sent

**Soft Delete:** `deleted` + `deletedAt` fields. Repository methods use `*AndDeletedFalse`.

---

### F3: Bidding System

**Source:** `BidService.java`, `BidController.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | BUILDER (create/withdraw), CLIENT (shortlist) |
| **Description** | Builders bid on open projects using lead credits |

**Bid Number Format:** `BID-{YEAR}-{SEQUENTIAL_5_DIGIT}`

**Status Transitions:**

```
DRAFT → SUBMITTED → SHORTLISTED → ACCEPTED
              ↘ UNDER_REVIEW ↗
              ↘ REJECTED
              ↘ WITHDRAWN
              ↘ EXPIRED
```

| Operation | Guard Conditions | Side Effects |
|-----------|-----------------|--------------|
| Create Bid | Builder not suspended; project is open; builder hasn't already bid; builder has lead credits | Consumes 1 lead credit; project OPEN→BIDDING; client notified |
| Withdraw Bid | Builder owns bid; status ≠ ACCEPTED; bid is active | Lead credit refunded (graceful failure); status → WITHDRAWN |
| Shortlist Bid | Client owns project; client not suspended; status = SUBMITTED | Status → SHORTLISTED; builder notified |

**Lead Credit Integration:**
- `verifyLeadCredits()` called BEFORE bid creation
- `consumeLeadCredit()` called AFTER bid saved (needs bid ID for transaction record)
- On withdrawal: `addLeadCredits(1, REFUND)` wrapped in try-catch (doesn't fail withdrawal)

**Active Statuses (isActive):** SUBMITTED, UNDER_REVIEW, SHORTLISTED
**Final Statuses (isFinal):** ACCEPTED, REJECTED, WITHDRAWN, EXPIRED

---

### F4: Milestone Tracking

**Source:** `MilestoneService.java`, `Milestone.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | BUILDER (complete), CLIENT (approve/reject) |
| **Description** | Track project progress via sequential milestones with payment release |

**Status Transitions:**

```
PENDING → IN_PROGRESS → COMPLETED → APPROVED → PAYMENT_PENDING → PAYMENT_RELEASED
                              ↘ UNDER_REVIEW ↗
                              ↘ REJECTED
                              ↘ DISPUTED
```

| Operation | Actor | Guard Conditions | Side Effects |
|-----------|-------|-----------------|--------------|
| Complete | BUILDER | Builder is awarded builder; not suspended; status = IN_PROGRESS | completedAt set; progressPercentage = 100; client notified |
| Approve | CLIENT | Client owns project; not suspended; status = COMPLETED or UNDER_REVIEW | approvedAt set; approvedBy = clientId; builder notified |
| Reject | CLIENT | Client owns project; not suspended; status = COMPLETED or UNDER_REVIEW | rejectionReason set; **no notification sent** (possible bug) |

**Entity Helper Methods:**
- `canBeCompleted()`: status == IN_PROGRESS
- `canBeApproved()`: status == COMPLETED || UNDER_REVIEW
- `requiresPayment()`: status == APPROVED || PAYMENT_PENDING
- `isOverdue()`: dueDate < today AND status not in {COMPLETED, APPROVED, PAYMENT_RELEASED}

**Observation:** `rejectMilestone()` uses `canBeApproved()` as its guard — same check as approval. This means rejection is only possible from COMPLETED or UNDER_REVIEW states, which is correct behavior but misleading method name.

---

### F5: Escrow & Payments

**Source:** `PaymentService.java`, `EscrowAccount.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | CLIENT (fund/release), BUILDER (receive) |
| **Description** | Escrow-based payment with milestone release and platform fee deduction |

**Platform Fee:** 5% (configurable via `app.platform.fee-percentage`)

**Payment Method:** MOCK only (enum has STRIPE, PAYPAL, BANK_TRANSFER, CASH but none implemented)

**Currency:** PKR (hardcoded)

| Operation | Guard Conditions | Calculations |
|-----------|-----------------|--------------|
| Fund Escrow | Amount > 0; client owns escrow; not suspended; account active | `totalFunded += amount; currentBalance += amount` |
| Release Payment | Milestone not already released; client owns project; not suspended; milestone APPROVED or PAYMENT_PENDING; amount > 0; sufficient balance | `fee = amount * 0.05; net = amount - fee; currentBalance -= amount; totalReleased += amount` |

**Escrow Account Methods:**
- `fund(amount)`: totalFunded += amount, currentBalance += amount
- `canRelease(amount)`: currentBalance >= amount AND isActive
- `release(amount)`: currentBalance -= amount, totalReleased += amount
- `refund(amount)`: currentBalance -= amount, totalRefunded += amount

**Concurrency:** `findByProjectIdForUpdate()` with `@Lock(PESSIMISTIC_WRITE)` on release

**Transaction Reference Format:** `TXN-{YEAR}-{SEQUENTIAL_6_DIGIT}`
**Payment Reference Format:** `PAY-{SEQUENTIAL_8_DIGIT}`

---

### F6: Contracts

**Source:** `ContractService.java`, `Contract.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | CLIENT (sign), BUILDER (sign), system (auto-generate) |
| **Description** | Auto-generated on project award, requires dual-party signing |

**Contract Number Format:** `CON-{YEAR}-{SEQUENTIAL_5_DIGIT}`

**Status Transitions:**

```
(generated) → PENDING_BUILDER → PENDING_CLIENT → ACTIVE → COMPLETED
                                              ↘ TERMINATED
                                              ↘ DISPUTED
```

| Operation | Guard Conditions | Side Effects |
|-----------|-----------------|--------------|
| Generate | Contract doesn't already exist for project | End date = project deadline OR today + estimatedDuration OR today + 90 days |
| Sign (Client) | Contract can be signed; signer is client; not suspended; hasn't already signed | clientSignedAt + clientIpAddress set |
| Sign (Builder) | Contract can be signed; signer is builder; not suspended; hasn't already signed | builderSignedAt + builderIpAddress set |

**Auto-Start:** When both parties sign (`isFullySigned()`), project automatically starts → status IN_PROGRESS

**Default Terms:** Predefined constant string covering scope, payment, timeline, changes, termination, dispute resolution, confidentiality, quality standards, and governing law.

**Payment Terms:** "Payment through escrow system. Funds released upon milestone approval."

---

### F7: Real-Time Chat

**Source:** `ChatService.java`, `ChatController.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | All authenticated users |
| **Description** | Direct and project-based chat rooms with WebSocket real-time delivery |

**Room Types:** DIRECT, PROJECT, BID, SUPPORT, GROUP

**Room Code Formats:**
- Direct: `CHAT-{UUID_8_CHARS}`
- Project: `PROJ-{projectId}-{UUID_4_CHARS}`

| Operation | Guard Conditions | Side Effects |
|-----------|-----------------|--------------|
| Create Direct Room | Other user exists | Deduplication via existing room check + DataIntegrityViolationException catch |
| Send Message | Room exists; sender is participant; not suspended | Room lastMessageAt updated; sender lastReadAt updated; WebSocket broadcast deferred to after commit |
| Edit Message | Message exists; sender is owner; not suspended | isEdited flag set; broadcast to room |
| Delete Message | Message exists; sender is owner; not suspended | Soft delete; broadcast to room with message ID |

**WebSocket Topics:**
- Room messages: `/topic/chat/{roomId}`
- Message edits: `/topic/chat/{roomId}/edit`
- Message deletes: `/topic/chat/{roomId}/delete`
- Per-user updates: `{email}/queue/chat-updates`

**Concurrency:** Direct room creation handles race conditions via `DataIntegrityViolationException` catch-and-retry.

---

### F8: Reviews & Moderation

**Source:** `ReviewService.java`, `AdminService.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | CLIENT (submit), ADMIN (moderate) |
| **Description** | Client reviews builders after project completion; admin moderation required |

| Operation | Guard Conditions | Side Effects |
|-----------|-----------------|--------------|
| Create Review | All ratings 1-5; project exists; client owns project; project COMPLETED; builder assigned; not already reviewed | Status = PENDING; builder rating updated immediately (before moderation) |
| Moderate (Approve) | Review exists | Status → APPROVED |
| Moderate (Reject) | Review exists | Status → REJECTED; notes stored; rejectedBy set |

**Review Types:** CLIENT_TO_BUILDER, BUILDER_TO_CLIENT, CLIENT_TO_SUPPLIER, BUILDER_TO_SUPPLIER, MATERIAL_REVIEW

**Observation:** Builder rating is updated on review creation (before moderation). If review is later rejected, the rating is incorrect. This is a known gap documented in project notes.

**Visibility:** Only APPROVED reviews shown in `getBuilderReviews()` and `getMyReviews()`.

---

### F9: Admin Operations

**Source:** `AdminService.java`, `AdminController.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | ADMIN, SUPER_ADMIN |
| **Description** | Platform governance, user management, content management |

| Operation | Guard Conditions | Side Effects |
|-----------|-----------------|--------------|
| Verify Builder | User exists; role is BUILDER; profile exists; not already verified | isVerified = true; verifiedAt + verifiedBy set |
| Suspend User | User exists; user is not admin; not already suspended | suspended = true; suspensionReason set |
| Unsuspend User | User exists; currently suspended | suspended = false; reason cleared |

**Metrics Dashboard Returns:**
- User counts by role
- Project counts by status
- Bid counts
- Verified builders count
- Payment metrics (total, completed, pending, revenue, fees)
- Review metrics (total, pending, flagged)
- Pending verifications count

**Revenue Summary Returns:**
- Total revenue
- Platform fees total
- Breakdown by payment type (with count + total)
- Monthly trends (month, count, total)

---

### F10: Lead Credits & Subscriptions

**Source:** `LeadService.java`, `SubscriptionService.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | BUILDER |
| **Description** | Credit-based system for bid access; tiered subscriptions |

**Subscription Tiers:** FREE, BASIC, PROFESSIONAL, ENTERPRISE

| Operation | Guard Conditions | Side Effects |
|-----------|-----------------|--------------|
| Verify Credits | Builder profile exists; credits > 0 | Throws if insufficient |
| Consume Credit | Profile locked (pessimistic); credits > 0 | credits -= 1; DEBIT transaction created |
| Refund Credit | Profile exists | credits += 1; REFUND transaction created |
| Upgrade Tier | Profile exists; new tier ≠ current; plan exists | Tier updated; expiration = +30 days; lead credits granted from plan |

**Default Lead Credits:** 5 (from `app.platform.default-lead-credits`)
**Bid Validity:** 30 days (from `app.platform.bid-validity-days`)

**Concurrency:** `findByUserIdForUpdate()` with `@Lock(PESSIMISTIC_WRITE)` on credit consumption

---

### F12: Disputes

**Source:** `DisputeService.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | Any project party (file), SUPPORT_AGENT/ADMIN (mediate/resolve) |
| **Description** | Formal dispute resolution between project parties |

**Dispute Number Format:** `DSP-{YEAR}-{SEQUENTIAL_5_DIGIT}`

**Status Transitions:**
```
FILED → UNDER_REVIEW → MEDIATION → AWAITING_RESPONSE → RESOLVED → CLOSED
     ↘ ESCALATED ↗
```

**Types:** PAYMENT, QUALITY, TIMELINE, SCOPE, COMMUNICATION, ABANDONMENT, OTHER

**Rules:**
- Cannot file dispute against yourself
- Only SUPPORT_AGENT or ADMIN can be assigned as mediator
- Mediator assignment auto-transitions FILED → UNDER_REVIEW
- Only support/admin can post internal comments
- Cannot assign mediator to resolved dispute

---

### F13: Material Orders & Deliveries

**Source:** `MaterialOrderService.java`

| Aspect | Detail |
|--------|--------|
| **Actors** | CLIENT/BUILDER (order), SUPPLIER (confirm/deliver) |
| **Description** | Material procurement with order tracking and delivery management |

**Order Number Format:** `ORD-{YEAR}-{SEQUENTIAL_5_DIGIT}`
**Delivery Number Format:** `DLV-{YEAR}-{SEQUENTIAL_5_DIGIT}`

**Order Status Transitions:**
```
PENDING_CONFIRMATION → CONFIRMED → PROCESSING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED
                                              ↘ CANCELLED
                                              ↘ PARTIALLY_DELIVERED
```

**Rules:**
- Supplier must own the materials being ordered
- Materials must be available
- Minimum order quantity enforced per material
- Order totals auto-recalculated after item creation
- When ALL deliveries marked DELIVERED, order auto-transitions to DELIVERED

---

## Workflows

### W1: Complete Project Lifecycle

```
1. CLIENT creates project (status: DRAFT)
2. CLIENT publishes project (status: OPEN)
3. BUILDER creates bid → project status: BIDDING (if first bid)
   └─ 1 lead credit consumed
4. CLIENT shortlists bid(s) (optional)
5. CLIENT awards project to bid
   ├─ Selected bid: ACCEPTED
   ├─ Other bids: REJECTED
   ├─ Escrow account created
   └─ Contract generated (status: PENDING_BUILDER)
6. BUILDER signs contract
7. CLIENT signs contract
   └─ Project auto-starts (status: IN_PROGRESS)
   └─ First milestone auto-starts
8. BUILDER completes milestone
9. CLIENT approves milestone
10. CLIENT releases payment (5% platform fee deducted)
    └─ Milestone status: PAYMENT_RELEASED
11. Repeat 8-10 for remaining milestones
12. Project completed (UNKNOWN — completion trigger not found in service code)
```

### W2: Bid Withdrawal with Refund

```
1. BUILDER submits bid (1 lead credit consumed)
2. BUILDER decides to withdraw
3. System checks: bid status ≠ ACCEPTED, bid is active
4. Bid status → WITHDRAWN
5. Lead credit refund attempted (1 credit)
   └─ If refund fails: logged as warning, withdrawal still succeeds
```

### W3: Account Lockout Flow

```
1. User attempts login with wrong password
2. Failed attempts counter incremented (persisted via noRollbackFor)
3. After 5th failure: accountLockedUntil = now + 15 minutes
4. Next login attempt (even with correct password): blocked with "Account temporarily locked" message
5. After 15 minutes: lockout auto-cleared on next login attempt
   └─ failedAttempts reset to 0
   └─ accountLockedUntil cleared
6. Successful login resets counter
```

### W4: Escrow Payment Release

```
1. CLIENT funds escrow (amount added to balance)
2. BUILDER completes milestone
3. CLIENT approves milestone (status: APPROVED)
4. CLIENT releases payment for milestone
   ├─ Validates: sufficient escrow balance (pessimistic lock)
   ├─ Calculates: fee = amount * 5%
   ├─ Calculates: net = amount - fee
   ├─ Escrow: currentBalance -= amount, totalReleased += amount
   ├─ Transaction: RELEASE record created
   └─ Milestone: status → PAYMENT_RELEASED
```

### W5: Contract Signing with Auto-Start

```
1. Contract generated on award (status: PENDING_BUILDER)
2. BUILDER signs → clientSignedAt set, status updated
3. CLIENT signs → builderSignedAt set
4. System checks isFullySigned() → both timestamps non-null
5. If fully signed:
   ├─ Contract status → ACTIVE
   ├─ Project status → IN_PROGRESS
   └─ Project startedAt = now
```

---

## Business Rules

### Validation Rules (extracted from code)

| Rule | Source | Error Message |
|------|--------|---------------|
| Email must be unique | AuthService:47 | "Registration could not be completed..." |
| Password min 8 chars | RegisterRequest DTO | Bean validation |
| Amount must be > 0 | PaymentService:48 | "Amount must be greater than zero" |
| Escrow must be active | PaymentService:61 | "Escrow account is not active" |
| Sufficient balance | PaymentService:140 | "Insufficient escrow balance. Current balance: PKR X, required: PKR Y" |
| Milestone payment set | PaymentService:133 | "Milestone has no payment amount set" |
| Rating 1-5 | ReviewService:validateRating | "{fieldName} must be between 1 and 5" |
| Project completed for review | ReviewService:47 | "Reviews can only be submitted for completed projects" |
| One review per project | ReviewService:55 | "You have already reviewed the builder for this project" |
| Can't bid on own project | BidService:55 | "You have already submitted a bid for this project" |
| Can't dispute self | DisputeService:61 | "Cannot file a dispute against yourself" |
| Min order quantity | MaterialOrderService:85 | "Minimum order quantity for 'X' is Y" |
| Material must be available | MaterialOrderService:82 | "Material 'X' is not available" |
| Can't withdraw accepted bid | BidService:149 | "Cannot withdraw an accepted bid" |

### Constraint Rules

| Constraint | Value | Source |
|-----------|-------|--------|
| Max page size | 100 | application.yml |
| Default page size | 20 | application.yml |
| Max file upload | 10 MB | application.yml |
| Max HTTP header | 48 KB | application.yml |
| Connection timeout | 20 seconds | application.yml |
| JWT access expiry | 30 minutes | application.yml |
| JWT refresh expiry | 7 days | application.yml |
| Email verify token TTL | 24 hours | AuthService |
| Password reset token TTL | 1 hour | AuthService |
| Lockout duration | 15 minutes | AuthService |
| Max failed logins | 5 | AuthService |
| Platform fee | 5% | application.yml |
| Default lead credits | 5 | application.yml |
| Bid validity | 30 days | application.yml |
| Escrow release delay | 24 hours | application.yml (UNKNOWN if enforced) |
| Min bid amount | 1,000 PKR | application.yml (UNKNOWN if enforced) |
| Max bid amount | 50,000,000 PKR | application.yml (UNKNOWN if enforced) |

---

## Edge Cases (Handled in Code)

| Edge Case | Handling | Source |
|-----------|----------|--------|
| Concurrent project award | Pessimistic lock via `findByIdForUpdate()` | ProjectService:157 |
| Concurrent escrow release | Pessimistic lock via `findByProjectIdForUpdate()` | PaymentService:137 |
| Concurrent lead credit consumption | Pessimistic lock via `findByUserIdForUpdate()` | LeadService:51 |
| Concurrent direct chat room creation | `DataIntegrityViolationException` catch-and-retry | ChatService:87-97 |
| Login counter persistence on error | `@Transactional(noRollbackFor = UnauthorizedException.class)` | AuthService:96 |
| Lead credit refund failure | try-catch with warning log; withdrawal still succeeds | BidService:162-167 |
| Expired lockout cleanup | Auto-cleared on next login attempt | AuthService:108-113 |
| Suspended user 2FA | Auto-disabled on login | AuthService:130-134 |
| Delivery completion check | When delivery marked DELIVERED, checks if ALL order deliveries are DELIVERED | MaterialOrderService:320-327 |

---

## Missing / Incomplete Features

| Feature | Status | Evidence |
|---------|--------|----------|
| **2FA (Two-Factor Auth)** | Stub only | TOTP library in pom.xml; entity fields exist; login auto-disables if enabled; no UI to enable |
| **Payment Gateway** | Mock only | `PaymentMethod.MOCK` hardcoded in all payments; STRIPE/PAYPAL enum values exist but no integration |
| **Email Delivery** | Mock config | localhost:1025 SMTP; no production provider configured |
| **Project Completion** | UNKNOWN | `project.complete()` entity method exists but no service method triggers it |
| **Bid Expiry** | UNKNOWN | `EXPIRED` status exists; `validUntil` set to 30 days; no scheduler or cron to expire bids |
| **Escrow Release Delay** | UNKNOWN | `app.platform.escrow-release-delay-hours: 24` configured but not enforced in code |
| **Min/Max Bid Amount** | UNKNOWN | Configured in application.yml but no validation found in BidService |
| **Notification on Milestone Reject** | Missing | `rejectMilestone()` does NOT send notification (approve does) |
| **Builder-to-Client Review** | Type exists | `BUILDER_TO_CLIENT` review type defined but no service method implements it |
| **Material Reviews** | Type exists | `MATERIAL_REVIEW` type defined but no service method implements it |
| **Rate Limiting** | Not implemented | No `@RateLimited`, no Bucket4j, no Spring Gateway rate limiting |

---

## Conflicts

| Conflict | Details |
|----------|---------|
| **Milestone rejection guard** | `rejectMilestone()` calls `canBeApproved()` instead of a dedicated `canBeRejected()`. Functionally equivalent (both check COMPLETED or UNDER_REVIEW) but semantically misleading. |
| **Review rating timing** | Builder rating updated on review creation (PENDING status), before admin moderation. If review is rejected, rating remains incorrect. |
| **Contract status flow** | Contract generated as PENDING_BUILDER, but signing flow supports both client-first and builder-first signing. Actual generated status doesn't enforce signing order. |
| **Project complete trigger** | `Project.complete()` entity method exists, but no service method calls it. Unclear how projects reach COMPLETED status. |
| **Escrow release delay** | Configured as 24 hours in application.yml but `releasePayment()` has no delay enforcement — releases immediately. |

---

## Unknowns

1. **How do projects reach COMPLETED status?** No service method calls `project.complete()`.
2. **How do bids expire?** `EXPIRED` status and `validUntil` date exist but no scheduler found.
3. **Is the 24h escrow release delay enforced?** Config exists but no code implements it.
4. **Are min/max bid amounts validated?** Config values exist (`1000`/`50000000`) but BidService doesn't check them.
5. **Can projects be cancelled?** `project.cancel(reason)` entity method exists but no service method calls it.
6. **Can projects be put on hold?** `ON_HOLD` status exists but no transition trigger found.
7. **How are subscription expirations handled?** `expiresAt` set to +30 days on upgrade but no scheduler checks expiry.
8. **What happens to escrow when project is cancelled?** No refund flow found in code.
9. **Are attachments/files validated beyond MIME type?** No virus scanning or content checks found.
10. **Is the `UNDER_REVIEW` bid status ever set?** No code transitions a bid to UNDER_REVIEW.
