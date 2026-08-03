package com.builderconnect.service;

import com.builderconnect.entity.NotificationPreference;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.repository.NotificationPreferenceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private EmailTemplateRenderer emailTemplateRenderer;

    @Mock
    private NotificationPreferenceRepository notificationPreferenceRepository;

    @InjectMocks
    private EmailService emailService;

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:5173");
        user = User.builder()
                .email("user@example.com")
                .name("Test User")
                .role(UserRole.CLIENT)
                .build();
        user.setId(7L);
    }

    @Test
    @DisplayName("Suspension email is attempted with the reason passed through verbatim")
    void sendAccountSuspendedEmail_passesReasonVariable() {
        emailService.sendAccountSuspendedEmail(user, "Repeated policy violations");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> variables = ArgumentCaptor.forClass(Map.class);
        verify(emailTemplateRenderer).sendTemplated(eq("account_suspended"), eq("user@example.com"),
                variables.capture(), anyString(), anyString());
        assertThat(variables.getValue())
                .containsEntry("name", "Test User")
                .containsEntry("reason", "Repeated policy violations");
    }

    @Test
    @DisplayName("New-bid email is suppressed when the client opted out of emailNewBid")
    void sendNewBidEmail_optedOut_suppressed() {
        NotificationPreference prefs = NotificationPreference.builder()
                .user(user)
                .emailNewBid(false)
                .build();
        when(notificationPreferenceRepository.findByUserId(7L)).thenReturn(Optional.of(prefs));

        emailService.sendNewBidEmail(user, 12L, "Kitchen Renovation", "Builder Co", "1,200,000.00", "45");

        verify(emailTemplateRenderer, never()).sendTemplated(anyString(), anyString(), anyMap(),
                any(), any());
    }

    @Test
    @DisplayName("New-bid email sends by default when no preference row exists")
    void sendNewBidEmail_noPreferences_sends() {
        when(notificationPreferenceRepository.findByUserId(7L)).thenReturn(Optional.empty());

        emailService.sendNewBidEmail(user, 12L, "Kitchen Renovation", "Builder Co", "1,200,000.00", "45");

        verify(emailTemplateRenderer).sendTemplated(eq("new_bid_notification"), eq("user@example.com"),
                anyMap(), anyString(), anyString());
    }

    @Test
    @DisplayName("Order-placed email is suppressed when the supplier opted out of emailOrderUpdate")
    void sendOrderPlacedEmail_optedOut_suppressed() {
        NotificationPreference prefs = NotificationPreference.builder()
                .user(user)
                .emailOrderUpdate(false)
                .build();
        when(notificationPreferenceRepository.findByUserId(7L)).thenReturn(Optional.of(prefs));

        emailService.sendOrderPlacedEmail(user, "MO-2026-00042", "Ahmed Khan", "3", "50,000");

        verify(emailTemplateRenderer, never()).sendTemplated(anyString(), anyString(), anyMap(),
                any(), any());
    }

    @Test
    @DisplayName("Order-status email sends by default and passes the order variables")
    void sendOrderStatusEmail_noPreferences_sends() {
        when(notificationPreferenceRepository.findByUserId(7L)).thenReturn(Optional.empty());

        emailService.sendOrderStatusEmail(user, "MO-2026-00042", "CONFIRMED");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> variables = ArgumentCaptor.forClass(Map.class);
        verify(emailTemplateRenderer).sendTemplated(eq("order_status_buyer"), eq("user@example.com"),
                variables.capture(), anyString(), anyString());
        assertThat(variables.getValue())
                .containsEntry("orderNumber", "MO-2026-00042")
                .containsEntry("status", "CONFIRMED");
    }
}
