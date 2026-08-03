package com.builderconnect.repository;

import com.builderconnect.entity.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Announcement entity operations.
 */
@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    @Query("SELECT a FROM Announcement a WHERE a.isActive = true " +
           "AND (a.startDate IS NULL OR a.startDate <= CURRENT_TIMESTAMP) " +
           "AND (a.endDate IS NULL OR a.endDate >= CURRENT_TIMESTAMP) " +
           "ORDER BY a.createdAt DESC")
    List<Announcement> findActiveAnnouncements();

    Page<Announcement> findByIsActiveTrueOrderByCreatedAtDesc(Pageable pageable);

    Page<Announcement> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
