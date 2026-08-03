package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Support ticket entity for customer support management.
 */
@Entity
@Table(name = "support_tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicket extends BaseEntity {

    public enum TicketCategory {
        ACCOUNT, BILLING, PROJECT, PAYMENT, TECHNICAL, DISPUTE, VERIFICATION, FEEDBACK, OTHER
    }

    public enum TicketPriority {
        LOW, NORMAL, HIGH, URGENT
    }

    public enum TicketStatus {
        OPEN, IN_PROGRESS, WAITING_CUSTOMER, WAITING_INTERNAL, RESOLVED, CLOSED, REOPENED
    }

    @Column(name = "ticket_number", nullable = false, unique = true, length = 20)
    private String ticketNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "order_id")
    private Long orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TicketPriority priority = TicketPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TicketStatus status = TicketStatus.OPEN;

    @Column(nullable = false)
    @Builder.Default
    private boolean escalated = false;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String resolution;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "satisfaction_rating")
    private Integer satisfactionRating;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TicketResponse> ticketResponses = new ArrayList<>();

    // Helper methods

    public void escalate() {
        this.escalated = true;
    }

    public void resolve(Long resolverUserId, String resolutionText) {
        this.status = TicketStatus.RESOLVED;
        this.resolvedBy = resolverUserId;
        this.resolvedAt = LocalDateTime.now();
        this.resolution = resolutionText;
    }

    public void reopen() {
        this.status = TicketStatus.REOPENED;
        this.resolvedBy = null;
        this.resolvedAt = null;
        this.resolution = null;
    }

    public void updateStatus(TicketStatus newStatus) {
        this.status = newStatus;
    }

    public boolean isOpen() {
        return this.status == TicketStatus.OPEN || this.status == TicketStatus.REOPENED;
    }

    public boolean isResolved() {
        return this.status == TicketStatus.RESOLVED || this.status == TicketStatus.CLOSED;
    }
}
