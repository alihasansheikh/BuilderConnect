package com.builderconnect.controller;

import com.builderconnect.dto.response.BadgeResponse;
import com.builderconnect.dto.response.UserBadgeResponse;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.service.BadgeService;
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
 * Controller for badge management.
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Badges", description = "Badge listing, awarding, and revocation endpoints")
public class BadgeController {

    private final BadgeService badgeService;

    @GetMapping("/badges")
    @Operation(summary = "List all active badges")
    public ResponseEntity<List<BadgeResponse>> getAllBadges() {
        List<BadgeResponse> badges = badgeService.getAllBadges();
        return ResponseEntity.ok(badges);
    }

    @GetMapping("/users/{userId}/badges")
    @Operation(summary = "Get badges earned by a user")
    public ResponseEntity<List<UserBadgeResponse>> getUserBadges(@PathVariable Long userId) {
        List<UserBadgeResponse> badges = badgeService.getUserBadges(userId);
        return ResponseEntity.ok(badges);
    }

    @PostMapping("/admin/badges/{badgeId}/award")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Award a badge to a user (admin only)")
    public ResponseEntity<UserBadgeResponse> awardBadge(
            @AuthenticationPrincipal User admin,
            @PathVariable Long badgeId,
            @RequestBody Map<String, Object> body) {

        Object rawUserId = body.get("userId");
        if (rawUserId == null) {
            throw new BadRequestException("userId is required");
        }
        Long userId;
        try {
            userId = Long.valueOf(rawUserId.toString());
        } catch (NumberFormatException e) {
            throw new BadRequestException("userId must be a valid number");
        }
        String notes = body.get("notes") != null ? body.get("notes").toString() : null;

        UserBadgeResponse response = badgeService.awardBadge(admin, userId, badgeId, notes);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/admin/badges/{userId}/{badgeId}/revoke")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Revoke a badge from a user (admin only)")
    public ResponseEntity<Map<String, String>> revokeBadge(
            @AuthenticationPrincipal User admin,
            @PathVariable Long userId,
            @PathVariable Long badgeId) {

        badgeService.revokeBadge(admin, userId, badgeId);
        return ResponseEntity.ok(Map.of("message", "Badge revoked successfully"));
    }
}
