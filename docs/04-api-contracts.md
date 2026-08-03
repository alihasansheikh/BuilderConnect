# API Contracts (Extracted from Controllers)

> Every endpoint below is extracted from actual `@RequestMapping` annotations. Request/response types are from method signatures. Nothing is assumed.
>
> For business rules and validation logic behind each endpoint, see [01-product-requirements.md](01-product-requirements.md).
> For auth flow details (JWT, lockout), see [03-architecture.md](03-architecture.md).

**Base URL:** `/api` (context-path from application.yml)
**Total Endpoints:** ~110 across 25 controllers

---

## Authentication — `/v1/auth` (AuthController)

| Method | Path | Body | Auth | Response | Notes |
|--------|------|------|------|----------|-------|
| POST | `/v1/auth/register` | `@Valid RegisterRequest` | No | `AuthResponse` (201) | Creates user + role profile |
| POST | `/v1/auth/login` | `@Valid LoginRequest` | No | `AuthResponse` | Account lockout after 5 fails |
| POST | `/v1/auth/refresh` | `@Valid RefreshTokenRequest` | No | `AuthResponse` | Validates stored refresh token |
| POST | `/v1/auth/logout` | — | Yes | `Map<String, String>` | Clears refresh token |
| POST | `/v1/auth/verify-email` | `@Valid TokenRequest` | No | `Map<String, String>` | |
| POST | `/v1/auth/forgot-password` | `@Valid EmailRequest` | No | `Map<String, String>` | Silent if email not found |
| POST | `/v1/auth/reset-password` | `@Valid ResetPasswordRequest` | No | `Map<String, String>` | |
| GET | `/v1/auth/me` | — | Yes | `AuthResponse.UserInfo` | Returns current user |

---

## Projects — `/v1` (ProjectController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| POST | `/v1/client/projects` | `@Valid ProjectCreateRequest` | Yes | `ProjectResponse` (201) | CLIENT |
| POST | `/v1/client/projects/{id}/publish` | — | Yes | `ProjectResponse` | CLIENT |
| GET | `/v1/client/projects` | — | Yes | `Page<ProjectResponse>` | CLIENT |
| GET | `/v1/client/projects/{id}` | — | Yes | `ProjectResponse` | CLIENT |
| POST | `/v1/client/projects/{projectId}/award/{bidId}` | — | Yes | `ProjectResponse` | CLIENT |
| GET | `/v1/projects` | — | No | `Page<ProjectResponse>` | — |
| GET | `/v1/projects/{id}` | — | No | `ProjectResponse` | — |
| GET | `/v1/builder/projects` | — | Yes | `Page<ProjectResponse>` | BUILDER |
| POST | `/v1/projects/{id}/start` | — | Yes | `ProjectResponse` | CLIENT or BUILDER |
| POST | `/v1/projects/{id}/images` | `MultipartFile` | Yes | `Map<String, Object>` | — |
| GET | `/v1/projects/{id}/images` | — | No | `List<Map<String, Object>>` | — |
| DELETE | `/v1/projects/{projectId}/images/{attachmentId}` | — | Yes | `Map<String, String>` | — |

**Query Params:** `status` (ProjectStatus), `city`, `categoryId`, `minBudget`, `maxBudget` on search; `Pageable` on list endpoints.

---

## Bids — `/v1` (BidController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| POST | `/v1/builder/bids` | `@Valid BidCreateRequest` | Yes | `BidResponse` (201) | BUILDER |
| GET | `/v1/builder/bids` | — | Yes | `Page<BidResponse>` | BUILDER |
| GET | `/v1/builder/bids/{id}` | — | Yes | `BidResponse` | BUILDER |
| POST | `/v1/builder/bids/{id}/withdraw` | — | Yes | `BidResponse` | BUILDER |
| GET | `/v1/projects/{projectId}/bids` | — | No | `List<BidResponse>` | — |
| GET | `/v1/projects/{projectId}/bids/paged` | — | No | `Page<BidResponse>` | — |
| POST | `/v1/client/bids/{id}/shortlist` | — | Yes | `BidResponse` | CLIENT |

**Query Params:** `status` (BidStatus) on builder bids; `Pageable` on paged endpoints.

---

## Milestones — `/v1` (MilestoneController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| GET | `/v1/projects/{projectId}/milestones` | — | No | `List<MilestoneResponse>` | — |
| POST | `/v1/milestones/{id}/complete` | `Map<String, String>` (**no @Valid**) | Yes | `MilestoneResponse` | BUILDER/ADMIN |
| POST | `/v1/milestones/{id}/approve` | — | Yes | `MilestoneResponse` | CLIENT/ADMIN |
| POST | `/v1/milestones/{id}/reject` | `Map<String, String>` (**no @Valid**) | Yes | `MilestoneResponse` | CLIENT/ADMIN |
| POST | `/v1/milestones/{id}/updates` | `@Valid MilestoneUpdateRequest` | Yes | `MilestoneUpdateResponse` | BUILDER/ADMIN |
| GET | `/v1/milestones/{id}/updates` | — | Yes | `List<MilestoneUpdateResponse>` | CLIENT/BUILDER/ADMIN |

---

## Payments — `/v1/payments` (PaymentController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| POST | `/v1/payments/topup` | `@Valid FundEscrowRequest` | Yes | `Map<String, Object>` | CLIENT |
| GET | `/v1/payments/escrow/{projectId}` | — | Yes | `Map<String, Object>` | CLIENT/BUILDER/ADMIN |
| POST | `/v1/payments/release` | `@Valid ReleasePaymentRequest` | Yes | `Map<String, Object>` | CLIENT |
| GET | `/v1/payments/history` | — | Yes | `Page<PaymentResponse>` | CLIENT/BUILDER/ADMIN |
| GET | `/v1/payments/project/{projectId}` | — | Yes | `List<PaymentResponse>` | CLIENT/BUILDER/ADMIN |
| GET | `/v1/payments/invoices` | — | Yes | `Page<InvoiceResponse>` | CLIENT/BUILDER/ADMIN |
| GET | `/v1/payments/invoices/{id}` | — | Yes | `InvoiceResponse` | CLIENT/BUILDER/ADMIN |
| GET | `/v1/payments/invoices/{id}/pdf` | — | Yes | `byte[]` (PDF) | CLIENT/BUILDER/ADMIN |

**Query Params:** `status` (PaymentStatus), `paymentType` on history; `status` (InvoiceStatus) on invoices.

---

## Contracts — `/v1/projects/{projectId}/contract` (ContractController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| GET | `/v1/projects/{projectId}/contract` | — | Yes | `ContractResponse` | CLIENT/BUILDER/ADMIN |
| POST | `/v1/projects/{projectId}/contract/sign` | — | Yes | `ContractResponse` | CLIENT/BUILDER |
| POST | `/v1/projects/{projectId}/contract/versions` | `Map<String, String>` (**no @Valid**) | Yes | `ContractVersionResponse` | CLIENT/BUILDER |
| GET | `/v1/projects/{projectId}/contract/versions` | — | Yes | `List<ContractVersionResponse>` | CLIENT/BUILDER/ADMIN |

---

## Chat — `/v1/chat` (ChatController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| GET | `/v1/chat/rooms` | — | Yes | `Page<ChatRoomResponse>` | isAuthenticated |
| POST | `/v1/chat/rooms/direct/{userId}` | — | Yes | `ChatRoomResponse` | isAuthenticated |
| GET | `/v1/chat/rooms/{roomId}/messages` | — | Yes | `Page<ChatMessageResponse>` | isAuthenticated |
| POST | `/v1/chat/rooms/{roomId}/messages` | `@Valid ChatMessageRequest` | Yes | `ChatMessageResponse` | isAuthenticated |
| POST | `/v1/chat/rooms/{roomId}/read` | — | Yes | `void` | isAuthenticated |
| GET | `/v1/chat/unread-count` | — | Yes | `Map<String, Long>` | isAuthenticated |
| PUT | `/v1/chat/messages/{messageId}` | `Map<String, String>` (**no @Valid**) | Yes | `ChatMessageResponse` | isAuthenticated |
| DELETE | `/v1/chat/messages/{messageId}` | — | Yes | `void` | isAuthenticated |

**WebSocket:**
| Destination | Body | Description |
|-------------|------|-------------|
| `/app/chat/{roomId}` | `ChatMessageRequest` | Send message via WS |
| `/app/chat/{roomId}/typing` | `Map<String, Object>` | Typing indicator |

---

## Reviews — `/v1` (ReviewController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| POST | `/v1/projects/{projectId}/review` | `@Valid ReviewRequest` | Yes | `ReviewResponse` | CLIENT |
| GET | `/v1/builders/{builderId}/reviews` | — | No | `Page<ReviewResponse>` | — |
| GET | `/v1/builder/reviews` | — | Yes | `Page<ReviewResponse>` | BUILDER |

---

## Notifications — `/v1/notifications` (NotificationController)

| Method | Path | Body | Auth | Response |
|--------|------|------|------|----------|
| GET | `/v1/notifications` | — | Yes | `Page<Notification>` |
| GET | `/v1/notifications/unread-count` | — | Yes | `Map<String, Long>` |
| POST | `/v1/notifications/{id}/read` | — | Yes | `void` |
| POST | `/v1/notifications/read-all` | — | Yes | `void` |
| GET | `/v1/notifications/preferences` | — | Yes | `NotificationPreferenceResponse` |
| PUT | `/v1/notifications/preferences` | `NotificationPreferenceRequest` (**no @Valid**) | Yes | `NotificationPreferenceResponse` |

**Note:** `GET /v1/notifications` returns raw `Notification` entity, not a response DTO.

---

## Admin — `/v1/admin` (AdminController)

| Method | Path | Body | Auth | Response |
|--------|------|------|------|----------|
| GET | `/v1/admin/metrics` | — | ADMIN | `Map<String, Object>` |
| GET | `/v1/admin/users` | — | ADMIN | `Page<UserResponse>` |
| GET | `/v1/admin/users/{id}` | — | ADMIN | `UserResponse` |
| POST | `/v1/admin/verify-builder` | `Map<String, Long>` (**no @Valid**) | ADMIN | `UserResponse` |
| POST | `/v1/admin/suspend-user` | `Map<String, Object>` (**no @Valid**) | ADMIN | `UserResponse` |
| POST | `/v1/admin/unsuspend-user` | `Map<String, Long>` (**no @Valid**) | ADMIN | `UserResponse` |
| GET | `/v1/admin/builders/pending` | — | ADMIN | `Page<Map<String, Object>>` |
| GET | `/v1/admin/revenue-summary` | — | ADMIN | `Map<String, Object>` |
| GET | `/v1/admin/audit-logs` | — | ADMIN | `Page<Map<String, Object>>` |
| GET | `/v1/admin/moderation-queue` | — | ADMIN | `Page<Map<String, Object>>` |
| POST | `/v1/admin/reviews/{id}/moderate` | `Map<String, String>` (**no @Valid**) | ADMIN | `Map<String, Object>` |
| GET | `/v1/admin/settings` | — | ADMIN | `List<Map<String, Object>>` |
| PUT | `/v1/admin/settings/{key}` | `Map<String, String>` (**no @Valid**) | ADMIN | `Map<String, Object>` |

**Query Params:** `role`, `search` on users; `category`, `action`, `userId`, `fromDate`, `toDate` on audit logs; `status` on moderation queue.

---

## User Profile — `/v1/users` (UserController)

| Method | Path | Body | Auth | Response |
|--------|------|------|------|----------|
| PUT | `/v1/users/me` | `Map<String, String>` (**no @Valid**) | Yes | `UserResponse` |
| POST | `/v1/users/me/profile-image` | `MultipartFile` | Yes | `Map<String, String>` |
| DELETE | `/v1/users/me/profile-image` | — | Yes | `Map<String, String>` |
| POST | `/v1/users/me/change-password` | `Map<String, String>` (**no @Valid**) | Yes | `Map<String, String>` |

---

## Builder Public — `/v1/builders` (BuilderController)

| Method | Path | Body | Auth | Response |
|--------|------|------|------|----------|
| GET | `/v1/builders` | — | No | `Page<Map<String, Object>>` |
| GET | `/v1/builders/{id}` | — | No | `Map<String, Object>` |

**Query Params:** `city`, `minExperience`, `maxExperience`, `minRating`, `isAvailable`, `specialization`.

---

## Builder Profile — `/v1/builder/me` (BuilderProfileController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| GET | `/v1/builder/me/profile` | — | Yes | `Map<String, Object>` | BUILDER |
| PUT | `/v1/builder/me/profile` | `BuilderProfileUpdateRequest` (**no @Valid**) | Yes | `Map<String, Object>` | BUILDER |
| POST | `/v1/builder/me/banner-image` | `MultipartFile` | Yes | `Map<String, String>` | BUILDER |
| DELETE | `/v1/builder/me/banner-image` | — | Yes | `Map<String, String>` | BUILDER |
| GET | `/v1/builder/me/analytics` | — | Yes | `Map<String, Object>` | BUILDER |

---

## Change Requests — `/v1/projects/{projectId}/change-requests`

| Method | Path | Body | Auth | Response |
|--------|------|------|------|----------|
| POST | `/v1/projects/{projectId}/change-requests` | `@Valid ChangeRequestCreateRequest` | Yes | `ChangeRequestResponse` |
| GET | `/v1/projects/{projectId}/change-requests` | — | No | `List<ChangeRequestResponse>` |
| POST | `.../change-requests/{id}/approve` | — | Yes | `ChangeRequestResponse` |
| POST | `.../change-requests/{id}/reject` | `Map<String, String>` (**no @Valid**) | Yes | `ChangeRequestResponse` |

---

## Lead Credits — `/v1/builder/leads` (LeadController)

| Method | Path | Auth | Response | @PreAuthorize |
|--------|------|------|----------|---------------|
| GET | `/v1/builder/leads/credits` | Yes | `Map<String, Object>` | BUILDER (class-level) |
| GET | `/v1/builder/leads/transactions` | Yes | `Page<LeadTransactionResponse>` | BUILDER (class-level) |

---

## Subscriptions — `/v1` (SubscriptionController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| GET | `/v1/subscriptions/plans` | — | No | `List<SubscriptionPlanResponse>` | — |
| GET | `/v1/builder/subscription` | — | Yes | `Map<String, Object>` | BUILDER |
| POST | `/v1/builder/subscription/upgrade` | `Map<String, String>` (**no @Valid**) | Yes | `Map<String, Object>` | BUILDER |

---

## CMS — `/v1` (CmsController)

**Public:**

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/v1/public/pages/{slug}` | No | `Map<String, Object>` |
| GET | `/v1/public/blog` | No | `Page<Map<String, Object>>` |
| GET | `/v1/public/blog/{slug}` | No | `Map<String, Object>` |

**Admin CMS:**

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| GET | `/v1/admin/cms/pages` | — | ADMIN | `Page<Map>` | ADMIN |
| POST | `/v1/admin/cms/pages` | `Map<String, String>` | ADMIN | `Map` | ADMIN |
| PUT | `/v1/admin/cms/pages/{id}` | `Map<String, Object>` | ADMIN | `Map` | ADMIN |
| DELETE | `/v1/admin/cms/pages/{id}` | — | ADMIN | `void` | ADMIN |
| GET | `/v1/admin/cms/blog` | — | ADMIN | `Page<Map>` | ADMIN |
| POST | `/v1/admin/cms/blog` | `Map<String, String>` | ADMIN | `Map` | ADMIN |
| PUT | `/v1/admin/cms/blog/{id}` | `Map<String, Object>` | ADMIN | `Map` | ADMIN |
| DELETE | `/v1/admin/cms/blog/{id}` | — | ADMIN | `void` | ADMIN |
| GET | `/v1/admin/cms/email-templates` | — | ADMIN | `List<Map>` | ADMIN |
| PUT | `/v1/admin/cms/email-templates/{id}` | `Map<String, Object>` | ADMIN | `Map` | ADMIN |

**All CMS endpoints use raw Maps — no typed DTOs.**

---

## Support Tickets — `/v1/support/tickets`

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| POST | `/v1/support/tickets` | `@Valid SupportTicketCreateRequest` | Yes | `SupportTicketResponse` | isAuthenticated |
| GET | `/v1/support/tickets` | — | Yes | `Page<SupportTicketResponse>` | isAuthenticated |
| GET | `/v1/support/tickets/{id}` | — | Yes | `SupportTicketResponse` | isAuthenticated |
| POST | `.../tickets/{id}/assign` | `Map<String, Long>` (**no @Valid**, optional) | Yes | `SupportTicketResponse` | SUPPORT/ADMIN |
| POST | `.../tickets/{id}/status` | `Map<String, String>` (**no @Valid**) | Yes | `SupportTicketResponse` | SUPPORT/ADMIN |
| POST | `.../tickets/{id}/resolve` | `Map<String, String>` (**no @Valid**) | Yes | `SupportTicketResponse` | SUPPORT/ADMIN |
| POST | `.../tickets/{id}/reopen` | — | Yes | `SupportTicketResponse` | isAuthenticated |
| POST | `.../tickets/{id}/responses` | `@Valid TicketResponseRequest` | Yes | `TicketResponseResponse` | isAuthenticated |
| GET | `.../tickets/{id}/responses` | — | Yes | `List<TicketResponseResponse>` | isAuthenticated |

---

## Disputes — `/v1` (DisputeController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| POST | `/v1/projects/{projectId}/disputes` | `@Valid DisputeCreateRequest` | Yes | `DisputeResponse` | isAuthenticated |
| GET | `/v1/disputes` | — | Yes | `Page<DisputeResponse>` | isAuthenticated |
| GET | `/v1/disputes/{id}` | — | Yes | `DisputeResponse` | isAuthenticated |
| POST | `/v1/disputes/{id}/assign-mediator` | `Map<String, Long>` (**no @Valid**, optional) | Yes | `DisputeResponse` | SUPPORT/ADMIN |
| POST | `/v1/disputes/{id}/status` | `Map<String, String>` (**no @Valid**) | Yes | `DisputeResponse` | SUPPORT/ADMIN |
| POST | `/v1/disputes/{id}/resolve` | `Map<String, String>` (**no @Valid**) | Yes | `DisputeResponse` | SUPPORT/ADMIN |
| POST | `/v1/disputes/{id}/comments` | `@Valid DisputeCommentRequest` | Yes | `DisputeCommentResponse` | isAuthenticated |
| GET | `/v1/disputes/{id}/comments` | — | Yes | `List<DisputeCommentResponse>` | isAuthenticated |

---

## Materials — `/v1` (MaterialController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| GET | `/v1/materials` | — | No | `Page<MaterialResponse>` | — |
| GET | `/v1/materials/{id}` | — | No | `MaterialResponse` | — |
| GET | `/v1/supplier/materials` | — | Yes | `Page<MaterialResponse>` | SUPPLIER |
| POST | `/v1/supplier/materials` | `@Valid MaterialCreateRequest` | Yes | `MaterialResponse` | SUPPLIER |
| PUT | `/v1/supplier/materials/{id}` | `@Valid MaterialUpdateRequest` | Yes | `MaterialResponse` | SUPPLIER |
| DELETE | `/v1/supplier/materials/{id}` | — | Yes | `void` | SUPPLIER |

---

## Material Orders — `/v1` (MaterialOrderController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| POST | `/v1/material-orders` | `@Valid MaterialOrderCreateRequest` | Yes | `MaterialOrderResponse` | isAuthenticated |
| GET | `/v1/material-orders/{id}` | — | Yes | `MaterialOrderResponse` | isAuthenticated |
| GET | `/v1/projects/{projectId}/material-orders` | — | Yes | `Page<MaterialOrderResponse>` | isAuthenticated |
| GET | `/v1/supplier/orders` | — | Yes | `Page<MaterialOrderResponse>` | SUPPLIER |
| POST | `/v1/material-orders/{id}/confirm` | — | Yes | `MaterialOrderResponse` | SUPPLIER |
| POST | `/v1/material-orders/{id}/status` | `Map<String, String>` (**no @Valid**) | Yes | `MaterialOrderResponse` | isAuthenticated |
| POST | `/v1/material-orders/{id}/deliveries` | `@Valid DeliveryCreateRequest` | Yes | `DeliveryResponse` | SUPPLIER |
| POST | `/v1/deliveries/{id}/status` | `Map<String, String>` (**no @Valid**) | Yes | `DeliveryResponse` | isAuthenticated |

---

## Badges — `/v1` (BadgeController)

| Method | Path | Body | Auth | Response | @PreAuthorize |
|--------|------|------|------|----------|---------------|
| GET | `/v1/badges` | — | No | `List<BadgeResponse>` | — |
| GET | `/v1/users/{userId}/badges` | — | No | `List<UserBadgeResponse>` | — |
| POST | `/v1/admin/badges/{badgeId}/award` | `Map<String, Object>` (**no @Valid**) | Yes | `UserBadgeResponse` | ADMIN |
| DELETE | `/v1/admin/badges/{userId}/{badgeId}/revoke` | — | Yes | `Map<String, String>` | ADMIN |

---

## Inconsistencies

### Response Format Inconsistency

| Pattern | Count | Controllers |
|---------|-------|-------------|
| Typed DTO response | ~60 endpoints | Auth, Bid, Milestone, Review, Material, SupportTicket, Dispute |
| `Map<String, Object>` | ~35 endpoints | Admin (all), Payment (escrow), Builder profile, Lead credits, Subscription, CMS (all) |
| `Map<String, String>` | ~10 endpoints | File upload/delete responses, auth simple responses |
| Raw entity (no DTO) | 1 endpoint | NotificationController returns `Page<Notification>` (entity, not DTO) |

### Missing @Valid on Request Bodies

**26 endpoints accept raw Maps without validation:**

| Controller | Endpoints Using Raw Maps |
|-----------|-------------------------|
| AdminController | 5 (verify-builder, suspend, unsuspend, moderate, update-setting) |
| CmsController | 5 (create/update pages, blog, email-templates) |
| SupportTicketController | 3 (assign, status, resolve) |
| DisputeController | 3 (assign-mediator, status, resolve) |
| MaterialOrderController | 2 (order status, delivery status) |
| MilestoneController | 2 (complete, reject) |
| ChatController | 1 (edit message) |
| ContractController | 1 (create version) |
| UserController | 2 (update profile, change password) |
| SubscriptionController | 1 (upgrade) |
| ChangeRequestController | 1 (reject) |
| BadgeController | 1 (award) |

### Missing @PreAuthorize

| Controller | Issue |
|-----------|-------|
| ChangeRequestController | No `@PreAuthorize` — auth in service layer |
| NotificationController | No `@PreAuthorize` — requires `@AuthenticationPrincipal` only |
| UserController | No `@PreAuthorize` — requires `@AuthenticationPrincipal` only |
| ProjectController (image endpoints) | No `@PreAuthorize` on upload/get/delete images |

### @AuthenticationPrincipal Inconsistency

| Controller | Some Methods Have It | Some Methods Don't |
|-----------|--------------------|--------------------|
| AdminController | verify, suspend, unsuspend, moderate, update-setting | metrics, users, pending, revenue, audit-logs, moderation-queue, settings |

Admin endpoints that modify data pass `@AuthenticationPrincipal User admin` for audit logging, but read-only endpoints don't — even though all require ADMIN role via `@PreAuthorize`.

### Duplicate Endpoint Patterns

| Pattern | Endpoints |
|---------|-----------|
| Project bids | `GET /v1/projects/{id}/bids` (list) AND `GET /v1/projects/{id}/bids/paged` (paginated) — same data, different format |

---

## Unknowns

1. **Are `Map<String, Object>` responses documented for frontend?** No OpenAPI/Swagger schema for Map responses — frontend must guess the structure.
2. **What fields does `Map<String, Object>` contain for admin metrics?** Only determinable by reading `AdminService.getMetrics()`.
3. **Does `GET /v1/projects/{id}/bids` return all bids or only active ones?** Depends on service implementation.
4. **Why do some endpoints lack @PreAuthorize while having identical auth requirements?** Inconsistent — some use class-level, some method-level, some rely on service layer.
5. **Are there undocumented WebSocket message formats?** Only `/app/chat/{roomId}` and `/app/chat/{roomId}/typing` found in controller — subscription topics (`/topic/notifications/{email}`, `/topic/chat/{roomId}`) defined in service layer.
6. **What happens when `@AuthenticationPrincipal User user` is null on authenticated endpoints?** Spring Security should block before reaching controller, but no explicit null check in controller methods.
