package com.builderconnect.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Injects the real SMTP password into the auto-configured {@link JavaMailSenderImpl} by decoding
 * {@code MAIL_PASSWORD_B64}.
 *
 * <p>The password is stored base64-encoded in {@code .env} because spring-dotenv cannot reliably
 * parse raw values that contain characters like {@code #} (treated as an inline comment) or quote
 * characters. Base64 uses only safe characters, so it round-trips cleanly through dotenv.
 *
 * <p>This is a no-op when the property is blank (the dev/mock mailer path), and it never logs the
 * decoded password — only its length, for a one-line startup confirmation.
 */
@Component
@Slf4j
public class MailPasswordDecoder implements BeanPostProcessor {

    @Value("${MAIL_PASSWORD_B64:}")
    private String encodedPassword;

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof JavaMailSenderImpl mailSender
                && encodedPassword != null && !encodedPassword.isBlank()) {
            try {
                String decoded = new String(
                        Base64.getDecoder().decode(encodedPassword.trim()), StandardCharsets.UTF_8);
                mailSender.setPassword(decoded);
                log.info("SMTP password loaded from MAIL_PASSWORD_B64 ({} chars)", decoded.length());
            } catch (IllegalArgumentException e) {
                log.error("MAIL_PASSWORD_B64 is not valid base64 — SMTP auth will fail: {}", e.getMessage());
            }
        }
        return bean;
    }
}
