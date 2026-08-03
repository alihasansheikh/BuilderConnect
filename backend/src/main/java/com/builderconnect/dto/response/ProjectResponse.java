package com.builderconnect.dto.response;

import com.builderconnect.entity.Project;
import com.builderconnect.util.JsonUtils;
import com.builderconnect.enums.ProjectStatus;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * DTO for project response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private Long id;
    private String projectNumber;
    private String title;
    private String description;
    private Long categoryId;
    private String categoryName;
    private String projectType;
    private BigDecimal areaSqFt;
    private String city;
    private String locationAddress;
    private BigDecimal budgetMin;
    private BigDecimal budgetMax;
    private BigDecimal finalBudget;
    private LocalDate deadline;
    private Integer estimatedDurationDays;
    private List<String> requiredSkills;
    private List<String> attachments;
    private String specialRequirements;
    private ProjectStatus status;
    private Boolean isUrgent;
    private Boolean isFeatured;
    private Integer progressPercentage;
    private LocalDateTime publishedAt;
    private LocalDateTime biddingDeadline;
    private LocalDateTime awardedAt;
    private LocalDateTime startedAt;
    private LocalDate expectedCompletionDate;
    private LocalDate actualCompletionDate;
    private LocalDateTime createdAt;

    // Create-wizard: Pakistan taxonomy fields
    private String propertyType;
    private String province;
    private String locationArea;
    private BigDecimal areaValue;
    private String areaUnit;
    private Integer floors;
    private Integer rooms;
    private Integer units;
    private String materialsProvidedBy;
    private String budgetType;
    private String structureCondition;
    private LocalDate preferredStartDate;
    private Boolean verifiedBuildersOnly;
    private List<String> trades;   // derived from required_skills JSON

    // Related entities
    private UserResponse client;
    private UserResponse awardedBuilder;
    private Integer bidCount;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /** Max characters of the description carried on summary (marketplace card) responses. */
    private static final int SUMMARY_DESCRIPTION_MAX_LENGTH = 200;

    public static ProjectResponse fromEntity(Project project) {
        ProjectResponseBuilder builder = ProjectResponse.builder()
            .id(project.getId())
            .projectNumber(project.getProjectNumber())
            .title(project.getTitle())
            .description(project.getDescription())
            .categoryId(project.getCategoryId())
            .categoryName(project.getCategoryName())
            .projectType(project.getProjectType())
            .areaSqFt(project.getAreaSqFt())
            .city(project.getCity())
            .locationAddress(project.getLocationAddress())
            .budgetMin(project.getBudgetMin())
            .budgetMax(project.getBudgetMax())
            .finalBudget(project.getFinalBudget())
            .deadline(project.getDeadline())
            .estimatedDurationDays(project.getEstimatedDurationDays())
            .requiredSkills(parseJsonArray(project.getRequiredSkills()))
            .attachments(parseJsonArray(project.getAttachments()))
            .specialRequirements(project.getSpecialRequirements())
            .status(project.getStatus())
            .isUrgent(project.getIsUrgent())
            .isFeatured(project.getIsFeatured())
            .progressPercentage(project.getProgressPercentage())
            .publishedAt(project.getPublishedAt())
            .biddingDeadline(project.getBiddingDeadline())
            .awardedAt(project.getAwardedAt())
            .startedAt(project.getStartedAt())
            .expectedCompletionDate(project.getExpectedCompletionDate())
            .actualCompletionDate(project.getActualCompletionDate())
            .createdAt(project.getCreatedAt())
            .propertyType(project.getPropertyType())
            .province(project.getProvince())
            .locationArea(project.getLocationArea())
            .areaValue(project.getAreaValue())
            .areaUnit(project.getAreaUnit())
            .floors(project.getFloors())
            .rooms(project.getRooms())
            .units(project.getUnits())
            .materialsProvidedBy(project.getMaterialsProvidedBy())
            .budgetType(project.getBudgetType())
            .structureCondition(project.getStructureCondition())
            .preferredStartDate(project.getPreferredStartDate())
            .verifiedBuildersOnly(project.getVerifiedBuildersOnly())
            .trades(parseJsonArray(project.getRequiredSkills()));

        if (project.getClient() != null) {
            builder.client(UserResponse.basicFromEntity(project.getClient()));
        }

        if (project.getAwardedBuilder() != null) {
            builder.awardedBuilder(UserResponse.basicFromEntity(project.getAwardedBuilder()));
        }

        if (project.getBids() != null) {
            builder.bidCount(project.getBids().size());
        }

        return builder.build();
    }

    public static ProjectResponse summaryFromEntity(Project project) {
        return summaryFromEntity(project, null);
    }

    /**
     * Marketplace-card summary. Intentionally does NOT include the client
     * (basicFromEntity carries email/phone — the marketplace must not expose the client).
     */
    public static ProjectResponse summaryFromEntity(Project project, Integer bidCount) {
        return ProjectResponse.builder()
            .id(project.getId())
            .projectNumber(project.getProjectNumber())
            .title(project.getTitle())
            .description(truncate(project.getDescription(), SUMMARY_DESCRIPTION_MAX_LENGTH))
            .categoryName(project.getCategoryName())
            .city(project.getCity())
            .budgetMin(project.getBudgetMin())
            .budgetMax(project.getBudgetMax())
            .deadline(project.getDeadline())
            .estimatedDurationDays(project.getEstimatedDurationDays())
            .requiredSkills(parseJsonArray(project.getRequiredSkills()))
            .status(project.getStatus())
            .isUrgent(project.getIsUrgent())
            .verifiedBuildersOnly(project.getVerifiedBuildersOnly())
            .biddingDeadline(project.getBiddingDeadline())
            .createdAt(project.getCreatedAt())
            .propertyType(project.getPropertyType())
            .areaValue(project.getAreaValue())
            .areaUnit(project.getAreaUnit())
            .areaSqFt(project.getAreaSqFt())
            .budgetType(project.getBudgetType())
            .trades(parseJsonArray(project.getRequiredSkills()))
            .bidCount(bidCount)
            .build();
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private static List<String> parseJsonArray(String json) {
        // Delegates to the shared helper, which also unwraps the double-encoded form these
        // JSON columns read back as (a single parse silently returned an empty list).
        return JsonUtils.parseStringArray(json);
    }
}
