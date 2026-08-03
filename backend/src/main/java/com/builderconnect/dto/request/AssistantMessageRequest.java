package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A message sent to the authenticated AI Assistant. The size limit is an
 * absolute abuse ceiling; the service truncates further before the LLM call.
 */
public record AssistantMessageRequest(

        @NotBlank(message = "Message is required")
        @Size(max = 4000, message = "Message is too long")
        String message
) {}
