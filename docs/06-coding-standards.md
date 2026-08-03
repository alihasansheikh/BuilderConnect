# Coding Standards (Extracted from Codebase Patterns)

> Standards below are derived from the DOMINANT patterns observed in the codebase. Violations are listed separately with evidence. This is descriptive (what the code does), not prescriptive (what it should do).
>
> For architectural patterns and layer flow, see [03-architecture.md](03-architecture.md).
> For endpoint-level validation details, see [04-api-contracts.md](04-api-contracts.md).

---

## Naming Conventions

### Observed Standard (Consistent)

| Element | Convention | Examples |
|---------|-----------|----------|
| Classes | PascalCase | `ProjectService`, `BidCreateRequest`, `AuthResponse` |
| Methods | camelCase, verb-first | `createBid()`, `getClientProjects()`, `fundEscrow()` |
| Variables/Fields | camelCase | `projectId`, `estimatedDurationDays`, `profileImageUrl` |
| Constants | UPPER_SNAKE_CASE | `MAX_FAILED_ATTEMPTS`, `LOCKOUT_DURATION_MINUTES` |
| Packages | lowercase | `com.builderconnect.service`, `com.builderconnect.dto.request` |
| DB Columns | snake_case | `project_number`, `client_id`, `created_at` |
| Enums | UPPER_SNAKE_CASE values | `IN_PROGRESS`, `PAYMENT_RELEASED`, `SUPER_ADMIN` |
| URLs | kebab-case | `/v1/admin/revenue-summary`, `/v1/material-orders` |

### Naming Patterns by Layer

| Layer | Pattern | Example |
|-------|---------|---------|
| Controller | `{Entity}Controller` | `ProjectController`, `BidController` |
| Service | `{Entity}Service` | `ProjectService`, `PaymentService` |
| Repository | `{Entity}Repository` | `ProjectRepository`, `UserRepository` |
| Request DTO | `{Entity}{Action}Request` | `BidCreateRequest`, `RegisterRequest` |
| Response DTO | `{Entity}Response` | `ProjectResponse`, `BidResponse` |
| Entity | `{Entity}` (no suffix) | `Project`, `Bid`, `User` |
| Enum | `{Concept}Status` or `{Concept}Type` | `ProjectStatus`, `UserRole` |

### Method Naming by Operation

| Operation | Pattern | Example |
|-----------|---------|---------|
| Create | `create{Entity}` | `createProject()`, `createBid()` |
| Read one | `get{Entity}` | `getProject()`, `getBid()` |
| Read list | `get{Entity}s` or `get{Owner}{Entity}s` | `getClientProjects()`, `getBuilderBids()` |
| Update | `update{Entity}` | `updateProfile()`, `updateMyProfile()` |
| Status change | `{action}{Entity}` | `publishProject()`, `awardProject()`, `withdrawBid()` |
| Static factory | `fromEntity()` | `ProjectResponse.fromEntity(project)` |
| Summary factory | `summaryFromEntity()` | `BidResponse.summaryFromEntity(bid)` |

---

## Layer Rules

### Controller Layer — Observed Responsibilities

**Standard Pattern (followed by ~70% of controllers):**

```java
@RestController
@RequestMapping("/v1/...")
@RequiredArgsConstructor
@Tag(name = "...", description = "...")
public class XxxController {

    private final XxxService xxxService;  // Service-only injection

    @PostMapping("/...")
    @Operation(summary = "...")
    @PreAuthorize("hasRole('...')")
    public ResponseEntity<XxxResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody XxxCreateRequest request) {
        XxxResponse response = xxxService.createXxx(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

**Observed Annotations:**
- `@RestController` — all controllers
- `@RequestMapping` — class-level URL prefix
- `@RequiredArgsConstructor` — Lombok constructor injection
- `@Tag` — Swagger grouping
- `@Operation(summary = "...")` — per-method Swagger docs
- `@PreAuthorize` — role-based access (class or method level)

**Controllers Following Standard:** PaymentController, ChatController, BidController, ReviewController, MilestoneController, MaterialController, MaterialOrderController, SupportTicketController, DisputeController

**Controllers Violating Standard:** ProjectController, AdminController, UserController, CmsController, BuilderProfileController (see Violations section)

### Service Layer — Observed Responsibilities

**Standard Pattern:**

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class XxxService {

    private final XxxRepository xxxRepository;
    private final AuditService auditService;
    // Other service/repo dependencies

    @Transactional
    public XxxResponse createXxx(User user, XxxCreateRequest request) {
        SecurityUtils.validateNotSuspended(user);
        // Validate business rules
        // Create entity
        // Save entity
        // Send notifications
        // Log audit
        return XxxResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Page<XxxResponse> getXxxList(User user, Pageable pageable) {
        return xxxRepository.findBy...(pageable)
                .map(XxxResponse::fromEntity);
    }
}
```

**Observed Annotations:**
- `@Service` — all services
- `@RequiredArgsConstructor` — Lombok injection
- `@Slf4j` — Lombok logger
- `@Transactional` — write operations
- `@Transactional(readOnly = true)` — read operations
- `@Async` — non-blocking side effects (AuditService, EmailService)

**Cross-cutting calls in services:**
1. `SecurityUtils.validateNotSuspended(user)` — at start of write methods
2. `auditService.logAction(...)` — after successful state changes
3. `notificationService.notify...(...)` — after relevant events
4. `emailService.send...(...)` — for critical notifications

### Repository Layer — Observed Responsibilities

**Standard Pattern:**

```java
@Repository
public interface XxxRepository extends JpaRepository<Xxx, Long> {

    Optional<Xxx> findByIdAndDeletedFalse(Long id);

    Page<Xxx> findByStatusAndDeletedFalse(XxxStatus status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT x FROM Xxx x WHERE x.id = :id")
    Optional<Xxx> findByIdForUpdate(@Param("id") Long id);

    boolean existsByEmailAndDeletedFalse(String email);
}
```

**Observed Conventions:**
- Extend `JpaRepository<Entity, Long>` — all repositories
- `*AndDeletedFalse` suffix — for soft-delete filtering
- `@Lock(PESSIMISTIC_WRITE)` + `findBy*ForUpdate` — for concurrent operations
- `@Query` for complex queries — JPQL preferred over native SQL
- Spring Data method naming for simple queries

---

## DTO Usage

### Request DTOs — Observed Standard

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class XxxCreateRequest {

    @NotNull(message = "Field is required")
    private Long projectId;

    @NotBlank(message = "Proposal is required")
    @Size(min = 50, max = 5000, message = "Proposal must be between 50 and 5000 characters")
    private String proposal;

    @DecimalMin(value = "0.01", message = "Amount must be positive")
    private BigDecimal amount;
}
```

**Lombok stack:** `@Data` + `@Builder` + `@NoArgsConstructor` + `@AllArgsConstructor`

**Observed in:** BidCreateRequest, ProjectCreateRequest, RegisterRequest, LoginRequest, MaterialCreateRequest, SupportTicketCreateRequest, DisputeCreateRequest, ChangeRequestCreateRequest, DeliveryCreateRequest, and ~10 more

### Response DTOs — Observed Standard

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class XxxResponse {
    private Long id;
    private String name;
    // ... fields
    private LocalDateTime createdAt;

    public static XxxResponse fromEntity(Xxx entity) {
        return XxxResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                // Null-safe nested mapping
                .clientName(entity.getClient() != null ? entity.getClient().getName() : null)
                // JSON array parsing
                .skills(parseJsonArray(entity.getSkills()))
                .build();
    }

    public static XxxResponse summaryFromEntity(Xxx entity) {
        // Lightweight version with fewer fields
    }
}
```

**Static factory methods:** `fromEntity()` (full), `summaryFromEntity()` (lightweight)
**JSON handling:** Private `parseJsonArray()` helper using Jackson ObjectMapper
**Null safety:** Ternary checks on nested relationships

---

## Validation Rules

### Observed Validation Annotations

| Annotation | Usage | Example |
|-----------|-------|---------|
| `@NotNull` | Required fields | `@NotNull(message = "Project ID is required")` |
| `@NotBlank` | Required strings | `@NotBlank(message = "Title is required")` |
| `@Size` | String length | `@Size(min = 10, max = 200, message = "...")` |
| `@Email` | Email format | `@Email(message = "Invalid email format")` |
| `@Min` / `@Max` | Numeric range | `@Min(1) @Max(5)` on ratings |
| `@DecimalMin` | Monetary amounts | `@DecimalMin(value = "0.01")` |
| `@FutureOrPresent` | Date constraints | `@FutureOrPresent` on deadlines |
| `@Valid` | Nested validation | `@Valid @RequestBody XxxRequest` |

### Service-Layer Validation Pattern

```java
// 1. Suspension check
SecurityUtils.validateNotSuspended(user);

// 2. Entity existence
Entity entity = repository.findById(id)
    .orElseThrow(() -> new ResourceNotFoundException("Entity not found: " + id));

// 3. Ownership check
if (!entity.getOwner().getId().equals(user.getId())) {
    throw new UnauthorizedException("Access denied");
}

// 4. Status guard
if (!entity.canBeApproved()) {
    throw new BadRequestException("Entity cannot be approved in current state: " + entity.getStatus());
}

// 5. Business rule
if (amount.compareTo(BigDecimal.ZERO) <= 0) {
    throw new BadRequestException("Amount must be greater than zero");
}
```

**Order:** Suspension → Existence → Ownership → Status → Business rule

---

## Exception Handling

### Custom Exception Hierarchy

```
RuntimeException
├── BadRequestException      → 400  (@ResponseStatus)
├── UnauthorizedException    → 401  (@ResponseStatus)
└── ResourceNotFoundException → 404  (@ResponseStatus)

Spring Exceptions (handled by GlobalExceptionHandler):
├── AccessDeniedException    → 403
├── BadCredentialsException  → 401
├── MethodArgumentNotValidException → 400 (with field errors)
└── MaxUploadSizeExceededException  → 400
```

### Error Response Envelope

```json
{
  "timestamp": "2026-03-27T12:00:00.000Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Human-readable error message",
  "path": "/api/v1/builder/bids",
  "validationErrors": {
    "amount": "Amount must be positive",
    "proposal": "Proposal is required"
  }
}
```

**`validationErrors`** only present for `MethodArgumentNotValidException` (bean validation failures).

### Exception Usage Pattern

| Exception | When to Use |
|-----------|-------------|
| `BadRequestException` | Invalid input, business rule violation, invalid state transition |
| `UnauthorizedException` | Failed auth, wrong owner, suspended account |
| `ResourceNotFoundException` | Entity not found by ID or lookup |
| `IllegalStateException` | Invalid entity state (used sparingly in milestone checks) |

---

## Logging

### Observed Patterns

| Level | Usage | Example |
|-------|-------|---------|
| `log.info()` | Successful state changes | `"Payment released: milestone={}, amount={}"` |
| `log.warn()` | Failed operations, lockout | `"Account locked for user {} after {} attempts"` |
| `log.error()` | Unhandled exceptions | `"Failed to store image"` (in FileStorageService) |
| `log.debug()` | Auth/connection events | `"WebSocket authenticated for user: {}"` |

**Async Audit Logging:**
```java
@Async
public void logAction(User user, String action, String description) {
    // Raw JDBC INSERT to audit_logs table (not JPA)
}
```

**Production config:** `esbuild: { drop: ['console'] }` strips frontend console.log. Backend uses INFO level for `com.builderconnect`, WARN for Spring Security.

---

## Transactions

### Observed Patterns

| Annotation | Usage |
|-----------|-------|
| `@Transactional` | All write operations (create, update, delete, status changes) |
| `@Transactional(readOnly = true)` | All read-only queries |
| `@Transactional(noRollbackFor = UnauthorizedException.class)` | Login (persists fail counter on error) |
| `@Lock(PESSIMISTIC_WRITE)` | Escrow release, lead credit consumption, project award |
| `@Async` | Audit logging, email sending (non-blocking) |

**Transaction scope:** Method-level (not class-level). Each service method declares its own transaction boundary.

**No explicit isolation level** overrides found — uses database default (REPEATABLE READ for MySQL, READ COMMITTED for H2).

---

## Testing

### Observed Test Infrastructure

**Framework:** JUnit 5 + Mockito + Spring Test

**Test files found (4 real tests):**
1. `AuthServiceTest.java` — unit test with Mockito mocks
2. `AuthControllerTest.java` — controller test (UNKNOWN if MockMvc or WebTestClient)
3. `ProjectServiceTest.java` — unit test
4. `BuilderConnectApplicationTests.java` — Spring Boot context load test

**Test naming convention:** `methodName_scenario_expectedBehavior`
```java
@Test
@DisplayName("Should register user successfully")
void register_withValidData_shouldReturnAuthResponse() { ... }
```

**Mock pattern:**
```java
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private AuthService authService;

    @BeforeEach
    void setUp() { /* setup test data */ }
}
```

**Frontend tests:** Vitest configured with `@testing-library/react`, but **0 test files found** in `frontend/src/`.

---

## Violations Found

### Critical Violations

| # | Violation | Files | Evidence |
|---|----------|-------|---------|
| V1 | **Controller injects repositories** | ProjectController, AdminController | `ProjectRepository`, `ProjectAttachmentRepository`, `BuilderProfileRepository` injected directly |
| V2 | **Map instead of typed DTO** (request) | AdminController, UserController, CmsController, ChatController, MilestoneController, SubscriptionController, ContractController, SupportTicketController, DisputeController, MaterialOrderController, BadgeController, ChangeRequestController | 26 endpoints use `Map<String, String>` or `Map<String, Object>` without `@Valid` |
| V3 | **Map instead of typed DTO** (response) | AdminController, PaymentController, BuilderController, BuilderProfileController, CmsController, LeadController, SubscriptionController | ~35 endpoints return `Map<String, Object>` |
| V4 | **Direct entity mutation in controller** | UserController | `user.setName(body.get("name"))` + `userRepository.save(user)` in controller |
| V5 | **Raw entity in response** | NotificationController | `Page<Notification>` returned (entity, not DTO) |
| V6 | **Unsafe type casting** | AdminController | `((Number) request.get("userId")).longValue()` — ClassCastException risk |

### High Violations

| # | Violation | Files | Evidence |
|---|----------|-------|---------|
| V7 | **Missing @Valid** | 26 endpoints | Request body accepted without bean validation |
| V8 | **Missing @PreAuthorize** | ChangeRequestController, NotificationController, UserController | Auth relies on service layer only — no defense-in-depth |
| V9 | **Inconsistent @AuthenticationPrincipal** | AdminController | Read endpoints don't receive admin user; write endpoints do |
| V10 | **Test coverage < 5%** | backend/src/test/ | Only 4 test files for 30 services + 25 controllers |

### Medium Violations

| # | Violation | Files | Evidence |
|---|----------|-------|---------|
| V11 | **Missing Lombok on DTO** | ReviewRequest | Only `@Data`, missing `@Builder` + constructors |
| V12 | **Duplicate endpoints** | BidController | Both list AND paged endpoints for same resource |
| V13 | **AuditService uses JDBC** | AuditService | Raw `JdbcTemplate` INSERT while rest uses JPA |
| V14 | **Inconsistent return types** | Mixed across controllers | Some return `ResponseEntity<DTO>`, others `ResponseEntity<Map>`, others `ResponseEntity<Void>` |
| V15 | **No API response wrapper** | All controllers | No standardized `ApiResponse<T>` envelope — each endpoint returns different shapes |

### Low Violations

| # | Violation | Files | Evidence |
|---|----------|-------|---------|
| V16 | **Hardcoded business rules** | AuthService, PaymentService | `MAX_FAILED_ATTEMPTS = 5`, `platformFeePercentage = 5.0` in code instead of SystemSettings |
| V17 | **Empty package** | `com.builderconnect.websocket` | Package exists but contains no files |
| V18 | **Mixed response status codes** | Various controllers | Some POST endpoints return 200, others return 201 for creation |

---

## Summary: Pattern Compliance by Controller

| Controller | Service-Only Injection | Typed DTOs | @Valid | @PreAuthorize | Compliance |
|-----------|----------------------|-----------|--------|---------------|------------|
| AuthController | YES | YES | YES | N/A (public) | **HIGH** |
| BidController | YES | YES | YES | YES | **HIGH** |
| ReviewController | YES | YES | YES | YES | **HIGH** |
| MaterialController | YES | YES | YES | YES | **HIGH** |
| MaterialOrderController | YES | MIXED | MIXED | MIXED | **MEDIUM** |
| SupportTicketController | YES | MIXED | MIXED | YES | **MEDIUM** |
| DisputeController | YES | MIXED | MIXED | YES | **MEDIUM** |
| ChatController | YES | MIXED | MIXED | YES | **MEDIUM** |
| PaymentController | YES | MAP responses | YES | YES | **MEDIUM** |
| MilestoneController | YES | MAP requests | NO | YES | **LOW** |
| ChangeRequestController | YES | MIXED | MIXED | NO | **LOW** |
| ContractController | YES | MIXED | NO | YES | **LOW** |
| SubscriptionController | YES | MAP | NO | YES | **LOW** |
| LeadController | YES | MAP response | N/A | YES | **LOW** |
| BuilderProfileController | YES | MAP response | NO | YES | **LOW** |
| BuilderController | YES | MAP response | N/A | N/A | **LOW** |
| BadgeController | YES | MIXED | NO | YES | **LOW** |
| NotificationController | YES | RAW ENTITY | NO | NO | **LOW** |
| **ProjectController** | **NO** | MIXED | YES | YES | **LOW** |
| **AdminController** | **NO** | MAP | NO | YES | **LOW** |
| **UserController** | **NO** | MAP | NO | NO | **VERY LOW** |
| **CmsController** | YES | ALL MAP | NO | YES | **VERY LOW** |
