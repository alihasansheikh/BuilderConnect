package com.builderconnect.controller;

import com.builderconnect.dto.request.ChangeRequestCreateRequest;
import com.builderconnect.dto.response.ChangeRequestResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.ChangeRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for project change request management.
 */
@RestController
@RequestMapping("/v1/projects/{projectId}/change-requests")
@RequiredArgsConstructor
@Tag(name = "Change Requests", description = "Project change request endpoints")
public class ChangeRequestController {

    private final ChangeRequestService changeRequestService;

    @PostMapping
    @Operation(summary = "Submit a change request")
    public ResponseEntity<ChangeRequestResponse> submit(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @Valid @RequestBody ChangeRequestCreateRequest request) {
        return ResponseEntity.ok(changeRequestService.submit(user, projectId, request));
    }

    @GetMapping
    @Operation(summary = "Get all change requests for a project")
    public ResponseEntity<List<ChangeRequestResponse>> getByProject(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId) {
        return ResponseEntity.ok(changeRequestService.getByProject(user, projectId));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve a change request")
    public ResponseEntity<ChangeRequestResponse> approve(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @PathVariable Long id) {
        return ResponseEntity.ok(changeRequestService.approve(user, id));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject a change request")
    public ResponseEntity<ChangeRequestResponse> reject(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "No reason provided");
        return ResponseEntity.ok(changeRequestService.reject(user, id, reason));
    }
}
