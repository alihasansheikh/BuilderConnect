package com.builderconnect.repository;

import com.builderconnect.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * Repository for AuditLog entity operations.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<AuditLog> findByActionCategoryOrderByCreatedAtDesc(AuditLog.ActionCategory category, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:category IS NULL OR a.actionCategory = :category) AND " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:action IS NULL OR a.action LIKE CONCAT('%', :action, '%')) AND " +
           "(:userId IS NULL OR a.userId = :userId) AND " +
           "(:fromDate IS NULL OR a.createdAt >= :fromDate) AND " +
           "(:toDate IS NULL OR a.createdAt <= :toDate) " +
           "ORDER BY a.createdAt DESC")
    Page<AuditLog> searchAuditLogs(
        @Param("category") AuditLog.ActionCategory category,
        @Param("status") AuditLog.AuditStatus status,
        @Param("action") String action,
        @Param("userId") Long userId,
        @Param("fromDate") LocalDateTime fromDate,
        @Param("toDate") LocalDateTime toDate,
        Pageable pageable
    );

    long countByActionCategory(AuditLog.ActionCategory category);
}
