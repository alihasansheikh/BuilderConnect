package com.builderconnect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for chat room details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomResponse {

    private Long id;
    private String roomCode;
    private String roomType;
    private String name;
    private Long projectId;
    private Boolean isActive;
    private LocalDateTime lastMessageAt;
    private String lastMessagePreview;
    private LocalDateTime createdAt;

    private List<ParticipantInfo> participants;
    private String lastMessage;
    private Long lastMessageSenderId;
    private Long unreadCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantInfo {
        private Long id;
        private String name;
        private String profileImageUrl;
    }
}
