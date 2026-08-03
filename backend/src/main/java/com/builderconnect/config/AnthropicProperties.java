package com.builderconnect.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Anthropic (Claude) API configuration (app.anthropic.* in application.yml,
 * sourced from ANTHROPIC_API_KEY in the gitignored backend/.env via spring-dotenv).
 * Active only when app.llm.provider=anthropic. Blank key → the AI features report
 * themselves unavailable, exactly like the Gemini path.
 */
@Component
@ConfigurationProperties(prefix = "app.anthropic")
@Getter
@Setter
public class AnthropicProperties {

    private String apiKey = "";

    private String model = "claude-haiku-4-5-20251001";

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
