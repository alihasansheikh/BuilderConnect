package com.builderconnect.service.llm;

import com.builderconnect.config.AnthropicProperties;
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
 * {@link LlmClient} backed by the Anthropic (Claude) Messages API. Text uses a
 * plain message completion; structured JSON uses FORCED TOOL USE — the response
 * schema becomes a tool's input_schema and the model is required to call it, so
 * the tool input is guaranteed schema-valid JSON.
 *
 * <p>Active only when {@code app.llm.provider=anthropic}.
 */
@Component
@ConditionalOnProperty(name = "app.llm.provider", havingValue = "anthropic")
@Slf4j
public class AnthropicClient implements LlmClient {

    private static final String ENDPOINT = "https://api.anthropic.com/v1/messages";
    private static final String API_VERSION = "2023-06-01";
    private static final String JSON_TOOL_NAME = "emit_result";
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final int READ_TIMEOUT_MS = 45_000;
    private static final int MAX_ATTEMPTS = 2;

    private final AnthropicProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public AnthropicClient(AnthropicProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(READ_TIMEOUT_MS);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public String generateText(String systemInstruction, List<ChatTurn> history, GenConfig config) {
        Map<String, Object> body = baseBody(systemInstruction, history, config);
        JsonNode root = call(body);
        return extractText(root);
    }

    @Override
    public String generateJson(String systemInstruction, List<ChatTurn> history,
                               Map<String, Object> responseSchema, GenConfig config) {
        Map<String, Object> body = baseBody(systemInstruction, history, config);

        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("name", JSON_TOOL_NAME);
        tool.put("description", "Return the requested structured result as JSON matching the schema.");
        tool.put("input_schema", responseSchema);
        body.put("tools", List.of(tool));
        body.put("tool_choice", Map.of("type", "tool", "name", JSON_TOOL_NAME));

        JsonNode root = call(body);
        return extractToolInput(root);
    }

    @Override
    public boolean isConfigured() {
        return properties.isConfigured();
    }

    private Map<String, Object> baseBody(String systemInstruction, List<ChatTurn> history, GenConfig config) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel());
        body.put("max_tokens", config.maxOutputTokens());
        body.put("temperature", config.temperature());
        body.put("system", systemInstruction);
        body.put("messages", normalizeMessages(history));
        return body;
    }

    /**
     * Anthropic requires the conversation to start with a user message and roles
     * to alternate. Map assistant→assistant / anything-else→user, drop any leading
     * assistant turns, and merge consecutive same-role turns.
     */
    private List<Map<String, Object>> normalizeMessages(List<ChatTurn> history) {
        List<Map<String, Object>> messages = new ArrayList<>();
        for (ChatTurn turn : history) {
            if (turn == null || turn.content() == null || turn.content().isBlank()) {
                continue;
            }
            String role = "assistant".equalsIgnoreCase(turn.role()) ? "assistant" : "user";
            if (messages.isEmpty() && "assistant".equals(role)) {
                continue; // must start with a user message
            }
            if (!messages.isEmpty() && role.equals(messages.get(messages.size() - 1).get("role"))) {
                Map<String, Object> prev = messages.get(messages.size() - 1);
                prev.put("content", prev.get("content") + "\n\n" + turn.content());
                continue;
            }
            Map<String, Object> msg = new LinkedHashMap<>();
            msg.put("role", role);
            msg.put("content", turn.content());
            messages.add(msg);
        }
        // Anthropic requires at least one message. Single-shot structured requests
        // (e.g. floor-plan generation) put everything in the system prompt and pass
        // no history, so add a minimal user turn to trigger generation.
        if (messages.isEmpty()) {
            Map<String, Object> msg = new LinkedHashMap<>();
            msg.put("role", "user");
            msg.put("content", "Generate the response now, following the system instructions exactly.");
            messages.add(msg);
        }
        return messages;
    }

    private JsonNode call(Map<String, Object> body) {
        LlmUnavailableException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                byte[] raw = restClient.post()
                        .uri(ENDPOINT)
                        .header("x-api-key", properties.getApiKey())
                        .header("anthropic-version", API_VERSION)
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(byte[].class);
                String json = raw == null ? "" : new String(raw, StandardCharsets.UTF_8);
                return objectMapper.readTree(json);
            } catch (Exception e) {
                last = new LlmUnavailableException("Anthropic request failed", e);
                log.warn("Anthropic call attempt {}/{} failed: {}", attempt, MAX_ATTEMPTS, e.getMessage());
            }
        }
        throw last != null ? last : new LlmUnavailableException("Anthropic call failed");
    }

    private String extractText(JsonNode root) {
        JsonNode content = root.path("content");
        if (content.isArray()) {
            for (JsonNode block : content) {
                if ("text".equals(block.path("type").asText())) {
                    String text = block.path("text").asText("");
                    if (!text.isBlank()) {
                        return text.trim();
                    }
                }
            }
        }
        throw new LlmUnavailableException("Anthropic returned no text content");
    }

    private String extractToolInput(JsonNode root) {
        JsonNode content = root.path("content");
        if (content.isArray()) {
            for (JsonNode block : content) {
                if ("tool_use".equals(block.path("type").asText())) {
                    JsonNode input = block.path("input");
                    if (input.isObject() || input.isArray()) {
                        return input.toString();
                    }
                }
            }
        }
        throw new LlmUnavailableException("Anthropic returned no tool output");
    }
}
