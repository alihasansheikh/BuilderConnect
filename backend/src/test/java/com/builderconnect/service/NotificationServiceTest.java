package com.builderconnect.service;

import com.builderconnect.entity.Notification;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.UserRole;
import com.builderconnect.repository.NotificationRepository;
import com.builderconnect.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationService notificationService;

    private User user(Long id, String email, UserRole role) {
        User u = User.builder()
                .email(email)
                .name("User " + id)
                .role(role)
                .build();
        u.setId(id);
        return u;
    }

    private void stubSaveAssignsId() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(100L + n.getUser().getId());
            return n;
        });
    }

    @Test
    @DisplayName("notifyAdmins creates one notification per admin returned by the repository")
    void notifyAdmins_createsOneNotificationPerAdmin() {
        User admin = user(1L, "admin@builderconnect.pk", UserRole.ADMIN);
        User superAdmin = user(2L, "superadmin@builderconnect.pk", UserRole.SUPER_ADMIN);
        when(userRepository.findByRoleInAndDeletedFalseOrderByCreatedAtDesc(
                List.of(UserRole.ADMIN, UserRole.SUPER_ADMIN)))
                .thenReturn(List.of(admin, superAdmin));
        stubSaveAssignsId();

        notificationService.notifyAdmins(NotificationType.DISPUTE_OPENED,
                "New Dispute Filed", "A dispute was filed", "dispute", 5L, "/support/disputes");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(2)).save(captor.capture());

        List<Notification> saved = captor.getAllValues();
        assertThat(saved)
                .extracting(n -> n.getUser().getEmail())
                .containsExactly("admin@builderconnect.pk", "superadmin@builderconnect.pk");
        assertThat(saved).allSatisfy(n -> {
            assertThat(n.getNotificationType()).isEqualTo(NotificationType.DISPUTE_OPENED);
            assertThat(n.getTitle()).isEqualTo("New Dispute Filed");
            assertThat(n.getRelatedEntityType()).isEqualTo("dispute");
            assertThat(n.getRelatedEntityId()).isEqualTo(5L);
            assertThat(n.getActionUrl()).isEqualTo("/support/disputes");
        });
    }

    @Test
    @DisplayName("notifyAdmins with no admins creates nothing")
    void notifyAdmins_noAdmins_createsNothing() {
        when(userRepository.findByRoleInAndDeletedFalseOrderByCreatedAtDesc(
                List.of(UserRole.ADMIN, UserRole.SUPER_ADMIN)))
                .thenReturn(List.of());

        notificationService.notifyAdmins(NotificationType.PAYMENT_RECEIVED,
                "Subscription Revenue", "msg", "SUBSCRIPTION", 1L, "/admin/revenue");

        verifyNoInteractions(notificationRepository);
    }

    @Test
    @DisplayName("getUserNotifications with isRead=false returns only unread notifications")
    void getUserNotifications_unreadFilter_returnsOnlyUnread() {
        Pageable pageable = PageRequest.of(0, 20);
        Notification unread = Notification.builder()
                .user(user(1L, "client1@example.com", UserRole.CLIENT))
                .notificationType(NotificationType.NEW_MESSAGE)
                .title("New message")
                .message("Hello")
                .build();
        Page<Notification> unreadPage = new PageImpl<>(List.of(unread), pageable, 1);
        when(notificationRepository.findByUserIdAndIsReadFalse(1L, pageable)).thenReturn(unreadPage);

        Page<Notification> result = notificationService.getUserNotifications(1L, false, pageable);

        assertThat(result).isSameAs(unreadPage);
        verify(notificationRepository, never()).findByUserIdOrderByCreatedAtDesc(1L, pageable);
    }

    @Test
    @DisplayName("getUserNotifications without the unread filter returns all notifications")
    void getUserNotifications_noFilter_returnsAll() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Notification> allPage = new PageImpl<>(List.of(), pageable, 0);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L, pageable)).thenReturn(allPage);

        assertThat(notificationService.getUserNotifications(1L, null, pageable)).isSameAs(allPage);
        assertThat(notificationService.getUserNotifications(1L, true, pageable)).isSameAs(allPage);
        verify(notificationRepository, never()).findByUserIdAndIsReadFalse(1L, pageable);
    }

    @Test
    @DisplayName("createNotification broadcast payload includes actionUrl and createdAt")
    void createNotification_broadcastIncludesActionUrlAndCreatedAt() {
        User recipient = user(1L, "client1@example.com", UserRole.CLIENT);
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 19, 12, 30);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(42L);
            n.setCreatedAt(createdAt);
            return n;
        });

        notificationService.createNotification(recipient, NotificationType.NEW_MESSAGE,
                "New message from Sara", "Hello", "chat", 9L, "/client/messages");

        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq("client1@example.com"), eq("/queue/notifications"), payloadCaptor.capture());

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) payloadCaptor.getValue();
        assertThat(payload)
                .containsEntry("id", 42L)
                .containsEntry("actionUrl", "/client/messages")
                .containsEntry("createdAt", createdAt.toString());
    }

    @Test
    @DisplayName("notifySupportAgents creates one notification per support agent")
    void notifySupportAgents_createsOneNotificationPerAgent() {
        User agent = user(3L, "support@builderconnect.pk", UserRole.SUPPORT_AGENT);
        when(userRepository.findByRoleInAndDeletedFalseOrderByCreatedAtDesc(
                List.of(UserRole.SUPPORT_AGENT)))
                .thenReturn(List.of(agent));
        stubSaveAssignsId();

        notificationService.notifySupportAgents(NotificationType.TICKET_CREATED,
                "New Support Ticket", "Ticket opened", "support_ticket", 7L, "/support/tickets/7");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getUser().getEmail()).isEqualTo("support@builderconnect.pk");
        assertThat(saved.getNotificationType()).isEqualTo(NotificationType.TICKET_CREATED);
        assertThat(saved.getActionUrl()).isEqualTo("/support/tickets/7");
    }

    @Test
    @DisplayName("notifySupportAgents falls back to admins when no active agents exist")
    void notifySupportAgents_noAgents_fallsBackToAdmins() {
        User admin = user(1L, "admin@builderconnect.pk", UserRole.ADMIN);
        when(userRepository.findByRoleInAndDeletedFalseOrderByCreatedAtDesc(
                List.of(UserRole.SUPPORT_AGENT)))
                .thenReturn(List.of());
        when(userRepository.findByRoleInAndDeletedFalseOrderByCreatedAtDesc(
                List.of(UserRole.ADMIN, UserRole.SUPER_ADMIN)))
                .thenReturn(List.of(admin));
        stubSaveAssignsId();

        notificationService.notifySupportAgents(NotificationType.TICKET_CREATED,
                "New Support Ticket", "Ticket opened", "support_ticket", 7L, "/support/tickets/7");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getUser().getEmail()).isEqualTo("admin@builderconnect.pk");
    }
}
