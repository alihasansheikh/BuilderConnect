package com.builderconnect.controller;

import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.util.JsonUtils;
import com.builderconnect.repository.BuilderProfileRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for public builder discovery.
 */
@RestController
@RequestMapping("/v1/builders")
@RequiredArgsConstructor
@Tag(name = "Builders", description = "Public builder search endpoints")
public class BuilderController {

    private final BuilderProfileRepository builderProfileRepository;

    @GetMapping
    @Operation(summary = "Search verified builders")
    public ResponseEntity<Page<Map<String, Object>>> searchBuilders(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) Integer maxExperience,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) Boolean isAvailable,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String text,
            @PageableDefault(size = 12, sort = "averageRating", direction = Sort.Direction.DESC) Pageable pageable) {

        boolean hasFilters = city != null || minExperience != null || maxExperience != null
                || minRating != null || isAvailable != null || specialization != null
                || (text != null && !text.isBlank());

        Page<BuilderProfile> profiles;
        if (hasFilters) {
            String cityParam = (city != null && !city.isBlank()) ? city : null;
            String specParam = (specialization != null && !specialization.isBlank()) ? specialization : null;
            String textParam = (text != null && !text.isBlank()) ? text.trim() : null;
            profiles = builderProfileRepository.searchBuilders(
                cityParam, minExperience, maxExperience, minRating, isAvailable, specParam, textParam, pageable);
        } else {
            profiles = builderProfileRepository.findAvailableVerifiedBuilders(pageable);
        }

        Page<Map<String, Object>> result = profiles.map(this::toSummary);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get builder profile by ID")
    public ResponseEntity<Map<String, Object>> getBuilder(@PathVariable Long id) {
        BuilderProfile profile = builderProfileRepository.findById(id)
            .filter(bp -> bp.getUser() != null && !Boolean.TRUE.equals(bp.getUser().getDeleted()))
            .orElseThrow(() -> new com.builderconnect.exception.ResourceNotFoundException("Builder not found: " + id));
        return ResponseEntity.ok(toSummary(profile));
    }

    private Map<String, Object> toSummary(BuilderProfile bp) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", bp.getId());
        map.put("userId", bp.getUser() != null ? bp.getUser().getId() : null);
        map.put("name", bp.getUser() != null ? bp.getUser().getName() : null);
        map.put("city", bp.getUser() != null ? bp.getUser().getCity() : null);
        map.put("companyName", bp.getCompanyName());
        map.put("bio", bp.getBio());
        map.put("yearsOfExperience", bp.getYearsOfExperience());
        // These columns are JSON and read back double-encoded — parse them so the API returns
        // real arrays instead of a raw JSON string the client has to unwrap itself.
        map.put("specializations", JsonUtils.parseStringArray(bp.getSpecializations()));
        map.put("skills", JsonUtils.parseStringArray(bp.getSkills()));
        map.put("serviceAreas", JsonUtils.parseStringArray(bp.getServiceAreas()));
        map.put("isVerified", bp.getIsVerified());
        map.put("isAvailable", bp.getIsAvailable());
        map.put("averageRating", bp.getAverageRating());
        map.put("totalReviews", bp.getTotalReviews());
        map.put("totalProjectsCompleted", bp.getTotalProjectsCompleted());
        // Effective tier: an expired paid subscription must not display paid badges publicly
        map.put("subscriptionTier", bp.getEffectiveTier());
        map.put("hourlyRate", bp.getHourlyRate());
        map.put("profileImageUrl", bp.getUser() != null ? bp.getUser().getProfileImageUrl() : null);
        map.put("bannerImageUrl", bp.getBannerImageUrl());
        return map;
    }
}
