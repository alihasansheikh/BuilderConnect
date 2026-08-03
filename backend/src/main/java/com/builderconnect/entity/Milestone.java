package com.builderconnect.entity;

import com.builderconnect.enums.MilestoneStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Milestone entity representing project phases with associated payments.
 */
@Entity
@Table(name = "milestones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Milestone extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 1;

    // Payment
    @Column(name = "payment_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal paymentAmount;

    @Column(name = "payment_percentage", precision = 5, scale = 2)
    private BigDecimal paymentPercentage;

    // Timeline
    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MilestoneStatus status = MilestoneStatus.PENDING;

    // Progress
    @Builder.Default
    @Column(name = "progress_percentage")
    private Integer progressPercentage = 0;

    // Deliverables
    @Column(columnDefinition = "JSON")
    private String deliverables;

    @Column(name = "completion_evidence", columnDefinition = "JSON")
    private String completionEvidence;

    // Approval
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "approved_by")
    private Long approvedBy;

    // Payment release
    @Column(name = "payment_released_at")
    private LocalDateTime paymentReleasedAt;

    @Column(name = "payment_transaction_id")
    private Long paymentTransactionId;

    // Direct milestone payment (record-only, off-platform proof)
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "payment_proof_url", length = 500)
    private String paymentProofUrl;

    @Column(name = "payment_confirmed_at")
    private LocalDateTime paymentConfirmedAt;

    @Column(name = "payment_note", length = 1000)
    private String paymentNote;

    // Helper methods
    public void start() {
        this.status = MilestoneStatus.IN_PROGRESS;
        if (this.startDate == null) {
            this.startDate = LocalDate.now();
        }
    }

    public void markComplete(String evidence) {
        this.status = MilestoneStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
        this.completionEvidence = evidence;
        this.progressPercentage = 100;
    }

    public void approve(Long approverUserId) {
        this.status = MilestoneStatus.APPROVED;
        this.approvedAt = LocalDateTime.now();
        this.approvedBy = approverUserId;
    }

    public void reject(String reason) {
        this.status = MilestoneStatus.REJECTED;
        this.rejectionReason = reason;
    }

    public void releasePayment(Long transactionId) {
        this.status = MilestoneStatus.PAYMENT_RELEASED;
        this.paymentReleasedAt = LocalDateTime.now();
        this.paymentTransactionId = transactionId;
    }

    public void markPaid(String proofUrl, String note) {
        this.status = MilestoneStatus.PAID;
        this.paidAt = LocalDateTime.now();
        this.paymentProofUrl = proofUrl;
        this.paymentNote = note;
    }

    public void confirmPayment() {
        this.status = MilestoneStatus.CONFIRMED;
        this.paymentConfirmedAt = LocalDateTime.now();
    }

    public boolean isOverdue() {
        return dueDate != null && dueDate.isBefore(LocalDate.now()) &&
               status != MilestoneStatus.COMPLETED && status != MilestoneStatus.APPROVED &&
               status != MilestoneStatus.PAYMENT_RELEASED;
    }

    public boolean canBeCompleted() {
        return status == MilestoneStatus.IN_PROGRESS;
    }

    public boolean canBeApproved() {
        return status == MilestoneStatus.COMPLETED || status == MilestoneStatus.UNDER_REVIEW;
    }

    public boolean requiresPayment() {
        return status == MilestoneStatus.APPROVED || status == MilestoneStatus.PAYMENT_PENDING;
    }
}
