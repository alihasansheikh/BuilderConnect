package com.builderconnect.controller;

import com.builderconnect.dto.request.SupportTicketCreateRequest;
import com.builderconnect.dto.request.TicketResponseRequest;
import com.builderconnect.dto.response.SupportTicketResponse;
import com.builderconnect.dto.response.TicketResponseResponse;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.service.SupportTicketService;
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
 * Controller for support ticket management.
 */
@RestController
@RequestMapping("/v1/support/tickets")
@RequiredArgsConstructor
@Tag(name = "Support Tickets", description = "Support ticket management endpoints")
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new support ticket")
    public ResponseEntity<SupportTicketResponse> createTicket(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SupportTicketCreateRequest request) {

        SupportTicketResponse response = supportTicketService.createTicket(user, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get support tickets - own tickets for users, all tickets for support/admin")
    public ResponseEntity<Page<SupportTicketResponse>> getTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Boolean escalated,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        if (isSupportOrAdmin(user)) {
            Page<SupportTicketResponse> tickets = supportTicketService.getAllTickets(
                    status, category, priority, escalated, pageable);
            return ResponseEntity.ok(tickets);
        } else {
            Page<SupportTicketResponse> tickets = supportTicketService.getUserTickets(user, status, pageable);
            return ResponseEntity.ok(tickets);
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a support ticket by ID")
    public ResponseEntity<SupportTicketResponse> getTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        SupportTicketResponse response = supportTicketService.getTicket(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT','ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Escalate a ticket to admins")
    public ResponseEntity<SupportTicketResponse> escalateTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        SupportTicketResponse response = supportTicketService.escalateTicket(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT','ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Update ticket status")
    public ResponseEntity<SupportTicketResponse> updateStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        SupportTicketResponse response = supportTicketService.updateStatus(user, id, newStatus);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT','ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Resolve a support ticket")
    public ResponseEntity<SupportTicketResponse> resolveTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String resolution = body.getOrDefault("resolution", "Resolved");
        SupportTicketResponse response = supportTicketService.resolveTicket(user, id, resolution);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Reopen a resolved ticket")
    public ResponseEntity<SupportTicketResponse> reopenTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        SupportTicketResponse response = supportTicketService.reopenTicket(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/responses")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add a response to a ticket")
    public ResponseEntity<TicketResponseResponse> addResponse(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody TicketResponseRequest request) {

        TicketResponseResponse response = supportTicketService.addResponse(user, id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/responses")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all responses for a ticket")
    public ResponseEntity<List<TicketResponseResponse>> getResponses(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        List<TicketResponseResponse> responses = supportTicketService.getResponses(user, id);
        return ResponseEntity.ok(responses);
    }

    private boolean isSupportOrAdmin(User user) {
        return user.getRole() == UserRole.SUPPORT_AGENT ||
               user.getRole() == UserRole.ADMIN ||
               user.getRole() == UserRole.SUPER_ADMIN;
    }
}
