package com.builderconnect.controller;

import com.builderconnect.dto.request.BuilderProfileUpdateRequest;
import com.builderconnect.dto.request.VerificationRequest;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.User;
import com.builderconnect.util.JsonUtils;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.service.BuilderAnalyticsService;
import com.builderconnect.service.FileStorageService;
import com.builderconnect.service.VerificationRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for builder profile self-management.
 */
@RestController
@RequestMapping("/v1/builder/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('BUILDER')")
@Tag(name = "Builder Profile", description = "Builder self-service profile endpoints")
public class BuilderProfileController {

    private final BuilderProfileRepository builderProfileRepository;
    private final BuilderAnalyticsService builderAnalyticsService;
    private final FileStorageService fileStorageService;
    private final VerificationRequestService verificationRequestService;

    @GetMapping("/profile")
    @Operation(summary = "Get my builder profile")
    public ResponseEntity<Map<String, Object>> getMyProfile(@AuthenticationPrincipal User user) {
        BuilderProfile profile = builderProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));
        return ResponseEntity.ok(toFullProfile(profile));
    }

    @PutMapping("/profile")
    @Operation(summary = "Update my builder profile")
    public ResponseEntity<Map<String, Object>> updateMyProfile(
            @AuthenticationPrincipal User user,
            @RequestBody BuilderProfileUpdateRequest request) {

        BuilderProfile profile = builderProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        if (request.getCompanyName() != null) profile.setCompanyName(request.getCompanyName());
        if (request.getBio() != null) profile.setBio(request.getBio());
        if (request.getSpecializations() != null) profile.setSpecializations(request.getSpecializations());
        if (request.getSkills() != null) profile.setSkills(request.getSkills());
        if (request.getServiceAreas() != null) profile.setServiceAreas(request.getServiceAreas());
        if (request.getHourlyRate() != null) profile.setHourlyRate(request.getHourlyRate());
        if (request.getMinimumProjectValue() != null) profile.setMinimumProjectValue(request.getMinimumProjectValue());
        if (request.getYearsOfExperience() != null) profile.setYearsOfExperience(request.getYearsOfExperience());
        if (request.getIsAvailable() != null) profile.setIsAvailable(request.getIsAvailable());
        if (request.getPortfolioDescription() != null) profile.setPortfolioDescription(request.getPortfolioDescription());
        if (request.getPrimaryTrade() != null) profile.setPrimaryTrade(request.getPrimaryTrade());
        if (request.getSecondaryTrades() != null) profile.setSecondaryTrades(request.getSecondaryTrades());
        if (request.getExperiencePerTrade() != null) profile.setExperiencePerTrade(request.getExperiencePerTrade());
        if (request.getNtnNumber() != null) profile.setNtnNumber(request.getNtnNumber());
        if (request.getPecNumber() != null) profile.setPecNumber(request.getPecNumber());
        if (request.getTeamMembers() != null) profile.setTeamMembers(request.getTeamMembers());
        if (request.getServiceAreaRadius() != null) profile.setServiceAreaRadius(request.getServiceAreaRadius());

        BuilderProfile saved = builderProfileRepository.save(profile);
        return ResponseEntity.ok(toFullProfile(saved));
    }

    @PostMapping("/banner-image")
    @Operation(summary = "Upload banner image")
    public ResponseEntity<Map<String, String>> uploadBannerImage(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {

        BuilderProfile profile = builderProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        // Delete old banner if exists
        fileStorageService.deleteImage(profile.getBannerImageUrl());

        String imageUrl = fileStorageService.storeBannerImage(file, profile.getId());
        profile.setBannerImageUrl(imageUrl);
        builderProfileRepository.save(profile);

        return ResponseEntity.ok(Map.of("bannerImageUrl", imageUrl));
    }

    @DeleteMapping("/banner-image")
    @Operation(summary = "Remove banner image")
    public ResponseEntity<Map<String, String>> deleteBannerImage(
            @AuthenticationPrincipal User user) {

        BuilderProfile profile = builderProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Builder profile not found"));

        fileStorageService.deleteImage(profile.getBannerImageUrl());
        profile.setBannerImageUrl(null);
        builderProfileRepository.save(profile);

        return ResponseEntity.ok(Map.of("message", "Banner image removed"));
    }

    @PostMapping("/verification-request")
    @Operation(summary = "Request account verification (requires NTN or PEC number on profile)")
    public ResponseEntity<Map<String, Object>> requestVerification(
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) VerificationRequest request) {
        return ResponseEntity.ok(verificationRequestService.submitBuilderRequest(user, request));
    }

    @PostMapping("/verification-request/document")
    @Operation(summary = "Upload a verification document (image/pdf)")
    public ResponseEntity<Map<String, String>> uploadVerificationDocument(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        return ResponseEntity.ok(Map.of("url", verificationRequestService.uploadDocument(user, file)));
    }

    @GetMapping("/analytics")
    @Operation(summary = "Get builder analytics and performance metrics")
    public ResponseEntity<Map<String, Object>> getAnalytics(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(builderAnalyticsService.getAnalytics(user));
    }

    private Map<String, Object> toFullProfile(BuilderProfile bp) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", bp.getId());
        map.put("userId", bp.getUser() != null ? bp.getUser().getId() : null);
        map.put("name", bp.getUser() != null ? bp.getUser().getName() : null);
        map.put("email", bp.getUser() != null ? bp.getUser().getEmail() : null);
        map.put("city", bp.getUser() != null ? bp.getUser().getCity() : null);
        map.put("companyName", bp.getCompanyName());
        map.put("bio", bp.getBio());
        map.put("yearsOfExperience", bp.getYearsOfExperience());
        // These columns are JSON and read back double-encoded — parse them so the API returns
        // real arrays instead of a raw JSON string the client has to unwrap itself.
        map.put("specializations", JsonUtils.parseStringArray(bp.getSpecializations()));
        map.put("skills", JsonUtils.parseStringArray(bp.getSkills()));
        map.put("serviceAreas", JsonUtils.parseStringArray(bp.getServiceAreas()));
        map.put("hourlyRate", bp.getHourlyRate());
        map.put("minimumProjectValue", bp.getMinimumProjectValue());
        map.put("isVerified", bp.getIsVerified());
        map.put("verificationStatus", bp.getVerificationStatus());
        map.put("verificationRequestedAt", bp.getVerificationRequestedAt());
        map.put("verificationRejectionReason", bp.getVerificationRejectionReason());
        map.put("isAvailable", bp.getIsAvailable());
        map.put("availabilityStatus", bp.getAvailabilityStatus());
        map.put("bannerImageUrl", bp.getBannerImageUrl());
        map.put("portfolioDescription", bp.getPortfolioDescription());
        map.put("averageRating", bp.getAverageRating());
        map.put("totalReviews", bp.getTotalReviews());
        map.put("totalProjectsCompleted", bp.getTotalProjectsCompleted());
        map.put("totalEarnings", bp.getTotalEarnings());
        map.put("subscriptionTier", bp.getSubscriptionTier());
        map.put("leadCredits", bp.getLeadCredits());
        map.put("primaryTrade", bp.getPrimaryTrade());
        map.put("secondaryTrades", JsonUtils.parseStringArray(bp.getSecondaryTrades()));
        map.put("experiencePerTrade", bp.getExperiencePerTrade());
        map.put("ntnNumber", bp.getNtnNumber());
        map.put("pecNumber", bp.getPecNumber());
        map.put("teamMembers", bp.getTeamMembers());
        map.put("serviceAreaRadius", bp.getServiceAreaRadius());
        return map;
    }
}
