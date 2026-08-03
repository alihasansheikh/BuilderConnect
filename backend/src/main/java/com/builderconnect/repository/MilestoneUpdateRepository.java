package com.builderconnect.repository;

import com.builderconnect.entity.MilestoneUpdate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for MilestoneUpdate entity operations.
 */
@Repository
public interface MilestoneUpdateRepository extends JpaRepository<MilestoneUpdate, Long> {

    List<MilestoneUpdate> findByMilestoneIdOrderByCreatedAtDesc(Long milestoneId);

    Page<MilestoneUpdate> findByMilestoneId(Long milestoneId, Pageable pageable);

    long countByMilestoneId(Long milestoneId);
}
