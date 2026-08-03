package com.builderconnect.service;

import com.builderconnect.dto.response.MaterialResponse;
import com.builderconnect.dto.response.ProjectResponse;
import com.builderconnect.entity.Favorite;
import com.builderconnect.entity.Favorite.FavoriteEntityType;
import com.builderconnect.entity.User;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.FavoriteRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for user favorites (bookmarks) on materials and projects.
 */
@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final MaterialRepository materialRepository;
    private final ProjectRepository projectRepository;
    private final AuditService auditService;

    /**
     * Toggles a favorite for the given entity. Returns true when the entity
     * is now favorited, false when the existing favorite was removed.
     */
    @Transactional
    public boolean toggle(User user, FavoriteEntityType entityType, Long entityId) {
        validateTargetExists(entityType, entityId);

        return favoriteRepository
                .findByUserIdAndEntityTypeAndEntityId(user.getId(), entityType, entityId)
                .map(existing -> {
                    favoriteRepository.delete(existing);
                    auditService.logAction(user, "FAVORITE_REMOVED", entityType.name(), entityId,
                            "Removed " + entityType.name().toLowerCase() + " from favorites");
                    return false;
                })
                .orElseGet(() -> {
                    Favorite favorite = Favorite.builder()
                            .user(user)
                            .entityType(entityType)
                            .entityId(entityId)
                            .build();
                    favoriteRepository.save(favorite);
                    auditService.logAction(user, "FAVORITE_ADDED", entityType.name(), entityId,
                            "Added " + entityType.name().toLowerCase() + " to favorites");
                    return true;
                });
    }

    /**
     * IDs of the user's favorited entities of the given type (for badge/heart state).
     */
    @Transactional(readOnly = true)
    public List<Long> getIds(User user, FavoriteEntityType entityType) {
        return favoriteRepository.findByUserIdAndEntityType(user.getId(), entityType).stream()
                .map(Favorite::getEntityId)
                .toList();
    }

    /**
     * The user's favorited materials, as catalog responses. Materials that were
     * removed from a catalog or whose supplier is deleted are hidden — matching
     * what the public browse would show (the favorite row itself is kept).
     */
    @Transactional(readOnly = true)
    public List<MaterialResponse> listMaterials(User user) {
        List<Long> ids = getIds(user, FavoriteEntityType.MATERIAL);
        if (ids.isEmpty()) {
            return List.of();
        }
        return materialRepository.findByIdIn(ids).stream()
                .filter(material -> Boolean.TRUE.equals(material.getIsAvailable())
                        && material.getSupplier() != null
                        && !Boolean.TRUE.equals(material.getSupplier().getDeleted()))
                .map(MaterialResponse::fromEntity)
                .toList();
    }

    /**
     * The user's favorited projects, as marketplace-card summaries
     * (summaryFromEntity — never the full response, which carries client contact info).
     */
    @Transactional(readOnly = true)
    public List<ProjectResponse> listProjects(User user) {
        List<Long> ids = getIds(user, FavoriteEntityType.PROJECT);
        if (ids.isEmpty()) {
            return List.of();
        }
        return projectRepository.findByIdInAndDeletedFalse(ids).stream()
                .map(ProjectResponse::summaryFromEntity)
                .toList();
    }

    private void validateTargetExists(FavoriteEntityType entityType, Long entityId) {
        switch (entityType) {
            case MATERIAL -> materialRepository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + entityId));
            case PROJECT -> projectRepository.findByIdAndDeletedFalse(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + entityId));
        }
    }
}
