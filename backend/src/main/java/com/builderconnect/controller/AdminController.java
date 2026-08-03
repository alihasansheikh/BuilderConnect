package com.builderconnect.controller;

import com.builderconnect.dto.response.UserResponse;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.enums.VerificationStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.service.AdminService;
import com.builderconnect.service.SystemSettingService;
import com.builderconnect.util.JsonUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for admin operations.
 */
@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
@Tag(name = "Admin", description = "Admin management endpoints")
public class AdminController {

    private final AdminService adminService;
    private final SystemSettingService systemSettingService;
    private final BuilderProfileRepository builderProfileRepository;

    @GetMapping("/metrics")
    @Operation(summary = "Get admin dashboard metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        Map<String, Object> metrics = adminService.getMetrics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/users")
    @Operation(summary = "Get users list")
    public ResponseEntity<Page<UserResponse>> getUsers(
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<UserResponse> users = adminService.getUsers(role, search, pageable);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{id}")
    @Operation(summary = "Get user details (enriched with activity counts, tier and badges)")
    public ResponseEntity<Map<String, Object>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUser(id));
    }

    @PostMapping("/verify-builder")
    @Operation(summary = "Verify a builder")
    public ResponseEntity<UserResponse> verifyBuilder(
            @AuthenticationPrincipal User admin,
            @RequestBody Map<String, Long> request) {
        Long userId = request.get("userId");
        UserResponse user = adminService.verifyBuilder(admin, userId);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/suspend-user")
    @Operation(summary = "Suspend a user")
    public ResponseEntity<UserResponse> suspendUser(
            @AuthenticationPrincipal User admin,
            @RequestBody Map<String, Object> request) {
        Long userId = requireUserId(request);
        String reason = (String) request.get("reason");
        UserResponse user = adminService.suspendUser(admin, userId, reason);
        return ResponseEntity.ok(user);
    }

    /** Raw-Map bodies would otherwise NPE/ClassCastException into a 500 on a bad userId. */
    private static Long requireUserId(Map<String, Object> request) {
        Object value = request != null ? request.get("userId") : null;
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text) {
            try {
                return Long.valueOf(text.trim());
            } catch (NumberFormatException ignored) {
                // handled by the BadRequestException below
            }
        }
        throw new BadRequestException("userId is required and must be numeric");
    }

    @GetMapping("/builders/pending")
    @Operation(summary = "Get builder verification queue (requested=true: PENDING requests; false: not yet requested)")
    public ResponseEntity<Page<Map<String, Object>>> getPendingVerifications(
            @RequestParam(defaultValue = "true") boolean requested,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {

        Page<BuilderProfile> page = requested
                ? builderProfileRepository.findByVerificationStatus(VerificationStatus.PENDING, pageable)
                : builderProfileRepository.findByIsVerifiedFalseAndVerificationStatusIn(
                        List.of(VerificationStatus.UNSUBMITTED, VerificationStatus.REJECTED), pageable);
        return ResponseEntity.ok(page.map(this::toPendingVerificationSummary));
    }

    private Map<String, Object> toPendingVerificationSummary(BuilderProfile bp) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", bp.getId());
        map.put("userId", bp.getUser() != null ? bp.getUser().getId() : null);
        map.put("name", bp.getUser() != null ? bp.getUser().getName() : null);
        map.put("email", bp.getUser() != null ? bp.getUser().getEmail() : null);
        map.put("city", bp.getUser() != null ? bp.getUser().getCity() : null);
        map.put("companyName", bp.getCompanyName());
        map.put("yearsOfExperience", bp.getYearsOfExperience());
        map.put("ntnNumber", bp.getNtnNumber());
        map.put("pecNumber", bp.getPecNumber());
        map.put("verificationStatus", bp.getVerificationStatus());
        map.put("verificationRequestedAt", bp.getVerificationRequestedAt());
        map.put("documents", JsonUtils.parseStringArray(bp.getVerificationDocuments()));
        map.put("createdAt", bp.getCreatedAt());
        return map;
    }

    @PostMapping("/reject-builder-verification")
    @Operation(summary = "Reject a builder's verification request")
    public ResponseEntity<UserResponse> rejectBuilderVerification(
            @AuthenticationPrincipal User admin,
            @RequestBody Map<String, Object> request) {
        Long userId = requireUserId(request);
        String reason = (String) request.get("reason");
        return ResponseEntity.ok(adminService.rejectBuilderVerification(admin, userId, reason));
    }

    @PostMapping("/reject-supplier-verification")
    @Operation(summary = "Reject a supplier's verification request")
    public ResponseEntity<UserResponse> rejectSupplierVerification(
            @AuthenticationPrincipal User admin,
            @RequestBody Map<String, Object> request) {
        Long userId = requireUserId(request);
        String reason = (String) request.get("reason");
        return ResponseEntity.ok(adminService.rejectSupplierVerification(admin, userId, reason));
    }

    @PostMapping("/verify-supplier")
    @Operation(summary = "Verify a supplier")
    public ResponseEntity<UserResponse> verifySupplier(
            @AuthenticationPrincipal User admin,
            @RequestBody Map<String, Long> request) {
        Long userId = request.get("userId");
        UserResponse user = adminService.verifySupplier(admin, userId);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/suppliers/pending")
    @Operation(summary = "Get supplier verification queue (requested=true: PENDING requests; false: not yet requested)")
    public ResponseEntity<Page<Map<String, Object>>> getPendingSuppliers(
            @RequestParam(defaultValue = "true") boolean requested,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(adminService.getPendingSuppliers(requested, pageable));
    }

    @PostMapping("/unsuspend-user")
    @Operation(summary = "Unsuspend a user")
    public ResponseEntity<UserResponse> unsuspendUser(
            @AuthenticationPrincipal User admin,
            @RequestBody Map<String, Long> request) {
        Long userId = request.get("userId");
        UserResponse user = adminService.unsuspendUser(admin, userId);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/revenue-summary")
    @Operation(summary = "Get revenue summary with breakdown and trends")
    public ResponseEntity<Map<String, Object>> getRevenueSummary() {
        return ResponseEntity.ok(adminService.getRevenueSummary());
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "Get audit logs with filters")
    public ResponseEntity<Page<Map<String, Object>>> getAuditLogs(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        // Date-only params (like every other filter endpoint); expand to inclusive day bounds here.
        return ResponseEntity.ok(adminService.getAuditLogs(category, status, action, userId,
                fromDate != null ? fromDate.atStartOfDay() : null,
                toDate != null ? toDate.atTime(23, 59, 59) : null,
                pageable));
    }

    @GetMapping("/moderation-queue")
    @Operation(summary = "Get reviews for moderation oversight (live list by default)")
    public ResponseEntity<Page<Map<String, Object>>> getModerationQueue(
            @RequestParam(defaultValue = "APPROVED") String status,
            @RequestParam(required = false) String reviewType,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminService.getModerationQueue(status, reviewType, minRating, maxRating, pageable));
    }

    @PostMapping("/reviews/{id}/moderate")
    @Operation(summary = "Moderate a review (hide/restore)")
    public ResponseEntity<Map<String, Object>> moderateReview(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String action = request.get("action");
        String notes = request.get("notes");
        return ResponseEntity.ok(adminService.moderateReview(admin, id, action, notes));
    }

    @GetMapping("/settings")
    @Operation(summary = "Get all system settings")
    public ResponseEntity<List<Map<String, Object>>> getSettings() {
        return ResponseEntity.ok(systemSettingService.getAllSettings());
    }

    @PutMapping("/settings/{key}")
    @Operation(summary = "Update a system setting")
    public ResponseEntity<Map<String, Object>> updateSetting(
            @AuthenticationPrincipal User admin,
            @PathVariable String key,
            @RequestBody Map<String, String> request) {
        String value = request.get("value");
        return ResponseEntity.ok(systemSettingService.updateSetting(admin, key, value));
    }
}
