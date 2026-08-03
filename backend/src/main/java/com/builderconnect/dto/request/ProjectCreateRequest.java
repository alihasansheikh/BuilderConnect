package com.builderconnect.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for project creation request (multi-step wizard).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectCreateRequest {

    // Step 1: Project Type (new wizard step)
    private String projectType; // Residential, Commercial, Renovation, etc.
    private BigDecimal areaSqFt;
    private List<String> trades; // Civil, Electrical, Plumbing, etc.

    // Create-wizard: classification / size / materials / requirement flags (Pakistan taxonomy).
    // The @Size limits mirror the column widths in V27 — without them an over-long value reaches the
    // insert and the database rejects it, which surfaces as a generic error instead of naming the field.
    @Size(max = 50, message = "Property type must not exceed 50 characters")
    private String propertyType;

    @Size(max = 50, message = "Province must not exceed 50 characters")
    private String province;

    @Size(max = 150, message = "Area/locality must not exceed 150 characters")
    private String locationArea;

    private BigDecimal areaValue;

    @Size(max = 20, message = "Area unit must not exceed 20 characters")
    private String areaUnit;                 // MARLA|KANAL|SQ_YARD|SQ_FT

    private Integer floors;
    private Integer rooms;
    private Integer units;

    @Size(max = 20, message = "Materials-provided-by must not exceed 20 characters")
    private String materialsProvidedBy;      // CLIENT|CONTRACTOR|DECIDE_LATER

    @Builder.Default
    @Size(max = 20, message = "Budget type must not exceed 20 characters")
    private String budgetType = "FIXED_RANGE"; // FIXED_RANGE|OPEN_TO_QUOTES

    @Size(max = 30, message = "Structure condition must not exceed 30 characters")
    private String structureCondition;
    private LocalDate preferredStartDate;

    @Builder.Default
    private Boolean verifiedBuildersOnly = false;

    // Step 2: Basic Information
    @NotBlank(message = "Title is required")
    @Size(min = 10, max = 200, message = "Title must be between 10 and 200 characters")
    private String title;

    @NotBlank(message = "Description is required")
    @Size(min = 50, max = 5000, message = "Description must be between 50 and 5000 characters")
    private String description;

    private Long categoryId;

    // Step 2: Location
    @NotBlank(message = "City is required")
    private String city;

    private String locationAddress;
    private BigDecimal locationLatitude;
    private BigDecimal locationLongitude;

    // Step 3: Budget & Timeline
    // budgetMin/budgetMax are optional at the field level (OPEN_TO_QUOTES needs neither);
    // FIXED_RANGE requirements are enforced by isBudgetRangeValid() below.
    private BigDecimal budgetMin;

    private BigDecimal budgetMax;

    @FutureOrPresent(message = "Deadline must be in the future")
    private LocalDate deadline;

    private Integer estimatedDurationDays;

    // Step 4: Requirements
    private List<String> requiredSkills;
    private List<String> attachmentUrls;
    private String specialRequirements;

    // Step 5: Options
    @Builder.Default
    private Boolean isUrgent = false;

    @Builder.Default
    private Boolean allowPartialBids = false;

    @Builder.Default
    private Boolean isPublic = true;

    private LocalDateTime biddingDeadline;

    // Optional: Milestones (can be added during creation)
    private List<MilestoneRequest> milestones;

    /**
     * Cross-field validation: when the budget model is a fixed range, both bounds are required,
     * the minimum must be at least 1000, and the maximum must not be below the minimum.
     * OPEN_TO_QUOTES (or any other model) imposes no budget bounds.
     */
    @AssertTrue(message = "Budget min and max are required for a fixed range")
    public boolean isBudgetRangeValid() {
        // A missing budgetType defaults to FIXED_RANGE (matches the entity default), so an
        // omitted value still enforces the budget bounds rather than silently bypassing them.
        if (budgetType != null && !"FIXED_RANGE".equals(budgetType)) return true;
        return budgetMin != null && budgetMax != null
            && budgetMin.compareTo(new java.math.BigDecimal("1000")) >= 0
            && budgetMax.compareTo(budgetMin) >= 0;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MilestoneRequest {
        @NotBlank(message = "Milestone title is required")
        private String title;

        private String description;
        private Integer sequenceOrder;

        @NotNull(message = "Payment amount is required")
        @DecimalMin(value = "0", message = "Payment amount must be positive")
        private BigDecimal paymentAmount;

        private BigDecimal paymentPercentage;
        private LocalDate startDate;
        private LocalDate dueDate;
        private List<String> deliverables;
    }
}
