package com.builderconnect.controller;

import com.builderconnect.dto.request.ChatMessageRequest;
import com.builderconnect.dto.response.ChatMessageResponse;
import com.builderconnect.dto.response.ChatRoomResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

/**
 * REST and WebSocket controller for chat operations.
 */
@RestController
@RequestMapping("/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Real-time messaging endpoints")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // ==================== REST ENDPOINTS ====================

    @GetMapping("/rooms")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get user's chat rooms")
    public ResponseEntity<Page<ChatRoomResponse>> getUserRooms(
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20, sort = "lastMessageAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ChatRoomResponse> rooms = chatService.getUserRooms(user, pageable);
        return ResponseEntity.ok(rooms);
    }

    @PostMapping("/rooms/direct/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get or create direct chat room with another user")
    public ResponseEntity<ChatRoomResponse> getOrCreateDirectRoom(
            @AuthenticationPrincipal User user,
            @PathVariable Long userId) {
        ChatRoomResponse room = chatService.getOrCreateDirectRoom(user, userId);
        return ResponseEntity.ok(room);
    }

    @PostMapping("/rooms/project/{projectId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get or create the chat room for an awarded project (client, awarded builder, or admin)")
    public ResponseEntity<ChatRoomResponse> getOrCreateProjectRoom(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId) {
        ChatRoomResponse room = chatService.getOrCreateProjectRoomForUser(projectId, user);
        return ResponseEntity.ok(room);
    }

    @GetMapping("/rooms/{roomId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get messages for a chat room")
    public ResponseEntity<Page<ChatMessageResponse>> getRoomMessages(
            @AuthenticationPrincipal User user,
            @PathVariable Long roomId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ChatMessageResponse> messages = chatService.getRoomMessages(roomId, user, pageable);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/rooms/{roomId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Send a message to a chat room")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @AuthenticationPrincipal User user,
            @PathVariable Long roomId,
            @Valid @RequestBody ChatMessageRequest request) {
        ChatMessageResponse message = chatService.sendMessage(roomId, user, request);
        return ResponseEntity.ok(message);
    }

    @PostMapping("/rooms/{roomId}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark messages in a room as read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable Long roomId) {
        chatService.markMessagesAsRead(roomId, user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get total unread message count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal User user) {
        long count = chatService.getUnreadCount(user);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PutMapping("/messages/{messageId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Edit a message")
    public ResponseEntity<ChatMessageResponse> editMessage(
            @AuthenticationPrincipal User user,
            @PathVariable Long messageId,
            @RequestBody Map<String, String> body) {
        String newContent = body.get("content");
        ChatMessageResponse message = chatService.editMessage(messageId, user, newContent);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping("/messages/{messageId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a message")
    public ResponseEntity<Void> deleteMessage(
            @AuthenticationPrincipal User user,
            @PathVariable Long messageId) {
        chatService.deleteMessage(messageId, user);
        return ResponseEntity.ok().build();
    }

    // ==================== WEBSOCKET ENDPOINTS ====================

    /**
     * WebSocket endpoint for sending messages.
     * Messages sent to /app/chat/{roomId} will be processed here.
     */
    @MessageMapping("/chat/{roomId}")
    public void handleWebSocketMessage(
            @DestinationVariable Long roomId,
            @Payload ChatMessageRequest request,
            Principal principal) {
        // In a real implementation, we would get the user from the principal
        // For now, this is handled through the REST endpoint
        // The WebSocket is primarily used for receiving messages via /topic/chat/{roomId}
    }

    /**
     * WebSocket endpoint for typing indicators.
     */
    @MessageMapping("/chat/{roomId}/typing")
    public void handleTypingIndicator(
            @DestinationVariable Long roomId,
            @Payload Map<String, Object> payload,
            Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            User user = (User) auth.getPrincipal();
            Map<String, Object> typingEvent = Map.of(
                    "userId", user.getId(),
                    "userName", user.getName(),
                    "typing", payload.getOrDefault("typing", false)
            );
            messagingTemplate.convertAndSend("/topic/chat/" + roomId + "/typing", typingEvent);
        }
    }
}
