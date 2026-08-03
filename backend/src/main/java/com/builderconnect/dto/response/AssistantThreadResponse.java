package com.builderconnect.dto.response;

import java.util.List;

/**
 * The user's AI Assistant thread. `enabled` reflects the admin kill-switch AND
 * whether a Gemini key is configured, so the page can show a disabled notice.
 */
public record AssistantThreadResponse(boolean enabled, List<AiMessageResponse> messages) {}
