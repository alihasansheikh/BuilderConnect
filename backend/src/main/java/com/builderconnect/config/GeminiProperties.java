package com.builderconnect.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Gemini API configuration (app.gemini.* in application.yml, sourced from
 * GEMINI_API_KEY in the gitignored backend/.env via spring-dotenv). Blank
 * default keeps dev bootable without a key — the chatbot then reports itself
 * unavailable and the public widget auto-hides via {@link #isConfigured()}.
 */
@Component
@ConfigurationProperties(prefix = "app.gemini")
@Getter
@Setter
public class GeminiProperties {

    private String apiKey = "";

    private String model = "gemini-flash-latest";

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
