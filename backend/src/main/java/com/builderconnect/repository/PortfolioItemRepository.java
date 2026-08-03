package com.builderconnect.repository;

import com.builderconnect.entity.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for {@link PortfolioItem} operations.
 */
@Repository
public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {

    List<PortfolioItem> findByUserIdOrderByDisplayOrderAscCreatedAtDesc(Long userId);

    Optional<PortfolioItem> findByIdAndUserId(Long id, Long userId);
}
