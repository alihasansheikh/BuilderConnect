package com.builderconnect.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Google Maps Platform configuration (app.google-maps.* in application.yml,
 * sourced from GOOGLE_MAPS_API_KEY in the gitignored backend/.env). Used to proxy
 * Places Autocomplete for the locality/area field so the key never reaches the
 * browser. Blank key → locality suggestions are simply disabled (the field still
 * works as free text).
 */
@Component
@ConfigurationProperties(prefix = "app.google-maps")
@Getter
@Setter
public class GoogleMapsProperties {

    private String apiKey = "";

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
