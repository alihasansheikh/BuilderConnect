package com.builderconnect.entity;

import com.builderconnect.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Extended profile for builders/contractors.
 */
@Entity
@Table(name = "builder_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuilderProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Business Information
    @Column(name = "company_name", length = 200)
    private String companyName;

    @Column(name = "business_registration_number", length = 100)
    private String businessRegistrationNumber;

    @Column(name = "tax_id", length = 50)
    private String taxId;

    @Column(name = "ntn_number", length = 50)
    private String ntnNumber;

    @Column(name = "pec_number", length = 50)
    private String pecNumber;

    @Builder.Default
    @Column(name = "years_of_experience")
    private Integer yearsOfExperience = 0;

    // Description and Skills
    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(columnDefinition = "JSON")
    private String specializations; // JSON array of specialization categories

    @Column(columnDefinition = "JSON")
    private String skills; // JSON array of skills

    @Column(name = "primary_trade", length = 100)
    private String primaryTrade;

    @Column(name = "secondary_trades", columnDefinition = "JSON")
    private String secondaryTrades; // JSON array of secondary trades

    @Column(name = "experience_per_trade", columnDefinition = "JSON")
    private String experiencePerTrade; // JSON object: {"trade": years}

    @Column(name = "service_areas", columnDefinition = "JSON")
    private String serviceAreas; // JSON array of cities/areas served

    @Builder.Default
    @Column(name = "service_area_radius")
    private Integer serviceAreaRadius = 50;

    // Verification Status
    @Builder.Default
    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verification_documents", columnDefinition = "JSON")
    private String verificationDocuments;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "verification_status", length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNSUBMITTED;

    @Column(name = "verification_requested_at")
    private LocalDateTime verificationRequestedAt;

    @Column(name = "verification_rejection_reason", length = 500)
    private String verificationRejectionReason;

    // Availability
    @Builder.Default
    @Column(name = "is_available")
    private Boolean isAvailable = true;

    @Column(name = "availability_status", length = 20)
    @Builder.Default
    private String availabilityStatus = "AVAILABLE";

    // Pricing
    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(name = "minimum_project_value", precision = 15, scale = 2)
    private BigDecimal minimumProjectValue;

    // Banner & Portfolio
    @Column(name = "banner_image_url", length = 500)
    private String bannerImageUrl;

    @Column(name = "portfolio_images", columnDefinition = "JSON")
    private String portfolioImages;

    @Column(name = "portfolio_description", columnDefinition = "TEXT")
    private String portfolioDescription;

    @Column(name = "team_members", columnDefinition = "JSON")
    private String teamMembers; // JSON array of {name, role, experience}

    // Statistics (denormalized for performance)
    @Builder.Default
    @Column(name = "total_projects_completed")
    private Integer totalProjectsCompleted = 0;

    @Builder.Default
    @Column(name = "total_earnings", precision = 15, scale = 2)
    private BigDecimal totalEarnings = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "average_rating", precision = 3, scale = 2)
    private BigDecimal averageRating = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_reviews")
    private Integer totalReviews = 0;

    // Subscription
    @Builder.Default
    @Column(name = "subscription_tier", length = 20)
    private String subscriptionTier = "FREE";

    @Column(name = "subscription_expires_at")
    private LocalDateTime subscriptionExpiresAt;

    @Builder.Default
    @Column(name = "lead_credits")
    private Integer leadCredits = 5;

    // Helper methods
    public void incrementProjectCount() {
        this.totalProjectsCompleted++;
    }

    public void addEarnings(BigDecimal amount) {
        this.totalEarnings = this.totalEarnings.add(amount);
    }

    public void updateRating(BigDecimal newRating) {
        // Weighted average calculation
        BigDecimal totalRatingSum = this.averageRating.multiply(BigDecimal.valueOf(this.totalReviews));
        this.totalReviews++;
        this.averageRating = totalRatingSum.add(newRating).divide(BigDecimal.valueOf(this.totalReviews), 2, java.math.RoundingMode.HALF_UP);
    }

    public boolean hasLeadCredits() {
        return this.leadCredits > 0;
    }

    /**
     * A null expiry never expires (FREE, or seeded paid rows without a period).
     * NOTE: the featured-first ORDER BY in BuilderProfileRepository duplicates
     * this predicate inline (SQL can't call entity methods) — keep both in sync.
     */
    public boolean isSubscriptionExpired() {
        return this.subscriptionExpiresAt != null
                && this.subscriptionExpiresAt.isBefore(LocalDateTime.now());
    }

    /** The tier whose limits/perks actually apply right now: expired paid tier -> FREE. */
    public String getEffectiveTier() {
        return isSubscriptionExpired() ? "FREE" : this.subscriptionTier;
    }

    public void useLeadCredit() {
        if (this.leadCredits > 0) {
            this.leadCredits--;
        }
    }
}
