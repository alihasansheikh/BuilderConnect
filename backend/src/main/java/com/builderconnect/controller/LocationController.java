package com.builderconnect.controller;

import com.builderconnect.dto.response.LocalitySuggestionsResponse;
import com.builderconnect.service.LocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Locality/area lookup, backed by a server-side Google Places Autocomplete proxy.
 * Authenticated (falls under anyRequest().authenticated()) so the paid key is not
 * exposed to an open endpoint.
 */
@RestController
@RequestMapping("/v1/locations")
@RequiredArgsConstructor
@Tag(name = "Locations", description = "Locality/area autocomplete")
public class LocationController {

    private final LocationService locationService;

    @GetMapping("/autocomplete")
    @Operation(summary = "Locality/area suggestions for the given query (Pakistan, biased to city)")
    public ResponseEntity<LocalitySuggestionsResponse> autocomplete(
            @RequestParam String query,
            @RequestParam(required = false) String city) {
        return ResponseEntity.ok(new LocalitySuggestionsResponse(locationService.autocomplete(query, city)));
    }
}
