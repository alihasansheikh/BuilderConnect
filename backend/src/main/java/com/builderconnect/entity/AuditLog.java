package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Audit log entity for comprehensive activity tracking.
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    public enum ActionCategory {
        AUTH, USER, PROJECT, BID, MILESTONE, PAYMENT, ESCROW, CHAT, REVIEW, ADMIN, SYSTEM, SECURITY
    }

    public enum AuditStatus {
        SUCCESS, FAILURE, PARTIAL
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_email", length = 100)
    private String userEmail;

    @Column(name = "user_role", length = 50)
    private String userRole;

    @Column(nullable = false, length = 100)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_category", nullable = false)
    private ActionCategory actionCategory;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "entity_name", length = 200)
    private String entityName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "old_values", columnDefinition = "JSON")
    private String oldValues;

    @Column(name = "new_values", columnDefinition = "JSON")
    private String newValues;

    @Column(columnDefinition = "JSON")
    private String metadata;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "request_id", length = 50)
    private String requestId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AuditStatus status = AuditStatus.SUCCESS;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
