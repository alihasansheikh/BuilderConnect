package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Dispute entity for managing disputes between users on projects.
 */
@Entity
@Table(name = "disputes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dispute extends BaseEntity {

    public enum DisputeType {
        PAYMENT, QUALITY, TIMELINE, SCOPE, COMMUNICATION, ABANDONMENT, OTHER
    }

    public enum DisputeStatus {
        FILED, UNDER_REVIEW, MEDIATION, AWAITING_RESPONSE, RESOLVED, ESCALATED, CLOSED
    }

    @Column(name = "dispute_number", nullable = false, unique = true, length = 20)
    private String disputeNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id")
    private Milestone milestone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filed_by", nullable = false)
    private User filedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filed_against", nullable = false)
    private User filedAgainst;

    @Enumerated(EnumType.STRING)
    @Column(name = "dispute_type", nullable = false)
    private DisputeType disputeType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DisputeStatus status = DisputeStatus.FILED;

    @Column(name = "subject", nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "JSON")
    private String evidence;

    @Column(name = "disputed_amount", precision = 15, scale = 2)
    private BigDecimal disputedAmount;

    @Column(name = "resolution_amount", precision = 15, scale = 2)
    private BigDecimal resolutionAmount;

    @Column(name = "resolution_type", length = 50)
    private String resolutionType;

    @Column(name = "resolution_summary", columnDefinition = "TEXT")
    private String resolutionDetails;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @OneToMany(mappedBy = "dispute", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DisputeComment> comments = new ArrayList<>();

    // Helper methods

    public void updateStatus(DisputeStatus newStatus) {
        this.status = newStatus;
    }

    public void resolve(String resolutionType, String resolutionDetails, BigDecimal resolutionAmount) {
        this.status = DisputeStatus.RESOLVED;
        this.resolutionType = resolutionType;
        this.resolutionDetails = resolutionDetails;
        this.resolutionAmount = resolutionAmount;
        this.resolvedAt = LocalDateTime.now();
    }

    public void escalate() {
        this.status = DisputeStatus.ESCALATED;
    }

    public void close() {
        this.status = DisputeStatus.CLOSED;
    }

    public boolean isOpen() {
        return this.status != DisputeStatus.RESOLVED && this.status != DisputeStatus.CLOSED;
    }

    public boolean isResolved() {
        return this.status == DisputeStatus.RESOLVED || this.status == DisputeStatus.CLOSED;
    }
}
