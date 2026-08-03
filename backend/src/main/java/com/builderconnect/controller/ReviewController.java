package com.builderconnect.controller;

import com.builderconnect.dto.request.ProductReviewRequest;
import com.builderconnect.dto.request.ReviewRequest;
import com.builderconnect.dto.request.ReviewVoteRequest;
import com.builderconnect.dto.response.MaterialReviewCheckResponse;
import com.builderconnect.dto.response.ProjectReviewCheckResponse;
import com.builderconnect.dto.response.ReviewResponse;
import com.builderconnect.dto.response.ReviewVoteResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.ReviewService;
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
 * Controller for project reviews.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Reviews", description = "Project review endpoints")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/v1/projects/{projectId}/review")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Submit a review for a completed project")
    public ResponseEntity<ReviewResponse> createReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @Valid @RequestBody ReviewRequest request) {

        ReviewResponse response = reviewService.createClientToBuilderReview(user, projectId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/projects/{projectId}/review/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Check whether I have reviewed this project")
    public ResponseEntity<ProjectReviewCheckResponse> getMyProjectReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId) {

        return ResponseEntity.ok(reviewService.getMyProjectReview(user, projectId));
    }

    @GetMapping("/v1/builders/{builderId}/reviews")
    @Operation(summary = "Get approved reviews for a builder (public)")
    public ResponseEntity<Page<ReviewResponse>> getBuilderReviews(
            @PathVariable Long builderId,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<ReviewResponse> reviews = reviewService.getBuilderReviews(builderId, minRating, maxRating, pageable);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/v1/builder/reviews")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Get my reviews as a builder")
    public ResponseEntity<Page<ReviewResponse>> getMyReviews(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<ReviewResponse> reviews = reviewService.getMyReviews(user, minRating, maxRating, pageable);
        return ResponseEntity.ok(reviews);
    }

    @PostMapping("/v1/materials/{id}/reviews")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Submit a review for a product")
    public ResponseEntity<ReviewResponse> createMaterialReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody ProductReviewRequest request) {

        ReviewResponse response = reviewService.createMaterialReview(user, id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/materials/{id}/reviews")
    @Operation(summary = "Get approved reviews for a product (public)")
    public ResponseEntity<Page<ReviewResponse>> getMaterialReviews(
            @PathVariable Long id,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<ReviewResponse> reviews = reviewService.getMaterialReviews(id, minRating, maxRating, pageable);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/v1/materials/{id}/reviews/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Check whether I have reviewed this product")
    public ResponseEntity<MaterialReviewCheckResponse> getMyMaterialReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        return ResponseEntity.ok(reviewService.getMyMaterialReview(user, id));
    }

    @PostMapping("/v1/reviews/{id}/helpful")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Vote a review helpful or not helpful (same vote again removes it)")
    public ResponseEntity<ReviewVoteResponse> voteHelpful(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody ReviewVoteRequest request) {

        ReviewVoteResponse response = reviewService.voteHelpful(user, id, request.getHelpful());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/materials/{materialId}/reviews/my-votes")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get my helpfulness votes across a product's reviews")
    public ResponseEntity<List<Map<String, Object>>> getMyVotes(
            @AuthenticationPrincipal User user,
            @PathVariable Long materialId) {

        return ResponseEntity.ok(reviewService.getMyVotes(user, materialId));
    }
}
