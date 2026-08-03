package com.builderconnect.entity;

import com.builderconnect.enums.ProjectStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Project entity representing construction projects.
 */
@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends BaseEntity {

    @Column(name = "project_number", nullable = false, unique = true, length = 20)
    private String projectNumber;

    // Ownership
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "awarded_builder_id")
    private User awardedBuilder;

    // Basic Information
    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "category_name", length = 100)
    private String categoryName;

    // Attributes collected by the create wizard (now persisted — previously dropped)
    @Column(name = "project_type", length = 50)
    private String projectType;

    @Column(name = "area_sq_ft", precision = 12, scale = 2)
    private BigDecimal areaSqFt;

    // --- Create-wizard: classification ---
    @Column(name = "property_type", length = 50)
    private String propertyType;

    // --- Location (Pakistan: Province + City + Area) ---
    @Column(name = "province", length = 50)
    private String province;

    @Column(name = "location_area", length = 150)
    private String locationArea;

    // --- Size (raw entry preserved alongside normalized area_sq_ft) ---
    @Column(name = "area_value", precision = 12, scale = 2)
    private BigDecimal areaValue;

    @Column(name = "area_unit", length = 20)
    private String areaUnit;                 // MARLA | KANAL | SQ_YARD | SQ_FT

    @Column(name = "floors")
    private Integer floors;

    @Column(name = "rooms")
    private Integer rooms;

    @Column(name = "units")
    private Integer units;

    // --- Materials & budget model ---
    @Column(name = "materials_provided_by", length = 20)
    private String materialsProvidedBy;      // CLIENT | CONTRACTOR | DECIDE_LATER

    @Builder.Default
    @Column(name = "budget_type", length = 20)
    private String budgetType = "FIXED_RANGE";   // FIXED_RANGE | OPEN_TO_QUOTES

    @Column(name = "structure_condition", length = 30)
    private String structureCondition;

    // --- Timeline ---
    @Column(name = "preferred_start_date")
    private LocalDate preferredStartDate;

    // --- Requirement flags ---
    @Builder.Default
    @Column(name = "verified_builders_only")
    private Boolean verifiedBuildersOnly = false;

    // Location
    @Column(nullable = false, length = 100)
    private String city;

    @Column(name = "location_address", length = 500)
    private String locationAddress;

    @Column(name = "location_latitude", precision = 10, scale = 8)
    private BigDecimal locationLatitude;

    @Column(name = "location_longitude", precision = 11, scale = 8)
    private BigDecimal locationLongitude;

    // Budget & Timeline
    @Column(name = "budget_min", precision = 15, scale = 2)
    private BigDecimal budgetMin;

    @Column(name = "budget_max", precision = 15, scale = 2)
    private BigDecimal budgetMax;

    @Column(name = "final_budget", precision = 15, scale = 2)
    private BigDecimal finalBudget;

    private LocalDate deadline;

    @Column(name = "estimated_duration_days")
    private Integer estimatedDurationDays;

    // Requirements
    @Column(name = "required_skills", columnDefinition = "JSON")
    private String requiredSkills;

    @Column(columnDefinition = "JSON")
    private String attachments;

    @Column(name = "special_requirements", columnDefinition = "TEXT")
    private String specialRequirements;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.DRAFT;

    // Flags
    @Builder.Default
    @Column(name = "is_urgent")
    private Boolean isUrgent = false;

    @Builder.Default
    @Column(name = "is_featured")
    private Boolean isFeatured = false;

    @Builder.Default
    @Column(name = "allow_partial_bids")
    private Boolean allowPartialBids = false;

    // Progress Tracking
    @Builder.Default
    @Column(name = "progress_percentage")
    private Integer progressPercentage = 0;

    @Column(name = "current_milestone_id")
    private Long currentMilestoneId;

    // Important Dates
    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "bidding_deadline")
    private LocalDateTime biddingDeadline;

    @Column(name = "awarded_at")
    private LocalDateTime awardedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "expected_completion_date")
    private LocalDate expectedCompletionDate;

    @Column(name = "actual_completion_date")
    private LocalDate actualCompletionDate;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    // Contract
    @Column(name = "contract_signed_at")
    private LocalDateTime contractSignedAt;

    @Column(name = "contract_document_url", length = 500)
    private String contractDocumentUrl;

    // Visibility
    @Builder.Default
    @Column(name = "is_public")
    private Boolean isPublic = true;

    // Soft Delete
    @Builder.Default
    @Column(nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Relationships — no cascade delete; use soft deletes to preserve audit trail
    @OneToMany(mappedBy = "project", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Bid> bids = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Milestone> milestones = new ArrayList<>();

    // Helper methods
    public boolean isOpen() {
        return status == ProjectStatus.OPEN || status == ProjectStatus.BIDDING;
    }

    public boolean isActive() {
        return status == ProjectStatus.IN_PROGRESS;
    }

    public boolean canReceiveBids() {
        return isOpen() && (biddingDeadline == null || biddingDeadline.isAfter(LocalDateTime.now()));
    }

    public void publish() {
        this.status = ProjectStatus.OPEN;
        this.publishedAt = LocalDateTime.now();
    }

    public void award(User builder, BigDecimal finalAmount) {
        this.awardedBuilder = builder;
        this.finalBudget = finalAmount;
        this.status = ProjectStatus.AWARDED;
        this.awardedAt = LocalDateTime.now();
    }

    public void start() {
        this.status = ProjectStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
    }

    public void complete() {
        this.status = ProjectStatus.COMPLETED;
        this.actualCompletionDate = LocalDate.now();
        this.progressPercentage = 100;
    }

    public void cancel(String reason) {
        this.status = ProjectStatus.CANCELLED;
        this.cancelledAt = LocalDateTime.now();
        this.cancellationReason = reason;
    }
}
