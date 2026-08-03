package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Review entity for user reviews and ratings.
 */
@Entity
@Table(name = "reviews", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"reviewer_id", "project_id", "review_type"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review extends BaseEntity {

    public enum ReviewType {
        CLIENT_TO_BUILDER,
        BUILDER_TO_CLIENT,
        CLIENT_TO_SUPPLIER,
        BUILDER_TO_SUPPLIER,
        MATERIAL_REVIEW
    }

    public enum ReviewStatus {
        PENDING, APPROVED, REJECTED, FLAGGED, HIDDEN
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_id", nullable = false)
    private User reviewee;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "material_order_id")
    private Long materialOrderId;

    @Column(name = "material_id")
    private Long materialId;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_type", nullable = false)
    private ReviewType reviewType;

    // Ratings (1-5)
    @Column(name = "overall_rating", nullable = false)
    private Integer overallRating;

    @Column(name = "quality_rating")
    private Integer qualityRating;

    @Column(name = "communication_rating")
    private Integer communicationRating;

    @Column(name = "timeliness_rating")
    private Integer timelinessRating;

    @Column(name = "value_rating")
    private Integer valueRating;

    @Column(name = "professionalism_rating")
    private Integer professionalismRating;

    // Content
    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(columnDefinition = "TEXT")
    private String pros;

    @Column(columnDefinition = "TEXT")
    private String cons;

    @Column(columnDefinition = "JSON")
    private String photos;

    // Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReviewStatus status = ReviewStatus.PENDING;

    @Column(name = "moderation_notes", columnDefinition = "TEXT")
    private String moderationNotes;

    @Column(name = "moderated_by")
    private Long moderatedBy;

    @Column(name = "moderated_at")
    private LocalDateTime moderatedAt;

    // Response
    @Column(columnDefinition = "TEXT")
    private String response;

    @Column(name = "response_at")
    private LocalDateTime responseAt;

    // Flags
    @Builder.Default
    @Column(name = "is_verified_purchase")
    private Boolean isVerifiedPurchase = false;

    @Builder.Default
    @Column(name = "is_featured")
    private Boolean isFeatured = false;

    // Helpfulness
    @Builder.Default
    @Column(name = "helpful_count")
    private Integer helpfulCount = 0;

    @Builder.Default
    @Column(name = "not_helpful_count")
    private Integer notHelpfulCount = 0;

    public void approve() {
        this.status = ReviewStatus.APPROVED;
    }

    public void reject(String notes, Long moderatorId) {
        this.status = ReviewStatus.REJECTED;
        this.moderationNotes = notes;
        this.moderatedBy = moderatorId;
        this.moderatedAt = LocalDateTime.now();
    }

    public void hide(Long moderatorId, String notes) {
        this.status = ReviewStatus.HIDDEN;
        this.moderationNotes = notes;
        this.moderatedBy = moderatorId;
        this.moderatedAt = LocalDateTime.now();
    }

    public void restore() {
        this.status = ReviewStatus.APPROVED;
    }

    public void addResponse(String responseText) {
        this.response = responseText;
        this.responseAt = LocalDateTime.now();
    }

    public double getAverageRating() {
        int count = 1;
        double sum = overallRating;
        if (qualityRating != null) { sum += qualityRating; count++; }
        if (communicationRating != null) { sum += communicationRating; count++; }
        if (timelinessRating != null) { sum += timelinessRating; count++; }
        if (valueRating != null) { sum += valueRating; count++; }
        if (professionalismRating != null) { sum += professionalismRating; count++; }
        return sum / count;
    }
}
