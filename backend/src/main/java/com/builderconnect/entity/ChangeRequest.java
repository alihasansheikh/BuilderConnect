package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Change request for modifying project scope, budget, or timeline.
 */
@Entity
@Table(name = "change_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeRequest extends BaseEntity {

    public enum ChangeType {
        SCOPE, BUDGET, TIMELINE
    }

    public enum ChangeRequestStatus {
        PENDING, APPROVED, REJECTED, WITHDRAWN
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false)
    private ChangeType changeType;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "proposed_value", columnDefinition = "TEXT")
    private String proposedValue;

    @Column(name = "current_value", columnDefinition = "TEXT")
    private String currentValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ChangeRequestStatus status = ChangeRequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // Helpers
    public void approve(User reviewer) {
        this.status = ChangeRequestStatus.APPROVED;
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
    }

    public void reject(User reviewer, String reason) {
        this.status = ChangeRequestStatus.REJECTED;
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void withdraw() {
        this.status = ChangeRequestStatus.WITHDRAWN;
    }

    public boolean isPending() {
        return this.status == ChangeRequestStatus.PENDING;
    }
}
