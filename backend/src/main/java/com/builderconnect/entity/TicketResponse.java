package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Ticket response entity for individual responses within a support ticket.
 * Note: ticket_responses table has created_at but NO updated_at column,
 * so this entity does NOT extend BaseEntity.
 */
@Entity
@Table(name = "ticket_responses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private SupportTicket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responder_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Builder.Default
    @Column(name = "is_internal")
    private Boolean isInternal = false;

    @Column(columnDefinition = "JSON")
    private String attachments;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
