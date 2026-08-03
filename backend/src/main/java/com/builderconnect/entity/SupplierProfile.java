package com.builderconnect.entity;

import com.builderconnect.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Extended profile for material suppliers.
 */
@Entity
@Table(name = "supplier_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "business_registration_number", length = 100)
    private String businessRegistrationNumber;

    @Column(name = "tax_id", length = 50)
    private String taxId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "JSON")
    private String categories; // JSON array of material categories supplied

    @Builder.Default
    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "verification_status", length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNSUBMITTED;

    @Column(name = "verification_requested_at")
    private LocalDateTime verificationRequestedAt;

    @Column(name = "verification_rejection_reason", length = 500)
    private String verificationRejectionReason;

    @Column(name = "verification_documents", columnDefinition = "JSON")
    private String verificationDocuments;

    @Column(name = "warehouse_address", length = 500)
    private String warehouseAddress;

    @Column(name = "delivery_areas", columnDefinition = "JSON")
    private String deliveryAreas; // JSON array of cities served

    @Builder.Default
    @Column(name = "minimum_order_value", precision = 15, scale = 2)
    private BigDecimal minimumOrderValue = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_orders_completed")
    private Integer totalOrdersCompleted = 0;

    @Builder.Default
    @Column(name = "average_rating", precision = 3, scale = 2)
    private BigDecimal averageRating = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_reviews")
    private Integer totalReviews = 0;

    public void updateRating(BigDecimal newRating) {
        // Weighted average calculation
        BigDecimal totalRatingSum = this.averageRating.multiply(BigDecimal.valueOf(this.totalReviews));
        this.totalReviews++;
        this.averageRating = totalRatingSum.add(newRating).divide(BigDecimal.valueOf(this.totalReviews), 2, java.math.RoundingMode.HALF_UP);
    }

    public void incrementOrdersCompleted() {
        this.totalOrdersCompleted++;
    }
}
