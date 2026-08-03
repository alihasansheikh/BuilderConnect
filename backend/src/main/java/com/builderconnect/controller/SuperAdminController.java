package com.builderconnect.controller;

import com.builderconnect.dto.response.UserResponse;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Super-admin exclusive operations: admin account management. This is the
 * controller behind the /v1/super-admin/** SecurityConfig rule — plain
 * ADMINs cannot reach any of these endpoints.
 */
@RestController
@RequestMapping("/v1/super-admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Super Admin", description = "Super-admin exclusive admin-management endpoints")
public class SuperAdminController {

    private final AdminService adminService;

    @PostMapping("/users/admins")
    @Operation(summary = "Create a team account — ADMIN or SUPPORT_AGENT (email pre-verified)")
    public ResponseEntity<UserResponse> createAdmin(
            @AuthenticationPrincipal User superAdmin,
            @RequestBody Map<String, String> request) {
        UserResponse admin = adminService.createAdminUser(superAdmin,
                request.get("name"), request.get("email"),
                request.get("phone"), request.get("password"),
                parseRole(request.get("role")));
        return ResponseEntity.ok(admin);
    }

    @GetMapping("/users/admins")
    @Operation(summary = "List team accounts (admins, super-admins, support agents)")
    public ResponseEntity<List<UserResponse>> listAdmins() {
        return ResponseEntity.ok(adminService.getTeamUsers());
    }

    @PostMapping("/users/{id}/suspend")
    @Operation(summary = "Suspend a user (may target ADMIN, never SUPER_ADMIN or self)")
    public ResponseEntity<UserResponse> suspendUser(
            @AuthenticationPrincipal User superAdmin,
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String reason = request != null ? request.get("reason") : null;
        return ResponseEntity.ok(adminService.suspendUserAsSuperAdmin(superAdmin, id, reason));
    }

    @PostMapping("/users/{id}/unsuspend")
    @Operation(summary = "Unsuspend a user (may target ADMIN, never SUPER_ADMIN or self)")
    public ResponseEntity<UserResponse> unsuspendUser(
            @AuthenticationPrincipal User superAdmin,
            @PathVariable Long id) {
        return ResponseEntity.ok(adminService.unsuspendUserAsSuperAdmin(superAdmin, id));
    }

    private static UserRole parseRole(String role) {
        if (role == null || role.isBlank()) {
            return UserRole.ADMIN;
        }
        try {
            return UserRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + role);
        }
    }
}
