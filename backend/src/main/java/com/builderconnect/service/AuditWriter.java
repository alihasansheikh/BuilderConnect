package com.builderconnect.service;

import com.builderconnect.entity.AuditLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Async persistence for audit entries. Kept as a separate bean so the @Async
 * proxy boundary is preserved when AuditService delegates to it — request
 * context (IP, user agent) must already be captured by the caller because
 * this runs on a thread without RequestContextHolder attributes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditWriter {

    private final JdbcTemplate jdbcTemplate;

    @Async
    public void write(AuditLog entry) {
        try {
            String sql = """
                INSERT INTO audit_logs (user_id, user_email, user_role, action, action_category,
                    entity_type, entity_id, description, old_values, new_values,
                    ip_address, user_agent, status, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                """;

            jdbcTemplate.update(sql,
                entry.getUserId(),
                entry.getUserEmail(),
                entry.getUserRole(),
                entry.getAction(),
                entry.getActionCategory().name(),
                entry.getEntityType(),
                entry.getEntityId(),
                entry.getDescription(),
                entry.getOldValues(),
                entry.getNewValues(),
                entry.getIpAddress(),
                entry.getUserAgent(),
                entry.getStatus().name(),
                entry.getErrorMessage()
            );

            log.debug("Audit log created: action={}, user={}, entity={}/{}",
                entry.getAction(), entry.getUserEmail() != null ? entry.getUserEmail() : "anonymous",
                entry.getEntityType(), entry.getEntityId());

        } catch (Exception e) {
            log.error("Failed to create audit log: action={}", entry.getAction(), e);
        }
    }
}
