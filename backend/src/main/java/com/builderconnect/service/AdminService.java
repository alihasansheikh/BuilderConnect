package com.builderconnect.service;

import com.builderconnect.dto.response.UserResponse;
import com.builderconnect.entity.AuditLog;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.Dispute;
import com.builderconnect.entity.Material;
import com.builderconnect.entity.Review;
import com.builderconnect.entity.SubscriptionPayment;
import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.entity.SupportTicket;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.enums.VerificationStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.AuditLogRepository;
import com.builderconnect.repository.BidRepository;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.DisputeRepository;
import com.builderconnect.repository.ReviewRepository;
import com.builderconnect.repository.SubscriptionPaymentRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.builderconnect.repository.SupportTicketRepository;
import com.builderconnect.repository.UserRepository;
import com.builderconnect.util.JsonUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for admin operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    /** Not-yet-requested statuses shown on the admin "Not requested" tab. */
    private static final List<VerificationStatus> NOT_REQUESTED_STATUSES =
        List.of(VerificationStatus.UNSUBMITTED, VerificationStatus.REJECTED);

    /**
     * Roles a super-admin may provision through the team-management endpoint —
     * self-registration is limited to CLIENT/BUILDER/SUPPLIER, so this endpoint is
     * the only path onto the platform for team accounts.
     */
    private static final Set<UserRole> CREATABLE_TEAM_ROLES =
        Set.of(UserRole.ADMIN, UserRole.SUPPORT_AGENT);

    /** Sort properties the moderation queue accepts from clients. */
    private static final Set<String> MODERATION_SORT_PROPERTIES = Set.of("createdAt", "overallRating");

    private final UserRepository userRepository;
    private final BuilderProfileRepository builderProfileRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final ProjectRepository projectRepository;
    private final BidRepository bidRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final ReviewRepository reviewRepository;
    private final MaterialRepository materialRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final DisputeRepository disputeRepository;
    private final ReviewService reviewService;
    private final BadgeService badgeService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final AdminRevenueService adminRevenueService;

    @Transactional(readOnly = true)
    public Map<String, Object> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        // User counts by role
        Map<String, Long> userCounts = new HashMap<>();
        userCounts.put("total", userRepository.count());
        userCounts.put("clients", userRepository.countByRole(UserRole.CLIENT));
        userCounts.put("builders", userRepository.countByRole(UserRole.BUILDER));
        userCounts.put("suppliers", userRepository.countByRole(UserRole.SUPPLIER));
        userCounts.put("admins", userRepository.countByRole(UserRole.ADMIN) + userRepository.countByRole(UserRole.SUPER_ADMIN));
        metrics.put("users", userCounts);

        // Project counts by status
        Map<String, Long> projectCounts = new HashMap<>();
        projectCounts.put("total", projectRepository.count());
        projectCounts.put("open", projectRepository.countByStatus(ProjectStatus.OPEN));
        projectCounts.put("bidding", projectRepository.countByStatus(ProjectStatus.BIDDING));
        projectCounts.put("inProgress", projectRepository.countByStatus(ProjectStatus.IN_PROGRESS));
        projectCounts.put("completed", projectRepository.countByStatus(ProjectStatus.COMPLETED));
        metrics.put("projects", projectCounts);

        // Bid counts
        Map<String, Long> bidCounts = new HashMap<>();
        bidCounts.put("total", bidRepository.count());
        metrics.put("bids", bidCounts);

        // Verified builders count
        long verifiedBuilders = builderProfileRepository.countByIsVerifiedTrue();
        metrics.put("verifiedBuilders", verifiedBuilders);

        // Subscription revenue metrics (Stripe-paid builder subscriptions)
        Map<String, Object> subscriptionCounts = new HashMap<>();
        subscriptionCounts.put("total", subscriptionPaymentRepository.count());
        subscriptionCounts.put("totalRevenue", subscriptionPaymentRepository.getTotalRevenue());
        subscriptionCounts.put("thisMonth", sumAmounts(
            subscriptionPaymentRepository.findByPaidAtAfterOrderByPaidAtDesc(startOfCurrentMonth())));
        metrics.put("subscriptions", subscriptionCounts);

        // Review metrics (reviews publish instantly; moderation is hide-only oversight)
        Map<String, Object> reviewCounts = new HashMap<>();
        reviewCounts.put("total", reviewRepository.count());
        reviewCounts.put("hidden", reviewRepository.countByStatus(Review.ReviewStatus.HIDDEN));
        metrics.put("reviews", reviewCounts);

        // Pending verification requests (builders + suppliers awaiting review)
        metrics.put("pendingVerifications",
            builderProfileRepository.countByVerificationStatus(VerificationStatus.PENDING)
                + supplierProfileRepository.countByVerificationStatus(VerificationStatus.PENDING));

        // Support workload — agents work these day-to-day; admins oversee escalations
        Map<String, Long> ticketCounts = new HashMap<>();
        ticketCounts.put("open", supportTicketRepository.countByStatus(SupportTicket.TicketStatus.OPEN));
        ticketCounts.put("inProgress", supportTicketRepository.countByStatus(SupportTicket.TicketStatus.IN_PROGRESS));
        ticketCounts.put("escalated", supportTicketRepository.countByEscalatedTrue());
        metrics.put("tickets", ticketCounts);

        Map<String, Long> disputeCounts = new HashMap<>();
        disputeCounts.put("filed", disputeRepository.countByStatus(Dispute.DisputeStatus.FILED));
        disputeCounts.put("underReview", disputeRepository.countByStatus(Dispute.DisputeStatus.UNDER_REVIEW));
        disputeCounts.put("escalated", disputeRepository.countByStatus(Dispute.DisputeStatus.ESCALATED));
        metrics.put("disputes", disputeCounts);

        return metrics;
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getUsers(UserRole role, String search, Pageable pageable) {
        Page<User> users;

        if (search != null && !search.isBlank() && role != null) {
            users = userRepository.searchUsersByRole(role, search, pageable);
        } else if (search != null && !search.isBlank()) {
            users = userRepository.searchUsers(search, pageable);
        } else if (role != null) {
            users = userRepository.findByRoleAndDeletedFalse(role, pageable);
        } else {
            users = userRepository.findByDeletedFalse(pageable);
        }

        return users.map(UserResponse::fromEntity);
    }

    @Transactional
    public UserResponse verifyBuilder(User admin, Long userId) {
        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.BUILDER) {
            throw new BadRequestException("User is not a builder");
        }

        BuilderProfile profile = user.getBuilderProfile();
        if (profile == null) {
            throw new BadRequestException("Builder profile not found");
        }

        if (profile.getIsVerified()) {
            throw new BadRequestException("Builder is already verified");
        }

        profile.setIsVerified(true);
        profile.setVerifiedAt(LocalDateTime.now());
        profile.setVerifiedBy(admin.getId());
        profile.setVerificationStatus(VerificationStatus.VERIFIED);
        profile.setVerificationRejectionReason(null);
        builderProfileRepository.save(profile);

        notificationService.createNotification(user, NotificationType.ACCOUNT_VERIFIED,
            "Account Verified",
            "Your builder account has been verified. Verified builders rank higher in search and win more clients.",
            "USER", userId, "/builder/dashboard");

        emailService.sendBuilderVerifiedEmail(user, profile.getCompanyName());

        auditService.logAction(admin, "BUILDER_VERIFIED", "USER", userId,
            "Verified builder: " + user.getName());

        log.info("Admin {} verified builder {}", admin.getEmail(), user.getEmail());

        return UserResponse.fromEntity(user);
    }

    @Transactional
    public UserResponse suspendUser(User admin, Long userId, String reason) {
        requireSuspensionReason(reason);

        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.isAdmin()) {
            throw new BadRequestException("Cannot suspend admin users");
        }

        if (user.getSuspended()) {
            throw new BadRequestException("User is already suspended");
        }

        user.setSuspended(true);
        user.setSuspensionReason(reason);
        userRepository.save(user);

        emailService.sendAccountSuspendedEmail(user, reason);

        auditService.logAction(admin, "USER_SUSPENDED", "USER", userId,
            "Suspended user: " + user.getName() + " - Reason: " + reason);

        log.info("Admin {} suspended user {} for: {}", admin.getEmail(), user.getEmail(), reason);

        return UserResponse.fromEntity(user);
    }

    @Transactional
    public UserResponse unsuspendUser(User admin, Long userId) {
        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.getSuspended()) {
            throw new BadRequestException("User is not suspended");
        }

        user.setSuspended(false);
        user.setSuspensionReason(null);
        userRepository.save(user);

        emailService.sendAccountUnsuspendedEmail(user);

        auditService.logAction(admin, "USER_UNSUSPENDED", "USER", userId,
            "Unsuspended user: " + user.getName());

        log.info("Admin {} unsuspended user {}", admin.getEmail(), user.getEmail());

        return UserResponse.fromEntity(user);
    }

    /**
     * User detail enriched with activity counts, effective subscription tier and
     * earned badges. Additive on top of the plain UserResponse shape.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getUser(Long userId) {
        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Map<String, Object> detail = objectMapper.convertValue(
            UserResponse.fromEntity(user), new TypeReference<Map<String, Object>>() {});

        long projectCount = switch (user.getRole()) {
            case CLIENT -> projectRepository.countByClientId(userId);
            case BUILDER -> projectRepository.countByBuilderId(userId);
            default -> 0L;
        };
        detail.put("projectCount", projectCount);
        detail.put("bidCount", user.getRole() == UserRole.BUILDER ? bidRepository.countByBuilderId(userId) : 0L);
        detail.put("activeSubscriptionTier",
            user.getBuilderProfile() != null ? user.getBuilderProfile().getEffectiveTier() : null);
        detail.put("badges", badgeService.getUserBadges(userId));

        return detail;
    }

    @Transactional
    public UserResponse verifySupplier(User admin, Long userId) {
        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.SUPPLIER) {
            throw new BadRequestException("User is not a supplier");
        }

        SupplierProfile profile = user.getSupplierProfile();
        if (profile == null) {
            throw new BadRequestException("Supplier profile not found");
        }

        if (Boolean.TRUE.equals(profile.getIsVerified())) {
            throw new BadRequestException("Supplier is already verified");
        }

        profile.setIsVerified(true);
        profile.setVerifiedAt(LocalDateTime.now());
        profile.setVerificationStatus(VerificationStatus.VERIFIED);
        profile.setVerificationRejectionReason(null);
        supplierProfileRepository.save(profile);

        notificationService.createNotification(user, NotificationType.ACCOUNT_VERIFIED,
            "Account Verified",
            "Your supplier account has been verified. Verified suppliers gain more trust from buyers.",
            "USER", userId, "/supplier/dashboard");

        emailService.sendSupplierVerifiedEmail(user, profile.getCompanyName());

        auditService.logAction(admin, "SUPPLIER_VERIFIED", "USER", userId,
            "Verified supplier: " + user.getName());

        log.info("Admin {} verified supplier {}", admin.getEmail(), user.getEmail());

        return UserResponse.fromEntity(user);
    }

    /**
     * Reject a builder's PENDING verification request with a reason.
     * Modeled on suspendUser; the builder may resubmit afterwards.
     */
    @Transactional
    public UserResponse rejectBuilderVerification(User admin, Long userId, String reason) {
        requireRejectionReason(reason);

        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.BUILDER) {
            throw new BadRequestException("User is not a builder");
        }

        BuilderProfile profile = user.getBuilderProfile();
        if (profile == null) {
            throw new BadRequestException("Builder profile not found");
        }

        if (profile.getVerificationStatus() != VerificationStatus.PENDING) {
            throw new BadRequestException("No pending verification request for this builder");
        }

        profile.setVerificationStatus(VerificationStatus.REJECTED);
        profile.setVerificationRejectionReason(reason);
        builderProfileRepository.save(profile);

        notificationService.createNotification(user, NotificationType.VERIFICATION_REJECTED,
            "Verification Request Rejected",
            "Your builder verification request was rejected: " + reason
                + ". You can update your profile and submit a new request.",
            "USER", userId, "/profile");

        emailService.sendVerificationRejectedEmail(user, reason);

        auditService.logAction(admin, "BUILDER_VERIFICATION_REJECTED", "USER", userId,
            "Rejected builder verification: " + user.getName() + " - Reason: " + reason);

        log.info("Admin {} rejected builder verification for {}: {}", admin.getEmail(), user.getEmail(), reason);

        return UserResponse.fromEntity(user);
    }

    /**
     * Reject a supplier's PENDING verification request with a reason.
     */
    @Transactional
    public UserResponse rejectSupplierVerification(User admin, Long userId, String reason) {
        requireRejectionReason(reason);

        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.SUPPLIER) {
            throw new BadRequestException("User is not a supplier");
        }

        SupplierProfile profile = user.getSupplierProfile();
        if (profile == null) {
            throw new BadRequestException("Supplier profile not found");
        }

        if (profile.getVerificationStatus() != VerificationStatus.PENDING) {
            throw new BadRequestException("No pending verification request for this supplier");
        }

        profile.setVerificationStatus(VerificationStatus.REJECTED);
        profile.setVerificationRejectionReason(reason);
        supplierProfileRepository.save(profile);

        notificationService.createNotification(user, NotificationType.VERIFICATION_REJECTED,
            "Verification Request Rejected",
            "Your supplier verification request was rejected: " + reason
                + ". You can update your profile and submit a new request.",
            "USER", userId, "/profile");

        emailService.sendVerificationRejectedEmail(user, reason);

        auditService.logAction(admin, "SUPPLIER_VERIFICATION_REJECTED", "USER", userId,
            "Rejected supplier verification: " + user.getName() + " - Reason: " + reason);

        log.info("Admin {} rejected supplier verification for {}: {}", admin.getEmail(), user.getEmail(), reason);

        return UserResponse.fromEntity(user);
    }

    private static void requireRejectionReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("A rejection reason is required");
        }
    }

    /**
     * Suppliers on the admin Verifications page (mirror of the builders/pending list):
     * requested=true -> PENDING requests; requested=false -> not yet requested
     * (unverified with status UNSUBMITTED or REJECTED).
     */
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getPendingSuppliers(boolean requested, Pageable pageable) {
        Page<SupplierProfile> page = requested
            ? supplierProfileRepository.findByVerificationStatus(VerificationStatus.PENDING, pageable)
            : supplierProfileRepository.findByIsVerifiedFalseAndVerificationStatusIn(
                NOT_REQUESTED_STATUSES, pageable);
        return page.map(this::toPendingSupplierSummary);
    }

    private Map<String, Object> toPendingSupplierSummary(SupplierProfile sp) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", sp.getId());
        map.put("userId", sp.getUser() != null ? sp.getUser().getId() : null);
        map.put("name", sp.getUser() != null ? sp.getUser().getName() : null);
        map.put("email", sp.getUser() != null ? sp.getUser().getEmail() : null);
        map.put("city", sp.getUser() != null ? sp.getUser().getCity() : null);
        map.put("companyName", sp.getCompanyName());
        map.put("businessRegistrationNumber", sp.getBusinessRegistrationNumber());
        map.put("verificationStatus", sp.getVerificationStatus());
        map.put("verificationRequestedAt", sp.getVerificationRequestedAt());
        map.put("documents", JsonUtils.parseStringArray(sp.getVerificationDocuments()));
        map.put("createdAt", sp.getCreatedAt());
        return map;
    }

    // ---------------------------------------------------------------
    // Super-admin only operations (exposed via SuperAdminController)
    // ---------------------------------------------------------------

    /**
     * Create a new team account — ADMIN or SUPPORT_AGENT (SUPER_ADMIN only).
     * Email is pre-verified — these accounts are provisioned, not self-registered.
     */
    @Transactional
    public UserResponse createAdminUser(User superAdmin, String name, String email,
                                        String phone, String password, UserRole role) {
        if (role == null || !CREATABLE_TEAM_ROLES.contains(role)) {
            throw new BadRequestException("Role must be ADMIN or SUPPORT_AGENT");
        }
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Name is required");
        }
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        if (password == null || password.length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters");
        }
        if (userRepository.existsByEmailAndDeletedFalse(email)) {
            throw new BadRequestException("Email is already registered");
        }

        User admin = User.builder()
            .email(email)
            .password(passwordEncoder.encode(password))
            .name(name)
            .phone(phone)
            .role(role)
            .emailVerified(true)
            .active(true)
            .build();
        admin = userRepository.save(admin);

        emailService.sendTeamWelcomeEmail(admin, role.getDisplayName());

        String action = role.name() + "_CREATED";
        auditService.logAction(superAdmin, action, "USER", admin.getId(),
            "Created " + role.getDisplayName() + " account: " + admin.getEmail());

        log.info("Super-admin {} created {} account {}", superAdmin.getEmail(), role, admin.getEmail());

        return UserResponse.fromEntity(admin);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getTeamUsers() {
        return userRepository
            .findByRoleInAndDeletedFalseOrderByCreatedAtDesc(
                List.of(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT))
            .stream()
            .map(UserResponse::fromEntity)
            .toList();
    }

    /**
     * Suspend a user as SUPER_ADMIN — may target ADMIN accounts (unlike the
     * regular admin path), but never a SUPER_ADMIN and never oneself.
     */
    @Transactional
    public UserResponse suspendUserAsSuperAdmin(User superAdmin, Long userId, String reason) {
        requireSuspensionReason(reason);

        User user = findSuperAdminTarget(superAdmin, userId);

        if (user.getSuspended()) {
            throw new BadRequestException("User is already suspended");
        }

        user.setSuspended(true);
        user.setSuspensionReason(reason);
        userRepository.save(user);

        emailService.sendAccountSuspendedEmail(user, reason);

        auditService.logAction(superAdmin, "USER_SUSPENDED", "USER", userId,
            "Suspended user: " + user.getName() + " - Reason: " + reason);

        log.info("Super-admin {} suspended user {} for: {}", superAdmin.getEmail(), user.getEmail(), reason);

        return UserResponse.fromEntity(user);
    }

    @Transactional
    public UserResponse unsuspendUserAsSuperAdmin(User superAdmin, Long userId) {
        User user = findSuperAdminTarget(superAdmin, userId);

        if (!user.getSuspended()) {
            throw new BadRequestException("User is not suspended");
        }

        user.setSuspended(false);
        user.setSuspensionReason(null);
        userRepository.save(user);

        emailService.sendAccountUnsuspendedEmail(user);

        auditService.logAction(superAdmin, "USER_UNSUSPENDED", "USER", userId,
            "Unsuspended user: " + user.getName());

        log.info("Super-admin {} unsuspended user {}", superAdmin.getEmail(), user.getEmail());

        return UserResponse.fromEntity(user);
    }

    private static void requireSuspensionReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("A suspension reason is required");
        }
    }

    private User findSuperAdminTarget(User superAdmin, Long userId) {
        User user = userRepository.findByIdAndDeletedFalse(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == UserRole.SUPER_ADMIN) {
            throw new BadRequestException("Cannot act on a super-admin account");
        }
        if (user.getId().equals(superAdmin.getId())) {
            throw new BadRequestException("Cannot act on your own account");
        }
        return user;
    }

    /**
     * Subscription revenue summary (Stripe-paid builder subscriptions). Delegated to
     * {@link AdminRevenueService}; kept here so the admin controller's API is unchanged.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getRevenueSummary() {
        return adminRevenueService.getRevenueSummary();
    }

    private static LocalDateTime startOfCurrentMonth() {
        return YearMonth.now().atDay(1).atStartOfDay();
    }

    private static BigDecimal sumAmounts(List<SubscriptionPayment> payments) {
        return payments.stream()
            .map(SubscriptionPayment::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Search audit logs with filters.
     */
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAuditLogs(String category, String status, String action, Long userId,
                                                    LocalDateTime fromDate, LocalDateTime toDate,
                                                    Pageable pageable) {
        AuditLog.ActionCategory cat = null;
        if (category != null && !category.isBlank()) {
            try {
                cat = AuditLog.ActionCategory.valueOf(category);
            } catch (IllegalArgumentException e) {
                // ignore invalid category
            }
        }

        AuditLog.AuditStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try {
                statusFilter = AuditLog.AuditStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                // ignore invalid status
            }
        }

        String actionFilter = (action != null && !action.isBlank()) ? action : null;

        Page<AuditLog> logs = auditLogRepository.searchAuditLogs(cat, statusFilter, actionFilter, userId, fromDate, toDate, pageable);
        return logs.map(this::auditLogToMap);
    }

    /**
     * Reviews for moderation oversight. Reviews publish instantly, so the
     * default view is the APPROVED (live) list; HIDDEN shows what moderators
     * have taken down.
     */
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getModerationQueue(String status, String reviewType,
                                                        Integer minRating, Integer maxRating,
                                                        Pageable pageable) {
        Review.ReviewStatus reviewStatus;
        try {
            reviewStatus = Review.ReviewStatus.valueOf(status);
        } catch (IllegalArgumentException | NullPointerException e) {
            reviewStatus = Review.ReviewStatus.APPROVED;
        }

        Review.ReviewType typeFilter = null;
        try {
            typeFilter = (reviewType == null || reviewType.isBlank()) ? null : Review.ReviewType.valueOf(reviewType);
        } catch (IllegalArgumentException e) {
            // invalid type → no filter
        }

        Page<Review> reviews = reviewRepository.searchForModeration(
                reviewStatus, typeFilter, minRating, maxRating, whitelistModerationSort(pageable));

        List<Long> materialIds = reviews.getContent().stream()
                .map(Review::getMaterialId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, String> materialNames = materialIds.isEmpty() ? Map.of()
                : materialRepository.findAllById(materialIds).stream()
                        .collect(Collectors.toMap(Material::getId, Material::getName));

        return reviews.map(review -> reviewToMap(review, materialNames));
    }

    /** The moderation query has no ORDER BY, so an unvetted client sort would reach SQL directly. */
    private Pageable whitelistModerationSort(Pageable pageable) {
        boolean allowed = pageable.getSort().isSorted()
                && pageable.getSort().stream()
                        .allMatch(order -> MODERATION_SORT_PROPERTIES.contains(order.getProperty()));
        if (allowed) {
            return pageable;
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    /**
     * Moderate a review: HIDE takes a live review down, RESTORE brings it back.
     * Legacy APPROVE/REJECT actions are accepted as RESTORE/HIDE synonyms.
     */
    @Transactional
    public Map<String, Object> moderateReview(User admin, Long reviewId, String action, String notes) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));

        if ("HIDE".equalsIgnoreCase(action) || "REJECT".equalsIgnoreCase(action)) {
            review.hide(admin.getId(), notes);
            log.info("Admin {} hid review {} - reason: {}", admin.getEmail(), reviewId, notes);
        } else if ("RESTORE".equalsIgnoreCase(action) || "APPROVE".equalsIgnoreCase(action)) {
            review.restore();
            log.info("Admin {} restored review {}", admin.getEmail(), reviewId);
        } else {
            throw new BadRequestException("Invalid moderation action: " + action);
        }

        reviewRepository.save(review);

        // A status flip changes what counts toward the rating rollups — recompute exactly.
        if (review.getMaterialId() != null) {
            reviewService.recomputeMaterialRollups(review.getMaterialId(), review.getReviewee().getId());
        } else {
            reviewService.recomputeBuilderRollups(review.getReviewee().getId());
        }

        auditService.logAction(admin, "REVIEW_MODERATED", "REVIEW", reviewId,
                action + " review #" + reviewId + (notes != null ? " - " + notes : ""));

        return reviewToMap(review);
    }

    private Map<String, Object> auditLogToMap(AuditLog log) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", log.getId());
        map.put("userId", log.getUserId());
        map.put("userEmail", log.getUserEmail());
        map.put("userRole", log.getUserRole());
        map.put("action", log.getAction());
        map.put("category", log.getActionCategory());
        map.put("entityType", log.getEntityType());
        map.put("entityId", log.getEntityId());
        map.put("description", log.getDescription());
        map.put("oldValues", log.getOldValues());
        map.put("newValues", log.getNewValues());
        map.put("ipAddress", log.getIpAddress());
        map.put("status", log.getStatus());
        map.put("createdAt", log.getCreatedAt());
        return map;
    }

    private Map<String, Object> reviewToMap(Review review) {
        Map<Long, String> materialNames = review.getMaterialId() == null ? Map.of()
                : materialRepository.findById(review.getMaterialId())
                        .map(m -> Map.of(m.getId(), m.getName()))
                        .orElse(Map.of());
        return reviewToMap(review, materialNames);
    }

    private Map<String, Object> reviewToMap(Review review, Map<Long, String> materialNames) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", review.getId());
        map.put("reviewerName", review.getReviewer() != null ? review.getReviewer().getName() : null);
        map.put("revieweeName", review.getReviewee() != null ? review.getReviewee().getName() : null);
        map.put("reviewType", review.getReviewType());
        map.put("overallRating", review.getOverallRating());
        map.put("title", review.getTitle());
        map.put("comment", review.getComment());
        map.put("materialName", review.getMaterialId() != null ? materialNames.get(review.getMaterialId()) : null);
        map.put("status", review.getStatus());
        map.put("moderationNotes", review.getModerationNotes());
        map.put("createdAt", review.getCreatedAt());
        return map;
    }
}
