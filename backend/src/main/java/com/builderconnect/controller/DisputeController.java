package com.builderconnect.controller;

import com.builderconnect.dto.request.DisputeCommentRequest;
import com.builderconnect.dto.request.DisputeCreateRequest;
import com.builderconnect.dto.response.DisputeCommentResponse;
import com.builderconnect.dto.response.DisputeResponse;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.service.DisputeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for dispute management.
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Disputes", description = "Dispute management endpoints")
public class DisputeController {

    private final DisputeService disputeService;

    @PostMapping("/projects/{projectId}/disputes")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "File a new dispute on a project")
    public ResponseEntity<DisputeResponse> fileDispute(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @Valid @RequestBody DisputeCreateRequest request) {

        DisputeResponse response = disputeService.fileDispute(user, projectId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/disputes")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get disputes - own disputes for users, all disputes for support/admin")
    public ResponseEntity<Page<DisputeResponse>> getDisputes(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String disputeType,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        if (isSupportOrAdmin(user)) {
            Page<DisputeResponse> disputes = disputeService.getAllDisputes(status, disputeType, pageable);
            return ResponseEntity.ok(disputes);
        } else {
            Page<DisputeResponse> disputes = disputeService.getUserDisputes(user, pageable);
            return ResponseEntity.ok(disputes);
        }
    }

    @GetMapping("/disputes/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a dispute by ID")
    public ResponseEntity<DisputeResponse> getDispute(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        DisputeResponse response = disputeService.getDispute(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/disputes/{id}/escalate")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT','ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Escalate a dispute to admins")
    public ResponseEntity<DisputeResponse> escalateDispute(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        DisputeResponse response = disputeService.escalateDispute(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/disputes/{id}/status")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT','ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Update dispute status")
    public ResponseEntity<DisputeResponse> updateStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        DisputeResponse response = disputeService.updateStatus(user, id, newStatus);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/disputes/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT','ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Resolve a dispute")
    public ResponseEntity<DisputeResponse> resolveDispute(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        DisputeResponse response = disputeService.resolveDispute(user, id, body);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/disputes/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add a comment to a dispute")
    public ResponseEntity<DisputeCommentResponse> addComment(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody DisputeCommentRequest request) {

        DisputeCommentResponse response = disputeService.addComment(user, id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/disputes/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all comments for a dispute")
    public ResponseEntity<List<DisputeCommentResponse>> getComments(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        List<DisputeCommentResponse> comments = disputeService.getComments(user, id);
        return ResponseEntity.ok(comments);
    }

    private boolean isSupportOrAdmin(User user) {
        return user.getRole() == UserRole.SUPPORT_AGENT ||
               user.getRole() == UserRole.ADMIN ||
               user.getRole() == UserRole.SUPER_ADMIN;
    }
}
