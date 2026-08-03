package com.builderconnect.service;

import com.builderconnect.dto.request.ChatMessageRequest;
import com.builderconnect.dto.response.ChatMessageResponse;
import com.builderconnect.dto.response.ChatRoomResponse;
import com.builderconnect.entity.ChatMessage;
import com.builderconnect.entity.ChatRoom;
import com.builderconnect.entity.ChatRoomParticipant;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.User;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.ChatMessageRepository;
import com.builderconnect.repository.ChatRoomParticipantRepository;
import com.builderconnect.repository.ChatRoomRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.UserRepository;
import com.builderconnect.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing chat rooms and messages.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    /**
     * Get or create a direct chat room between two users.
     */
    @Transactional
    public ChatRoomResponse getOrCreateDirectRoom(User user1, Long user2Id) {
        User user2 = userRepository.findById(user2Id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if direct room already exists between these users
        Optional<Long> existingRoomId = participantRepository.findDirectRoomBetweenUsers(user1.getId(), user2Id);

        if (existingRoomId.isPresent()) {
            ChatRoom room = chatRoomRepository.findById(existingRoomId.get())
                    .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));
            return mapToResponse(room, user1);
        }

        // Create new direct room
        try {
            ChatRoom room = ChatRoom.builder()
                    .roomCode("CHAT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .roomType(ChatRoom.RoomType.DIRECT)
                    .createdBy(user1.getId())
                    .isActive(true)
                    .build();

            ChatRoom savedRoom = chatRoomRepository.save(room);

            // Add participants
            addParticipant(savedRoom.getId(), user1.getId(), true);
            addParticipant(savedRoom.getId(), user2Id, false);

            log.info("Created direct chat room {} between users {} and {}",
                    savedRoom.getRoomCode(), user1.getId(), user2Id);

            return mapToResponse(savedRoom, user1);
        } catch (DataIntegrityViolationException e) {
            // Room was created by concurrent request, fetch the existing one
            existingRoomId = participantRepository.findDirectRoomBetweenUsers(user1.getId(), user2Id);
            if (existingRoomId.isPresent()) {
                ChatRoom existingRoom = chatRoomRepository.findById(existingRoomId.get())
                        .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));
                return mapToResponse(existingRoom, user1);
            }
            throw new BadRequestException("Failed to create chat room");
        }
    }

    /**
     * Get or create a project-related chat room.
     */
    @Transactional
    public ChatRoomResponse getOrCreateProjectRoom(Long projectId, Set<Long> participantIds, User creator) {
        Optional<ChatRoom> existingRoom = chatRoomRepository.findByProjectId(projectId);

        if (existingRoom.isPresent()) {
            return mapToResponse(existingRoom.get(), creator);
        }

        ChatRoom room = ChatRoom.builder()
                .roomCode("PROJ-" + projectId + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase())
                .roomType(ChatRoom.RoomType.PROJECT)
                .projectId(projectId)
                .createdBy(creator.getId())
                .isActive(true)
                .build();

        ChatRoom savedRoom = chatRoomRepository.save(room);

        // Add creator as admin
        addParticipant(savedRoom.getId(), creator.getId(), true);

        // Add other participants
        participantIds.stream()
                .filter(id -> !id.equals(creator.getId()))
                .forEach(id -> addParticipant(savedRoom.getId(), id, false));

        log.info("Created project chat room {} for project {}", savedRoom.getRoomCode(), projectId);

        return mapToResponse(savedRoom, creator);
    }

    /**
     * Get or create the chat room for an awarded project, enforcing party access.
     * Caller must be the project's client, the awarded builder, or an admin.
     * Both the client and the awarded builder are always seeded as participants.
     */
    @Transactional
    public ChatRoomResponse getOrCreateProjectRoomForUser(Long projectId, User user) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        User awardedBuilder = project.getAwardedBuilder();
        if (awardedBuilder == null || isPreAward(project.getStatus())) {
            throw new BadRequestException("Project has no awarded builder yet");
        }

        Long clientId = project.getClient().getId();
        Long builderId = awardedBuilder.getId();
        boolean isParty = user.getId().equals(clientId) || user.getId().equals(builderId);
        if (!isParty && !user.isAdmin()) {
            throw new UnauthorizedException("You do not have access to this project's chat room");
        }

        Optional<ChatRoom> existingRoom = chatRoomRepository.findByProjectId(projectId);
        if (existingRoom.isPresent()) {
            ChatRoom room = existingRoom.get();
            ensureParticipant(room.getId(), clientId);
            ensureParticipant(room.getId(), builderId);
            return mapToResponse(room, user);
        }

        return getOrCreateProjectRoom(projectId, Set.of(clientId, builderId), user);
    }

    private static boolean isPreAward(ProjectStatus status) {
        return status == ProjectStatus.DRAFT
                || status == ProjectStatus.OPEN
                || status == ProjectStatus.BIDDING;
    }

    private void ensureParticipant(Long roomId, Long userId) {
        if (participantRepository.findByChatRoomIdAndUserId(roomId, userId).isEmpty()) {
            addParticipant(roomId, userId, false);
        }
    }

    /**
     * Get all chat rooms for a user.
     */
    @Transactional(readOnly = true)
    public Page<ChatRoomResponse> getUserRooms(User user, Pageable pageable) {
        Page<ChatRoom> rooms = chatRoomRepository.findUserChatRooms(user.getId(), pageable);
        return rooms.map(room -> mapToResponse(room, user));
    }

    /**
     * Get messages for a chat room.
     */
    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getRoomMessages(Long roomId, User user, Pageable pageable) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        // Verify user is a participant
        if (!isParticipant(roomId, user.getId())) {
            throw new BadRequestException("You are not a participant in this chat room");
        }

        Page<ChatMessage> messages = chatMessageRepository.findByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(roomId, pageable);
        return messages.map(this::mapMessageToResponse);
    }

    /**
     * Send a message to a chat room.
     */
    @Transactional
    public ChatMessageResponse sendMessage(Long roomId, User sender, ChatMessageRequest request) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        // Verify sender is a participant
        if (!isParticipant(roomId, sender.getId())) {
            throw new BadRequestException("You are not a participant in this chat room");
        }
        SecurityUtils.validateNotSuspended(sender);

        ChatMessage.MessageType messageType = ChatMessage.MessageType.TEXT;
        if (request.getMessageType() != null) {
            try {
                messageType = ChatMessage.MessageType.valueOf(request.getMessageType());
            } catch (IllegalArgumentException e) {
                messageType = ChatMessage.MessageType.TEXT;
            }
        }

        ChatMessage message = ChatMessage.builder()
                .chatRoom(room)
                .sender(sender)
                .content(request.getContent())
                .messageType(messageType)
                .isEdited(false)
                .isDeleted(false)
                .build();

        if (request.getAttachmentUrl() != null) {
            message.setAttachmentUrl(request.getAttachmentUrl());
            message.setAttachmentName(request.getAttachmentName());
        }

        ChatMessage savedMessage = chatMessageRepository.save(message);

        // Update room's last message timestamp
        room.updateLastMessage(request.getContent());
        chatRoomRepository.save(room);

        // Update sender's lastReadAt so their own message doesn't count as unread
        participantRepository.findByChatRoomIdAndUserId(roomId, sender.getId())
                .ifPresent(participant -> {
                    participant.setLastReadAt(LocalDateTime.now());
                    participantRepository.save(participant);
                });

        ChatMessageResponse response = mapMessageToResponse(savedMessage);

        // Collect notification data while Hibernate session is still open
        List<ChatRoomParticipant> otherParticipants = participantRepository.findOtherParticipants(roomId, sender.getId());
        String senderName = sender.getName();
        String contentPreview = request.getContent().length() > 50
                ? request.getContent().substring(0, 50) + "..."
                : request.getContent();
        List<User> recipientUsers = otherParticipants.stream()
                .map(p -> userRepository.findById(p.getUserId()).orElse(null))
                .filter(u -> u != null)
                .toList();

        // Create notification records inside the transaction — createNotification
        // defers its own WebSocket broadcast until this transaction commits
        recipientUsers.forEach(recipientUser ->
                notificationService.createNotification(
                        recipientUser,
                        NotificationType.NEW_MESSAGE,
                        "New message from " + senderName,
                        contentPreview,
                        "chat",
                        roomId,
                        messagesUrlFor(recipientUser)
                ));

        // Defer broadcasts until AFTER transaction commits
        Long senderId = sender.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                // Broadcast to room subscribers (for selected-room real-time)
                messagingTemplate.convertAndSend("/topic/chat/" + roomId, response);

                // Broadcast to each recipient's personal queue (for cross-room/cross-page updates)
                recipientUsers.forEach(recipientUser -> {
                    try {
                        messagingTemplate.convertAndSendToUser(
                                recipientUser.getEmail(),
                                "/queue/chat-updates",
                                Map.of(
                                        "roomId", roomId,
                                        "senderId", senderId,
                                        "senderName", senderName,
                                        "lastMessage", contentPreview,
                                        "timestamp", response.getCreatedAt() != null ? response.getCreatedAt().toString() : ""
                                )
                        );
                    } catch (Exception e) {
                        log.warn("Failed to send chat update to user {}", recipientUser.getId());
                    }
                });
            }
        });

        log.info("Message sent in room {} by user {}", roomId, sender.getId());
        return response;
    }

    private String messagesUrlFor(User recipient) {
        String segment = switch (recipient.getRole()) {
            case CLIENT -> "client";
            case BUILDER -> "builder";
            case SUPPLIER -> "supplier";
            case SUPPORT_AGENT -> "support";
            case ADMIN, SUPER_ADMIN -> "admin";
        };
        return "/" + segment + "/messages";
    }

    /**
     * Mark messages as read.
     */
    @Transactional
    public void markMessagesAsRead(Long roomId, User user) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        if (!isParticipant(roomId, user.getId())) {
            throw new BadRequestException("You are not a participant in this chat room");
        }

        // Update participant's last read time
        participantRepository.findByChatRoomIdAndUserId(roomId, user.getId())
                .ifPresent(participant -> {
                    participant.setLastReadAt(LocalDateTime.now());
                    participantRepository.save(participant);
                });

        log.info("Marked messages as read in room {} for user {}", roomId, user.getId());
    }

    /**
     * Get unread message count for a user.
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        // Count messages in rooms where user is participant and message was sent after last read
        List<ChatRoomParticipant> participations = participantRepository.findByUserIdAndIsActiveTrue(user.getId());

        return participations.stream()
                .mapToLong(p -> {
                    LocalDateTime lastRead = p.getLastReadAt();
                    if (lastRead == null) {
                        return chatMessageRepository.countByChatRoomId(p.getChatRoomId());
                    }
                    return chatMessageRepository.findNewMessages(p.getChatRoomId(), lastRead).size();
                })
                .sum();
    }

    /**
     * Edit a message.
     */
    @Transactional
    public ChatMessageResponse editMessage(Long messageId, User user, String newContent) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new BadRequestException("You can only edit your own messages");
        }
        SecurityUtils.validateNotSuspended(user);

        message.edit(newContent);
        ChatMessage savedMessage = chatMessageRepository.save(message);
        ChatMessageResponse response = mapMessageToResponse(savedMessage);
        Long chatRoomId = message.getChatRoom().getId();

        // Defer broadcast until after transaction commits
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend("/topic/chat/" + chatRoomId + "/edit", response);
            }
        });

        return response;
    }

    /**
     * Delete a message (soft delete).
     */
    @Transactional
    public void deleteMessage(Long messageId, User user) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new BadRequestException("You can only delete your own messages");
        }
        SecurityUtils.validateNotSuspended(user);

        message.softDelete();
        chatMessageRepository.save(message);
        Long chatRoomId = message.getChatRoom().getId();

        // Defer broadcast until after transaction commits
        // Send object with id (not bare Long) so frontend can read .id
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend("/topic/chat/" + chatRoomId + "/delete", Map.of("id", messageId));
            }
        });

        log.info("Message {} soft deleted by user {}", messageId, user.getId());
    }

    private void addParticipant(Long roomId, Long userId, boolean isOwner) {
        ChatRoomParticipant participant = ChatRoomParticipant.builder()
                .chatRoomId(roomId)
                .userId(userId)
                .role(isOwner ? ChatRoomParticipant.ParticipantRole.OWNER : ChatRoomParticipant.ParticipantRole.MEMBER)
                .joinedAt(LocalDateTime.now())
                .isActive(true)
                .build();
        participantRepository.save(participant);
    }

    private boolean isParticipant(Long roomId, Long userId) {
        return participantRepository.existsByChatRoomIdAndUserIdAndIsActiveTrue(roomId, userId);
    }

    private ChatRoomResponse mapToResponse(ChatRoom room, User currentUser) {
        List<ChatRoomParticipant> participants = participantRepository.findByChatRoomIdAndIsActiveTrue(room.getId());

        List<ChatRoomResponse.ParticipantInfo> participantInfos = participants.stream()
                .map(p -> {
                    User user = userRepository.findById(p.getUserId()).orElse(null);
                    if (user == null) return null;

                    return ChatRoomResponse.ParticipantInfo.builder()
                            .id(user.getId())
                            .name(user.getName())
                            .profileImageUrl(user.getProfileImageUrl())
                            .build();
                })
                .filter(p -> p != null)
                .collect(Collectors.toList());

        ChatRoomResponse.ChatRoomResponseBuilder builder = ChatRoomResponse.builder()
                .id(room.getId())
                .roomCode(room.getRoomCode())
                .roomType(room.getRoomType().name())
                .name(room.getName())
                .projectId(room.getProjectId())
                .isActive(room.getIsActive())
                .lastMessageAt(room.getLastMessageAt())
                .lastMessagePreview(room.getLastMessagePreview())
                .createdAt(room.getCreatedAt())
                .participants(participantInfos);

        // Get last message details
        ChatMessage lastMessage = chatMessageRepository.findLatestMessage(room.getId());
        if (lastMessage != null) {
            builder.lastMessage(lastMessage.getPreview());
            builder.lastMessageSenderId(lastMessage.getSender().getId());
        }

        // Get unread count for current user
        participantRepository.findByChatRoomIdAndUserId(room.getId(), currentUser.getId())
                .ifPresent(p -> {
                    LocalDateTime lastRead = p.getLastReadAt();
                    if (lastRead == null) {
                        builder.unreadCount(chatMessageRepository.countByChatRoomId(room.getId()));
                    } else {
                        builder.unreadCount((long) chatMessageRepository.findNewMessages(room.getId(), lastRead).size());
                    }
                });

        return builder.build();
    }

    private ChatMessageResponse mapMessageToResponse(ChatMessage message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .roomId(message.getChatRoom().getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getName())
                .senderPhotoUrl(message.getSender().getProfileImageUrl())
                .content(message.getIsDeleted() ? "This message was deleted" : message.getContent())
                .messageType(message.getMessageType().name())
                .attachmentUrl(message.getAttachmentUrl())
                .attachmentName(message.getAttachmentName())
                .isEdited(message.getIsEdited())
                .isDeleted(message.getIsDeleted())
                .createdAt(message.getCreatedAt())
                .editedAt(message.getEditedAt())
                .build();
    }
}
