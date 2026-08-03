package com.builderconnect.controller;

import com.builderconnect.dto.response.UserProfileResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Aggregate profile page (LinkedIn/Upwork style). Authenticated — falls under
 * {@code anyRequest().authenticated()} in SecurityConfig; contact details are hidden
 * from non-owner/non-admin viewers in {@link ProfileService}.
 */
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@Tag(name = "Profiles", description = "Aggregate user profile page")
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/{userId}/profile")
    @Operation(summary = "Get a user's aggregate profile page")
    public ResponseEntity<UserProfileResponse> getUserProfile(
            @AuthenticationPrincipal User viewer,
            @PathVariable Long userId) {
        return ResponseEntity.ok(profileService.getUserProfile(userId, viewer));
    }
}
