package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Dispute comment entity for individual comments within a dispute.
 * Note: dispute_comments table has created_at but NO updated_at column,
 * so this entity does NOT extend BaseEntity.
 */
@Entity
@Table(name = "dispute_comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisputeComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_id", nullable = false)
    private Dispute dispute;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String comment;

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
