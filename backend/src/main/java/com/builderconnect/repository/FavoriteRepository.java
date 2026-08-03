package com.builderconnect.repository;

import com.builderconnect.entity.Favorite;
import com.builderconnect.entity.Favorite.FavoriteEntityType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Favorite entity operations.
 */
@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    List<Favorite> findByUserIdAndEntityType(Long userId, FavoriteEntityType entityType);

    Optional<Favorite> findByUserIdAndEntityTypeAndEntityId(Long userId, FavoriteEntityType entityType, Long entityId);

    boolean existsByUserIdAndEntityTypeAndEntityId(Long userId, FavoriteEntityType entityType, Long entityId);
}
