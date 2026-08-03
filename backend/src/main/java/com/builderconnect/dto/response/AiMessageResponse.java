package com.builderconnect.dto.response;

import com.builderconnect.entity.AiMessage;

/** One AI Assistant message (role is USER or ASSISTANT; content is Markdown for assistant replies). */
public record AiMessageResponse(Long id, String role, String content, String createdAt) {

    public static AiMessageResponse from(AiMessage m) {
        return new AiMessageResponse(
                m.getId(),
                m.getRole().name(),
                m.getContent(),
                m.getCreatedAt() == null ? null : m.getCreatedAt().toString()
        );
    }
}
