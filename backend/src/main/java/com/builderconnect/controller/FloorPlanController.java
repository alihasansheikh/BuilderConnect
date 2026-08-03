package com.builderconnect.controller;

import com.builderconnect.dto.request.FloorPlanBrief;
import com.builderconnect.dto.response.FloorPlanResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.FloorPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Floor Plan Studio generation. Access is limited to CLIENT/BUILDER via the
 * SecurityConfig /v1/floorplan/** rule. Stateless — returns a semantic plan the
 * client validates and lays out; nothing is persisted.
 */
@RestController
@RequestMapping("/v1/floorplan")
@RequiredArgsConstructor
@Tag(name = "Floor Plan", description = "AI floor-plan program generation (clients + builders)")
public class FloorPlanController {

    private final FloorPlanService floorPlanService;

    @PostMapping("/generate")
    @Operation(summary = "Generate a semantic floor-plan program from a design brief")
    public ResponseEntity<FloorPlanResponse> generate(@AuthenticationPrincipal User user,
                                                       @Valid @RequestBody FloorPlanBrief brief) {
        return ResponseEntity.ok(floorPlanService.generate(user, brief));
    }
}
