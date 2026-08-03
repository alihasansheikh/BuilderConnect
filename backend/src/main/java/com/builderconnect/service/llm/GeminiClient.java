package com.builderconnect.service.llm;

import com.builderconnect.config.GeminiProperties;
import com.builderconnect.exception.LlmUnavailableException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * {@link LlmClient} backed by the Google Gemini REST API (generativelanguage.googleapis.com).
 * Uses Spring {@link RestClient} (already on the classpath via spring-boot-starter-web —
 * no new dependency) with explicit timeouts and one retry on transient failures.
 */
@Component
@ConditionalOnProperty(name = "app.llm.provider", havingValue = "gemini", matchIfMissing = true)
@Slf4j
public class GeminiClient implements LlmClient {

    private static final String ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final int READ_TIMEOUT_MS = 20_000;
    private static final int MAX_ATTEMPTS = 2;

    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GeminiClient(GeminiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(READ_TIMEOUT_MS);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public String generateText(String systemInstruction, List<ChatTurn> history, GenConfig config) {
        return call(buildBody(systemInstruction, history, null, config));
    }

    @Override
    public String generateJson(String systemInstruction, List<ChatTurn> history,
                               Map<String, Object> responseSchema, GenConfig config) {
        return call(buildBody(systemInstruction, history, responseSchema, config));
    }

    @Override
    public boolean isConfigured() {
        return properties.isConfigured();
    }

    private String call(Map<String, Object> body) {
        String url = String.format(ENDPOINT, properties.getModel(), properties.getApiKey());

        LlmUnavailableException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                // Read as raw bytes then decode: Gemini sometimes replies with
                // Content-Type application/octet-stream, which the String message
                // converter refuses — bytes work regardless of content type.
                byte[] raw = restClient.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(byte[].class);
                String json = raw == null ? "" : new String(raw, StandardCharsets.UTF_8);
                return extractText(json);
            } catch (LlmUnavailableException parseFailure) {
                // A malformed / empty / blocked response won't change on retry.
                throw parseFailure;
            } catch (Exception e) {
                last = new LlmUnavailableException("Gemini request failed", e);
                log.warn("Gemini call attempt {}/{} failed: {}", attempt, MAX_ATTEMPTS, e.getMessage());
            }
        }
        throw last != null ? last : new LlmUnavailableException("Gemini call failed");
    }

    /**
     * Builds the request body. When {@code responseSchema} is non-null the
     * generationConfig also asks for JSON output constrained to that schema
     * (Gemini structured output); otherwise it is a plain text request.
     */
    private Map<String, Object> buildBody(String systemInstruction, List<ChatTurn> history,
                                          Map<String, Object> responseSchema, GenConfig config) {
        List<Map<String, Object>> contents = new ArrayList<>();
        for (ChatTurn turn : history) {
            String role = "assistant".equalsIgnoreCase(turn.role()) ? "model" : "user";
            contents.add(Map.of(
                    "role", role,
                    "parts", List.of(Map.of("text", turn.content()))
            ));
        }

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", config.temperature());
        generationConfig.put("maxOutputTokens", config.maxOutputTokens());
        if (responseSchema != null) {
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("responseSchema", responseSchema);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        body.put("contents", contents);
        body.put("generationConfig", generationConfig);
        return body;
    }

    private String extractText(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new LlmUnavailableException("Gemini returned no candidates");
            }
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new LlmUnavailableException("Gemini returned no content parts");
            }
            String text = parts.get(0).path("text").asText("");
            if (text.isBlank()) {
                throw new LlmUnavailableException("Gemini returned empty text");
            }
            return text.trim();
        } catch (LlmUnavailableException e) {
            throw e;
        } catch (Exception e) {
            throw new LlmUnavailableException("Failed to parse Gemini response", e);
        }
    }
}
