package com.builderconnect.controller;

import com.builderconnect.dto.response.UserResponse;
import com.builderconnect.entity.MaterialOrder;
import com.builderconnect.entity.User;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.MaterialOrderRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.UserRepository;
import com.builderconnect.service.AuditService;
import com.builderconnect.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Controller for user profile management.
 */
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profile endpoints")
public class UserController {

    private static final Set<UserRole> DELETE_BLOCKED_ROLES =
            Set.of(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT);

    /** users.email column width (V1) — the tombstoned address must still fit. */
    private static final int MAX_EMAIL_LENGTH = 100;

    /** Live project commitments (as client or awarded builder) that block self-deletion. */
    private static final List<ProjectStatus> ACTIVE_PROJECT_STATUSES = List.of(
            ProjectStatus.AWARDED, ProjectStatus.CONTRACT_PENDING,
            ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD);

    /** In-flight marketplace orders (as buyer or supplier) that block self-deletion. */
    private static final List<MaterialOrder.OrderStatus> OPEN_ORDER_STATUSES = List.of(
            MaterialOrder.OrderStatus.PENDING_CONFIRMATION, MaterialOrder.OrderStatus.CONFIRMED,
            MaterialOrder.OrderStatus.PROCESSING, MaterialOrder.OrderStatus.READY_FOR_DELIVERY,
            MaterialOrder.OrderStatus.OUT_FOR_DELIVERY);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;
    private final ProjectRepository projectRepository;
    private final MaterialOrderRepository materialOrderRepository;

    @PutMapping("/me")
    @Operation(summary = "Update current user profile")
    public ResponseEntity<UserResponse> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {

        if (body.containsKey("name") && body.get("name") != null && !body.get("name").isBlank()) {
            user.setName(body.get("name"));
        }
        if (body.containsKey("phone")) {
            user.setPhone(body.get("phone"));
        }
        if (body.containsKey("city")) {
            user.setCity(body.get("city"));
        }
        if (body.containsKey("address")) {
            user.setAddress(body.get("address"));
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(UserResponse.fromEntity(saved));
    }

    @PostMapping("/me/profile-image")
    @Operation(summary = "Upload profile picture")
    public ResponseEntity<Map<String, String>> uploadProfileImage(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {

        // Delete old image if exists
        fileStorageService.deleteOldProfileImage(user.getProfileImageUrl());

        String imageUrl = fileStorageService.storeProfileImage(file, user.getId());
        user.setProfileImageUrl(imageUrl);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("profileImageUrl", imageUrl));
    }

    @DeleteMapping("/me/profile-image")
    @Operation(summary = "Remove profile picture")
    public ResponseEntity<Map<String, String>> deleteProfileImage(
            @AuthenticationPrincipal User user) {

        fileStorageService.deleteOldProfileImage(user.getProfileImageUrl());
        user.setProfileImageUrl(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Profile image removed"));
    }

    @PostMapping("/me/change-password")
    @Operation(summary = "Change current user password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || currentPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new BadRequestException("currentPassword and newPassword are required and cannot be blank");
        }

        // A wrong current password is a validation failure (400), not an auth failure (401) —
        // returning 401 would trip the axios interceptor into a pointless token refresh + retry.
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Incorrect password");
        }

        if (newPassword.length() < 8) {
            throw new BadRequestException("New password must be at least 8 characters");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @DeleteMapping("/me")
    @Operation(summary = "Delete current user account (soft delete)")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {

        if (DELETE_BLOCKED_ROLES.contains(user.getRole())) {
            throw new BadRequestException(
                "Administrative and support accounts cannot be self-deleted. Contact a super administrator.");
        }

        String password = body != null ? body.get("password") : null;
        if (password == null || password.isBlank()) {
            throw new BadRequestException("Password is required to delete your account");
        }

        // 400 (not 401) so the axios interceptor doesn't waste a token refresh + retry.
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadRequestException("Incorrect password");
        }

        // Hard-block deletion while the user is still committed to live work — a tombstoned
        // account would strand the counterparty. They must wind these down first.
        long activeProjects = projectRepository.countActiveForUser(user.getId(), ACTIVE_PROJECT_STATUSES);
        if (activeProjects > 0) {
            throw new BadRequestException("You have " + activeProjects + " active project"
                + (activeProjects == 1 ? "" : "s") + " - complete or cancel them first.");
        }
        long openOrders = materialOrderRepository.countOpenForUser(user.getId(), OPEN_ORDER_STATUSES);
        if (openOrders > 0) {
            throw new BadRequestException("You have " + openOrders + " open marketplace order"
                + (openOrders == 1 ? "" : "s") + " - complete or cancel them first.");
        }

        // users.email is UNIQUE at the DB level across deleted rows too, so the address must be
        // tombstoned or the user could never re-register with it. The id prefix keeps the
        // tombstone unique even after truncation to the column's 100 chars.
        String originalEmail = user.getEmail();
        String tombstonedEmail = "deleted-" + user.getId() + "-" + originalEmail;
        user.setEmail(tombstonedEmail.length() > MAX_EMAIL_LENGTH
            ? tombstonedEmail.substring(0, MAX_EMAIL_LENGTH)
            : tombstonedEmail);
        user.setDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        user.setRefreshToken(null);
        user.setRefreshTokenExpiresAt(null);
        userRepository.save(user);

        auditService.logAction(user, "ACCOUNT_DELETED", "USER", user.getId(),
            "User deleted their own account (email: " + originalEmail + ")");

        return ResponseEntity.ok(Map.of("message", "Account deleted"));
    }
}