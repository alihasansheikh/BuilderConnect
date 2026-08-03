# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Last full audit: 2026-07-12** — every count, endpoint, enum, and config claim below was verified against the actual code by a multi-agent sweep. See "Known Issues (Verified)" for open bugs found during that audit.

> **2026-08-03 — SUPERVISOR and INSPECTOR roles, daily-log and inspection modules, and the Budget Estimator were REMOVED entirely (platform is now 6 roles: CLIENT, BUILDER, SUPPLIER, SUPPORT_AGENT, ADMIN, SUPER_ADMIN); docs/fyp-project-report untracked; repo licensed proprietary All Rights Reserved. Sections below mentioning these features are historical.**

> **2026-07-17 major changes (this note supersedes conflicting sections below; doc not yet fully re-audited):**
> - **Product marketplace shipped**: supplier→(client+builder) storefront (`/{client|builder}/products`), direct COD orders with state machine + stock, product reviews (instant, helpful votes), favourites hearts (V33), supplier orders DataTable + `/supplier/orders/:id`, supplier stats + detailed Revenue page (`/supplier/revenue`, V35 `paid_at`), material image uploads.
> - **Payment/Invoice subsystem REMOVED** (V34 drops payments/invoices/escrow_accounts/escrow_transactions/builder_payouts). Milestone direct payment (pay with proof → builder confirm → project completes) lives on MilestoneController/MilestoneService. Client Payments/Invoices pages gone.
> - **Real Stripe subscriptions (test mode)** for builders: hosted Checkout `mode=payment` per 30-day period via `POST /v1/builder/subscription/checkout|confirm|select-free`, signature-verified `POST /v1/webhooks/stripe` (permitAll + rate-limit exempt), idempotent apply into `subscription_payments` (V36). Mock `upgradeTier` deleted. Plan limits ENFORCED via effective tier (expired→FREE): maxActiveBids at bid creation, maxPortfolioImages, featured-first builder search. Keys in gitignored `backend/.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`); keyless boot returns 400 "Stripe is not configured" on checkout.
> - Admin revenue (`/admin/revenue`, `GET /v1/admin/revenue-summary`) now shows SUBSCRIPTION revenue; `metrics.payments` → `metrics.subscriptions`.
> - Migrations now **V1–V36**. `User`/`Notification` secrets are `@JsonIgnore`d. `UnauthorizedException` maps to **401**.

> **2026-07-18 changes (supersedes conflicting sections below, including parts of the 2026-07-17 note):**
> - **Migrations now V1–V40**: V37 verification-request flow columns, V38 email-template cleanup/additions, V39 honest blog seed copy, V40 system-settings cleanup (adds maintenance banner message, drops unread keys incl. the dead platform fee — no fee is charged anywhere post-V34).
> - **Registration allowlist**: `POST /v1/auth/register` accepts ONLY CLIENT/BUILDER/SUPPLIER (400 otherwise). Team accounts are provisioned by SUPER_ADMIN via `POST /v1/super-admin/users/admins` (roles ADMIN, SUPPORT_AGENT, SUPERVISOR, INSPECTOR; email pre-verified); also `GET /v1/super-admin/users/admins`, `POST /v1/super-admin/users/{id}/suspend|unsuspend`. UI: `/admin/admins` page (super-admin only).
> - **Suspension is enforced everywhere**: credentials-valid login returns "Your account has been suspended..." (+ reason) — password is checked FIRST so the reason is only revealed to the account owner; refresh is blocked, JwtAuthenticationFilter rejects every request from a suspended principal (live session termination), and WebSocket CONNECT is rejected too. Admin suspend/unsuspend sends email; write actions also gate via `SecurityUtils.validateNotSuspended`.
> - **Security audit trail**: failed logins and lockouts now write `audit_logs` rows (`LOGIN_FAILED` per attempt — including unknown emails with null user — and `USER_ACCOUNT_LOCKED` on the 5th); `AuditService` records the real client IP (X-Forwarded-For, else remote address). `RateLimitFilter` honors X-Forwarded-For only from `app.rate-limit.trusted-proxies` (default loopback).
> - **Admin/support notification fan-out**: `NotificationService.notifyAdmins` / `notifySupportAgents` broadcast to all active admins / support agents. New `NotificationType`s: `VERIFICATION_REQUESTED`, `VERIFICATION_REJECTED`, `TICKET_CREATED`. Triggers: verification request → admins, dispute filed → admins, Stripe subscription payment → admins, ticket created → support agents. `/support/*` routes now also allow ADMIN/SUPER_ADMIN.
> - **Moderation queue filters**: `GET /v1/admin/moderation-queue` takes `status` (default APPROVED), `reviewType`, `minRating`, `maxRating` + Pageable sorting; queue rows include product names for product reviews.
> - **Public site unification**: shared nav (with mobile menu) + shared footer across all public pages; blog cover images actually render.
> - **Verification request flow (V37)**: builders/suppliers submit `POST /v1/builder/me/verification-request` / `POST /v1/supplier/me/verification-request` (optional note + documentUrls; documents uploaded first via `POST .../verification-request/document`, multipart). documentUrls MUST start with `/uploads/verification/` (400 otherwise — the admin queue renders them as links). Admin queue: `GET /v1/admin/builders/pending?requested=` and `GET /v1/admin/suppliers/pending?requested=`; approve via `POST /v1/admin/verify-builder|verify-supplier`, reject with reason via `POST /v1/admin/reject-builder-verification|reject-supplier-verification`.
> - **Self-service account deletion**: `DELETE /v1/users/me` (password confirm; blocked for ADMIN/SUPER_ADMIN/SUPPORT_AGENT). Soft-deletes AND tombstones the email (`deleted-{id}-{email}`, truncated to 100) so the address can re-register (users.email is UNIQUE across deleted rows). Deleted users are hidden from public builder search + builder detail, marketplace project search, and material browse; bids on a deleted client's project are rejected. UI: shared Settings page is role-appropriate — non-privileged roles get a Danger Zone (`DeleteAccountDialog`); privileged roles see no deletion and trimmed notification-preference toggles.
> - **Template-driven email (V38)**: `EmailTemplateRenderer` sends via `email_templates` with `{{variable}}` substitution; body variables are HTML-escaped (body is sent as HTML); inactive template = admin kill-switch except security-critical keys (email_verification, password_reset) which fall back; every attempt logged to `email_logs`. Reset-password page exists; auth also has `POST /v1/auth/resend-verification`.
> - **Public settings**: `GET /v1/public/settings` (no auth) — maintenance banner/message + footer contact. Maintenance mode, bid/lead/image limits are LIVE settings now (V40); admin settings page shows only rows something actually reads.
> - **frontend/src/services** split: axios instance/interceptors/error helpers moved to `apiClient.ts`; `api.ts` re-exports them, so `@/services/api` imports are unchanged.
> - Known Issues below re-marked: **#6, #10, #11, #12, #13, #22 are RESOLVED** (marked ✅ inline). Treat the rest of the list as historical — verify against code before acting.

> **2026-07-19 UX/flow overhaul (supersedes conflicting sections below; not yet fully re-audited). Supervisor & inspector features/pages were deliberately OUT OF SCOPE and are unchanged.**
> - **Migrations now V1–V45**: V41 backfills wizard detail fields (property_type/area/province/structure_condition) on the V10 seed projects so marketplace cards/filters have real data; V42 adds `milestone_rejected` + `project_completed` email templates; V43 adds `notification_preferences.email_order_update` (per-user opt-out) + `order_placed_supplier`/`order_status_buyer` templates; V44 adds `ticket_response`/`ticket_resolved`/`dispute_filed` templates; V45 **drops** `support_tickets.assigned_to|assigned_at` and `disputes.assigned_mediator|assigned_at` and **adds** `support_tickets.escalated BOOLEAN` (assignment removed; agents work / admins oversee).
> - **Realtime fixes**: STOMP heartbeats corrected; on reconnect the client **re-subscribes** existing destinations (was silently dead after a drop); chat messages now fan out a `NEW_MESSAGE` notification; `WebSocketAuthInterceptor` now authorizes **SUBSCRIBE** (rejects `/topic/chat/{roomId}` and its `/edit|/delete|/typing` sub-destinations unless the principal is a room participant); notification list supports an **unread-only** filter; NotificationDropdown/live NotificationCenter play a **chime with a mute toggle** persisted in localStorage (`frontend/src/lib/notificationSound.ts`).
> - **Project lifecycle (V42)**: milestones are **work-gated** — a builder must post progress/updates before a milestone can be marked complete → client approve/reject (reject emails the builder rework reason); when every milestone is paid the project completes and both parties are emailed. **Project cancellation** flow added. **Bid expiry job**: `@Scheduled(cron = "0 0 3 * * *")` `BidService.expireStaleBids` marks past-validity active bids EXPIRED and notifies the builder. Marketplace/project **read access tightened** (private project detail scoped to owner/awarded/eligible builders + admins); contract history + change-request fixes.
> - **Reviews**: verified-purchase flag (buyer had a DELIVERED order / completed project) surfaced as a badge; list endpoints gained **sort + rating/type filters** (`ReviewListControls` on builder, supplier, product, and profile review lists); `GET .../review/me` guard + project-review 400 fixes; post-delivery review CTA on order detail.
> - **Supplier orders (V43)**: order status now validated against `LEGAL_TRANSITIONS` (RETURNED path fixed), row locked on write; item counts + product search in the orders table; **paymentStatus** filter; order emails on placement/CONFIRMED/DELIVERED (respecting `email_order_update`); catalog pagination; deep-linked status filters; buyer reorder.
> - **Support redesign**: regular users get first-class **Help & Support** pages — `MyTickets`/`MyTicketDetail` at `/{client|builder|supplier}/support` (+ `/support/tickets/:id`) with a **File-Dispute** dialog from project/order screens. Dispute filing is **restricted to the two project parties** (400 otherwise) and emails the respondent; ticket owners get agent-reply/resolution emails. `resolveDispute` now **requires a legal `resolutionType`** (400 otherwise). **Ticket/dispute assignment REMOVED** (V45) — replaced by **escalation to admins** (`escalateTicket`/`escalateDispute` flag the row + `notifyAdmins`); the agents-work / admins-oversee split gives ADMIN/SUPER_ADMIN read-through on `/support/*` and Tickets+Disputes items in the admin sidebar. The **support role's own sidebar dropped its Messages entry**.
> - **Client**: new **builders directory** at `/client/builders` (+ `/client/builders/compare`) reusing the public search/compare components inside the dashboard shell; public builder-search/compare pages retained but builder profiles are now the login-gated `/profile/:userId`. Leaner client sidebar. `GuestRoute` bounces already-authenticated users off `/login|/register|/verify-email` to their role home (`getRoleHomePath`); forgot-password reset hardened.
> - **Builder**: the standalone Leads page is **merged into Subscription** — `/builder/leads` now `Navigate`-redirects to `/builder/subscription` (honest lead-credit history lives there); real dashboard stats; analytics trend charts **gated** (only shown once enough data exists).
> - **Settings**: notification-preference toggles are **role-aware** (each role sees only the channels it actually receives, incl. the new `email_order_update` for buyers/suppliers); account deletion is **hard-blocked** for privileged roles (ADMIN/SUPER_ADMIN/SUPPORT_AGENT) at the API and hidden in the UI.
> - **Public**: Home page **de-faked** — fabricated stats/testimonials replaced with honest copy; role-segment 404 fix; profile quick actions.

> **2026-07-20 AI suite (three deliverables; supersedes conflicting sections below). Migrations now V1–V47. Powered by a shared, provider-agnostic LLM core.**
> - **Shared LLM core**: `service/llm/LlmClient` (interface: `generateText(systemInstruction, history, GenConfig)` + `generateJson(..., responseSchema, ...)` for structured output) + `GeminiClient` (Spring `RestClient` → Google Gemini `:generateContent`, model **`gemini-flash-latest`** env-overridable via `GEMINI_MODEL`; reads the body as **byte[]** to tolerate `application/octet-stream` responses; `LlmUnavailableException` → **HTTP 503** busy) + `GeminiProperties` (`app.gemini.*`, key `GEMINI_API_KEY` in gitignored `backend/.env`; blank key → feature auto-disables). Free-tier quota is TIGHT and SHARED across all three surfaces — real use needs billing.
> - **D1 — Public FAQ chatbot**: anonymous floating bubble on the public pages. `POST /v1/public/chatbot/ask` (permitAll), grounded ONLY on `resources/faq-knowledge.md`, declines off-topic, English + Roman Urdu, react-markdown answers. Kill-switch `chatbot_enabled` (V46) exposed via `/v1/public/settings` (widget also hides with no key). Dedicated per-IP rate-limit bucket. `components/chatbot/PublicChatWidget` (lazy `ChatPanel`) mounted in `PublicNav`.
> - **D2 — Authenticated AI Assistant**: full-page assistant for **CLIENT + BUILDER** (`pages/shared/AiAssistant.tsx`, sidebar "AI Assistant"). Advisory only (no tools/account-data). **One saved thread per user** (`ai_messages` table, V47, owner-scoped repo) + Clear button; blocking replies; broad scope (platform KB + open-domain construction/budgeting) personalized by role/name; ~6-exchange memory. `GET/POST/DELETE /v1/assistant/messages` (`hasAnyRole CLIENT,BUILDER`); kill-switch `ai_assistant_enabled` (V47) + key gate.
> - **D3 — Floor-plan generation**: dedicated **Floor Plan Studio** (`pages/shared/FloorPlanStudio.tsx`, sidebar "Floor Plan") for CLIENT + BUILDER. Form (plot Marla/Kanal/sq ft, bedrooms, bathrooms, kitchen open/closed, drawing room, car porch, notes) → `POST /v1/floorplan/generate` returns a **SEMANTIC plan JSON** (structured output; rooms + relative sizes + zones + furniture, NO coordinates) → deterministic **TS layout engine** (`lib/floorplan/{schema,units,layout,fixtures}.ts`; weight-balanced squarified slicing packs non-overlapping rooms, carves ensuite baths, places doors/windows/furniture) → **editable Konva canvas** (`components/floorplan/*`, `konva`+`react-konva`): move/resize rooms, rename labels, Regenerate, **export PNG + PDF** (`jspdf`) with dimensions/areas. **Session-only** (no persistence). The D2 assistant recognizes a design request and shows an "Open Floor Plan Studio" hand-off button. Vector "architectural drawing" quality (not photoreal — editable + free/no-GPU by design).

> **2026-07-21 changes (supersedes conflicting sections above, incl. the 2026-07-20 AI-provider details). Migrations still V1–V47 (no new migrations).**
> - **LLM provider is now PLUGGABLE** — `app.llm.provider` (env `LLM_PROVIDER`) = `gemini` | `anthropic`, each `@ConditionalOnProperty` so exactly one `LlmClient` bean is active. New `AnthropicClient` (Claude Messages API; **forced tool use** for structured JSON — `responseSchema` → tool `input_schema` — since Anthropic has no responseSchema field; `normalizeMessages` guarantees Anthropic's required non-empty user turn) + `AnthropicProperties` (`app.anthropic.*`, `ANTHROPIC_API_KEY`, default model `claude-haiku-4-5-20251001`). `LlmClient` gained `isConfigured()`; the three AI services + `PublicSettingsController` gate on `llmClient.isConfigured()` (no longer a Gemini-specific check). **Currently running on Anthropic** (Gemini free tier is `limit:0`/overloaded and unusable); Anthropic is PAID. Switch back with `LLM_PROVIDER=gemini`. Both keys live in gitignored `backend/.env`.
> - **Budget estimator fixed + standalone tool**: the old model double-counted finishing (turnkey base rate PLUS per-trade finishing add-ons) and had no grey-vs-finished option, over-pricing ~2×. Now a **finish-quality tier** (GREY 0.62 / STANDARD 1.0 / PREMIUM 1.32 × recalibrated standard base rates); **trades are informational only** (never affect the total); response adds `estimatedLow/High` (±15%), `structureCost`, `finishingCost`, `ratePerSqFt`; `getCostTables` no longer exposes raw rate maps. `POST /v1/budget-estimate` request gained `finishTier`. New shared `components/budget/BudgetEstimator.tsx` (self-contained + embedded modes; coverage % default 80) used by BOTH a new **Budget Estimator** sidebar page (`pages/shared/BudgetEstimator.tsx`, CLIENT+BUILDER) AND the CreateProject wizard. `BudgetBreakdownChart` deleted. (5-marla std house: ~5.5M, was ~10.6M.)
> - **Locality/area autocomplete** (Google Places, server-proxied): new `LocationController`/`LocationService` → `GET /v1/locations/autocomplete?query=&city=` (authenticated) proxies Google legacy Places Autocomplete (country:pk, `types=geocode`, city-biased) so `GOOGLE_MAPS_API_KEY` (backend/.env, `app.google-maps.*`) never reaches the browser. Frontend `components/location/LocalityAutocomplete.tsx` (debounced, free-text-friendly) replaces the free-text "Locality / Area" input in CreateProject; stores the locality name in the existing `locationArea` (no schema change). Blank key → suggestions disabled, field still works.
> - **Dev auth**: access token is now **8 hours in dev** (`application-dev.yml`) so frequent H2-wipe restarts (which erase DB-stored refresh tokens) don't log you out mid-session; **production keeps the 30-minute default**. `JWT_SECRET` is intentionally unset in `backend/.env` (dev uses the committed `application-dev.yml` default; prod has NO default and must set it).

## Overview
Construction project management platform connecting clients with builders, suppliers, supervisors, and inspectors in Pakistan. Monorepo with Java Spring Boot backend and React TypeScript frontend. All 8 roles have real, API-backed frontend dashboards (no placeholder pages remain).

## Quick Commands
```bash
# Backend (from /backend)
mvn spring-boot:run          # Start backend on :8080 (H2 in-memory DB, auto-runs Flyway)
mvn compile -q               # Quick compile check
mvn test                     # Run tests (36 tests, all passing as of last audit)

# Frontend (from /frontend)
npm run dev                  # Start Vite dev server on :5173
npx tsc --noEmit             # TypeScript check (14 pre-existing errors in 12 page files)
npx vite build               # Production build (use this — `npm run build` runs `tsc && vite build`
                             #   and FAILS on the pre-existing TS errors)
npm test                     # Vitest — currently exits 1: ZERO frontend test files exist
```

## Tech Stack

### Backend
- **Java 17 / Spring Boot 3.2.1 / Maven** (artifact `builderconnect-backend` v2.0.0)
- **Database**: H2 in-memory (MySQL compat mode, `application-dev.yml`) — fresh DB every restart, no flyway repair needed
- **Production DB**: MySQL (configured in `application.yml`; `mysql-connector-j` 8.2.0)
- **ORM**: Spring Data JPA / Hibernate (`ddl-auto: none` in dev — Flyway creates schema; `validate` in prod)
- **Migrations**: Flyway (V1–V28 in `backend/src/main/resources/db/migration/`)
- **Auth**: JWT via jjwt 0.12.3 (access 30min, refresh 7d, issuer `BuilderConnect`; algorithm auto-selected from secret length — HS256 floor enforced at startup, dev secret yields HS512), BCrypt (strength 10), Spring Security, account lockout (5 attempts → 15min)
- **Rate limiting**: custom `RateLimitFilter` (NOT bucket4j) — per-IP fixed window: 10 req/min on the 4 auth endpoints (login/register/forgot-password/reset-password, one shared bucket), 100 req/min general; returns 429 + `Retry-After`; configured via `app.rate-limit.*`
- **WebSocket**: STOMP at `/ws` (registered twice: native WS + SockJS fallback), broker prefixes `/topic` and `/queue`, app prefix `/app`, user prefix `/user`
- **PDF generation**: iText 7 (7.2.5) for invoice/contract PDFs
- **2FA**: `dev.samstevens.totp` dependency present but feature UNIMPLEMENTED (login auto-disables the `twoFactorEnabled` flag)
- **API docs**: Swagger/OpenAPI (springdoc 2.3.0) at `/api/swagger-ui.html` — **dev profile only** (`OpenApiConfig` is `@Profile("dev")`; prod disables both api-docs and swagger-ui)
- **Server**: Port 8080, context-path `/api`
- **File uploads**: Max 10MB, stored in `./uploads/`, served at `/uploads/**` (allowed: jpg/jpeg/png/gif/pdf/doc/docx/xls/xlsx)
- **Platform fee**: 5% (`app.platform.fee-percentage`); also `min-bid-amount` 1000, `max-bid-amount` 50000000, `default-lead-credits` 5, `bid-validity-days` 30, `escrow-release-delay-hours` 24

### Frontend
- **React 18.2 / TypeScript 5.3 / Vite 5.0**
- **Styling**: Tailwind CSS 3.4, dark mode (class-based via ThemeContext, localStorage `theme` key), CSS variables (HSL), tailwindcss-animate, cva, clsx + tailwind-merge (`cn()`). Brand palette: **orange primary** HSL(25 95% 53%) + green (rebranded from teal/amber 2026-04-09)
- **State**: React Query v5.17 (`staleTime: 5min`, `retry: 1` global; Marketplace 2min; builder Dashboard 60s)
- **Routing**: React Router v6.21 with role-based `ProtectedRoute`; **route-level code splitting** — every page is `React.lazy` inside `Suspense` (LoadingSpinner fallback); public/auth/404 routes wrapped in `<ForceLightMode>` (public site always light theme)
- **Forms**: React Hook Form 7.49 + Zod 3.22
- **UI**: Radix UI primitives, Lucide icons, Recharts, Sonner toasts, DOMPurify
- **HTTP**: Axios 1.6 with interceptors: JWT attach, mutex-guarded 401 refresh (single in-flight `refreshPromise`), and 429 rate-limit handling (`userMessage` from `Retry-After`)
- **Tables**: @tanstack/react-table 8.11
- **WebSocket**: @stomp/stompjs 7.0 + sockjs-client 1.6 (custom `useWebSocket` hook)
- **Dates**: date-fns 3.2
- **Testing**: Vitest 1.x + @testing-library/react + jsdom configured, but **0 test files exist**
- **Path alias**: `@/` → `src/`
- **vite.config.ts**: `esbuild.drop: ['console','debugger']`; `define: { global: 'globalThis' }` (SockJS); `resolve.dedupe: ['react','react-dom']`; proxy `/api` → `http://localhost:8080`, `/ws` → same target with `ws: true` and rewrite `path => '/api' + path`

---

## Project Structure

```
backend/src/main/java/com/builderconnect/
├── config/          # 8 classes: SecurityConfig, CorsConfig, WebSocketConfig, WebSocketAuthInterceptor,
│                    #   OpenApiConfig, WebMvcConfig, DevDataLoader, RateLimitFilter
├── controller/      # 25 REST controllers (/v1/...)
├── dto/request/     # 29 Request DTOs
├── dto/response/    # 31 Response DTOs
├── entity/          # 42 JPA entities + BaseEntity (provides id, createdAt, updatedAt)
├── enums/           # 10 enum files (+ many inner enums in entities)
├── exception/       # BadRequestException, ResourceNotFoundException, UnauthorizedException,
│                    #   RateLimitExceededException, GlobalExceptionHandler
├── repository/      # 41 Spring Data JPA repositories
├── security/        # JwtTokenProvider, JwtAuthenticationFilter, UserDetailsServiceImpl
├── service/         # 29 service classes
├── util/            # SecurityUtils (validation helpers)
└── websocket/       # (empty — WebSocket logic in config/ and controller/)

backend/src/test/java/com/builderconnect/   # 6 test classes (36 tests):
│   # AuthServiceTest, ProjectServiceTest, AuthControllerTest,
│   # JwtTokenProviderTest, RateLimitFilterTest, BuilderConnectApplicationTests

backend/src/main/resources/
├── application.yml          # Base config (MySQL, port 8080, context-path /api); spring.profiles.active: dev
├── application-dev.yml      # Dev config (H2 in-memory, H2 console, verbose logging, dev JWT secret)
├── application-prod.yml     # Production config (Swagger disabled, WARN/INFO logging, CORS locked down)
└── db/migration/            # V1–V28 Flyway migrations

backend/.env.example         # JWT_SECRET, DB creds, SPRING_PROFILES_ACTIVE, FRONTEND_URL, MAIL_*, STRIPE_* (frontend/.env.example: VITE_ vars)
                             #   (No Docker/containers — run backend with `mvn spring-boot:run`, frontend with `npm run dev` / `npx vite build`)

frontend/src/
├── components/
│   ├── ErrorBoundary.tsx    # React error boundary with dev stack trace
│   ├── layout/              # DashboardLayout (role-based sidebar + header for all 8 roles), NotificationDropdown
│   ├── ui/                  # 13 components: DataTable, Skeleton, ReasonDialog, ThemeToggle, StatusBadge,
│   │                        #   StatCard, EmptyState, Pagination, LoadingSpinner, AnimatedCounter,
│   │                        #   AnimatedSection, ForceLightMode, Logo
│   ├── project/             # MilestoneTimeline, BudgetBreakdownChart, ChangeRequestForm, BidFormModal
│   └── admin/, builder/, chat/, forms/   # EMPTY leftover dirs (safe to delete)
├── contexts/                # AuthContext (user + auth methods), ThemeContext (dark/light)
├── hooks/                   # useWebSocket (STOMP), useIntersectionObserver
├── lib/                     # utils (cn, parseJsonArray), formatters (PKR/en-PK), status-colors (10 domain maps)
├── pages/                   # 50 page files:
│   ├── admin/               # 10: Dashboard, Users, Verifications, AuditLogs, ModerationQueue,
│   │                        #   RevenueReports, SystemSettings, CmsPages, BlogManagement, EmailTemplates
│   ├── auth/                # 3: Login, Register, ForgotPassword
│   ├── builder/             # 10: Dashboard, Marketplace, MarketplaceProjectDetail, MyBids, ActiveProjects,
│   │                        #   ProjectView, Reviews, Analytics, LeadManagement, Subscription
│   ├── client/              # 6: Dashboard, CreateProject, MyProjects, ProjectDetails, PaymentHistory, Invoices
│   ├── inspector/           # 2: Dashboard, Assignments (real pages — inspectionApi)
│   ├── public/              # 5: Home, BuilderSearch, BuilderDetail, BuilderComparison, NotFound
│   ├── shared/              # Messages, NotificationCenter, Settings (+ ComingSoon.tsx = DEAD CODE, unimported)
│   ├── supervisor/          # 3: Dashboard, DailyLogs, ProjectLogs (real pages — dailyLogApi)
│   ├── supplier/            # 3: Dashboard, Catalog, Orders (real pages — materialApi/materialOrderApi)
│   └── support/             # 4: Dashboard, Tickets, TicketDetail, Disputes (real pages — supportTicketApi/disputeApi)
├── services/api.ts          # Axios instance + 24 typed API helper objects + getApiErrorMessage()
├── types/index.ts           # ~60 TypeScript interfaces and type unions
├── main.tsx                 # Entry: React.StrictMode > QueryClientProvider > BrowserRouter > ThemeProvider >
│                            #   ErrorBoundary > AuthProvider > App + Toaster
└── App.tsx                  # Lazy-loaded route definitions with ProtectedRoute wrapper (8 role groups)
```

---

## User Roles (8 roles)
`CLIENT` | `BUILDER` | `SUPPLIER` | `SUPERVISOR` | `INSPECTOR` | `SUPPORT_AGENT` | `ADMIN` | `SUPER_ADMIN`

## Test Accounts (all password: "password" — DevDataLoader re-encodes on startup; 15 users seeded in V10)
| Email | Role | Name / Notes |
|-------|------|--------------|
| alihasansheikh01@gmail.com | SUPER_ADMIN | Super Administrator (Karachi) |
| admin@builderconnect.pk | ADMIN | Admin User (Karachi) |
| support@builderconnect.pk | SUPPORT_AGENT | Support Agent (Karachi) |
| client1@example.com | CLIENT | Ahmed Khan (Karachi) |
| client2@example.com | CLIENT | Sara Ahmed (Lahore) |
| client3@example.com | CLIENT | Usman Ali (Islamabad) |
| builder1@example.com | BUILDER | Muhammad Contractors (Karachi, PROFESSIONAL, verified) |
| builder2@example.com | BUILDER | Ali Construction Co (Lahore, BASIC, verified) |
| builder3@example.com | BUILDER | Pak Builders (Karachi, FREE, NOT verified) |
| builder4@example.com | BUILDER | Prime Constructors (Islamabad, ENTERPRISE, verified) |
| supplier1@example.com | SUPPLIER | Karachi Building Materials (Karachi) |
| supplier2@example.com | SUPPLIER | Punjab Steel Works (Lahore) |
| supervisor1@example.com | SUPERVISOR | Imran Supervisor (Karachi) |
| inspector1@example.com | INSPECTOR | Qadir Inspector (Karachi) |
| inspector2@example.com | INSPECTOR | Bilal Quality Services (Lahore) |

## Test Projects
| Number | Title | Status | Owner | Notes |
|--------|-------|--------|-------|-------|
| PRJ-2026-00001 | Kitchen Renovation in DHA | OPEN | client1 | 2 bids; escrow funded 200k (V16) |
| PRJ-2026-00002 | Bathroom Upgrade | BIDDING | client1 | 1 bid (builder1, SHORTLISTED) |
| PRJ-2026-00003 | Full House Painting | OPEN | client2 | is_urgent=TRUE; subject of dispute DSP-2026-00001 |
| PRJ-2026-00004 | New House Construction | IN_PROGRESS | client3 | Awarded to builder4 (18.5M); contract ACTIVE; escrow 5M; supervisor1 assigned; 6 milestones (Foundation Work IN_PROGRESS @70%) |

---

## All API Endpoints (25 Controllers)

**SecurityConfig URL rules** (evaluated BEFORE `@PreAuthorize`):
- permitAll: `/v1/auth/**`, `/v1/public/**`, `/ws/**`, `/error`, `/uploads/**`, GET `/v1/builders/**`, GET `/v1/categories/**`, GET `/v1/materials/**`, GET `/v1/badges/**`, Swagger paths (only when `springdoc.swagger-ui.enabled=true`, i.e. dev)
- Role prefixes (each also allows ADMIN + SUPER_ADMIN): `/v1/client/**` CLIENT, `/v1/builder/**` BUILDER, `/v1/supplier/**` SUPPLIER, `/v1/supervisor/**` SUPERVISOR, `/v1/inspector/**` INSPECTOR, `/v1/support/**` SUPPORT_AGENT, `/v1/admin/**` ADMIN; `/v1/super-admin/**` SUPER_ADMIN only
- Everything else: `anyRequest().authenticated()` — **there are no other public endpoints** (e.g. GET `/v1/projects` is authenticated, NOT public)

### AuthController — `/v1/auth` (all public)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/register` | Register new user |
| POST | `/v1/auth/login` | Login with email/password |
| POST | `/v1/auth/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | Logout and invalidate tokens |
| POST | `/v1/auth/verify-email` | Verify email address |
| POST | `/v1/auth/forgot-password` | Request password reset |
| POST | `/v1/auth/reset-password` | Reset password with token |
| GET | `/v1/auth/me` | Get current user info |

### ProjectController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/client/projects` | Create project (CLIENT) |
| POST | `/v1/client/projects/{id}/publish` | Publish draft project (CLIENT) |
| GET | `/v1/client/projects` | Get client's projects, paginated (CLIENT) |
| GET | `/v1/client/projects/{id}` | Get project details for client (CLIENT) |
| POST | `/v1/client/projects/{projectId}/award/{bidId}` | Award project to bidder (CLIENT) |
| GET | `/v1/projects` | Search open projects / marketplace (authenticated — NOT public) |
| GET | `/v1/projects/{id}` | Get project details (authenticated — NOT public) |
| GET | `/v1/builder/projects` | Get builder's active projects (BUILDER) |
| POST | `/v1/projects/{id}/start` | Start a project (CLIENT/BUILDER) |
| POST | `/v1/projects/{id}/images` | Upload project image, multipart (owner/awarded builder enforced in service) |
| GET | `/v1/projects/{id}/images` | Get project images (authenticated) |
| DELETE | `/v1/projects/{projectId}/images/{attachmentId}` | Delete project image (owner enforced in service) |

### BidController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/builder/bids` | Create bid (BUILDER) |
| GET | `/v1/builder/bids` | Get builder's bids, paginated (BUILDER) |
| GET | `/v1/builder/bids/{id}` | Get bid details (BUILDER — see Known Issues: no ownership check in controller) |
| POST | `/v1/builder/bids/{id}/withdraw` | Withdraw bid (BUILDER) |
| GET | `/v1/projects/{projectId}/bids` | Get bids for project, list (authenticated) |
| GET | `/v1/projects/{projectId}/bids/paged` | Get bids for project, paginated (authenticated) |
| POST | `/v1/client/bids/{id}/shortlist` | Shortlist bid (CLIENT) — no frontend helper/UI calls this |

### MilestoneController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/projects/{projectId}/milestones` | Get project milestones (authenticated) |
| POST | `/v1/milestones/{id}/complete` | Mark milestone complete (BUILDER/ADMIN/SUPER_ADMIN) |
| POST | `/v1/milestones/{id}/approve` | Approve milestone (CLIENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/milestones/{id}/reject` | Reject milestone (CLIENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/milestones/{id}/updates` | Add milestone update (BUILDER/ADMIN/SUPER_ADMIN) |
| GET | `/v1/milestones/{id}/updates` | Get milestone updates (CLIENT/BUILDER/ADMIN/SUPER_ADMIN) |
| POST | `/v1/milestones/{id}/pay` | Client marks milestone paid, multipart proof required (CLIENT) — direct-payment model |
| POST | `/v1/milestones/{id}/confirm-payment` | Builder confirms receipt → CONFIRMED; project completes when all milestones PAID/CONFIRMED (BUILDER) |

### PaymentController — REMOVED 2026-07-17
The entire Payment/Invoice records subsystem was deleted (entities Payment/Invoice/EscrowAccount/EscrowTransaction, PaymentService, InvoiceService, PaymentController, `/v1/payments/**` endpoints — all 404 now). The milestone pay/confirm mechanic survives on MilestoneController (above). Tables dropped in V34. Marketplace COD order payments are unrelated (MaterialOrder inner PaymentStatus) and untouched. Subscription payments are Stripe-backed (see SubscriptionController) recorded in `subscription_payments` (V36).

### ContractController — `/v1/projects/{projectId}/contract`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/projects/{projectId}/contract` | Get project contract (CLIENT/BUILDER/ADMIN/SUPER_ADMIN) |
| POST | `/v1/projects/{projectId}/contract/sign` | Sign contract (CLIENT/BUILDER) |
| POST | `/v1/projects/{projectId}/contract/versions` | Create contract version (CLIENT/BUILDER) |
| GET | `/v1/projects/{projectId}/contract/versions` | Get contract version history (CLIENT/BUILDER/ADMIN/SUPER_ADMIN) |

### ChatController — `/v1/chat` (all REST endpoints authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/chat/rooms` | Get user's chat rooms |
| POST | `/v1/chat/rooms/direct/{userId}` | Get/create direct chat room |
| GET | `/v1/chat/rooms/{roomId}/messages` | Get room messages |
| POST | `/v1/chat/rooms/{roomId}/messages` | Send message |
| POST | `/v1/chat/rooms/{roomId}/read` | Mark messages as read |
| GET | `/v1/chat/unread-count` | Get unread message count |
| PUT | `/v1/chat/messages/{messageId}` | Edit message |
| DELETE | `/v1/chat/messages/{messageId}` | Delete message |
| WS | `/app/chat/{roomId}` | **NO-OP STUB** — sending happens via REST; WS is receive-only (`/topic/chat/{roomId}`) |
| WS | `/app/chat/{roomId}/typing` | Typing indicator → broadcasts to `/topic/chat/{roomId}/typing` |

### ReviewController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/projects/{projectId}/review` | Submit review (CLIENT) |
| GET | `/v1/builders/{builderId}/reviews` | Get builder's reviews (public — GET `/v1/builders/**` permitAll) |
| GET | `/v1/builder/reviews` | Get my reviews (BUILDER) |

### NotificationController — `/v1/notifications` (authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/notifications` | Get notifications (paginated) |
| GET | `/v1/notifications/unread-count` | Get unread count |
| POST | `/v1/notifications/{id}/read` | Mark as read (see Known Issues: no ownership check) |
| POST | `/v1/notifications/read-all` | Mark all as read |
| GET | `/v1/notifications/preferences` | Get notification preferences |
| PUT | `/v1/notifications/preferences` | Update notification preferences |

### AdminController — `/v1/admin` (ADMIN/SUPER_ADMIN)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/admin/metrics` | Dashboard metrics |
| GET | `/v1/admin/users` | Users list (with role/search filter) |
| GET | `/v1/admin/users/{id}` | User details |
| POST | `/v1/admin/verify-builder` | Verify a builder |
| POST | `/v1/admin/suspend-user` | Suspend user |
| POST | `/v1/admin/unsuspend-user` | Unsuspend user |
| GET | `/v1/admin/builders/pending` | Pending builder verifications (served by controller directly via BuilderProfileRepository, not AdminService) |
| GET | `/v1/admin/revenue-summary` | Revenue summary with trends |
| GET | `/v1/admin/audit-logs` | Audit logs (filtered) |
| GET | `/v1/admin/moderation-queue` | Reviews pending moderation |
| POST | `/v1/admin/reviews/{id}/moderate` | Moderate review (approve/reject) |
| GET | `/v1/admin/settings` | System settings |
| PUT | `/v1/admin/settings/{key}` | Update setting |

### UserController — `/v1/users` (authenticated)
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/v1/users/me` | Update profile |
| POST | `/v1/users/me/profile-image` | Upload profile image (multipart) |
| DELETE | `/v1/users/me/profile-image` | Remove profile image |
| POST | `/v1/users/me/change-password` | Change password |

### BuilderController — `/v1/builders` (public via GET `/v1/builders/**` permitAll)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/builders` | Search verified builders (filtered) |
| GET | `/v1/builders/{id}` | Get builder profile |

### BuilderProfileController — `/v1/builder/me` (BUILDER)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/builder/me/profile` | Get my builder profile |
| PUT | `/v1/builder/me/profile` | Update my builder profile |
| POST | `/v1/builder/me/banner-image` | Upload banner image |
| DELETE | `/v1/builder/me/banner-image` | Remove banner image |
| GET | `/v1/builder/me/analytics` | Get builder analytics |

### ChangeRequestController — `/v1/projects/{projectId}/change-requests` (authenticated; no @PreAuthorize — service-layer checks)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/projects/{projectId}/change-requests` | Submit change request |
| GET | `/v1/projects/{projectId}/change-requests` | Get change requests |
| POST | `/v1/projects/{projectId}/change-requests/{id}/approve` | Approve |
| POST | `/v1/projects/{projectId}/change-requests/{id}/reject` | Reject |

### LeadController — `/v1/builder/leads` (BUILDER)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/builder/leads/credits` | Get lead credit balance |
| GET | `/v1/builder/leads/transactions` | Get credit transaction history |

### SubscriptionController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/subscriptions/plans` | Available plans (authenticated — NOT public, despite code comment) |
| GET | `/v1/builder/subscription` | Current subscription (BUILDER) |
| POST | `/v1/builder/subscription/upgrade` | Upgrade tier (BUILDER) |

### BudgetEstimatorController — `/v1/budget-estimate` (authenticated)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/budget-estimate` | Get budget estimate |
| GET | `/v1/budget-estimate/cost-tables` | Get cost tables/options |

### CmsController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/public/pages/{slug}` | Get published page (public) |
| GET | `/v1/public/blog` | Get blog posts (public) |
| GET | `/v1/public/blog/{slug}` | Get blog post by slug (public) |
| GET | `/v1/admin/cms/pages` | List CMS pages (ADMIN) |
| POST | `/v1/admin/cms/pages` | Create CMS page (ADMIN) |
| PUT | `/v1/admin/cms/pages/{id}` | Update CMS page (ADMIN) |
| DELETE | `/v1/admin/cms/pages/{id}` | Delete CMS page (ADMIN) |
| GET | `/v1/admin/cms/blog` | List blog posts (ADMIN) |
| POST | `/v1/admin/cms/blog` | Create blog post (ADMIN) |
| PUT | `/v1/admin/cms/blog/{id}` | Update blog post (ADMIN) |
| DELETE | `/v1/admin/cms/blog/{id}` | Delete blog post (ADMIN) |
| GET | `/v1/admin/cms/email-templates` | List email templates (ADMIN) |
| PUT | `/v1/admin/cms/email-templates/{id}` | Update email template (ADMIN) |

### BadgeController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/badges` | List all active badges (public — GET `/v1/badges/**` permitAll) |
| GET | `/v1/users/{userId}/badges` | Get badges earned by a user (authenticated) |
| POST | `/v1/admin/badges/{badgeId}/award` | Award badge, body `{userId, notes?}` (ADMIN/SUPER_ADMIN) |
| DELETE | `/v1/admin/badges/{userId}/{badgeId}/revoke` | Revoke badge (ADMIN/SUPER_ADMIN) |

### DailyLogController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/projects/{projectId}/daily-logs` | Create daily log — one per supervisor+project+date (SUPERVISOR) |
| GET | `/v1/projects/{projectId}/daily-logs` | Get project daily logs, paginated; filters status/startDate/endDate (authenticated) |
| GET | `/v1/supervisor/daily-logs` | Get current supervisor's logs (SUPERVISOR) |
| GET | `/v1/daily-logs/{id}` | Get daily log (service allows: creator, project client, awarded builder, admins) |
| PUT | `/v1/daily-logs/{id}` | Update a DRAFT log (SUPERVISOR, creator only) |
| POST | `/v1/daily-logs/{id}/submit` | Submit draft for review (SUPERVISOR, creator only) |
| POST | `/v1/daily-logs/{id}/review` | Mark submitted log reviewed (CLIENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/daily-logs/{id}/approve` | Approve submitted/reviewed log (CLIENT/ADMIN/SUPER_ADMIN) |

Status flow: `DRAFT → SUBMITTED → REVIEWED → APPROVED`. Log numbers: `LOG-YYYY-NNNNN`.

### DisputeController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/projects/{projectId}/disputes` | File dispute (authenticated; optional milestoneId; cannot dispute self) |
| GET | `/v1/disputes` | Own disputes for users; all + filters for SUPPORT_AGENT/ADMIN/SUPER_ADMIN |
| GET | `/v1/disputes/{id}` | Get dispute (involved parties or support/admin) |
| POST | `/v1/disputes/{id}/assign-mediator` | Assign mediator, `{mediatorId?}` (omit = self-assign) (SUPPORT_AGENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/disputes/{id}/status` | Update status (SUPPORT_AGENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/disputes/{id}/resolve` | Resolve, `{resolutionType?, resolutionDetails?, resolutionAmount?}` (SUPPORT_AGENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/disputes/{id}/comments` | Add comment; `isInternal` honored only for support/admin |
| GET | `/v1/disputes/{id}/comments` | Get comments; internal notes hidden from non-support/admin |

Dispute numbers: `DSP-YYYY-NNNNN`.

### InspectionController — `/v1` (**NO @PreAuthorize on any endpoint** — see Known Issues)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/projects/{projectId}/inspections` | Request inspection (service checks: client/awarded builder/admin; inspector must have INSPECTOR role) |
| GET | `/v1/projects/{projectId}/inspections` | List project inspections (any authenticated user — no ownership check) |
| GET | `/v1/projects/{projectId}/inspections/paged` | Paginated project inspections (any authenticated user) |
| GET | `/v1/inspector/assignments` | Inspector's assignments, optional status filter (INSPECTOR via `/v1/inspector/**` URL rule) |
| GET | `/v1/inspections/{id}` | Get inspection detail (any authenticated user — no ownership check) |
| POST | `/v1/inspections/{id}/schedule` | Schedule date/time (service: assigned inspector or admin) |
| POST | `/v1/inspections/{id}/start` | Start inspection (service: assigned inspector only) |
| POST | `/v1/inspections/{id}/complete` | Complete with findings/rating/score/pass-fail (service: assigned inspector only) |
| POST | `/v1/inspections/{id}/cancel` | Cancel (service: requester, assigned inspector, or admin) |

Inspection numbers: `INS-YYYY-NNNNN`.

### MaterialController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/materials` | Browse materials; filters query/categoryId/supplierId (public — GET `/v1/materials/**` permitAll) |
| GET | `/v1/materials/{id}` | Get material detail (public) |
| GET | `/v1/supplier/materials` | Get supplier's own catalog (SUPPLIER) |
| POST | `/v1/supplier/materials` | Add material (SUPPLIER) |
| PUT | `/v1/supplier/materials/{id}` | Update own material (SUPPLIER, owner only) |
| DELETE | `/v1/supplier/materials/{id}` | Remove material — soft delete via `isAvailable=false` (SUPPLIER, owner only) |

### MaterialOrderController — `/v1`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/material-orders` | Create order; validates supplier role, material ownership/availability/min-qty (authenticated) |
| GET | `/v1/material-orders/{id}` | Get order (order owner, supplier, project client, or admin) |
| GET | `/v1/projects/{projectId}/material-orders` | Get project's orders (authenticated — no ownership check, see Known Issues) |
| GET | `/v1/supplier/orders` | Supplier's incoming orders, optional status filter (SUPPLIER) |
| POST | `/v1/material-orders/{id}/confirm` | Confirm PENDING_CONFIRMATION order (SUPPLIER, own order) |
| POST | `/v1/material-orders/{id}/status` | Update status `{status}` (owner/supplier/client/admin; no transition validation) |
| POST | `/v1/material-orders/{id}/deliveries` | Create delivery; moves order to OUT_FOR_DELIVERY (SUPPLIER, own order) |
| POST | `/v1/deliveries/{id}/status` | Update delivery status; all DELIVERED → order DELIVERED (order's supplier or admin) |

Order numbers: `ORD-YYYY-NNNNN`; deliveries: `DLV-YYYY-NNNNN`.

### SupportTicketController — `/v1/support/tickets`
> **BROKEN FOR REGULAR USERS**: SecurityConfig locks `/v1/support/**` to SUPPORT_AGENT/ADMIN/SUPER_ADMIN at URL level, so despite `isAuthenticated()` annotations, CLIENT/BUILDER/etc. get 403 on every endpoint — users cannot create or view their own tickets. See Known Issues.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/support/tickets` | Create ticket (intended: any authenticated user) |
| GET | `/v1/support/tickets` | Own tickets for users; all + filters for support/admin |
| GET | `/v1/support/tickets/{id}` | Get ticket (owner or support/admin) |
| POST | `/v1/support/tickets/{id}/assign` | Assign, `{assigneeId?}` (omit = self-assign) (SUPPORT_AGENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/support/tickets/{id}/status` | Update status (SUPPORT_AGENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/support/tickets/{id}/resolve` | Resolve, `{resolution?}` (SUPPORT_AGENT/ADMIN/SUPER_ADMIN) |
| POST | `/v1/support/tickets/{id}/reopen` | Reopen resolved/closed ticket (owner or support/admin) |
| POST | `/v1/support/tickets/{id}/responses` | Add response; `isInternal` support/admin-only; auto-flips WAITING_* status |
| GET | `/v1/support/tickets/{id}/responses` | Get responses; internal notes hidden from non-support/admin |

Ticket numbers: `TKT-YYYY-NNNNN`.

---

## Database Schema — Critical Notes

### Entity Base Class
`BaseEntity` provides `id` (Long, auto), `createdAt`, `updatedAt` via Spring Data Auditing.

### `updated_at` coverage (post-V25: 55 of 56 tables have it)
**Only one table now lacks `updated_at` — do NOT reference it in SQL there:**
- `user_badges` — also lacks `created_at`; safe (its entity does NOT extend `BaseEntity`)

`escrow_transactions` was the last gap and is fixed by **V25** (its entity extends `BaseEntity`, so the column is required). All other tables have `updated_at` (V19/V22/V23/V25 backfilled the stragglers).

### Chat Room Participants
Uses `role ENUM('OWNER','ADMIN','MEMBER','OBSERVER')`. JPA entity `ChatRoomParticipant` uses `ParticipantRole` enum (aligned with SQL).

---

## All ENUM Values (SQL)

### Project & Bid Statuses
- **projects.status**: `DRAFT`, `OPEN`, `BIDDING`, `AWARDED`, `CONTRACT_PENDING`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `CANCELLED`, `DISPUTED`
- **bids.status**: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`
- **milestones.status**: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `PAYMENT_PENDING`, `PAYMENT_RELEASED`, `DISPUTED`

### Contract & Payment
- **contracts.status**: `DRAFT`, `PENDING_CLIENT`, `PENDING_BUILDER`, `ACTIVE`, `COMPLETED`, `TERMINATED`, `DISPUTED`
- **payments.status**: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REFUNDED`, `CANCELLED`
- **payments.payment_type**: `ESCROW_FUND`, `MILESTONE_RELEASE`, `REFUND`, `SUBSCRIPTION`, `LEAD_CREDIT_PURCHASE`, `INSPECTION_FEE`, `PLATFORM_FEE`
- **payments.payment_method**: `MOCK`, `STRIPE`, `PAYPAL`, `BANK_TRANSFER`, `CASH` (all real payments are MOCK — no gateway integration exists)
- **invoices.status**: `DRAFT`, `SENT`, `VIEWED`, `PAID`, `OVERDUE`, `CANCELLED`, `REFUNDED`
- **invoices.invoice_type**: `PROJECT`, `SUBSCRIPTION`, `SERVICE`, `CREDIT_NOTE`

### Escrow
- **escrow_transactions.transaction_type**: `FUND`, `RELEASE`, `REFUND`, `HOLD`, `DISPUTE_HOLD`, `DISPUTE_RELEASE`, `FEE`, `ADJUSTMENT`
- **escrow_transactions.status**: `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`

### Chat
- **chat_rooms.room_type**: `PROJECT`, `BID`, `SUPPORT`, `DIRECT`, `GROUP`
- **chat_messages.message_type**: `TEXT`, `IMAGE`, `FILE`, `SYSTEM`, `MILESTONE_UPDATE`, `PAYMENT_NOTIFICATION`
- **chat_room_participants.role**: `OWNER`, `ADMIN`, `MEMBER`, `OBSERVER`

### Notifications
- **notification_type**: V21 converted the column from ENUM to VARCHAR(50) — all 18 Java `NotificationType` values supported including `BID_SHORTLISTED` (original 17 SQL values: `NEW_BID`, `BID_ACCEPTED`, `BID_REJECTED`, `PROJECT_AWARDED`, `MILESTONE_COMPLETED`, `MILESTONE_APPROVED`, `PAYMENT_RECEIVED`, `PAYMENT_RELEASED`, `NEW_MESSAGE`, `NEW_REVIEW`, `INSPECTION_SCHEDULED`, `INSPECTION_COMPLETED`, `DISPUTE_OPENED`, `DISPUTE_RESOLVED`, `ACCOUNT_VERIFIED`, `SUBSCRIPTION_EXPIRING`, `SYSTEM_ANNOUNCEMENT`)
- **priority**: `LOW`, `NORMAL`, `HIGH`, `URGENT`

### Inspections & Site Logs
- **inspections.inspection_type**: `PRE_CONSTRUCTION`, `FOUNDATION`, `FRAMING`, `ELECTRICAL`, `PLUMBING`, `MILESTONE_VERIFICATION`, `FINAL_INSPECTION`, `SAFETY_AUDIT`, `QUALITY_CHECK`
- **inspections.status**: `REQUESTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `PASSED`, `FAILED`, `CONDITIONAL_PASS`, `CANCELLED`, `RESCHEDULED`
- **inspections.overall_rating**: `EXCELLENT`, `GOOD`, `SATISFACTORY`, `NEEDS_IMPROVEMENT`, `UNSATISFACTORY`
- **daily_logs.weather**: `SUNNY`, `CLOUDY`, `RAINY`, `STORMY`, `SNOWY`, `WINDY`
- **daily_logs.status**: `DRAFT`, `SUBMITTED`, `REVIEWED`, `APPROVED`
- **daily_logs.safety_incidents**: `BOOLEAN` (TRUE/FALSE, not VARCHAR)
- **milestone_updates.update_type**: `PROGRESS`, `NOTE`, `ISSUE`, `PHOTO`, `COMPLETION_REQUEST`

### Supplier & Materials
- **material_orders.status**: `DRAFT`, `PENDING_CONFIRMATION`, `CONFIRMED`, `PROCESSING`, `READY_FOR_DELIVERY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `PARTIALLY_DELIVERED`, `CANCELLED`, `RETURNED`
- **material_orders.payment_status**: `PENDING`, `PARTIAL`, `PAID`, `REFUNDED`
- **material_order_items.status**: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`
- **deliveries.status**: `PREPARING`, `DISPATCHED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED_DELIVERY`, `RETURNED`
- **deliveries.delivery_method**: `SUPPLIER_DELIVERY`, `THIRD_PARTY`, `PICKUP`
- **quote_requests.status**: `DRAFT`, `SUBMITTED`, `QUOTED`, `ACCEPTED`, `REJECTED`, `EXPIRED`

### Reviews & Support
- **reviews.review_type**: `CLIENT_TO_BUILDER`, `BUILDER_TO_CLIENT`, `CLIENT_TO_SUPPLIER`, `BUILDER_TO_SUPPLIER`, `CLIENT_TO_INSPECTOR`, `CLIENT_TO_SUPERVISOR`, `MATERIAL_REVIEW`
- **reviews.status**: `PENDING`, `APPROVED`, `REJECTED`, `FLAGGED`, `HIDDEN`
- **support_tickets.category**: `ACCOUNT`, `BILLING`, `PROJECT`, `PAYMENT`, `TECHNICAL`, `DISPUTE`, `VERIFICATION`, `FEEDBACK`, `OTHER`
- **support_tickets.status**: `OPEN`, `IN_PROGRESS`, `WAITING_CUSTOMER`, `WAITING_INTERNAL`, `RESOLVED`, `CLOSED`, `REOPENED`
- **support_tickets.resolution_type**: `RESOLVED`, `DUPLICATE`, `WONT_FIX`, `INVALID`, `ESCALATED`
- **ticket_responses.response_type**: `REPLY`, `INTERNAL_NOTE`, `STATUS_CHANGE`, `ESCALATION`
- **disputes.dispute_type**: `PAYMENT`, `QUALITY`, `TIMELINE`, `SCOPE`, `COMMUNICATION`, `ABANDONMENT`, `OTHER`
- **disputes.status**: `FILED`, `UNDER_REVIEW`, `MEDIATION`, `AWAITING_RESPONSE`, `RESOLVED`, `ESCALATED`, `CLOSED`
- **disputes.resolution_type**: `FAVOR_FILER`, `FAVOR_RESPONDENT`, `MUTUAL_AGREEMENT`, `PARTIAL`, `DISMISSED`, `ESCALATED`
- **dispute_comments.comment_type**: `RESPONSE`, `EVIDENCE`, `MEDIATOR_NOTE`, `RESOLUTION_PROPOSAL`, `INTERNAL`

### Admin & System
- **audit_logs.action_category**: `AUTH`, `USER`, `PROJECT`, `BID`, `MILESTONE`, `PAYMENT`, `ESCROW`, `CHAT`, `REVIEW`, `ADMIN`, `SYSTEM`, `SECURITY`
- **audit_logs.status**: `SUCCESS`, `FAILURE`, `PARTIAL`
- **system_settings.setting_type**: `STRING`, `NUMBER`, `BOOLEAN`, `JSON`
- **announcements.announcement_type**: `INFO`, `WARNING`, `MAINTENANCE`, `PROMOTION`, `UPDATE`
- **announcements.display_position**: `TOP_BANNER`, `DASHBOARD`, `MODAL`, `SIDEBAR`
- **change_requests.change_type**: `SCOPE`, `BUDGET`, `TIMELINE`
- **change_requests.status**: `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`
- **cms_pages/blog_posts.status**: `DRAFT`, `PUBLISHED`, `ARCHIVED` — **VARCHAR(20) in SQL, not a SQL ENUM**; values enforced only by the Java enum

### Builder Profiles & Misc
- **availability_status**: `AVAILABLE`, `BUSY`, `ON_LEAVE`, `NOT_ACCEPTING`
- **subscription_tier**: `FREE`, `BASIC`, `PROFESSIONAL`, `ENTERPRISE`
- **subscription_plans.billing_cycle**: `MONTHLY`, `QUARTERLY`, `YEARLY`
- **lead_transactions.transaction_type**: `CREDIT`, `DEBIT`, `BONUS`, `REFUND`, `SUBSCRIPTION_RENEWAL`
- **project_attachments.attachment_type**: `REQUIREMENT`, `DESIGN`, `CONTRACT`, `PROGRESS`, `INSPECTION`, `OTHER`
- **project_tasks.status**: `TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`, `BLOCKED`; **.priority**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **badges.category**: `ACHIEVEMENT`, `VERIFICATION`, `MILESTONE`, `LOYALTY`, `SPECIAL`; **.criteria_type**: `AUTOMATIC`, `MANUAL`, `VERIFICATION`
- **user_devices.device_type**: `WEB`, `MOBILE`, `TABLET`, `DESKTOP`
- **email_logs.status**: `PENDING`, `SENT`, `DELIVERED`, `BOUNCED`, `FAILED`
- **builder_payouts.status**: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

---

## Backend Services (29 services)

| Service | Key Responsibilities |
|---------|---------------------|
| `AdminService` | getMetrics, getUsers, getUser, verifyBuilder, suspend/unsuspendUser, getRevenueSummary, getAuditLogs, getModerationQueue, moderateReview (`/admin/builders/pending` is served by AdminController directly via BuilderProfileRepository) |
| `AuditService` | logAction (3 overloads) |
| `AuthService` | register, login, refreshToken, logout, verifyEmail, forgotPassword, resetPassword; creates builder/supplier profiles on register; lockout logic (5 attempts → 15min, `noRollbackFor`) |
| `BadgeService` | getAllBadges, getUserBadges, awardBadge (admin, duplicate-guarded, audited), revokeBadge, checkAndAwardAutomaticBadges (codes: VERIFIED_EMAIL, FIRST_PROJECT, FIVE_PROJECTS) |
| `BidService` | createBid, getBid, getBuilderBids, getProjectBids (Page) + getProjectBidsList (List), withdrawBid, shortlistBid |
| `BudgetEstimatorService` | estimateBudget (rule-based), getTimelineEstimate, getCostTables |
| `ChangeRequestService` | submit, approve, reject, getByProject |
| `ChatService` | getOrCreateDirectRoom, getOrCreateProjectRoom, getUserRooms, getRoomMessages, sendMessage, markMessagesAsRead, getUnreadCount, editMessage, deleteMessage (WS broadcasts via afterCommit) |
| `CmsService` | CRUD for pages/blog posts; email templates (returns Map payloads, not typed DTOs) |
| `ContractService` | generateContract, signContract, getContractByProject, createVersion, getVersionHistory |
| `DailyLogService` | Supervisor site-diary workflow: createLog, updateLog, submitLog, reviewLog, approveLog, getLog, getProjectLogs, getSupervisorLogs (DRAFT→SUBMITTED→REVIEWED→APPROVED) |
| `DisputeService` | fileDispute, getDispute, getUserDisputes, getAllDisputes, assignMediator, updateStatus, resolveDispute, addComment, getComments (internal notes support/admin-only) |
| `EmailService` | sendVerificationEmail, sendPasswordResetEmail, sendProjectAwardedEmail, sendMilestoneCompletedEmail, sendPaymentReleasedEmail |
| `FileStorageService` | init, storeProfileImage, storeBannerImage, storeProjectImage, deleteImage, deleteProfileImage, deleteOldProfileImage |
| `InspectionService` | requestInspection, scheduleInspection, startInspection, completeInspection, cancelInspection, getInspection, getProjectInspections (List+Page), getInspectorAssignments(+ByStatus) |
| `InvoiceService` | generateMilestoneInvoice, getInvoicesForUser, getInvoice, getProjectInvoices, markAsPaid, markAsSent, generateInvoicePdf (iText 7) |
| `LeadService` | verifyLeadCredits, consumeLeadCredit, getLeadCreditBalance, getLeadTransactions, addLeadCredits |
| `MaterialOrderService` | createOrder, getOrder (access check), getProjectOrders, getSupplierOrders, confirmOrder, updateOrderStatus, createDelivery, updateDeliveryStatus |
| `MaterialService` | Supplier catalog: browseMaterials (public search), getMaterial, getSupplierCatalog, createMaterial, updateMaterial, deleteMaterial (soft, `isAvailable=false`) |
| `MilestoneService` | getProjectMilestones, completeMilestone, approveMilestone, rejectMilestone |
| `MilestoneUpdateService` | addUpdate, getUpdates |
| `NotificationPreferenceService` | getOrCreate, update |
| `NotificationService` | createNotification (broadcasts via private `broadcastNotification` in afterCommit using `convertAndSendToUser` → `/user/queue/notifications`), getUserNotifications, getUnreadNotifications, getUnreadCount, markAsRead/All, notifyNewBid, notifyBidAccepted/Rejected/Shortlisted, notifyProjectAwarded, notifyMilestoneCompleted/Approved, notifyPaymentReleased, notifyNewMessage, notifyNewReview |
| `PaymentService` | fundEscrow, getEscrowBalance, releasePayment, createPaymentRecord, getPaymentHistory, getProjectPayments |
| `ProjectService` | createProject (**creates milestones only**), publishProject, getProject, getClientProject(s), getBuilderProjects, getOpenProjects, awardProject (**creates escrow account on award, not creation**), startProject (activates first milestone) |
| `ReviewService` | createClientToBuilderReview, getBuilderReviews, getMyReviews, hasReviewed |
| `SubscriptionService` | getAvailablePlans, getSubscriptionDetails, upgradeTier |
| `SupportTicketService` | createTicket, getTicket, getUserTickets, getAllTickets, assignTicket, updateStatus, resolveTicket, reopenTicket, addResponse (auto WAITING_* status flip), getResponses |
| `SystemSettingService` | getSetting (2 overloads), getAllSettings, getPublicSettings, updateSetting, createSetting |

---

## Frontend Patterns

### API Service (services/api.ts) — 24 typed helper objects
- Base URL: `import.meta.env.VITE_API_URL || '/api'`
- Helpers: `authApi`, `projectApi`, `bidApi`, `milestoneApi`, `changeRequestApi`, `contractVersionApi`, `paymentApi`, `chatApi`, `reviewApi`, `notificationApi`, `contractApi`, `builderApi`, `leadApi`, `subscriptionApi`, `userApi`, `budgetApi`, `adminApi`, **`supportTicketApi`, `inspectionApi`, `dailyLogApi`, `disputeApi`, `materialApi`, `materialOrderApi`, `badgeApi`**
- Also exports `getApiErrorMessage(error, fallback)` and the default axios instance
- Backend endpoints with NO frontend helper/UI: bid shortlist, GET builder bid detail, paged project bids, project start

### React Query Keys (by domain — used for invalidation)
```
# Shared/layout
['notification-count'] ['notifications-preview'] ['notifications', tab, page]
['notification-preferences'] ['chat-unread-count'] ['chat-rooms'] ['chat-messages', roomId]
# Client
['client-projects', statusFilter, page] ['client-projects-all'] ['project', id]
['project-bids', id] ['project-milestones', id] ['project-contract', id]
['escrow-balance', id] ['project-images', id] ['payment-history', status, type, page]
['invoices', status, page] ['change-requests', projectId] ['milestone-updates', milestoneId]
# Builder
['builder-my-profile'] ['builder-bids', 'dashboard', {size:5}] ['builder-bids', statusFilter, page]
['builder-bids-check', projectId] ['builder-projects', 'dashboard', {size:5}]
['builder-active-projects'] ['builder-project', projectId] ['milestones', projectId]
['marketplace-projects', filters, page]  # staleTime 2min
['marketplace-project', id] ['builder-my-reviews'] ['builder-analytics']
['lead-credits-balance'] ['lead-transactions', page] ['my-subscription'] ['subscription-plans']
# Public
['builders', ...filters] ['builder', id] ['builder-detail', id] ['builder-reviews', userId]
# Admin
['admin-metrics'] ['admin-revenue'] ['admin-revenue-summary'] ['admin-users', role, search, page]
['pending-verifications'] ['admin-audit-logs', page, category, search] ['moderation-queue', tab, page]
['admin-settings'] ['admin-email-templates'] ['admin-cms-pages', page] ['admin-blog-posts', page]
# Supplier / Supervisor / Inspector / Support
['supplier-catalog'] ['supplier-orders', statusFilter]
['supervisor-daily-logs', status, from, to, page] ['project-daily-logs', projectId]
['inspector-assignments'] ['inspection', id]
['support-tickets', status, category, priority, page] ['support-ticket', id]
['support-ticket-responses', id] ['support-disputes', status, type] ['dispute-comments', id]
['support-tickets-dashboard'] ['support-disputes-dashboard']
```

### Auth Flow
- Tokens in `localStorage`: `accessToken`, `refreshToken`
- Axios request interceptor adds `Authorization: Bearer <token>`
- 401 → automatic refresh via `/v1/auth/refresh` behind a **module-level mutex** (single in-flight promise shared across parallel 401s); refresh 401/403 clears tokens + redirects `/login` (network errors do NOT clear tokens)
- Response interceptor also handles **429** — attaches `userMessage` from `Retry-After`
- `refreshAuth()` (AuthContext): refresh → dispatch `token-refreshed` event → GET `/v1/auth/me` → setUser. NOTE: the silent interceptor refresh does NOT dispatch `token-refreshed` (see Known Issues — stale WS token)
- AuthContext User: `{ id, email, name, role, profileImageUrl?, emailVerified, twoFactorEnabled, phone?, city?, address?, builderProfile? (Pick: leadCredits/averageRating/totalProjectsCompleted/totalEarnings/subscriptionTier/isVerified/companyName), supplierProfile? (Pick: isVerified/averageRating/companyName) }`
- Post-login redirect (getRedirectPath): `{role}/dashboard` for CLIENT/BUILDER/SUPPLIER/SUPERVISOR/INSPECTOR, `/admin/dashboard` for ADMIN/SUPER_ADMIN — **SUPPORT_AGENT missing → lands on `/`** (see Known Issues)

### WebSocket (useWebSocket hook)
- STOMP: tries native WebSocket first (`ws(s)://{host}/ws`), falls back to `new SockJS('/ws')` on pre-connect error
- Heartbeat: 10s incoming/outgoing
- Reconnect: `getBackoffDelay()` defines a 1s→30s exponential schedule, **but it never engages** — `reconnectDelay` is read once at Client construction (attempt=0), so effective reconnect is a constant 1s (see Known Issues)
- **Server rejects unauthenticated connections** (WebSocketAuthInterceptor throws on CONNECT; accepts `Authorization: Bearer`, bare Authorization, or `token` native header)
- Token re-sync: listens for same-tab `token-refreshed` AND cross-tab `storage` events → full reconnect
- Hook API: `{ connected, connectionError, subscribe(dest, cb), publish(dest, body) }`
- **Subscriptions actually in use** (server sends via `convertAndSendToUser` — NOT `/topic/notifications/{email}`):
  - `/user/queue/notifications` — DashboardLayout notification badge
  - `/user/queue/chat-updates` — DashboardLayout + Messages chat badge
  - `/topic/chat/{roomId}` (+ `/edit`, `/delete`, `/typing`) — Messages page
- HTTP polling fallback: `refetchInterval: 120000` on chat-unread-count, notification-count, chat-rooms

---

## Frontend Routes

All pages lazy-loaded; `ProtectedRoute`: unauthenticated → `/login`, wrong role → `/`. **No ComingSoon/placeholder routes remain — all 8 roles have real pages.**

### Public (no auth — wrapped in `ForceLightMode`, always light theme)
`/` Home, `/builders` BuilderSearch, `/builders/compare` BuilderComparison, `/builders/:id` BuilderDetail, `/login`, `/register`, `/forgot-password`

### Client (CLIENT)
`/client/dashboard`, `/client/projects/new` CreateProject, `/client/projects` MyProjects, `/client/projects/:id` ProjectDetails, `/client/payments` PaymentHistory, `/client/invoices` Invoices, `/client/messages`, `/client/notifications`, `/client/settings`

### Builder (BUILDER)
`/builder/dashboard`, `/builder/marketplace`, `/builder/marketplace/:id` MarketplaceProjectDetail, `/builder/bids` MyBids, `/builder/projects` ActiveProjects, `/builder/projects/:id` ProjectView, `/builder/reviews`, `/builder/analytics`, `/builder/leads` LeadManagement, `/builder/subscription`, `/builder/messages`, `/builder/notifications`, `/builder/settings`

### Admin (ADMIN/SUPER_ADMIN)
`/admin/dashboard`, `/admin/users`, `/admin/verifications`, `/admin/audit-logs`, `/admin/moderation`, `/admin/revenue`, `/admin/system-settings`, `/admin/cms-pages`, `/admin/blog`, `/admin/email-templates`, `/admin/notifications`, `/admin/settings`

### Supplier (SUPPLIER — real pages)
`/supplier/dashboard`, `/supplier/catalog` Catalog, `/supplier/orders` Orders, `/supplier/messages`, `/supplier/notifications`, `/supplier/settings`

### Supervisor (SUPERVISOR — real pages)
`/supervisor/dashboard`, `/supervisor/projects` ProjectLogs, `/supervisor/logs` DailyLogs, `/supervisor/messages`, `/supervisor/notifications`, `/supervisor/settings`

### Inspector (INSPECTOR — real pages)
`/inspector/dashboard`, `/inspector/assignments` Assignments, `/inspector/messages`, `/inspector/notifications`, `/inspector/settings`

### Support (SUPPORT_AGENT — real pages)
`/support/dashboard`, `/support/tickets` Tickets, `/support/tickets/:id` TicketDetail, `/support/disputes` Disputes, `/support/messages`, `/support/notifications`, `/support/settings`

### Catch-all
`*` → NotFound (wrapped in `ForceLightMode`)

---

## Flyway Migrations (V1–V28)
| Version | Actual contents |
|---------|-----------------|
| V1 | `users`, `user_devices`, `builder_profiles`, `supplier_profiles`, `supervisor_profiles`, `inspector_profiles` |
| V2 | `project_categories`, `projects`, `project_tasks`, `project_attachments`, `contracts` + seeds 12 categories |
| V3 | `bids`, `milestones`, `milestone_updates`, `bid_messages` |
| V4 | `escrow_accounts`, `escrow_transactions`, `payments`, `invoices`, `builder_payouts` |
| V5 | `chat_rooms`, `chat_room_participants`, `chat_messages`, `message_read_receipts`, `notifications`, `email_logs` |
| V6 | `inspections`, `inspection_checklist_templates`, `daily_logs`, `safety_checklists` + seeds 3 templates |
| V7 | `material_categories`, `materials`, `material_orders`, `material_order_items`, `deliveries`, `quote_requests` + seeds 12 material categories |
| V8 | `reviews`, `review_helpfulness`, `badges`, `user_badges`, `skill_endorsements` + seeds 17 badges |
| V9 | `support_tickets`, `ticket_responses`, `disputes`, `dispute_comments`, `audit_logs`, `system_settings`, `announcements` + seeds 9 settings |
| V10 | Seed: **15 users**, 4 builder + 2 supplier + 1 supervisor + 2 inspector profiles, 4 projects, 4 bids, 6 milestones, 1 escrow account, 6 materials, 2 reviews, 3 notifications, 8 user badges |
| V11 | Adds 7 columns to `builder_profiles` (primary_trade, secondary_trades, experience_per_trade, ntn_number, pec_number, team_members, service_area_radius); creates `subscription_plans` (+4 plans) and `lead_transactions` |
| V12 | `change_requests` |
| V13 | `contract_versions` |
| V14 | `cms_pages`, `blog_posts`, `email_templates` + seeds 5 templates (status cols VARCHAR(20), not ENUM) |
| V15 | 7 indexes on 4 tables: payments (3), escrow_transactions (1), audit_logs (2), notifications (1) |
| V16 | Comprehensive seed data (34 sections: contract, escrow txns, payments, invoices, chat, change requests, attachments, announcements, CMS, blog, settings, leads, reviews, notifications, inspection, daily logs, material orders, deliveries, tickets, dispute, audit logs...); leaves empty: user_devices, builder_payouts, review_helpfulness, message_read_receipts, bid_messages, project_tasks, email_logs |
| V17 | `notification_preferences` + seeds defaults for all users |
| V18 | Adds `banner_image_url` to `builder_profiles` (header comment wrongly says "V17") |
| V19 | Adds `updated_at` to `project_attachments` |
| V20 | Adds `workers_absent` to `daily_logs` |
| V21 | Converts `notifications.notification_type` ENUM → VARCHAR(50) (BID_SHORTLISTED support) |
| V22 | Adds `updated_at` to `notifications` **and `chat_messages`** |
| V23 | Account lockout columns on users (`failed_login_attempts`, `account_locked_until`) + `updated_at` to 16 tables (**skips escrow_transactions — open bug**) |
| V24 | FK indexes: `projects.supervisor_id`, `chat_room_participants.last_read_message_id`, `users.account_locked_until` |
| V25 | Adds `updated_at` to `escrow_transactions` (fixes the entity/schema mismatch — see Resolved #1) |
| V26 | Adds `project_type`, `area_sq_ft`, `estimated_budget_from_tool` to `projects` (wizard fields that were collected but dropped — now persisted) |
| V27 | Adds the 14 create-wizard columns to `projects` (property_type, province, location_area, area_value, area_unit, floors, rooms, units, materials_provided_by, budget_type DEFAULT 'FIXED_RANGE', structure_condition, preferred_start_date, requires_supervisor, verified_builders_only); **re-seeds `project_categories`** to the 8-nature taxonomy (New Construction / Renovation / Repair / Extension-Addition / Demolition / Interior Finishing / Maintenance / Fit-out) and remaps the V10 seed projects onto it |
| V28 | Seed: the *pending* work V10/V16 never created, so supplier/inspector/supervisor actions are demoable — `MO-2026-00004`/`MO-2026-00005` PENDING_CONFIRMATION orders (+4 items), `INS-2026-00002` REQUESTED / `INS-2026-00003` SCHEDULED (inspector1) / `INS-2026-00004` REQUESTED (inspector2), `DL-2026-00003` DRAFT (supervisor1) |

---

## Backend Configuration

### application.yml (Base — `spring.profiles.active: dev` is the DEFAULT)
```yaml
server.port: 8080
server.servlet.context-path: /api
server.max-http-request-header-size: 48KB
server.tomcat.connection-timeout: 20000
server.error.include-message: always        # also in prod — exception messages exposed (see Known Issues)
spring.data.web.pageable: max-page-size 100, default-page-size 20
spring.servlet.multipart: max 10MB (file + request)
spring.datasource: ${DB_URL:jdbc:mysql://localhost:3306/builderconnect...}  # DB_URL HAS a localhost default
                   ${DB_USERNAME}, ${DB_PASSWORD}                           # NO defaults
spring.mail: localhost:1025 (mock SMTP)
jwt.secret: ${JWT_SECRET}                    # NO default — startup fails if missing or < 32 bytes
jwt.access-token-expiration: 1800000         # 30 min
jwt.refresh-token-expiration: 604800000      # 7 days
jwt.issuer: BuilderConnect
app.platform: fee-percentage 5.0, min-bid 1000, max-bid 50000000, default-lead-credits 5,
              bid-validity-days 30, escrow-release-delay-hours 24
app.rate-limit: auth-requests-per-minute 10, general-requests-per-minute 100
app.cors.allowed-origins: YAML list          # BROKEN — @Value can't bind YAML lists, defaults always apply
```

### application-dev.yml (active by default)
```yaml
spring.datasource: H2 in-memory (jdbc:h2:mem:builderconnect;...;MODE=MySQL, sa/blank)
spring.jpa: ddl-auto none (Flyway creates schema), show-sql true
spring.h2.console: enabled at /api/h2-console
spring.flyway.enabled: true                  # (file comment claims disabled — stale, Flyway DOES run)
jwt.secret: DevOnlySecret... (committed dev-only default)
app.cors.allowed-origins: localhost:3000/5173/5174 (YAML list — same binding caveat)
```

### application-prod.yml (activate with SPRING_PROFILES_ACTIVE=prod)
```yaml
springdoc: api-docs AND swagger-ui disabled
logging: root WARN, com.builderconnect INFO, hibernate SQL OFF
spring.h2.console.enabled: false
hikari max-pool 20
app.cors.allowed-origins: https://builderconnect.pk + www  # silently IGNORED — see Known Issues
```

### Config Classes (8)
| Class | Purpose |
|-------|---------|
| `SecurityConfig` | CSRF disabled, stateless, BCrypt(10), HSTS + X-Frame-Options SAMEORIGIN + X-Content-Type-Options, `@EnableMethodSecurity`; registers RateLimitFilter AND JwtAuthenticationFilter before UsernamePasswordAuthenticationFilter; URL role rules for all 8 role prefixes (see API Endpoints preamble); swagger paths permitted only when `springdoc.swagger-ui.enabled=true` |
| `RateLimitFilter` | Per-IP two-tier fixed-window limiter: AUTH tier 10/min (login/register/forgot/reset — one shared bucket per IP), GENERAL 100/min; 429 + `Retry-After` + JSON body; exempt: /ws, /uploads, /swagger-ui, /v3/api-docs, /h2-console, /error; IP from X-Forwarded-For (unvalidated — spoofable); daemon evicts stale counters every 5 min |
| `CorsConfig` | CORS via `@Value` on `app.cors.allowed-origins` (localhost defaults); exposes Authorization, Content-Disposition, X-Total-Count, X-Page-Number, X-Page-Size |
| `WebSocketConfig` | STOMP `/ws` registered twice (SockJS + native), broker `/topic` + `/queue`, app `/app`, user `/user`; origins via same broken `@Value` (its default omits :5174) |
| `WebSocketAuthInterceptor` | JWT from STOMP CONNECT headers — **rejects** unauthenticated; sets user principal from userId claim |
| `OpenApiConfig` | `@Profile("dev")` only — Swagger with JWT scheme at `/api/swagger-ui.html` |
| `WebMvcConfig` | Serves `/uploads/**` from `./uploads/` (cache 3600s); Pageable resolver max 100 / default 20 |
| `DevDataLoader` | `@Profile("dev")` — re-encodes ALL user passwords to BCrypt of `"password"` on every startup (resets any password changed at runtime) |

### Deployment
- **No Docker / containers** (Dockerfiles were removed 2026-07-13 to keep the stack simple). Run the backend with `mvn spring-boot:run` (or `java -jar` on the packaged jar) and build the frontend with `npx vite build`, serving the `dist/` output from any static host.
- **Set `SPRING_PROFILES_ACTIVE=prod` for any non-local deployment** — base `application.yml` defaults to the `dev` profile (H2 + committed dev JWT secret), so a jar run without this env var silently comes up in dev mode. See Known Issue #5.
- Env templates are split per app (no root .env — nothing loads one): `backend/.env.example` (JWT_SECRET, DB creds, SPRING_PROFILES_ACTIVE, FRONTEND_URL, MAIL_*, STRIPE_*) and `frontend/.env.example` (VITE_API_URL, VITE_STRIPE_PUBLISHABLE_KEY)
- No CI pipeline.

---

## Known Issues (Verified 2026-07-12)

Bugs confirmed against source during the 2026-07-12 audit. **The five High items were fixed 2026-07-13** (see "Resolved" below). **Medium #6/#10/#11/#12/#13 and Low #22 were fixed by 2026-07-18** (marked ✅ inline); the remaining Medium/Low items are still open.

### High — RESOLVED 2026-07-13
1. ✅ **`escrow_transactions` missing `updated_at`** — fixed by **V25 migration** (`V25__add_escrow_transactions_updated_at.sql`) adding the column so the schema matches `EscrowTransaction extends BaseEntity`; escrow funding/release inserts and prod schema validation now succeed.
2. ✅ **Support tickets unreachable for regular users** — the blanket `/v1/support/**` rule was **removed from SecurityConfig**; each SupportTicketController endpoint is now governed by its own `@PreAuthorize` (users manage their own tickets via `isAuthenticated()`, agents/admins via role checks).
3. ✅ **Prod CORS/WS origins silently ignored** — `app.cors.allowed-origins` changed to a **comma-separated scalar** in all three ymls (so `@Value` binds it), and `WebSocketConfig`'s default now includes `:5174`. Prod origins now apply.
4. ✅ **`InspectionController` read authz** — `InspectionService.getInspection`/`getProjectInspections` now enforce access (project client, awarded builder, assigned inspector/requester, or admin), and the controller threads the authenticated user through.
5. ✅ **Docker removed** — both Dockerfiles were deleted (stack simplified). The residual real risk — base yml defaults to the `dev` profile — is now documented under Deployment: **set `SPRING_PROFILES_ACTIVE=prod` for any non-local run** or the app comes up with H2 + the committed dev secret.

**Post-award pipeline wired + client flow made workable 2026-07-15 (verified end-to-end, 28/28 live-server assertions):**
- ✅ **The whole post-award money/lifecycle pipeline now runs.** `awardProject` auto-generates a default 30/40/30 milestone schedule from the awarded budget when the project has none (so escrow is always releasable); `fundEscrow` and `releasePayment` now create `Payment` records (Payment History reflects real activity); `releasePayment` generates a milestone `Invoice`, notifies + emails the builder, marks the milestone paid via `milestone.releasePayment(txId)`, **starts the next milestone**, and **completes the project** when all milestones are paid (so the review flow and the Dashboard "Completed" stat finally work). Previously all of these methods were dead code.
- ✅ **Invoice IDOR closed** — `getInvoice`/`generateInvoicePdf` now take the user and enforce ownership (issuedTo or admin).
- ✅ **Real invoice PDFs** via iText 7 (was plain text mislabeled `application/pdf`).
- ✅ **Invoice/payment numbering fixed** — `getNextInvoiceNumber`/`getNextPaymentReference` no longer `CAST(SUBSTRING(...))` (crashed on H2 for seeded `INV-2026-*`); now derive from the numeric PK.
- ✅ **Double-release race fixed** — `releasePayment` pessimistically locks the milestone row (`MilestoneRepository.findByIdForUpdate`).
- ✅ **`awardProject` escrow creation is idempotent** (a project that already has an escrow account, e.g. seed data, no longer 500s on award).
- ✅ **`IllegalStateException` → 409** in GlobalExceptionHandler (milestone state conflicts were raw 500s).
- ✅ **Client frontend usability**: Award button now shows for OPEN/BIDDING + SUBMITTED/UNDER_REVIEW/SHORTLISTED (was BIDDING+SUBMITTED only, hiding seed projects) with a confirm dialog; all client mutations surface the real backend message via `getApiErrorMessage` (was generic toasts); award/publish/sign/release/fund now invalidate `client-projects` / `client-projects-all` / `payment-history` / `invoices` (fixes 5-min stale lists); CreateProject invalidates the lists, routes to the project page, and its toast says the project is a draft to publish; `CreateReviewRequest` TS type aligned to backend `ReviewRequest` (removed the last client-page tsc error).

**Also fixed 2026-07-13 (found during use, not in the original audit):**
- ✅ **Login with a non-existent email returned HTTP 500 instead of 401.** `UserDetailsServiceImpl.loadUserByUsername` threw `UsernameNotFoundException` inside its `@Transactional(readOnly=true)` proxy, which — because it *joins* `AuthService.login`'s transaction — marked that transaction rollback-only; login then caught the wrapped exception and threw `UnauthorizedException` (declared `noRollbackFor`), so Spring tried to commit a rollback-only tx → `UnexpectedRollbackException` → 500. Fixed by adding `noRollbackFor = UsernameNotFoundException.class` to `loadUserByUsername`/`loadUserById`. A wrong *password* was never affected (the user exists, so `loadUserByUsername` returns normally). Verified: bad email → 401, valid → 200, wrong password → 401.

### Medium — security / correctness
6. ✅ **IDOR: notification mark-as-read** — RESOLVED 2026-07-18: `markAsRead(notificationId, userId)` runs an owner-scoped update; 0 rows affected → 404 (does not reveal whether the notification exists).
7. **IDOR: `GET /v1/builder/bids/{id}`** — neither `BidController.getBuilderBid` nor `BidService.getBid` (bare `findById`) checks ownership; any BUILDER can read any other builder's bid (amount, proposal). Confirmed.
8. **`MaterialOrderService.getProjectOrders` — no access check** — any authenticated user can list any project's material orders (incl. delivery addresses). (Inspection project-list access was fixed with #4; material orders still open.)
9. **Order/dispute/ticket status updates lack state-transition validation** — any allowed party can set any status (e.g. CANCELLED→CONFIRMED).
10. ✅ **RateLimitFilter trusts X-Forwarded-For unconditionally** — RESOLVED 2026-07-18: the header is honored only when the direct peer is in `app.rate-limit.trusted-proxies` (default loopback); all other connections are keyed by socket address, so remote clients cannot rotate identities.
11. ✅ **WebSocket backoff never engages** — RESOLVED 2026-07-18: `useWebSocket` reassigns `client.reconnectDelay = getBackoffDelay(attempt)` in onDisconnect/onWebSocketError and resets to 1s on connect, so the 1s→30s exponential schedule actually applies.
12. ✅ **Silent token refresh leaves WS stale** — RESOLVED 2026-07-18: the interceptor refresh (now in `services/apiClient.ts`) dispatches `token-refreshed`, so the STOMP client reconnects with the fresh token.
13. ✅ **SUPPORT_AGENT post-login redirect missing** — RESOLVED: `getRedirectPath()` has a `SUPPORT_AGENT` case → `/support/dashboard`.
14. **JWT algorithm environment-dependent** — jjwt auto-selects HS256/384/512 from secret length; pin explicitly if HS512 is the guarantee.
15. **Non-atomic entity-number generation** — `findMaxId()+1` pattern in DailyLog/Dispute/SupportTicket/MaterialOrder services can duplicate LOG-/DSP-/TKT-/ORD- numbers under concurrency.

### Low — hygiene
16. `server.error.include-message: always` not overridden in prod (leaks exception messages).
17. Role-rule mismatches: URL rules grant ADMIN access to `/v1/supervisor/**`/`/v1/supplier/**` but method `@PreAuthorize hasRole('SUPERVISOR'/'SUPPLIER')` blocks admins.
18. `BadgeController.awardBadge` parses raw Map — missing `userId` → NPE 500 instead of 400.
19. Dead code: `pages/shared/ComingSoon.tsx` (unimported), empty `components/{admin,builder,chat,forms}/` dirs, empty `scripts/` dir, empty backend `websocket/` package, no-op WS handler `/app/chat/{roomId}`.
20. 14 pre-existing TS errors in 12 page files (PageResponse<T> vs T[] unions, local interfaces vs shared types) — `npm run build` fails, `npx vite build` works.
21. `frontend/src/pages/inspector/Assignments.tsx` at 799 lines (project cap 800); `supervisor/DailyLogs.tsx` at 751.
22. ✅ RESOLVED: the V16 seed copy for terms/FAQ/about was rewritten (no fee claim — no platform fee exists at all post-V34/V40) and the V10 "shortlisted" notification text was fixed.
23. Zero frontend test files despite full Vitest setup; backend has only 6 test classes / 36 tests.

---

## Common Pitfalls
1. **H2 ENUM strictness**: Must use exact string values — H2 is stricter than MySQL with enum values
2. **Seed data conflicts**: V10/V14/V16 already seed email_templates, system_settings, and many other tables — use `INSERT IGNORE` or check for duplicates
3. **H2 date functions**: Use `DATEADD('DAY', -N, NOW())` not MySQL `DATE_SUB`
4. **Currency**: All monetary values in PKR (Pakistani Rupees), `DECIMAL(15,2)`
5. **Soft deletes**: Users and Projects use `deleted` + `deletedAt` fields — always use `*AndDeletedFalse` repository methods
6. **Vite duplicate React**: If hooks fail with "Invalid hook call", clear `node_modules/.vite` and restart (vite.config.ts already has `resolve.dedupe`)
7. **`user_badges` has no `updated_at`** — never reference it in SQL for that table (every other table has it; `escrow_transactions` was fixed by V25)
7b. **Seed entity numbers ≠ service-generated ones**: the SQL seeds use `DL-2026-…` for daily logs and `MO-2026-…` for material orders, while `DailyLogService`/`MaterialOrderService` generate `LOG-`/`ORD-`. Both prefixes coexist at runtime. Match the seed prefix when adding seed rows. Also: `materials` columns are `minimum_order_quantity` and `is_in_stock` (there is no `min_order_quantity`/`is_available`), and `daily_logs` has UNIQUE `(project_id, supervisor_id, log_date)` — V16 already used day offsets −10 and −5 for project 4 / supervisor1.
8. **Context path**: Backend serves under `/api` — all API calls go to `http://localhost:8080/api/v1/...`; WebSocket at `/api/ws` (vite rewrites `/ws` → `/api/ws`)
9. **JSON array fields**: `specializations`, `skills`, `serviceAreas`, `requiredSkills` are stored as JSON strings — use `parseJsonArray()` from `@/lib/utils` (unwraps up to 5 encoding layers)
10. **No default secrets**: base `application.yml` requires `JWT_SECRET`, `DB_USERNAME`, `DB_PASSWORD` env vars (DB_URL has a localhost default); dev profile supplies dev defaults
11. **Account lockout**: 5 failed logins → 15-minute lockout; login uses `noRollbackFor` to persist the counter even when throwing
12. **Pagination max**: `max-page-size: 100` (yml + WebMvcConfig) — clients cannot request more than 100 items/page
13. **Production build strips console + debugger**: `esbuild.drop` in vite.config.ts
14. **Use `npx vite build`, not `npm run build`** — the npm script runs `tsc &&` first and fails on the 14 pre-existing TS errors
15. **Rate limiting in dev**: hammering auth endpoints (e.g. scripted logins) hits the 10/min per-IP limit → 429; general API limit is 100/min per IP
16. **DevDataLoader resets ALL passwords** to "password" on every dev restart — including users registered or password-changed at runtime
17. **Swagger is dev-only**: `OpenApiConfig` is `@Profile("dev")` and prod yml disables springdoc entirely
18. **URL rules run before `@PreAuthorize`** — a controller under `/v1/support/**` etc. is gated by SecurityConfig first; method annotations can't widen access

---

## Other Documentation Map

| Doc | Status (2026-07-12 audit) |
|-----|---------------------------|
| `docs/00-project-overview.md` … `06-coding-standards.md` | Code-extracted suite (2026-03-30) — most accurate docs; 02/04/05 fully valid; 00/01/03/06 need light updates (rate limiting, Dockerfiles, test count, rebrand) |
| `docs/04-api-contracts.md` | Authoritative full endpoint catalog (~110 endpoints, 25 controllers) |
| `docs/DIAGRAMS.md` | Mermaid diagrams — mostly current, but header counts stale (says 17 controllers/26 repos) |
| `README.md` | Entry point — had stale password/migrations/endpoints (partially corrected 2026-07-12) |
| `PROJECT_STRUCTURE.md` | OBSOLETE pre-implementation plan (Feb 2026) — >50% wrong; do not trust |
| `SYSTEM_DIAGRAM.md` | Stale (Mar 1) — counts and "ComingSoon" claims wrong |
| `docs/FYP_REPORT.md`, `FYP_PRESENTATION_NOTES.md` | Academic docs — contain aspirational claims (Stripe/PayPal, OAuth, 150+ endpoints, 70% coverage) that do NOT match the code |
