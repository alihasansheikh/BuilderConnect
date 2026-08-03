package com.builderconnect.service;

import com.builderconnect.entity.EmailLog;
import com.builderconnect.entity.EmailTemplate;
import com.builderconnect.repository.EmailLogRepository;
import com.builderconnect.repository.EmailTemplateRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailTemplateRendererTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailTemplateRepository emailTemplateRepository;

    @Mock
    private EmailLogRepository emailLogRepository;

    @InjectMocks
    private EmailTemplateRenderer renderer;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(renderer, "fromEmail", "noreply@builderconnect.pk");
    }

    private EmailTemplate template(String key, String subject, String body, boolean active) {
        return EmailTemplate.builder()
                .templateKey(key)
                .name("Template " + key)
                .subject(subject)
                .body(body)
                .isActive(active)
                .build();
    }

    @Test
    @DisplayName("active template found - variables substituted, email sent, SENT log written")
    void sendTemplated_activeTemplate_substitutesAndSends() throws Exception {
        when(emailTemplateRepository.findByTemplateKey("builder_verified"))
                .thenReturn(Optional.of(template("builder_verified",
                        "Congratulations {{name}}!",
                        "<p>Hi {{name}}, {{companyName}} is now verified.</p>", true)));
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        renderer.sendTemplated("builder_verified", "builder@example.com",
                Map.of("name", "Ali", "companyName", "Ali Construction"), null, null);

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        MimeMessage sent = messageCaptor.getValue();
        assertThat(sent.getSubject()).isEqualTo("Congratulations Ali!");
        assertThat((String) sent.getContent()).contains("Hi Ali", "Ali Construction is now verified");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog emailLog = logCaptor.getValue();
        assertThat(emailLog.getStatus()).isEqualTo(EmailLog.EmailStatus.SENT);
        assertThat(emailLog.getEmailType()).isEqualTo("builder_verified");
        assertThat(emailLog.getRecipientEmail()).isEqualTo("builder@example.com");
        assertThat(emailLog.getSentAt()).isNotNull();
        assertThat(emailLog.getFailureReason()).isNull();
    }

    @Test
    @DisplayName("variable values are HTML-escaped in the body but not the plain-text subject")
    void sendTemplated_htmlInVariables_escapedInBody() throws Exception {
        when(emailTemplateRepository.findByTemplateKey("new_bid"))
                .thenReturn(Optional.of(template("new_bid",
                        "New bid from {{builderName}}",
                        "<p>{{builderName}} placed a bid.</p>", true)));
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        renderer.sendTemplated("new_bid", "client@example.com",
                Map.of("builderName", "Ali <a href=\"https://evil.pk\">click</a> & Co"), null, null);

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        MimeMessage sent = messageCaptor.getValue();
        assertThat((String) sent.getContent())
                .contains("Ali &lt;a href=&quot;https://evil.pk&quot;&gt;click&lt;/a&gt; &amp; Co")
                .doesNotContain("<a href=\"https://evil.pk\">");
        assertThat(sent.getSubject()).isEqualTo("New bid from Ali <a href=\"https://evil.pk\">click</a> & Co");
    }

    @Test
    @DisplayName("inactive non-critical template - send suppressed, nothing logged")
    void sendTemplated_inactiveNonCritical_suppressesSend() {
        when(emailTemplateRepository.findByTemplateKey("project_awarded"))
                .thenReturn(Optional.of(template("project_awarded", "Awarded", "<p>Body</p>", false)));

        renderer.sendTemplated("project_awarded", "builder@example.com",
                Map.of("builderName", "Ali"), "Fallback subject", "<p>Fallback body</p>");

        verify(mailSender, never()).send(any(MimeMessage.class));
        verify(emailLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("inactive security-critical template - fallback sent instead of suppressing")
    void sendTemplated_inactiveCritical_usesFallback() throws Exception {
        when(emailTemplateRepository.findByTemplateKey("email_verification"))
                .thenReturn(Optional.of(template("email_verification",
                        "Template subject", "<p>Template body</p>", false)));
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        renderer.sendTemplated("email_verification", "user@example.com",
                Map.of("name", "Sara", "verificationUrl", "http://localhost/verify"),
                "Verify your account",
                "<p>Hello {{name}}, verify at {{verificationUrl}}</p>");

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        MimeMessage sent = messageCaptor.getValue();
        assertThat(sent.getSubject()).isEqualTo("Verify your account");
        assertThat((String) sent.getContent()).contains("Hello Sara", "http://localhost/verify");
    }

    @Test
    @DisplayName("missing template - fallback sent with substitution")
    void sendTemplated_missingTemplate_usesFallback() throws Exception {
        when(emailTemplateRepository.findByTemplateKey("nonexistent_key")).thenReturn(Optional.empty());
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        renderer.sendTemplated("nonexistent_key", "user@example.com",
                Map.of("name", "Usman"),
                "Fallback subject", "<p>Hello {{name}}</p>");

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        MimeMessage sent = messageCaptor.getValue();
        assertThat(sent.getSubject()).isEqualTo("Fallback subject");
        assertThat((String) sent.getContent()).contains("Hello Usman");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getStatus()).isEqualTo(EmailLog.EmailStatus.SENT);
        assertThat(logCaptor.getValue().getTemplateName()).isNull();
    }

    @Test
    @DisplayName("missing template and no fallback - send skipped")
    void sendTemplated_missingTemplateNoFallback_skips() {
        when(emailTemplateRepository.findByTemplateKey("nonexistent_key")).thenReturn(Optional.empty());

        renderer.sendTemplated("nonexistent_key", "user@example.com", Map.of(), null, null);

        verify(mailSender, never()).send(any(MimeMessage.class));
        verify(emailLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("send failure - FAILED log written with reason, no exception thrown")
    void sendTemplated_sendFails_writesFailedLog() {
        when(emailTemplateRepository.findByTemplateKey("account_suspended"))
                .thenReturn(Optional.of(template("account_suspended",
                        "Suspended", "<p>Hi {{name}}</p>", true)));
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        doThrow(new MailSendException("SMTP connection refused"))
                .when(mailSender).send(any(MimeMessage.class));

        renderer.sendTemplated("account_suspended", "user@example.com",
                Map.of("name", "Ahmed", "reason", "Policy violation"), null, null);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog emailLog = logCaptor.getValue();
        assertThat(emailLog.getStatus()).isEqualTo(EmailLog.EmailStatus.FAILED);
        assertThat(emailLog.getFailureReason()).contains("SMTP connection refused");
        assertThat(emailLog.getSentAt()).isNull();
    }
}
