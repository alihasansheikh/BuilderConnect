package com.builderconnect.controller;

import com.builderconnect.dto.request.BidCreateRequest;
import com.builderconnect.dto.response.BidResponse;
import com.builderconnect.entity.User;
import com.builderconnect.enums.BidStatus;
import com.builderconnect.service.BidService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for bid operations.
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Bids", description = "Bid management endpoints")
public class BidController {

    private final BidService bidService;

    // ==================== BUILDER ENDPOINTS ====================

    @PostMapping("/builder/bids")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Create a new bid")
    public ResponseEntity<BidResponse> createBid(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BidCreateRequest request) {
        BidResponse response = bidService.createBid(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/builder/bids")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Get builder's bids")
    public ResponseEntity<Page<BidResponse>> getBuilderBids(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) BidStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<BidResponse> bids = bidService.getBuilderBids(user, status, pageable);
        return ResponseEntity.ok(bids);
    }

    @GetMapping("/builder/bids/exists")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Check whether the builder has an active (non-withdrawn) bid on a project")
    public ResponseEntity<Map<String, Boolean>> bidExists(
            @AuthenticationPrincipal User user,
            @RequestParam Long projectId) {
        return ResponseEntity.ok(Map.of("exists", bidService.bidExists(projectId, user)));
    }

    @GetMapping("/builder/bids/stats")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Get builder's bid statistics")
    public ResponseEntity<BidService.BidStats> getBidStats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bidService.getBuilderBidStats(user));
    }

    @GetMapping("/builder/bids/{id:\\d+}")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Get bid details for builder")
    public ResponseEntity<BidResponse> getBuilderBid(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        BidResponse response = bidService.getBid(id, user);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/builder/bids/{id}/withdraw")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Withdraw a bid")
    public ResponseEntity<BidResponse> withdrawBid(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        BidResponse response = bidService.withdrawBid(user, id);
        return ResponseEntity.ok(response);
    }

    // ==================== PROJECT BIDS ENDPOINTS ====================

    @GetMapping("/projects/{projectId}/bids")
    @Operation(summary = "Get all bids for a project (project client or admin)")
    public ResponseEntity<List<BidResponse>> getProjectBids(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId) {
        List<BidResponse> bids = bidService.getProjectBidsList(projectId, user);
        return ResponseEntity.ok(bids);
    }

    @GetMapping("/projects/{projectId}/bids/paged")
    @Operation(summary = "Get paginated bids for a project (project client or admin)")
    public ResponseEntity<Page<BidResponse>> getProjectBidsPaged(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<BidResponse> bids = bidService.getProjectBids(projectId, user, pageable);
        return ResponseEntity.ok(bids);
    }

    // ==================== CLIENT ENDPOINTS ====================

    @PostMapping("/client/bids/{id}/shortlist")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Shortlist a bid")
    public ResponseEntity<BidResponse> shortlistBid(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        BidResponse response = bidService.shortlistBid(user, id);
        return ResponseEntity.ok(response);
    }
}
