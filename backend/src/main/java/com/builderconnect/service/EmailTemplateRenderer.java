package com.builderconnect.service;

import com.builderconnect.entity.EmailLog;
import com.builderconnect.entity.EmailTemplate;
import com.builderconnect.repository.EmailLogRepository;
import com.builderconnect.repository.EmailTemplateRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

/**
 * Sends emails driven by the email_templates table with {{variable}}
 * substitution. Inactive templates act as an admin kill-switch, except
 * for security-critical keys which always fall back rather than being
 * suppressed. Every send attempt is recorded in email_logs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailTemplateRenderer {

    private static final Set<String> SECURITY_CRITICAL_KEYS = Set.of("email_verification", "password_reset");
    private static final int MAX_RECIPIENT_LENGTH = 100;
    private static final int MAX_EMAIL_TYPE_LENGTH = 50;
    private static final int MAX_SUBJECT_LENGTH = 255;
    private static final int MAX_FAILURE_REASON_LENGTH = 500;

    private final JavaMailSender mailSender;
    private final EmailTemplateRepository emailTemplateRepository;
    private final EmailLogRepository emailLogRepository;

    @Value("${app.email.from}")
    private String fromEmail;

    @Async
    public void sendTemplated(String templateKey, String toEmail, Map<String, String> variables,
                              String fallbackSubject, String fallbackBody) {
        try {
            EmailTemplate template = emailTemplateRepository.findByTemplateKey(templateKey).orElse(null);

            String subject;
            String body;

            if (template == null) {
                if (fallbackSubject == null || fallbackBody == null) {
                    log.warn("Email template '{}' not found and no fallback provided - skipping send to {}",
                            templateKey, toEmail);
                    return;
                }
                subject = fallbackSubject;
                body = fallbackBody;
            } else if (Boolean.FALSE.equals(template.getIsActive())) {
                if (!SECURITY_CRITICAL_KEYS.contains(templateKey)) {
                    log.info("Email template '{}' is inactive - suppressing send to {}", templateKey, toEmail);
                    return;
                }
                log.warn("Security-critical email template '{}' is inactive - sending fallback to {}",
                        templateKey, toEmail);
                subject = fallbackSubject != null ? fallbackSubject : template.getSubject();
                body = fallbackBody != null ? fallbackBody : template.getBody();
            } else {
                subject = template.getSubject();
                body = template.getBody();
            }

            String resolvedSubject = substitute(subject, variables, false);
            String resolvedBody = substitute(body, variables, true);
            String templateName = template != null ? template.getName() : null;

            sendAndLog(templateKey, toEmail, resolvedSubject, resolvedBody, templateName);
        } catch (Exception e) {
            log.error("Unexpected error sending templated email '{}' to {}: {}",
                    templateKey, toEmail, e.getMessage());
        }
    }

    private void sendAndLog(String templateKey, String toEmail, String subject, String body, String templateName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
            log.info("Email '{}' sent to {}", templateKey, toEmail);
            writeLog(templateKey, toEmail, subject, body, templateName, EmailLog.EmailStatus.SENT, null);
        } catch (Exception e) {
            log.error("Failed to send email '{}' to {}: {}", templateKey, toEmail, e.getMessage());
            writeLog(templateKey, toEmail, subject, body, templateName, EmailLog.EmailStatus.FAILED, e.getMessage());
        }
    }

    private void writeLog(String templateKey, String toEmail, String subject, String body,
                          String templateName, EmailLog.EmailStatus status, String failureReason) {
        try {
            emailLogRepository.save(EmailLog.builder()
                    .recipientEmail(truncate(toEmail, MAX_RECIPIENT_LENGTH))
                    .emailType(truncate(templateKey, MAX_EMAIL_TYPE_LENGTH))
                    .subject(truncate(subject, MAX_SUBJECT_LENGTH))
                    .body(body)
                    .templateName(templateName)
                    .status(status)
                    .failureReason(truncate(failureReason, MAX_FAILURE_REASON_LENGTH))
                    .sentAt(status == EmailLog.EmailStatus.SENT ? LocalDateTime.now() : null)
                    .build());
        } catch (Exception e) {
            log.error("Failed to write email log for '{}' to {}: {}", templateKey, toEmail, e.getMessage());
        }
    }

    /**
     * The body is sent as HTML (setText(body, true)) while variable values are user-controlled
     * (display names, project titles, company names) — they must be escaped or a user could
     * inject markup/links into emails delivered to other users. Links belong in the template
     * itself, never in a variable. The subject is plain text and stays unescaped.
     */
    private String substitute(String text, Map<String, String> variables, boolean escapeHtml) {
        if (text == null || variables == null) {
            return text;
        }
        String result = text;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            String raw = entry.getValue() != null ? entry.getValue() : "";
            String value = escapeHtml ? HtmlUtils.htmlEscape(raw) : raw;
            result = result.replace("{{" + entry.getKey() + "}}", value);
        }
        return result;
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
