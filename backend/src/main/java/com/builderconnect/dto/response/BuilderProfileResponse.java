package com.builderconnect.dto.response;

import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.util.JsonUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * DTO for builder profile response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BuilderProfileResponse {

    private Long id;
    private Long userId;
    private String companyName;
    private String businessRegistrationNumber;
    private Integer yearsOfExperience;
    private String bio;
    private List<String> specializations;
    private List<String> skills;
    private List<String> serviceAreas;
    private Boolean isVerified;
    private LocalDateTime verifiedAt;
    private Boolean isAvailable;
    private String availabilityStatus;
    private BigDecimal hourlyRate;
    private BigDecimal minimumProjectValue;
    private List<String> portfolioImages;
    private String portfolioDescription;
    private Integer totalProjectsCompleted;
    private BigDecimal totalEarnings;
    private BigDecimal averageRating;
    private Integer totalReviews;
    private String subscriptionTier;
    private LocalDateTime subscriptionExpiresAt;
    private Integer leadCredits;

    // Enhanced profile fields
    private String primaryTrade;
    private List<String> secondaryTrades;
    private String experiencePerTrade;
    private String ntnNumber;
    private String pecNumber;
    private String teamMembers;
    private Integer serviceAreaRadius;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static BuilderProfileResponse fromEntity(BuilderProfile profile) {
        return BuilderProfileResponse.builder()
            .id(profile.getId())
            .userId(profile.getUser().getId())
            .companyName(profile.getCompanyName())
            .businessRegistrationNumber(profile.getBusinessRegistrationNumber())
            .yearsOfExperience(profile.getYearsOfExperience())
            .bio(profile.getBio())
            .specializations(parseJsonArray(profile.getSpecializations()))
            .skills(parseJsonArray(profile.getSkills()))
            .serviceAreas(parseJsonArray(profile.getServiceAreas()))
            .isVerified(profile.getIsVerified())
            .verifiedAt(profile.getVerifiedAt())
            .isAvailable(profile.getIsAvailable())
            .availabilityStatus(profile.getAvailabilityStatus())
            .hourlyRate(profile.getHourlyRate())
            .minimumProjectValue(profile.getMinimumProjectValue())
            .portfolioImages(parseJsonArray(profile.getPortfolioImages()))
            .portfolioDescription(profile.getPortfolioDescription())
            .totalProjectsCompleted(profile.getTotalProjectsCompleted())
            .totalEarnings(profile.getTotalEarnings())
            .averageRating(profile.getAverageRating())
            .totalReviews(profile.getTotalReviews())
            .subscriptionTier(profile.getSubscriptionTier())
            .subscriptionExpiresAt(profile.getSubscriptionExpiresAt())
            .leadCredits(profile.getLeadCredits())
            .primaryTrade(profile.getPrimaryTrade())
            .secondaryTrades(parseJsonArray(profile.getSecondaryTrades()))
            .experiencePerTrade(profile.getExperiencePerTrade())
            .ntnNumber(profile.getNtnNumber())
            .pecNumber(profile.getPecNumber())
            .teamMembers(profile.getTeamMembers())
            .serviceAreaRadius(profile.getServiceAreaRadius())
            .build();
    }

    private static List<String> parseJsonArray(String json) {
        // Delegates to the shared helper, which also unwraps the double-encoded form these
        // JSON columns read back as (a single parse silently returned an empty list).
        return JsonUtils.parseStringArray(json);
    }
}
