package com.builderconnect.entity;

import com.builderconnect.enums.NotificationType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Notification entity for in-app notifications.
 * Note: notifications table has created_at but NO updated_at column,
 * so this entity does NOT extend BaseEntity.
 */
@Entity
@Table(name = "notifications")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum Priority {
        LOW, NORMAL, HIGH, URGENT
    }

    // Recipient — excluded from JSON: the API already scopes queries to the caller, and
    // serializing the User entity here only bloats (and used to leak) the payload
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false)
    private NotificationType notificationType;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(length = 50)
    private String icon;

    @Column(name = "related_entity_type", length = 50)
    private String relatedEntityType;

    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    @Column(name = "action_url", length = 500)
    private String actionUrl;

    @Builder.Default
    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Builder.Default
    @Column(name = "sent_email")
    private Boolean sentEmail = false;

    @Column(name = "email_sent_at")
    private LocalDateTime emailSentAt;

    @Builder.Default
    @Column(name = "sent_push")
    private Boolean sentPush = false;

    @Column(name = "push_sent_at")
    private LocalDateTime pushSentAt;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priority priority = Priority.NORMAL;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }
}
