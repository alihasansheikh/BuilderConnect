package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * UserBadge entity representing a badge awarded to a user.
 * Does NOT extend BaseEntity because user_badges table has no updated_at column.
 */
@Entity
@Table(name = "user_badges", uniqueConstraints = {
        @UniqueConstraint(name = "unique_user_badge", columnNames = {"user_id", "badge_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "badge_id", nullable = false)
    private Badge badge;

    @Column(name = "awarded_at", nullable = false, updatable = false)
    private LocalDateTime awardedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "awarded_by")
    private User awardedBy;

    @Column(name = "award_reason", length = 500)
    private String notes;

    @PrePersist
    protected void onCreate() {
        if (awardedAt == null) {
            awardedAt = LocalDateTime.now();
        }
    }
}
