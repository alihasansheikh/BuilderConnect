package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Record of an outbound email, backed by the V5 email_logs table.
 * The table predates BaseEntity conventions (no updated_at), so
 * columns are mapped directly instead of extending BaseEntity.
 */
@Entity
@Table(name = "email_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "recipient_email", nullable = false, length = 100)
    private String recipientEmail;

    @Column(name = "email_type", nullable = false, length = 50)
    private String emailType;

    @Column(nullable = false, length = 255)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "template_name", length = 100)
    private String templateName;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(length = 20)
    private EmailStatus status = EmailStatus.PENDING;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Builder.Default
    @Column(length = 50)
    private String provider = "SMTP";

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public enum EmailStatus {
        PENDING, SENT, DELIVERED, BOUNCED, FAILED
    }
}
