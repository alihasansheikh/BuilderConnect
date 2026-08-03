# BuilderConnect v2 — FYP Presentation Notes

## One-Liner
> A full-stack construction marketplace connecting clients with verified builders through escrow-protected payments, real-time tracking, and multi-stakeholder collaboration — built for Pakistan's construction industry.

---

## 1. Problem Statement (30 seconds)

- Pakistan's PKR 1.5 trillion construction industry is **fragmented and informal**
- Homeowners can't verify contractor credentials or compare pricing
- **Payment disputes** are the #1 cause of project abandonment
- No centralized platform for project tracking, communication, or quality control
- Skilled builders lose work to unverified competitors

---

## 2. Solution: BuilderConnect (1 minute)

A **marketplace + project management platform** with 8 user roles:

| Role | What They Do |
|------|-------------|
| **Client** | Posts projects, funds escrow, approves milestones |
| **Builder** | Bids on projects, completes work, receives payments |
| **Supplier** | Manages material catalog, processes orders |
| **Supervisor** | Submits daily site logs, safety checklists |
| **Inspector** | Conducts quality inspections, generates reports |
| **Support Agent** | Handles tickets and disputes |
| **Admin** | Manages users, verifies builders, moderates reviews |
| **Super Admin** | Full platform control, system settings |

---

## 3. Core Features to Highlight (3 minutes)

### 3.1 Milestone-Based Escrow Payments
- Client funds are held in **escrow** — never paid directly to builder
- Payments released **only** when milestones are completed and approved
- **5% platform fee** automatically calculated on each release
- **Pessimistic locking** prevents double-payment race conditions
- Full payment history with downloadable invoice PDFs

### 3.2 Project Lifecycle Management
```
DRAFT → OPEN → BIDDING → AWARDED → CONTRACT_PENDING → IN_PROGRESS → COMPLETED
```
- 10 distinct project states with enforced transitions
- Multi-step project creation wizard (7 steps)
- Automatic contract generation on project award
- Dual-signature contract system (client + builder)

### 3.3 Competitive Bidding System
- Builders spend **lead credits** to submit bids (prevents spam)
- Clients can **shortlist** and compare bids side-by-side
- Cost breakdown: labor, material, other expenses
- Automatic rejection of losing bids when project is awarded
- Bid validity expiry dates

### 3.4 Real-Time Communication
- **WebSocket** (STOMP over SockJS) for instant messaging
- Real-time notification badges across the dashboard
- Typing indicators and read receipts
- Message editing and deletion
- Per-room chat with project context

### 3.5 Builder Verification & Reputation
- Admin-verified builder profiles (PEC number, business registration)
- Star ratings across 4 dimensions (quality, communication, timeliness, value)
- Review moderation queue for admin approval
- Subscription tiers: FREE → BASIC → PROFESSIONAL → ENTERPRISE
- Lead credit economy for marketplace access

### 3.6 Budget Estimator
- Rule-based cost estimation engine
- Calculates based on project type, area (sq ft), city, and selected trades
- Provides cost breakdown by category (foundation, structure, finishing, etc.)
- Timeline estimation included

---

## 4. Security Features to Highlight (2 minutes)

### 4.1 Authentication & Authorization
| Feature | Implementation |
|---------|---------------|
| Password storage | **BCrypt** (strength 10) |
| Token system | **JWT** — HS512 signing, 30min access + 7-day refresh |
| Account lockout | **5 failed attempts → 15-minute lock** |
| Role-based access | **8 roles** with URL-pattern + method-level security |
| WebSocket auth | STOMP CONNECT interceptor **rejects** unauthenticated connections |

### 4.2 API Security
| Feature | Implementation |
|---------|---------------|
| Rate limiting | **10 req/min** (auth) + **100 req/min** (general) per IP |
| Input validation | **@Valid DTOs** with Bean Validation on all endpoints |
| SQL injection | **Parameterized queries** via Spring Data JPA |
| XSS prevention | **DOMPurify** sanitization on frontend |
| CSRF | Disabled (stateless JWT, no cookies) |
| CORS | Explicit allowed origins per environment |
| Pagination max | **100 items/page** hard limit |

### 4.3 Data Protection
| Feature | Implementation |
|---------|---------------|
| HSTS | Enabled, 1-year max-age, includeSubDomains |
| X-Frame-Options | SAMEORIGIN (clickjacking prevention) |
| X-Content-Type | nosniff (MIME-sniffing prevention) |
| Soft deletes | Users/projects use `deleted` + `deletedAt` (audit trail) |
| Cascade protection | `{PERSIST, MERGE}` only — no cascade delete |
| Console stripping | `esbuild: { drop: ['console', 'debugger'] }` in production |
| User enumeration | Generic error messages on registration/password reset |

### 4.4 Financial Security
| Feature | Implementation |
|---------|---------------|
| Escrow protection | Funds locked until milestone approval |
| Pessimistic locking | `@Lock(PESSIMISTIC_WRITE)` on escrow + lead credits |
| Double-release prevention | Status check before every payment release |
| Platform fee | 5% calculated atomically with payment release |
| Suspension enforcement | `SecurityUtils.validateNotSuspended()` in 12+ services |

---

## 5. Tech Stack (30 seconds)

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI |
| **State** | React Query v5 (server state), React Context (auth/theme) |
| **Backend** | Java 17, Spring Boot 3.2, Spring Security, Spring Data JPA |
| **Database** | MySQL 8 (prod), H2 in-memory (dev) |
| **Migrations** | Flyway (24 versioned migrations) |
| **Real-time** | WebSocket with STOMP protocol over SockJS |
| **API docs** | Swagger/OpenAPI (dev only, disabled in production) |
| **Validation** | Zod (frontend), Bean Validation (backend) |

---

## 6. Key Numbers

| Metric | Value |
|--------|-------|
| Database tables | **30+** |
| API endpoints | **60+** across 17 controllers |
| Flyway migrations | **V1–V24** |
| Frontend pages | **40+** with React.lazy code splitting |
| User roles | **8** |
| Project states | **10** |
| Enum types | **50+** covering all business statuses |
| Service classes | **22** |
| JPA repositories | **26** |
| Test accounts | **14** pre-seeded users |

---

## 7. Demo Flow (if doing live demo)

1. **Login** as `client1@example.com` / `password`
2. **Create a project** → walk through 7-step wizard → publish
3. **Switch to builder** (`builder1@example.com`) → browse marketplace → submit bid
4. **Switch back to client** → review bid → award project
5. **Show contract** → sign from both sides
6. **Fund escrow** → show escrow balance
7. **Complete milestone** (as builder) → approve (as client) → release payment
8. **Show real-time chat** between client and builder
9. **Show admin dashboard** (`admin@builderconnect.pk`) → metrics, user management
10. **Toggle dark mode** → show it works everywhere

---

## 8. Differentiators (vs existing platforms)

| Feature | Thumbtack/Upwork | BookABuilder | **BuilderConnect** |
|---------|-----------------|--------------|-------------------|
| Escrow payments | No | No | **Yes** |
| Multi-stakeholder (8 roles) | No | No | **Yes** |
| Site supervisor logs | No | No | **Yes** |
| Quality inspections | No | No | **Yes** |
| Real-time WebSocket chat | Limited | No | **Yes** |
| Budget estimator | No | No | **Yes** |
| Pakistan-focused | No | No | **Yes** |
| Lead credit economy | No | No | **Yes** |

---

## 9. Limitations (be honest — evaluators appreciate it)

1. Payment gateway is **mock** — production needs Stripe/PayPal credentials
2. Email service uses dev SMTP — production needs AWS SES
3. 2FA framework exists but is **auto-disabled** (needs full TOTP implementation)
4. No native mobile app (responsive web only)
5. PII (phone, address) stored **unencrypted** — field-level encryption recommended
6. Rule-based recommendations only — ML models need training data

---

## 10. Future Work

- Native mobile apps (React Native)
- Machine learning for builder recommendations
- Video call integration for remote consultations
- Multi-language support (Urdu)
- Blockchain-based credential verification
- IoT integration for site monitoring
