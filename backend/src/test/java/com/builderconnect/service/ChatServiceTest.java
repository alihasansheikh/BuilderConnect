package com.builderconnect.service;

import com.builderconnect.dto.request.ChatMessageRequest;
import com.builderconnect.dto.response.ChatMessageResponse;
import com.builderconnect.entity.ChatMessage;
import com.builderconnect.entity.ChatRoom;
import com.builderconnect.entity.ChatRoomParticipant;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.ChatMessageRepository;
import com.builderconnect.repository.ChatRoomParticipantRepository;
import com.builderconnect.repository.ChatRoomRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    private static final Long ROOM_ID = 10L;

    @Mock
    private ChatRoomRepository chatRoomRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ChatRoomParticipantRepository participantRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ChatService chatService;

    private User user(Long id, String email, String name, UserRole role) {
        User u = User.builder()
                .email(email)
                .name(name)
                .role(role)
                .build();
        u.setId(id);
        return u;
    }

    private ChatRoom room() {
        ChatRoom chatRoom = ChatRoom.builder()
                .roomCode("CHAT-TEST01")
                .roomType(ChatRoom.RoomType.DIRECT)
                .isActive(true)
                .build();
        chatRoom.setId(ROOM_ID);
        return chatRoom;
    }

    private ChatRoomParticipant participant(Long userId) {
        return ChatRoomParticipant.builder()
                .chatRoomId(ROOM_ID)
                .userId(userId)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("sendMessage persists a NEW_MESSAGE notification per recipient inside the transaction, before commit")
    void sendMessage_createsNotificationPerRecipientBeforeCommit() {
        User sender = user(1L, "sender@example.com", "Ahmed Khan", UserRole.CLIENT);
        User recipientClient = user(2L, "client2@example.com", "Sara Ahmed", UserRole.CLIENT);
        User recipientBuilder = user(3L, "builder1@example.com", "Muhammad Contractors", UserRole.BUILDER);

        when(chatRoomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room()));
        when(participantRepository.existsByChatRoomIdAndUserIdAndIsActiveTrue(ROOM_ID, 1L)).thenReturn(true);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(inv -> {
            ChatMessage m = inv.getArgument(0);
            m.setId(55L);
            return m;
        });
        when(participantRepository.findByChatRoomIdAndUserId(ROOM_ID, 1L)).thenReturn(Optional.empty());
        when(participantRepository.findOtherParticipants(ROOM_ID, 1L))
                .thenReturn(List.of(participant(2L), participant(3L)));
        when(userRepository.findById(2L)).thenReturn(Optional.of(recipientClient));
        when(userRepository.findById(3L)).thenReturn(Optional.of(recipientBuilder));

        ChatMessageRequest request = ChatMessageRequest.builder().content("Hello there").build();

        TransactionSynchronizationManager.initSynchronization();
        try {
            chatService.sendMessage(ROOM_ID, sender, request);

            // Notification rows are persisted in the transactional body, NOT deferred to afterCommit
            ArgumentCaptor<User> recipientCaptor = ArgumentCaptor.forClass(User.class);
            verify(notificationService, times(2)).createNotification(
                    recipientCaptor.capture(),
                    eq(NotificationType.NEW_MESSAGE),
                    eq("New message from Ahmed Khan"),
                    eq("Hello there"),
                    eq("chat"),
                    eq(ROOM_ID),
                    anyString());
            assertThat(recipientCaptor.getAllValues())
                    .extracting(User::getId)
                    .containsExactly(2L, 3L);

            // WebSocket broadcasts stay deferred until the transaction commits
            verifyNoInteractions(messagingTemplate);

            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(TransactionSynchronization::afterCommit);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }

        verify(messagingTemplate).convertAndSend(eq("/topic/chat/" + ROOM_ID), any(ChatMessageResponse.class));
        verify(messagingTemplate).convertAndSendToUser(eq("client2@example.com"), eq("/queue/chat-updates"), any());
        verify(messagingTemplate).convertAndSendToUser(eq("builder1@example.com"), eq("/queue/chat-updates"), any());
    }

    @Test
    @DisplayName("sendMessage rejects a sender who is not a room participant")
    void sendMessage_nonParticipant_throws() {
        User sender = user(1L, "sender@example.com", "Ahmed Khan", UserRole.CLIENT);
        when(chatRoomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room()));
        when(participantRepository.existsByChatRoomIdAndUserIdAndIsActiveTrue(ROOM_ID, 1L)).thenReturn(false);

        ChatMessageRequest request = ChatMessageRequest.builder().content("hi").build();

        assertThatThrownBy(() -> chatService.sendMessage(ROOM_ID, sender, request))
                .isInstanceOf(BadRequestException.class);

        verifyNoInteractions(notificationService, messagingTemplate);
    }
}
