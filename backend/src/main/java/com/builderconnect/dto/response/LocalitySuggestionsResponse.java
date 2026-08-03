package com.builderconnect.dto.response;

import java.util.List;

/** Locality/area autocomplete suggestions (human-readable labels). */
public record LocalitySuggestionsResponse(List<String> suggestions) {}
