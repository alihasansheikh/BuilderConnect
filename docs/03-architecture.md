# Architecture (Extracted from Code)

> Describes ACTUAL implementation patterns found in code. Not idealized architecture.

---

## Architecture Style

**Monolithic full-stack application** with clear frontend/backend separation. No microservices, message queues, or containerization.

> For full tech stack with versions, see [00-project-overview.md](00-project-overview.md#tech-stack).

---

## Module Structure

### Backend Package Layout

```
com.builderconnect/
├── config/          (7 files)  — Spring configuration beans
├── controller/      (25 files) — REST API endpoints
├── dto/
│   ├── request/     (29 files) — Incoming request validation
│   └── response/    (31 files) — Outgoing response shaping
├── entity/          (43 files) — JPA entities (database models)
├── enums/           (10 files) — Status/type enumerations
├── exception/       (4 files)  — Custom exceptions + global handler
├── repository/      (41 files) — Spring Data JPA repositories
├── security/        (3 files)  — JWT filter, token provider, user details
├── service/         (30 files) — Business logic
├── util/            (1 file)   — SecurityUtils (suspension validation)
└── websocket/       (0 files)  — Empty; WS logic in config/ + controller/
```

**Total backend Java classes: ~244**

### Frontend Directory Layout

```
frontend/src/
├── components/      (18 files) — Reusable UI components
│   ├── layout/      (2)        — DashboardLayout, NotificationDropdown
│   ├── project/     (4)        — BidFormModal, MilestoneTimeline, BudgetChart, ChangeRequestForm
│   └── ui/          (11)       — StatCard, Skeleton, DataTable, StatusBadge, etc.
├── contexts/        (2 files)  — AuthContext, ThemeContext
├── hooks/           (2 files)  — useWebSocket, useIntersectionObserver
├── lib/             (3 files)  — utils, formatters, status-colors
├── pages/           (48 files) — Route-level page components (by role)
├── services/        (1 file)   — api.ts (Axios instance + typed helpers)
└── types/           (1 file)   — index.ts (all TypeScript interfaces)
```

**Total frontend files: ~75**

---

## Request Flow

### Intended Pattern (Controller → Service → Repository)

```
HTTP Request
  → JwtAuthenticationFilter (extracts + validates JWT)
  → SecurityConfig (URL-level role check)
  → Controller (@PreAuthorize method-level check)
    → Service (@Transactional business logic)
      → Repository (Spring Data JPA query)
      → AuditService.logAction() (@Async, non-blocking)
      → NotificationService (WebSocket broadcast)
      → EmailService (@Async, non-blocking)
    ← Response DTO
  ← ResponseEntity<DTO>
```

### Actual Implementation (Varies by Controller)

**Clean pattern (PaymentController, ChatController, ReviewController):**
```
Controller → Service only → Repository
         (no direct repo access)
```

**Mixed pattern (ProjectController, AdminController):**
```
Controller → Service (for some methods)
         → Repository directly (for image upload, pending verifications)
         → Manual auth logic (ownership checks in controller)
         → Manual DTO mapping (entity → Map in controller)
```

| Controller | Injects Services Only? | Direct Repo Access? | Manual Auth Logic? |
|-----------|----------------------|--------------------|--------------------|
| PaymentController | YES | No | No |
| ChatController | YES | No | No |
| ReviewController | YES | No | No |
| BidController | YES | No | No |
| MilestoneController | YES | No | No |
| **ProjectController** | **NO** | **Yes** (ProjectRepo, AttachmentRepo) | **Yes** (ownership checks) |
| **AdminController** | **NO** | **Yes** (BuilderProfileRepo) | **Yes** (map parsing) |
| UserController | Mostly | Minor | Minor |

---

## Authentication Flow

### JWT Token Lifecycle

```
1. Login: POST /v1/auth/login
   ├─ AuthenticationManager.authenticate(email, password)
   ├─ Account lockout check (5 attempts → 15min lock)
   ├─ Suspension check
   ├─ Generate access token (30min, claims: userId, email, role, name)
   ├─ Generate refresh token (7 days, claims: subject only)
   ├─ Store refresh token in User entity
   └─ Return AuthResponse {accessToken, refreshToken, user}

2. Authenticated Request:
   ├─ JwtAuthenticationFilter.doFilterInternal()
   │   ├─ Extract "Bearer " token from Authorization header
   │   ├─ Validate signature + expiration
   │   ├─ Load UserDetails by email from token
   │   ├─ Set SecurityContext authentication
   │   └─ Continue filter chain
   ├─ SecurityConfig URL matching (role-based)
   └─ @PreAuthorize method-level check (if present)

3. Token Refresh: POST /v1/auth/refresh
   ├─ Validate refresh token signature
   ├─ Find user by ID from token
   ├─ Verify stored refresh token matches
   ├─ Check refresh token not expired
   ├─ Generate new access + refresh tokens
   └─ Return AuthResponse

4. Logout: POST /v1/auth/logout
   └─ Clear refresh token from User entity
      (access token remains valid until expiry — no blacklist)
```

### Token Claims

| Claim | Access Token | Refresh Token |
|-------|-------------|---------------|
| sub | userId | userId |
| email | yes | no |
| role | yes | no |
| name | yes | no |
| iss | "BuilderConnect" | "BuilderConnect" |
| type | — | "refresh" |
| exp | +30 minutes | +7 days |

**Key Implementation Detail:** `User` entity directly implements `UserDetails` — no separate adapter. `isAccountNonLocked()` checks both `suspended` and `accountLockedUntil`.

> For full account lockout rules (attempts, duration, persistence), see [01-product-requirements.md](01-product-requirements.md#f1-authentication--account-management).

---

## Data Flow

### Frontend → Backend

```
React Component
  → useQuery/useMutation (React Query v5)
    → api.ts helper (typed Axios call)
      → Axios request interceptor (adds Bearer token)
        → Vite dev proxy (/api → localhost:8080)
          → Spring Boot
```

### Backend → Frontend (Real-time)

```
Service (state change)
  → NotificationService.createNotification()
    → Save to DB
    → SimpMessagingTemplate.convertAndSend()
      → STOMP broker (/topic/notifications/{email})
        → SockJS/WebSocket
          → useWebSocket hook (React)
            → queryClient.invalidateQueries()
```

### Token Refresh Flow (Frontend)

```
API call returns 401
  → Axios response interceptor
    → refreshPromise mutex (prevents parallel refreshes)
      → POST /v1/auth/refresh
        → New tokens stored in localStorage
        → Original request retried with new token
    → On refresh failure (401/403):
        → Clear localStorage
        → Redirect to /login
    → On network error:
        → Don't redirect (might be transient)
```

---

## External Integrations

| System | Implementation | Status |
|--------|---------------|--------|
| **SMTP Email** | Spring JavaMailSender | MOCK — `localhost:1025`, methods log only |
| **WebSocket** | Spring STOMP + SockJS | ACTIVE |
| **File Storage** | Local filesystem (`./uploads/`) | ACTIVE — no S3 |
| **Payment Gateway** | None | MOCK only |
| **SMS/Push, Search, CDN, Monitoring, CI/CD** | None | NOT IMPLEMENTED |

> For full scope assessment (implemented vs missing features), see [00-project-overview.md](00-project-overview.md#system-scope).

---

## Cross-Cutting Concerns

### Logging

| Layer | Pattern | Source |
|-------|---------|--------|
| **Controllers** | No explicit logging | — |
| **Services** | `log.info()` on state changes, `log.warn()` on failures | Lombok `@Slf4j` |
| **AuditService** | Async JDBC INSERT to `audit_logs` table | `@Async` + `JdbcTemplate` |
| **JWT Filter** | Silent exception catch (log + continue) | `JwtAuthenticationFilter:65-67` |
| **Production** | Console drops via `esbuild: { drop: ['console'] }` | `vite.config.ts` |

**Inconsistency:** AuditService uses raw `JdbcTemplate` SQL while everything else uses Spring Data JPA. This is intentional (async audit shouldn't participate in calling transaction) but architecturally inconsistent.

### Error Handling

**Backend (GlobalExceptionHandler):**

| Exception | HTTP Status | Response |
|-----------|------------|----------|
| ResourceNotFoundException | 404 | `{timestamp, status, error, message, path}` |
| BadRequestException | 400 | Same envelope |
| UnauthorizedException | 401 | Same envelope |
| AccessDeniedException | 403 | Same envelope |
| BadCredentialsException | 401 | Generic message (no credential leaking) |
| MethodArgumentNotValidException | 400 | Envelope + `validationErrors` map |
| MaxUploadSizeExceededException | 400 | Hardcoded "10MB" message |
| Exception (catch-all) | 500 | Generic "An unexpected error occurred" |

**Frontend (ErrorBoundary):**
- React class component wrapping entire app
- Shows fallback UI with "Go to Home" button
- Dev mode: shows error stack trace
- Production: generic error message

**Frontend (API layer):**
- Axios interceptor handles 401 → token refresh
- Axios interceptor handles 429 → rate limit user message
- `getApiErrorMessage()` helper extracts `error.response.data.message`
- Individual components use `toast.error()` from Sonner

### Transactions

| Pattern | Usage | Example |
|---------|-------|---------|
| `@Transactional` | Write operations | All create/update service methods |
| `@Transactional(readOnly = true)` | Read operations | Query/list service methods |
| `@Transactional(noRollbackFor = UnauthorizedException.class)` | Login (persist counter on failure) | `AuthService.login()` |
| `@Lock(PESSIMISTIC_WRITE)` | Concurrent financial ops | EscrowAccount, BuilderProfile repos |
| `@Async` | Non-blocking side effects | AuditService, EmailService |

**No explicit isolation level overrides** — defaults to DB default (REPEATABLE READ for MySQL, READ COMMITTED for H2).

---

## Violations

### Layer Breaking

| Violation | File | Lines | Description |
|-----------|------|-------|-------------|
| Controller → Repository | `ProjectController.java` | 45-46 | Injects `ProjectRepository` + `ProjectAttachmentRepository` directly |
| Controller → Repository | `AdminController.java` | 41 | Injects `BuilderProfileRepository` directly |
| Controller does auth logic | `ProjectController.java` | 157-165 | Manual ownership check instead of delegating to service |
| Controller does DTO mapping | `AdminController.java` | 98-110 | Transforms entity to Map in controller |
| Controller does business logic | `ProjectController.java` | 150-190 | File upload with manual entity creation and save |

### Inconsistent Patterns

| Pattern | Consistent Usage | Violations |
|---------|-----------------|------------|
| Service-only injection in controllers | PaymentController, ChatController, BidController | ProjectController, AdminController inject repos |
| DTO Response objects | Most endpoints return typed DTOs | Some return `Map<String, Object>` (AdminController, PaymentService) |
| @PreAuthorize annotations | Used on some controller classes | Missing on individual methods that need finer control |
| Request DTOs with @Valid | LoginRequest, RegisterRequest | `Map<String, String>` still used for some auth endpoints (refresh was fixed, but some admin endpoints use raw Maps) |
| Audit logging | Most write operations log | Some don't (e.g., milestone rejection has no audit log call found) |
| Notification sending | Most state changes notify | Milestone rejection doesn't send notification |

### Architectural Smells

| Smell | Evidence |
|-------|---------|
| **God Entity** | `User` entity has 28+ fields, implements UserDetails, handles auth + profile + session + lockout |
| **JSON columns as String** | 13+ fields across 6 entities store JSON as plain String, causing multi-layer encoding |
| **No DTO layer for entities** | User entity used directly as Spring Security UserDetails (tight coupling) |
| **Mixed response types** | Some services return entities, some return DTOs, some return `Map<String, Object>` |
| **Empty package** | `websocket/` package exists but is empty — WS logic scattered in `config/` and `controller/` |
| **Hardcoded business rules** | Platform fee (5%), lockout duration (15min), lead credits (5 default) in service code rather than SystemSettings |

---

## Weak Areas

| Area | Issue | Impact |
|------|-------|--------|
| **Test coverage** | Only `AuthServiceTest.java` found in test directory | No regression safety for 29 other services |
| **No CI/CD** | No GitHub Actions, Jenkins, or similar | Manual deployment, no automated quality gates |
| **No containerization** | No Dockerfile | Deployment process is UNKNOWN |
| **Email is mocked** | All 5 email methods log only, no SMTP | Users never receive emails (verification, password reset) |
| **Payment is mocked** | `PaymentMethod.MOCK` hardcoded | No real money flow despite full escrow implementation |
| **No search indexing** | SQL `LIKE '%query%'` patterns | Full-text search will be slow at scale |
| **No caching** | No Redis, no `@Cacheable` | Every request hits DB |
| **No rate limiting** | No Bucket4j, no API Gateway | Vulnerable to brute force (mitigated by account lockout only) |
| **No database migration rollback** | Flyway forward-only | Can't revert failed migrations |
| **Frontend type gaps** | 20+ `any` types remain in non-admin pages | Runtime errors possible |

---

## Unknowns

1. **Deployment target:** No evidence of where/how the application is deployed (bare metal, cloud VM, PaaS, container). No Dockerfile, no cloud config.
2. **Production database:** MySQL configured but no evidence of a production database existing. All development uses H2 in-memory.
3. **Async thread pool:** `@Async` used for audit and email but no `@EnableAsync` configuration found with custom thread pool. May use Spring's default SimpleAsyncTaskExecutor (no thread reuse).
4. **WebSocket scaling:** Single-server STOMP broker. How does this scale horizontally? No external message broker (RabbitMQ, Redis pub/sub) configured.
5. **File upload in production:** Files stored in `./uploads/` relative to working directory. What happens on container restart? No volume mount or S3 integration.
6. **Session management:** Stateless JWT but `User.refreshToken` stored in DB. Is this cleaned up periodically? No TTL job found.
7. **Circular dependency risk:** Services inject each other (e.g., BidService → LeadService → BuilderProfileRepository, ProjectService → ContractService). No evidence of actual circular dependency but risk exists.
8. **Frontend bundle size:** No bundle analysis configured. With 48 lazy-loaded pages + Recharts + Radix UI, production bundle could be large.
