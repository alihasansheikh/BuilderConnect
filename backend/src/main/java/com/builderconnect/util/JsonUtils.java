package com.builderconnect.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;

/**
 * Helpers for the JSON string columns used across the schema
 * (required_skills, attachments, specializations, service_areas, photos, ...).
 */
public final class JsonUtils {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /** Guards against a pathological chain of nested encodings while still unwrapping real ones. */
    private static final int MAX_ENCODING_LAYERS = 5;

    private JsonUtils() {
        // utility class
    }

    /**
     * Parses a JSON array of strings, tolerating double-encoded values.
     *
     * <p>These columns are declared {@code JSON} but mapped to a Java {@code String}. H2 (MySQL
     * mode) converts a character string written to a JSON column into a JSON <em>string</em>, so
     * the value reads back as {@code "[\"a\",\"b\"]"} rather than {@code ["a","b"]}. Parsing that
     * once yields a String, not a List — so we unwrap any string layers before giving up.
     *
     * <p>This previously lived (single-parse, exception swallowed) in five separate response DTOs,
     * which meant every such field silently read as an empty list. Keep this the only copy.
     *
     * @return the parsed values, or an empty list when null/blank/unparseable
     */
    public static List<String> parseStringArray(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }

        String value = json;
        for (int layer = 0; layer < MAX_ENCODING_LAYERS; layer++) {
            try {
                return objectMapper.readValue(value, new TypeReference<List<String>>() {});
            } catch (Exception notAnArrayYet) {
                try {
                    // Not an array — if it's a JSON string, peel one encoding layer and retry.
                    value = objectMapper.readValue(value, String.class);
                } catch (Exception notAString) {
                    return Collections.emptyList();
                }
            }
        }
        return Collections.emptyList();
    }
}
