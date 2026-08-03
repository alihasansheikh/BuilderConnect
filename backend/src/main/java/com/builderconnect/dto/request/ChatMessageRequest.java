package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for sending chat messages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {

    @NotBlank(message = "Message content is required")
    @Size(max = 5000, message = "Message cannot exceed 5000 characters")
    private String content;

    @Builder.Default
    private String messageType = "TEXT"; // TEXT, IMAGE, FILE, SYSTEM

    private String attachmentUrl;

    private String attachmentName;

    private Long replyToMessageId;
}
