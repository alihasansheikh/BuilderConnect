package com.builderconnect.service;

import com.builderconnect.dto.response.UserProfileResponse;
import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.entity.User;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.BuilderProfileRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.builderconnect.repository.UserRepository;
import com.builderconnect.util.JsonUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the aggregate profile page for a user (public discovery + self-view).
 */
@Service
@RequiredArgsConstructor
public class ProfileService {

    /** Cap on completed projects surfaced on the profile card. */
    private static final int MAX_COMPLETED_PROJECTS = 100;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final UserRepository userRepository;
    private final BuilderProfileRepository builderProfileRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final ProjectRepository projectRepository;
    private final MaterialRepository materialRepository;

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(Long userId, User viewer) {
        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean isOwnProfile = viewer != null && viewer.getId().equals(userId);
        boolean canSeeContact = isOwnProfile || (viewer != null && viewer.isAdmin());

        UserProfileResponse.UserProfileResponseBuilder builder = UserProfileResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .city(user.getCity())
                .profileImageUrl(user.getProfileImageUrl())
                .memberSince(user.getCreatedAt())
                .isOwnProfile(isOwnProfile)
                .completedProjects(List.of());

        if (canSeeContact) {
            builder.phone(user.getPhone())
                    .email(user.getEmail())
                    .address(user.getAddress());
        }

        if (user.getRole() == UserRole.BUILDER) {
            applyBuilderProfile(user, isOwnProfile, builder);
        } else if (user.getRole() == UserRole.SUPPLIER) {
            applySupplierProfile(user, builder);
        }

        return builder.build();
    }

    private void applyBuilderProfile(User user, boolean isOwnProfile,
                                     UserProfileResponse.UserProfileResponseBuilder builder) {
        BuilderProfile bp = builderProfileRepository.findByUserId(user.getId()).orElse(null);
        if (bp == null) {
            builder.headline(null);
            return;
        }

        builder.builderProfile(buildBuilderProfileMap(bp, isOwnProfile));
        builder.headline(bp.getCompanyName() != null ? bp.getCompanyName() : bp.getPrimaryTrade());
        if (bp.getAverageRating() != null) {
            builder.averageRating(bp.getAverageRating().doubleValue());
        }
        builder.totalReviews(bp.getTotalReviews());
        builder.completedProjects(buildCompletedProjects(user.getId()));
    }

    private void applySupplierProfile(User user,
                                      UserProfileResponse.UserProfileResponseBuilder builder) {
        SupplierProfile sp = supplierProfileRepository.findByUserId(user.getId()).orElse(null);
        if (sp == null) {
            return;
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("companyName", sp.getCompanyName());
        map.put("description", sp.getDescription());
        map.put("isVerified", sp.getIsVerified());
        map.put("verifiedAt", sp.getVerifiedAt());
        map.put("categories", JsonUtils.parseStringArray(sp.getCategories()));
        map.put("deliveryAreas", JsonUtils.parseStringArray(sp.getDeliveryAreas()));
        map.put("warehouseAddress", sp.getWarehouseAddress());
        map.put("minimumOrderValue", sp.getMinimumOrderValue());
        map.put("totalOrdersCompleted", sp.getTotalOrdersCompleted());
        map.put("totalReviews", sp.getTotalReviews());
        map.put("averageRating", sp.getAverageRating());
        map.put("totalProducts", materialRepository.countBySupplierIdAndIsAvailableTrue(user.getId()));
        builder.supplierProfile(map);
        builder.headline(sp.getCompanyName());
        if (sp.getAverageRating() != null) {
            builder.averageRating(sp.getAverageRating().doubleValue());
        }
        builder.totalReviews(sp.getTotalReviews());
    }

    private Map<String, Object> buildBuilderProfileMap(BuilderProfile bp, boolean isOwnProfile) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("companyName", bp.getCompanyName());
        map.put("bio", bp.getBio());
        map.put("yearsOfExperience", bp.getYearsOfExperience());
        map.put("specializations", JsonUtils.parseStringArray(bp.getSpecializations()));
        map.put("skills", JsonUtils.parseStringArray(bp.getSkills()));
        map.put("serviceAreas", JsonUtils.parseStringArray(bp.getServiceAreas()));
        map.put("primaryTrade", bp.getPrimaryTrade());
        map.put("secondaryTrades", JsonUtils.parseStringArray(bp.getSecondaryTrades()));
        map.put("experiencePerTrade", parseJsonLenient(bp.getExperiencePerTrade()));
        map.put("ntnNumber", bp.getNtnNumber());
        map.put("pecNumber", bp.getPecNumber());
        map.put("teamMembers", parseJsonLenient(bp.getTeamMembers()));
        map.put("serviceAreaRadius", bp.getServiceAreaRadius());
        map.put("hourlyRate", bp.getHourlyRate());
        map.put("minimumProjectValue", bp.getMinimumProjectValue());
        map.put("availabilityStatus", bp.getAvailabilityStatus());
        map.put("isVerified", bp.getIsVerified());
        map.put("isAvailable", bp.getIsAvailable());
        map.put("bannerImageUrl", bp.getBannerImageUrl());
        map.put("portfolioDescription", bp.getPortfolioDescription());
        map.put("averageRating", bp.getAverageRating());
        map.put("totalReviews", bp.getTotalReviews());
        map.put("totalProjectsCompleted", bp.getTotalProjectsCompleted());
        map.put("subscriptionTier", bp.getSubscriptionTier());
        // Earnings and lead credits are private — only the owner sees them.
        if (isOwnProfile) {
            map.put("totalEarnings", bp.getTotalEarnings());
            map.put("leadCredits", bp.getLeadCredits());
        }
        return map;
    }

    private List<Map<String, Object>> buildCompletedProjects(Long builderId) {
        List<Project> projects = projectRepository
                .findByAwardedBuilderIdAndStatusAndDeletedFalse(
                        builderId, ProjectStatus.COMPLETED,
                        PageRequest.of(0, MAX_COMPLETED_PROJECTS))
                .getContent();
        return projects.stream().map(this::toCompletedProjectSummary).toList();
    }

    private Map<String, Object> toCompletedProjectSummary(Project project) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", project.getId());
        map.put("title", project.getTitle());
        map.put("categoryName", project.getCategoryName());
        map.put("city", project.getCity());
        map.put("finalBudget", project.getFinalBudget());
        map.put("actualCompletionDate", project.getActualCompletionDate());
        return map;
    }

    /**
     * Parses a JSON object/array column into a live structure (Map or List), peeling the
     * double-encoded string layers these {@code JSON}-typed columns read back as. Returns
     * {@code null} when the value is null/blank/unparseable rather than throwing.
     */
    private static Object parseJsonLenient(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        String value = json;
        for (int layer = 0; layer < 5; layer++) {
            Object parsed;
            try {
                parsed = OBJECT_MAPPER.readValue(value, Object.class);
            } catch (Exception notJson) {
                return null;
            }
            if (parsed instanceof String s) {
                value = s; // peel one string-encoding layer and retry
                continue;
            }
            return parsed;
        }
        return null;
    }
}
