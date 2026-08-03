package com.builderconnect.dto.request;

import com.builderconnect.entity.Favorite.FavoriteEntityType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for toggling a favorite (bookmark) on a material or project.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteToggleRequest {

    @NotNull(message = "Entity type is required")
    private FavoriteEntityType entityType;

    @NotNull(message = "Entity ID is required")
    private Long entityId;
}
