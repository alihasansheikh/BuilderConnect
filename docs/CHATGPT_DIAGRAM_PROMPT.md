# ChatGPT Prompt — Generate All BuilderConnect UML Diagrams

Copy and paste this entire prompt into ChatGPT (GPT-4o recommended). It will generate and render all 32 diagrams as visual Mermaid charts. You can then screenshot or export each one.

---

## PROMPT START

You are a UML diagram expert. I need you to generate and RENDER (not just code) the following Mermaid diagrams for my FYP project "BuilderConnect v2" — a construction marketplace platform built with Java Spring Boot + React TypeScript.

**IMPORTANT INSTRUCTIONS:**
1. Render each diagram as a VISUAL Mermaid chart (use your built-in Mermaid rendering)
2. Generate them ONE BY ONE — show me each rendered diagram before moving to the next
3. Use clean, professional styling with colors
4. After rendering all diagrams, provide a ZIP-ready summary

---

### SYSTEM CONTEXT

**BuilderConnect v2** is a construction marketplace connecting 8 user roles:
- CLIENT (posts projects, funds escrow, approves milestones)
- BUILDER (bids on projects, completes milestones, receives payments)
- SUPPLIER (manages material catalog, processes orders)
- SUPERVISOR (submits daily site logs, safety checklists)
- INSPECTOR (conducts quality inspections)
- SUPPORT_AGENT (handles tickets and disputes)
- ADMIN / SUPER_ADMIN (platform management)

**Tech Stack:** React 18 + TypeScript (frontend) | Java 17 + Spring Boot 3.2 (backend) | MySQL/H2 (database) | JWT auth | WebSocket (STOMP) | Escrow payments

**Core Entities:** User, Project, Bid, Milestone, Contract, EscrowAccount, Payment, Review, BuilderProfile, ChatRoom, Notification

---

### DIAGRAM 1: Class Diagram — Core Domain Model

Render a Mermaid class diagram showing these 10 entities with their key fields and relationships:

**User:** email, name, role (enum: 8 roles), phone, city, suspended, failedLoginAttempts, accountLockedUntil, deleted
- 1-to-1: BuilderProfile
- 1-to-many: Projects (as client), Bids (as builder), Reviews

**Project:** projectNumber, title, description, city, budgetMin, budgetMax, status (enum: DRAFT→OPEN→BIDDING→AWARDED→CONTRACT_PENDING→IN_PROGRESS→COMPLETED→CANCELLED), isUrgent, progressPercentage, deleted
- Many-to-1: client (User), awardedBuilder (User)
- 1-to-many: Bids, Milestones
- 1-to-1: Contract, EscrowAccount

**Bid:** bidNumber, amount, proposal, estimatedDurationDays, laborCost, materialCost, status (DRAFT→SUBMITTED→SHORTLISTED→ACCEPTED/REJECTED/WITHDRAWN), creditsUsed
- Many-to-1: Project, builder (User)

**Milestone:** title, sequenceOrder, paymentAmount, dueDate, status (PENDING→IN_PROGRESS→COMPLETED→UNDER_REVIEW→APPROVED→REJECTED→PAYMENT_RELEASED), rejectionReason
- Many-to-1: Project

**Contract:** contractNumber, totalAmount, paymentTerms, scopeOfWork, status (DRAFT→PENDING_CLIENT→PENDING_BUILDER→ACTIVE→COMPLETED), clientSignedAt, builderSignedAt
- 1-to-1: Project; Many-to-1: client, builder

**EscrowAccount:** totalFunded, totalReleased, currentBalance, currency(PKR), isActive
- 1-to-1: Project; Many-to-1: client

**Payment:** paymentReference, paymentType (ESCROW_FUND/MILESTONE_RELEASE/PLATFORM_FEE), amount, feeAmount(5%), netAmount, status (PENDING→COMPLETED/FAILED)
- Many-to-1: payer, payee, project, milestone

**Review:** overallRating(1-5), qualityRating, communicationRating, comment, reviewType, status (PENDING/APPROVED/REJECTED)
- Many-to-1: reviewer, reviewee

**BuilderProfile:** companyName, yearsOfExperience, specializations(JSON), isVerified, averageRating, leadCredits, subscriptionTier
- 1-to-1: User

**ChatRoom:** roomCode, roomType (PROJECT/DIRECT/SUPPORT), name, isActive, lastMessageAt

---

### DIAGRAM 2: Enumerations Class Diagram

Render all 6 key enums: UserRole(8), ProjectStatus(10), BidStatus(8), MilestoneStatus(9), ContractStatus(7), PaymentStatus(6)

---

### DIAGRAM 3: Sequence Diagram — User Registration

Actors: User → React Frontend → AuthController → AuthService → UserRepository → EmailService → JwtTokenProvider → AuditService

Flow:
1. User fills form → Frontend validates with Zod → POST /v1/auth/register
2. AuthService checks email uniqueness (generic error if exists to prevent enumeration)
3. BCrypt encodes password → saves User
4. If BUILDER role: creates BuilderProfile. If SUPPLIER: creates SupplierProfile
5. Sends verification email
6. Generates JWT access token (30min) + refresh token (7 days)
7. Returns AuthResponse with tokens + user data
8. Frontend stores tokens in localStorage, navigates to role dashboard

---

### DIAGRAM 4: Sequence Diagram — Project Bidding Flow

Actors: Client, Builder
Flow:
1. Client creates project (DRAFT) → publishes (OPEN)
2. Builder browses marketplace → views project
3. Builder checks lead credits → submits bid (consumes 1 credit)
4. Project status changes to BIDDING
5. NotificationService notifies client of new bid

---

### DIAGRAM 5: Sequence Diagram — Project Award

Flow:
1. Client selects winning bid → POST /v1/client/projects/{id}/award/{bidId}
2. ProjectService acquires PESSIMISTIC_WRITE lock on project
3. Winning bid → ACCEPTED, all other bids → REJECTED
4. Project → AWARDED
5. Contract generated automatically
6. Notifications sent to all bidders

---

### DIAGRAM 6: Sequence Diagram — Milestone Payment Release

Flow:
1. Builder marks milestone COMPLETED with evidence
2. Client reviews → approves milestone
3. Client initiates payment release
4. PaymentService acquires PESSIMISTIC_WRITE lock on escrow
5. Calculates 5% platform fee
6. Escrow balance deducted → Payment record created → Milestone → PAYMENT_RELEASED
7. Builder notified of payment

---

### DIAGRAM 7: Sequence Diagram — Real-Time Chat (WebSocket)

Flow:
1. STOMP CONNECT with JWT token → WebSocketAuthInterceptor validates
2. Subscribe to /topic/chat/{roomId}
3. User sends message → /app/chat/{roomId}
4. ChatService saves message → broadcasts to all room subscribers
5. Both users see message in real-time

---

### DIAGRAM 8-12: State Transition Diagrams

Render 5 separate state diagrams for:
8. **Project:** DRAFT → OPEN → BIDDING → AWARDED → CONTRACT_PENDING → IN_PROGRESS → (ON_HOLD ↔ IN_PROGRESS) → COMPLETED. Any state → CANCELLED/DISPUTED
9. **Bid:** DRAFT → SUBMITTED → UNDER_REVIEW → SHORTLISTED → ACCEPTED. Alt: REJECTED, WITHDRAWN, EXPIRED
10. **Milestone:** PENDING → IN_PROGRESS → COMPLETED → UNDER_REVIEW → APPROVED → PAYMENT_PENDING → PAYMENT_RELEASED. Alt: REJECTED → back to IN_PROGRESS
11. **Contract:** DRAFT → PENDING_CLIENT/PENDING_BUILDER → ACTIVE → COMPLETED. Alt: TERMINATED, DISPUTED
12. **Payment:** PENDING → PROCESSING → COMPLETED. Alt: FAILED, REFUNDED, CANCELLED

---

### DIAGRAM 13-15: Use Case Diagrams

13. **System-wide:** Show all 8 actors (Client, Builder, Supplier, Supervisor, Inspector, Support, Admin, SuperAdmin) with their primary use cases grouped
14. **Client Detail:** Client with 17 use cases (create project, publish, review bids, award, sign contract, fund escrow, approve milestones, release payment, submit review, file dispute, chat, view invoices, etc.) with <<includes>> relationships
15. **Builder Detail:** Builder with 16 use cases (manage profile, browse marketplace, submit bid, sign contract, update progress, mark complete, view analytics, manage credits, etc.)

---

### DIAGRAM 16-19: Process Flow Diagrams (Flowcharts)

16. **Client End-to-End Flow:** Register → Create Project → Publish → Receive Bids → Award → Sign Contract → Fund Escrow → Approve Milestones → Release Payments → Review Builder
17. **Builder Flow:** Register → Complete Profile → Get Verified → Browse Marketplace → Submit Bid → Sign Contract → Complete Milestones → Receive Payments
18. **Admin Flow:** Login → Dashboard → (Verify Builders | Manage Users | Moderate Reviews | View Revenue | Audit Logs | CMS Management)
19. **Payment/Escrow Flow:** Client funds escrow → Milestone approved → PESSIMISTIC lock → Calculate 5% fee → Release payment → Update escrow balance → Notify builder

---

### DIAGRAM 20-21: Architecture Diagrams

20. **System Architecture (Box-and-Line):** Browser → React 18/TypeScript/Vite/TailwindCSS → (REST API + WebSocket) → Spring Boot 3.2 (17 Controllers → 22 Services → 26 Repositories) → Flyway V1-V24 → MySQL/H2. Include: RateLimitFilter, JwtAuthenticationFilter, Spring Security
21. **Auth Flow Architecture:** Login Page → AuthController → AuthService (BCrypt + Lockout) → JwtTokenProvider (HS512) → tokens stored in localStorage → Axios interceptor adds Bearer header → JwtAuthenticationFilter validates on each request → 401 triggers auto-refresh

---

### DIAGRAM 22-23: ER Diagrams

22. **Core Tables:** users, projects, bids, milestones, contracts, escrow_accounts, payments, reviews, builder_profiles, chat_rooms — with PKs, FKs, and relationship cardinalities
23. **Supporting Tables:** inspections, daily_logs, safety_checklists, material_orders, deliveries, support_tickets, disputes, audit_logs, notifications, cms_pages, blog_posts, email_templates, system_settings

---

### DIAGRAM 24: Design Patterns Diagram

Show a visual map of 9 design patterns used:
- **Creational:** Builder (Contract generation), Factory Method (Notification types), Singleton (Spring beans)
- **Structural:** Repository (26 JPA repos), DTO (16 request + 18 response), Proxy (Axios interceptor)
- **Behavioral:** Observer (WebSocket notifications), Strategy (Payment methods), Chain of Responsibility (Security filter chain: RateLimit → JWT → Auth)

---

### RENDERING INSTRUCTIONS

- Use colors: Blue (#2563eb) for frontend, Yellow (#d97706) for API, Green (#16a34a) for services, Purple (#9333ea) for data, Red (#dc2626) for storage
- Use clean, readable fonts
- Keep diagrams professional — suitable for FYP evaluation
- Number each diagram clearly (Diagram 1, Diagram 2, etc.)

Generate Diagram 1 first, then ask me "Next?" before proceeding to each subsequent diagram.

## PROMPT END
