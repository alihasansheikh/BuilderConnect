package com.builderconnect.controller;

import com.builderconnect.dto.request.MilestoneCreateRequest;
import com.builderconnect.dto.request.MilestoneUpdateRequest;
import com.builderconnect.dto.response.MilestoneResponse;
import com.builderconnect.dto.response.MilestoneUpdateResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.MilestoneService;
import com.builderconnect.service.MilestoneUpdateService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Controller for milestone management.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Milestones", description = "Milestone management endpoints")
public class MilestoneController {

    private final MilestoneService milestoneService;
    private final MilestoneUpdateService milestoneUpdateService;

    @GetMapping("/v1/projects/{projectId}/milestones")
    @Operation(summary = "Get milestones for a project (client, awarded builder, or admin)")
    public ResponseEntity<List<MilestoneResponse>> getProjectMilestones(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId) {
        List<MilestoneResponse> milestones = milestoneService.getProjectMilestones(user, projectId);
        return ResponseEntity.ok(milestones);
    }

    @PostMapping("/v1/projects/{projectId}/milestones")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Create a milestone in the project schedule (awarded builder)")
    public ResponseEntity<MilestoneResponse> createMilestone(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @Valid @RequestBody MilestoneCreateRequest request) {
        MilestoneResponse milestone = milestoneService.createMilestone(user, projectId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(milestone);
    }

    @PutMapping("/v1/milestones/{id}")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Edit a pending milestone (awarded builder)")
    public ResponseEntity<MilestoneResponse> updateMilestone(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody MilestoneCreateRequest request) {
        MilestoneResponse milestone = milestoneService.updateMilestone(user, id, request);
        return ResponseEntity.ok(milestone);
    }

    @DeleteMapping("/v1/milestones/{id}")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Delete a pending milestone (awarded builder)")
    public ResponseEntity<Void> deleteMilestone(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        milestoneService.deleteMilestone(user, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/v1/milestones/{id}/complete")
    @PreAuthorize("hasAnyRole('BUILDER', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Mark a milestone as complete (builder)")
    public ResponseEntity<MilestoneResponse> completeMilestone(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String evidence = body != null ? body.get("evidence") : null;
        MilestoneResponse milestone = milestoneService.completeMilestone(user, id, evidence);
        return ResponseEntity.ok(milestone);
    }

    @PostMapping("/v1/milestones/{id}/approve")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Approve a milestone (client)")
    public ResponseEntity<MilestoneResponse> approveMilestone(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        MilestoneResponse milestone = milestoneService.approveMilestone(user, id);
        return ResponseEntity.ok(milestone);
    }

    @PostMapping("/v1/milestones/{id}/reject")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Reject a milestone (client)")
    public ResponseEntity<MilestoneResponse> rejectMilestone(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "No reason provided");
        MilestoneResponse milestone = milestoneService.rejectMilestone(user, id, reason);
        return ResponseEntity.ok(milestone);
    }

    @PostMapping(value = "/v1/milestones/{id}/pay", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Record an off-platform payment for a milestone (client uploads proof)")
    public ResponseEntity<MilestoneResponse> payMilestone(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            // required=false so a missing part yields the service's 400 ("Payment proof is required")
            // instead of a 500 from MissingServletRequestPartException.
            @RequestParam(value = "proof", required = false) MultipartFile proof,
            @RequestParam(value = "note", required = false) String note) {
        MilestoneResponse response = milestoneService.markMilestonePaid(user, id, proof, note);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/v1/milestones/{id}/confirm-payment")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Builder confirms receipt of a milestone payment")
    public ResponseEntity<MilestoneResponse> confirmMilestonePayment(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        MilestoneResponse response = milestoneService.confirmMilestonePayment(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/v1/milestones/{id}/updates")
    @PreAuthorize("hasAnyRole('BUILDER', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Add a progress update to a milestone")
    public ResponseEntity<MilestoneUpdateResponse> addUpdate(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody MilestoneUpdateRequest request) {
        return ResponseEntity.ok(milestoneUpdateService.addUpdate(user, id, request));
    }

    @GetMapping("/v1/milestones/{id}/updates")
    @PreAuthorize("hasAnyRole('CLIENT', 'BUILDER', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get all updates for a milestone")
    public ResponseEntity<List<MilestoneUpdateResponse>> getUpdates(@PathVariable Long id) {
        return ResponseEntity.ok(milestoneUpdateService.getUpdates(id));
    }
}
