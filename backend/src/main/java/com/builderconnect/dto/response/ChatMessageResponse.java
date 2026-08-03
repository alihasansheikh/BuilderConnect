package com.builderconnect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for chat messages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

    private Long id;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String senderPhotoUrl;
    private String content;
    private String messageType;
    private String attachmentUrl;
    private String attachmentName;
    private Boolean isEdited;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private Long replyToMessageId;
    private String replyToContent;
}
