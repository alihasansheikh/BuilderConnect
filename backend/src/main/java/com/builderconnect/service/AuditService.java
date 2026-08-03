package com.builderconnect.service;

import com.builderconnect.entity.AuditLog;
import com.builderconnect.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Service for audit logging. IP address and user agent are captured eagerly on
 * the caller (request) thread — RequestContextHolder is empty on async threads —
 * then the actual insert is delegated to the async {@link AuditWriter}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditWriter auditWriter;

    public void logAction(User user, String action, String description) {
        submit(user, action, "USER", user != null ? user.getId() : null, description, null, null,
            AuditLog.AuditStatus.SUCCESS, null);
    }

    public void logAction(User user, String action, String entityType, Long entityId, String description) {
        submit(user, action, entityType, entityId, description, null, null,
            AuditLog.AuditStatus.SUCCESS, null);
    }

    public void logAction(User user, String action, String entityType, Long entityId,
                          String description, String oldValues, String newValues) {
        submit(user, action, entityType, entityId, description, oldValues, newValues,
            AuditLog.AuditStatus.SUCCESS, null);
    }

    public void logAction(User user, String action, String entityType, Long entityId,
                          String description, AuditLog.AuditStatus status, String errorMessage) {
        submit(user, action, entityType, entityId, description, null, null,
            status != null ? status : AuditLog.AuditStatus.SUCCESS, errorMessage);
    }

    private void submit(User user, String action, String entityType, Long entityId,
                        String description, String oldValues, String newValues,
                        AuditLog.AuditStatus status, String errorMessage) {
        try {
            AuditLog entry = AuditLog.builder()
                .userId(user != null ? user.getId() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .userRole(user != null ? user.getRole().name() : null)
                .action(action)
                .actionCategory(AuditLog.ActionCategory.valueOf(determineCategory(action)))
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .oldValues(oldValues)
                .newValues(newValues)
                .ipAddress(getClientIpAddress())
                .userAgent(getUserAgent())
                .status(status)
                .errorMessage(errorMessage)
                .build();

            auditWriter.write(entry);
        } catch (Exception e) {
            log.error("Failed to submit audit log: action={}", action, e);
        }
    }

    private String determineCategory(String action) {
        if (action.contains("LOCKED") || action.contains("ACCOUNT_DELETED")) return "SECURITY";
        if (action.startsWith("USER_") || action.contains("LOGIN") || action.contains("LOGOUT") ||
            action.contains("REGISTER") || action.contains("PASSWORD")) {
            return "AUTH";
        }
        if (action.contains("PROJECT")) return "PROJECT";
        if (action.contains("BID")) return "BID";
        if (action.contains("MILESTONE")) return "MILESTONE";
        if (action.contains("PAYMENT") || action.contains("ESCROW")) return "PAYMENT";
        if (action.contains("CHAT") || action.contains("MESSAGE")) return "CHAT";
        if (action.contains("REVIEW")) return "REVIEW";
        if (action.contains("ADMIN") || action.contains("VERIFY") || action.contains("SUSPEND")) return "ADMIN";
        return "SYSTEM";
    }

    private String getClientIpAddress() {
        try {
            ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String xForwardedFor = request.getHeader("X-Forwarded-For");
                if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                    return xForwardedFor.split(",")[0].trim();
                }
                return request.getRemoteAddr();
            }
        } catch (Exception e) {
            log.trace("Could not get client IP address", e);
        }
        return null;
    }

    private String getUserAgent() {
        try {
            ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String userAgent = request.getHeader("User-Agent");
                return userAgent != null && userAgent.length() > 500
                    ? userAgent.substring(0, 500)
                    : userAgent;
            }
        } catch (Exception e) {
            log.trace("Could not get user agent", e);
        }
        return null;
    }
}
