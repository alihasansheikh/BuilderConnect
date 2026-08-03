package com.builderconnect.controller;

import com.builderconnect.dto.request.FavoriteToggleRequest;
import com.builderconnect.entity.Favorite.FavoriteEntityType;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.service.FavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for user favorites (bookmarks) on materials and projects.
 */
@RestController
@RequestMapping("/v1/favorites")
@RequiredArgsConstructor
@Tag(name = "Favorites", description = "Bookmark materials and projects")
public class FavoriteController {

    private final FavoriteService favoriteService;

    @PostMapping("/toggle")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Toggle a favorite on a material or project")
    public ResponseEntity<Map<String, Boolean>> toggleFavorite(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody FavoriteToggleRequest request) {

        boolean favorited = favoriteService.toggle(user, request.getEntityType(), request.getEntityId());
        return ResponseEntity.ok(Map.of("favorited", favorited));
    }

    @GetMapping("/ids")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get IDs of the current user's favorites of a given type")
    public ResponseEntity<List<Long>> getFavoriteIds(
            @AuthenticationPrincipal User user,
            @RequestParam String type) {

        return ResponseEntity.ok(favoriteService.getIds(user, parseType(type)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List the current user's favorites of a given type")
    public ResponseEntity<List<?>> getFavorites(
            @AuthenticationPrincipal User user,
            @RequestParam String type) {

        return switch (parseType(type)) {
            case MATERIAL -> ResponseEntity.ok(favoriteService.listMaterials(user));
            case PROJECT -> ResponseEntity.ok(favoriteService.listProjects(user));
        };
    }

    private FavoriteEntityType parseType(String type) {
        if (type == null || type.isBlank()) {
            throw new BadRequestException("Favorite type is required");
        }
        String normalized = type.trim().toUpperCase();
        if (normalized.endsWith("S")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        try {
            return FavoriteEntityType.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid favorite type: " + type);
        }
    }
}
