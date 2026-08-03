package com.builderconnect.service.llm;

import java.util.List;
import java.util.Map;

/**
 * Provider-agnostic LLM text-generation abstraction. The FAQ chatbot and the
 * authenticated assistant use the plain text path; floor-plan generation uses
 * the structured-JSON path. Both share the same provider seam so the concrete
 * implementation stays swappable.
 */
public interface LlmClient {

    /**
     * Generate a text completion.
     *
     * @param systemInstruction grounding + behaviour rules (not part of the turn history)
     * @param history           conversation turns, oldest first, ending with the user's latest message
     * @param config            generation parameters
     * @return the model's reply text
     */
    String generateText(String systemInstruction, List<ChatTurn> history, GenConfig config);

    /**
     * Generate a structured JSON completion. The provider is instructed to emit
     * ONLY a JSON document conforming to {@code responseSchema}; the returned
     * string is that raw JSON (the model's text output IS the JSON), which the
     * caller validates.
     *
     * @param systemInstruction grounding + behaviour rules (not part of the turn history)
     * @param history           conversation turns, oldest first (may be empty for a single-shot request)
     * @param responseSchema    an OpenAPI-subset schema map constraining the output shape
     * @param config            generation parameters
     * @return the model's raw JSON string
     */
    String generateJson(String systemInstruction, List<ChatTurn> history,
                        Map<String, Object> responseSchema, GenConfig config);

    /** Whether the active provider has an API key configured (else the AI features self-disable). */
    boolean isConfigured();

    /** A single conversation turn. role is "user" or "assistant". */
    record ChatTurn(String role, String content) {}

    /** Generation parameters. */
    record GenConfig(double temperature, int maxOutputTokens) {}
}
