package com.builderconnect.service;

import com.builderconnect.config.GoogleMapsProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Proxies Google Places Autocomplete for the locality/area field. The API key
 * stays server-side. Restricted to Pakistan and biased to the selected city.
 * Any failure (missing key, quota, network) returns an empty list so the field
 * degrades gracefully to free text.
 */
@Service
@Slf4j
public class LocationService {

    private static final String AUTOCOMPLETE_URL =
            "https://maps.googleapis.com/maps/api/place/autocomplete/json";
    private static final int MAX_SUGGESTIONS = 6;
    private static final int MIN_QUERY_LENGTH = 2;

    private final GoogleMapsProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public LocationService(GoogleMapsProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(6_000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public List<String> autocomplete(String query, String city) {
        List<String> suggestions = new ArrayList<>();
        if (query == null || query.trim().length() < MIN_QUERY_LENGTH || !properties.isConfigured()) {
            return suggestions;
        }

        // Bias to the chosen city by folding it into the query text (no coordinates needed).
        String input = query.trim();
        if (city != null && !city.isBlank()
                && !input.toLowerCase().contains(city.trim().toLowerCase())) {
            input = input + " " + city.trim();
        }

        String url = UriComponentsBuilder.fromHttpUrl(AUTOCOMPLETE_URL)
                .queryParam("input", input)
                .queryParam("components", "country:pk")
                .queryParam("types", "geocode")
                .queryParam("key", properties.getApiKey())
                .build().toUriString();

        try {
            byte[] raw = restClient.get()
                    .uri(url)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(byte[].class);
            JsonNode root = objectMapper.readTree(raw == null ? new byte[0] : raw);
            String status = root.path("status").asText("");
            if (!"OK".equals(status) && !"ZERO_RESULTS".equals(status)) {
                log.warn("Places Autocomplete returned status {}: {}",
                        status, root.path("error_message").asText(""));
                return suggestions;
            }
            for (JsonNode prediction : root.path("predictions")) {
                String description = prediction.path("description").asText("");
                if (!description.isBlank()) {
                    // Trim the trailing ", Pakistan" for a cleaner locality label.
                    suggestions.add(description.replaceFirst(",?\\s*Pakistan$", "").trim());
                }
                if (suggestions.size() >= MAX_SUGGESTIONS) break;
            }
        } catch (Exception e) {
            log.warn("Places Autocomplete request failed: {}", e.getMessage());
        }
        return suggestions;
    }
}
