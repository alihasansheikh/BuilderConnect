# Project Overview

## What the System Does (Code Evidence)

BuilderConnect is a **construction project management marketplace** that connects clients (homeowners/developers) with builders and suppliers. The system manages the full project lifecycle: project creation, competitive bidding, contract generation, milestone tracking, escrow-based payments, real-time chat, material ordering, reviews, and administrative oversight.

**Main business purpose:** Digitize the construction industry in Pakistan by providing a transparent marketplace with secure escrow payments and milestone-based project tracking.

**Target users (inferred from code):**
- Clients (homeowners, real estate developers) — post projects, manage payments
- Builders/Contractors — bid on projects, manage milestones
- Material Suppliers — catalog management, order fulfillment, deliveries
- Support Agents — ticket management, dispute resolution
- Admins/Super Admins — platform governance, user verification, revenue monitoring

**Currency:** PKR (Pakistani Rupees) — hardcoded across all monetary fields (`DECIMAL(15,2)`)

---

## Core Features (Observed from Code)

### Fully Implemented (Controllers + Services + Entities + Frontend Pages)

| Module | Backend | Frontend | Description |
|--------|---------|----------|-------------|
| **Auth** | AuthController, AuthService | Login, Register, ForgotPassword | JWT auth (access 30min, refresh 7d), BCrypt, account lockout (5 attempts/15min), 2FA stub (disabled) |
| **Projects** | ProjectController, ProjectService | CreateProject, MyProjects, ProjectDetails | Full CRUD, publish/draft workflow, award to builder, soft deletes |
| **Bidding** | BidController, BidService | Marketplace, MarketplaceProjectDetail, MyBids, BidFormModal | Builder bid submission, withdrawal (with credit refund), shortlisting, lead credit consumption |
| **Milestones** | MilestoneController, MilestoneService | MilestoneTimeline (component) | Complete/approve/reject workflow, updates with attachments |
| **Payments/Escrow** | PaymentController, PaymentService | PaymentHistory, Invoices | Escrow funding, milestone-based release with 5% platform fee, pessimistic locking |
| **Contracts** | ContractController, ContractService | (embedded in ProjectView) | Auto-generation on award, dual-party signing, version history |
| **Chat** | ChatController, ChatService | Messages | Direct/project/support rooms, WebSocket STOMP, message edit/delete |
| **Reviews** | ReviewController, ReviewService | Reviews | Client-to-builder reviews, moderation queue (PENDING status), rating aggregation |
| **Notifications** | NotificationController, NotificationService | NotificationCenter, NotificationDropdown | WebSocket real-time push, preferences, mark-read |
| **Builder Profiles** | BuilderProfileController, BuilderProfileResponse | Settings, BuilderSearch, BuilderDetail, BuilderComparison | Profile management, public search, banner images, analytics |
| **Admin** | AdminController, AdminService | 10 admin pages | Metrics, user management, builder verification, revenue reports, audit logs, moderation, system settings, CMS, blog, email templates |
| **Subscriptions** | SubscriptionController, SubscriptionService | Subscription | Tiered plans (FREE/BASIC/PROFESSIONAL/ENTERPRISE), lead credits |
| **Lead Credits** | LeadController, LeadService | LeadManagement | Credit balance, transaction history, consumption on bid, refund on withdrawal |
| **Change Requests** | ChangeRequestController, ChangeRequestService | ChangeRequestForm (component) | Scope/budget/timeline change proposals with approval flow |
| **File Uploads** | (via ProjectController, UserController, BuilderProfileController), FileStorageService | (integrated in forms) | Profile images, banner images, project images; UUID filenames, MIME validation |

### Implemented Backend Only (No Dedicated Frontend Pages)

| Module | Backend | Frontend Status |
|--------|---------|-----------------|
| **Support Tickets** | SupportTicketController, SupportTicketService | Support Dashboard + Tickets + TicketDetail pages exist |
| **Disputes** | DisputeController, DisputeService | Support Disputes page exists |
| **Materials** | MaterialController, MaterialService | Supplier Catalog page exists |
| **Material Orders** | MaterialOrderController, MaterialOrderService | Supplier Orders page exists |
| **Badges** | BadgeController, BadgeService | No dedicated page |

### Infrastructure Features

Account lockout, suspension checks, pessimistic locking, platform fee (5%), audit logging, XSS protection, WebSocket auth, security headers, and production profile are all implemented.

> For detailed business rules and constraints, see [01-product-requirements.md](01-product-requirements.md). For architecture patterns, see [03-architecture.md](03-architecture.md).

---

## System Scope

### Clearly Included
- Full bidding marketplace lifecycle (post → bid → award → contract → milestones → payment)
- 6-role RBAC (CLIENT, BUILDER, SUPPLIER, SUPPORT_AGENT, ADMIN, SUPER_ADMIN)
- Real-time WebSocket notifications and chat
- Escrow-based payment with milestone release
- Admin dashboard with metrics, revenue, audit logs, content management
- Dark mode UI with Minimals-inspired design system (teal #00A76F primary)

### Partially Implemented
- **2FA**: Entity fields exist (`twoFactorEnabled`, `twoFactorSecret`), TOTP library in pom.xml, but login auto-disables if enabled. No UI to enable.
- **Email sending**: EmailService exists with 5 email methods, but mail config defaults to localhost:1025 (mock). No real SMTP configured.
- **Material Orders + Deliveries**: Backend entities and services exist, frontend has Catalog + Orders pages.
- **Supplier dashboard**: Pages exist but are less polished than Client/Builder/Admin.

### Missing or Incomplete
- **Real payment gateway integration**: All payments use `PaymentMethod.MOCK`. No Stripe/PayPal integration despite enum values existing.
- **SMS/Push notifications**: No implementation found. Only WebSocket + email (mock).
- **File attachment viewing**: Files uploaded but no lightbox/preview beyond image display.
- **Search indexing**: Full-text search uses LIKE queries, no Elasticsearch or similar.
- **Rate limiting**: No request rate limiting implemented (infrastructure concern noted but not coded).
- **E2E tests**: Zero Playwright/Cypress tests despite vitest configured.
- **Unit test coverage**: Minimal — only `AuthServiceTest.java` found in test directory.

---

## Tech Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Java | 17 |
| Framework | Spring Boot | 3.2.1 |
| Build | Maven | (wrapper) |
| ORM | Spring Data JPA / Hibernate | (via Spring Boot) |
| Database (dev) | H2 in-memory | 2.2.x |
| Database (prod) | MySQL | 8.x |
| Migrations | Flyway | 9.22.x |
| Auth | Spring Security + JWT (jjwt 0.12.3) | |
| WebSocket | Spring WebSocket + STOMP + SockJS | |
| API Docs | springdoc-openapi 2.3.0 (Swagger UI) | |
| PDF | iText 7.2.5 | |
| Password | BCrypt (strength 10) | |
| Mail | Spring Mail (mock config) | |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript | 5.3.3 |
| Framework | React | 18.2.0 |
| Build | Vite | 5.0.11 |
| Styling | Tailwind CSS | 3.4.1 |
| State | React Query (TanStack) | 5.17.0 |
| Routing | React Router | 6.21.1 |
| Forms | React Hook Form + Zod | 7.49.3 / 3.22.4 |
| HTTP | Axios | 1.6.5 |
| UI Primitives | Radix UI (12 packages) | various |
| Icons | Lucide React | 0.309.0 |
| Charts | Recharts | 2.10.3 |
| Tables | TanStack React Table | 8.11.2 |
| WebSocket | @stomp/stompjs + sockjs-client | 7.0.0 / 1.6.1 |
| Toasts | Sonner | 1.3.1 |
| Sanitization | DOMPurify | 3.3.1 |
| Testing | Vitest + React Testing Library | 1.1.3 |

---

## Key Modules

### Backend (by package)
| Package | Purpose | File Count |
|---------|---------|------------|
| `controller` | REST API endpoints | 25 |
| `service` | Business logic | 30 |
| `entity` | JPA entities (database models) | 43 |
| `repository` | Spring Data JPA repositories | 41 |
| `dto/request` | Incoming request validation | 29 |
| `dto/response` | Outgoing response shaping | 31 |
| `config` | Spring configuration beans | 7 |
| `security` | JWT filter, token provider, user details | 3 |
| `enums` | Status/type enumerations | 10 |
| `exception` | Custom exceptions + global handler | 4 |
| `util` | SecurityUtils (suspension validation) | 1 |

### Frontend (by directory)
| Directory | Purpose | File Count |
|-----------|---------|------------|
| `pages/admin` | Admin dashboard suite | 10 |
| `pages/builder` | Builder marketplace + project management | 10 |
| `pages/client` | Client project + payment management | 6 |
| `pages/public` | Public landing + builder search | 5 |
| `pages/shared` | Cross-role pages (messages, settings, notifications) | 4 |
| `pages/auth` | Login, register, forgot password | 3 |
| `pages/supplier` | Supplier catalog + orders | 3 |
| `pages/support` | Support tickets + disputes | 4 |
| `components/ui` | Reusable UI primitives | 11 |
| `components/project` | Project-specific components | 4 |
| `components/layout` | Dashboard layout + notification dropdown | 2 |

---

## Entry Points

### REST API Controllers (25 endpoints groups)
All served under `/api/v1/...` on port 8080.

| Controller | Base Path | Auth Required |
|-----------|-----------|---------------|
| AuthController | `/v1/auth/**` | No (public) |
| ProjectController | `/v1/projects/**`, `/v1/client/projects/**`, `/v1/builder/projects/**` | Mixed |
| BidController | `/v1/builder/bids/**`, `/v1/projects/{id}/bids/**` | Yes |
| MilestoneController | `/v1/projects/{id}/milestones/**`, `/v1/milestones/**` | Yes |
| PaymentController | `/v1/payments/**` | Yes |
| ChatController | `/v1/chat/**` | Yes |
| ContractController | `/v1/projects/{id}/contract/**` | Yes |
| ReviewController | `/v1/projects/{id}/review`, `/v1/builders/{id}/reviews` | Mixed |
| NotificationController | `/v1/notifications/**` | Yes |
| AdminController | `/v1/admin/**` | ADMIN/SUPER_ADMIN |
| UserController | `/v1/users/**` | Yes |
| BuilderController | `/v1/builders/**` | No (public search) |
| BuilderProfileController | `/v1/builder/me/**` | BUILDER |
| ChangeRequestController | `/v1/projects/{id}/change-requests/**` | Yes |
| LeadController | `/v1/builder/leads/**` | BUILDER |
| SubscriptionController | `/v1/subscriptions/**`, `/v1/builder/subscription/**` | Mixed |
| CmsController | `/v1/public/**`, `/v1/admin/cms/**` | Mixed |
| SupportTicketController | `/v1/support/tickets/**` | Yes |
| DisputeController | `/v1/projects/{id}/disputes/**`, `/v1/disputes/**` | Yes |
| MaterialController | `/v1/materials/**`, `/v1/supplier/materials/**` | Mixed |
| MaterialOrderController | `/v1/material-orders/**`, `/v1/supplier/orders/**` | Yes |
| BadgeController | `/v1/badges/**`, `/v1/admin/badges/**` | Mixed |

### WebSocket Endpoints
- STOMP endpoint: `/ws` (with SockJS fallback)
- Subscribe: `/topic/notifications/{email}`, `/topic/chat/{roomId}`
- Publish: `/app/chat/{roomId}`, `/app/chat/{roomId}/typing`

### Background Jobs
- **DevDataLoader**: `CommandLineRunner` (`@Profile("dev")`) — re-encodes all user passwords to BCrypt of "password" on startup. Not a scheduled job.
- **No scheduled tasks** (`@Scheduled`) found in codebase.
- **No message queue consumers** (Kafka, RabbitMQ) found.

---

## Observations

### Inconsistencies
1. **Service count (30) > Controller count (25)**: Services without controllers: `AuditService` (internal only), `EmailService` (internal only), `FileStorageService` (used by other controllers), `InvoiceService` (used by PaymentController), `MilestoneUpdateService` (used by MilestoneController), `NotificationPreferenceService`, `SystemSettingService` (used by AdminController).
2. **Entity count (43) >> Controller count (25)**: Many entities are sub-resources (ChatRoomParticipant, MaterialOrderItem, ContractVersion, etc.) managed through parent controllers.
3. **Repository count (41) vs Entity count (43)**: 2 entities lack dedicated repositories — likely `BaseEntity` (abstract) and one other (possibly `UserBadge` managed through `UserBadgeRepository` which IS present).
4. **JSON column encoding**: `specializations`, `skills`, `serviceAreas`, `requiredSkills` stored as JSON strings in TEXT columns. Multi-layer JSON encoding occurs during JPA → Jackson serialization. Frontend has `parseJsonArray()` utility to unwrap.
5. **2FA declared but non-functional**: TOTP library in pom.xml, entity fields exist, but login auto-disables 2FA. No UI to enable it.
6. **Mock payment only**: `PaymentMethod` enum includes STRIPE, PAYPAL, BANK_TRANSFER, CASH — but all payment operations use MOCK. No payment gateway integration code exists.
7. **Email service exists but mail is mock**: localhost:1025 SMTP. No production email provider configured.

### Suspicious/Incomplete Areas
1. **No real payment integration** despite escrow flow being fully implemented
2. **iText7 PDF library** in pom.xml — used by `InvoiceService.generateInvoicePdf()` but PDF generation may be basic
3. **`ComingSoon.tsx`** page exists — previously used for placeholder roles, now mostly replaced
4. **Seed data in 3 migrations** (V10, V14, V16) — potential for conflicts, documented in CLAUDE.md

---

## Unknowns

1. **Deployment target**: No Dockerfile, docker-compose, or CI/CD pipeline found. Deployment strategy is UNKNOWN.
2. **Production database**: MySQL configured but no production database exists. Schema is H2-tested only.
3. **Real email delivery**: No production SMTP configured. Email sending may silently fail in production.
4. **File storage in production**: Files stored locally in `./uploads/`. No S3/cloud storage integration. UNKNOWN if this is intentional or pending.
5. **Mobile app**: No mobile-specific API versioning or push notification infrastructure. UNKNOWN if a mobile client is planned.
6. **Multi-tenancy**: No tenant isolation code found. Appears to be a single-tenant platform.
7. **Internationalization**: No i18n support. All strings are English. Currency is PKR only.
8. **Analytics/tracking**: No Google Analytics, Mixpanel, or similar integration found.
9. **Backup/disaster recovery**: No database backup strategy documented or implemented.
10. **Load testing**: No performance benchmarks or load test scripts found.
