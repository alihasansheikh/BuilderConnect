package com.builderconnect.controller;

import com.builderconnect.dto.request.PortfolioItemRequest;
import com.builderconnect.dto.response.PortfolioItemResponse;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.service.PortfolioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Portfolio endpoints for the LinkedIn/Upwork-style profile page.
 * Reads are open to any authenticated viewer; mutations are owner-scoped BUILDER actions.
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Portfolio", description = "Builder portfolio items on the profile page")
public class PortfolioController {

    private final PortfolioService portfolioService;

    @GetMapping("/users/{userId}/portfolio")
    @Operation(summary = "Get a user's portfolio items")
    public ResponseEntity<List<PortfolioItemResponse>> getUserPortfolio(@PathVariable Long userId) {
        return ResponseEntity.ok(portfolioService.getUserPortfolio(userId));
    }

    @PostMapping("/builder/me/portfolio")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Create a portfolio item")
    public ResponseEntity<PortfolioItemResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PortfolioItemRequest request) {
        return ResponseEntity.ok(portfolioService.create(user, request));
    }

    @PutMapping("/builder/me/portfolio/{id}")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Update an owned portfolio item")
    public ResponseEntity<PortfolioItemResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioItemRequest request) {
        return ResponseEntity.ok(portfolioService.update(user, id, request));
    }

    @DeleteMapping("/builder/me/portfolio/{id}")
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Delete an owned portfolio item")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        portfolioService.delete(user, id);
        return ResponseEntity.ok(Map.of("message", "Portfolio item deleted"));
    }

    @PostMapping(value = "/builder/me/portfolio/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('BUILDER')")
    @Operation(summary = "Upload a portfolio image")
    public ResponseEntity<Map<String, String>> uploadImage(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        String url = portfolioService.uploadImage(user, file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
