package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * A public FAQ chatbot question plus recent conversation context. The service
 * truncates the question and caps the history; the size limit here is an
 * absolute abuse ceiling.
 */
public record ChatbotRequest(

        @NotBlank(message = "Question is required")
        @Size(max = 1000, message = "Question is too long")
        String question,

        List<Turn> history
) {
    /** A prior turn. role is "user" or "assistant". */
    public record Turn(String role, String content) {}
}
