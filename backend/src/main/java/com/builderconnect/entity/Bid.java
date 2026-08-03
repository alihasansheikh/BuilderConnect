package com.builderconnect.entity;

import com.builderconnect.enums.BidStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Bid entity representing builder proposals for projects.
 */
@Entity
@Table(name = "bids", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"project_id", "builder_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bid extends BaseEntity {

    @Column(name = "bid_number", nullable = false, unique = true, length = 20)
    private String bidNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "builder_id", nullable = false)
    private User builder;

    // Bid Details
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String proposal;

    @Column(name = "work_plan", columnDefinition = "TEXT")
    private String workPlan;

    @Column(name = "estimated_duration_days", nullable = false)
    private Integer estimatedDurationDays;

    // Cost Breakdown
    @Column(name = "labor_cost", precision = 15, scale = 2)
    private BigDecimal laborCost;

    @Column(name = "material_cost", precision = 15, scale = 2)
    private BigDecimal materialCost;

    @Column(name = "other_cost", precision = 15, scale = 2)
    private BigDecimal otherCost;

    @Column(name = "cost_breakdown", columnDefinition = "JSON")
    private String costBreakdown;

    // Attachments
    @Column(columnDefinition = "JSON")
    private String attachments;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BidStatus status = BidStatus.DRAFT;

    // Response from client
    @Column(name = "client_notes", columnDefinition = "TEXT")
    private String clientNotes;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // Validity
    @Column(name = "valid_until")
    private LocalDate validUntil;

    // Important Dates
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    // Credit tracking
    @Builder.Default
    @Column(name = "credits_used")
    private Integer creditsUsed = 0;

    // Helper methods
    public void submit() {
        this.status = BidStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
        if (this.validUntil == null) {
            this.validUntil = LocalDate.now().plusDays(30);
        }
    }

    public void shortlist() {
        this.status = BidStatus.SHORTLISTED;
        this.reviewedAt = LocalDateTime.now();
    }

    public void accept() {
        this.status = BidStatus.ACCEPTED;
        this.acceptedAt = LocalDateTime.now();
    }

    public void reject(String reason) {
        this.status = BidStatus.REJECTED;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void withdraw() {
        this.status = BidStatus.WITHDRAWN;
        this.withdrawnAt = LocalDateTime.now();
    }

    public void expire() {
        this.status = BidStatus.EXPIRED;
    }

    public boolean isActive() {
        return status == BidStatus.SUBMITTED || status == BidStatus.UNDER_REVIEW || status == BidStatus.SHORTLISTED;
    }

    public boolean isExpired() {
        return validUntil != null && validUntil.isBefore(LocalDate.now());
    }
}
