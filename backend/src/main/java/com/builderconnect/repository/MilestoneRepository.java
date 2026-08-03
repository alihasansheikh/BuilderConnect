package com.builderconnect.repository;

import com.builderconnect.entity.Milestone;
import com.builderconnect.enums.MilestoneStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Milestone entity operations.
 */
@Repository
public interface MilestoneRepository extends JpaRepository<Milestone, Long> {

    List<Milestone> findByProjectIdOrderBySequenceOrderAsc(Long projectId);

    /**
     * Pessimistic write-lock on a single milestone row. Used by payment release to
     * serialize concurrent release attempts on the same milestone (prevents double debit).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Milestone m WHERE m.id = :id")
    Optional<Milestone> findByIdForUpdate(@Param("id") Long id);

    List<Milestone> findByProjectIdAndStatus(Long projectId, MilestoneStatus status);

    Optional<Milestone> findByProjectIdAndSequenceOrder(Long projectId, Integer sequenceOrder);

    long countByProjectId(Long projectId);

    long countByProjectIdAndStatus(Long projectId, MilestoneStatus status);

    @Query("SELECT SUM(m.paymentAmount) FROM Milestone m WHERE m.project.id = :projectId")
    BigDecimal sumPaymentAmountByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT SUM(m.paymentAmount) FROM Milestone m WHERE m.project.id = :projectId AND m.status = 'PAYMENT_RELEASED'")
    BigDecimal sumReleasedPaymentsByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT m FROM Milestone m WHERE m.project.id = :projectId AND m.status NOT IN ('PAYMENT_RELEASED', 'APPROVED') ORDER BY m.sequenceOrder ASC")
    List<Milestone> findPendingMilestones(@Param("projectId") Long projectId);

    @Query("SELECT m FROM Milestone m WHERE m.project.id = :projectId AND m.status = 'IN_PROGRESS'")
    Optional<Milestone> findCurrentMilestone(@Param("projectId") Long projectId);

    @Query("SELECT MAX(m.sequenceOrder) FROM Milestone m WHERE m.project.id = :projectId")
    Integer findMaxSequenceOrder(@Param("projectId") Long projectId);

    // Lifetime earnings actually received by a builder (milestones marked paid/confirmed/released).
    @Query("SELECT COALESCE(SUM(m.paymentAmount), 0) FROM Milestone m " +
           "WHERE m.project.awardedBuilder.id = :builderId " +
           "AND m.status IN (com.builderconnect.enums.MilestoneStatus.PAID, " +
           "com.builderconnect.enums.MilestoneStatus.CONFIRMED, " +
           "com.builderconnect.enums.MilestoneStatus.PAYMENT_RELEASED)")
    BigDecimal sumReceivedEarningsByBuilder(@Param("builderId") Long builderId);

    // Monthly received earnings: [year, month, revenue] grouped over paidAt.
    @Query("SELECT YEAR(m.paidAt), MONTH(m.paidAt), COALESCE(SUM(m.paymentAmount), 0) FROM Milestone m " +
           "WHERE m.project.awardedBuilder.id = :builderId AND m.paidAt IS NOT NULL AND m.paidAt >= :from " +
           "AND m.status IN (com.builderconnect.enums.MilestoneStatus.PAID, " +
           "com.builderconnect.enums.MilestoneStatus.CONFIRMED, " +
           "com.builderconnect.enums.MilestoneStatus.PAYMENT_RELEASED) " +
           "GROUP BY YEAR(m.paidAt), MONTH(m.paidAt)")
    List<Object[]> getMonthlyEarningsByBuilder(@Param("builderId") Long builderId,
                                               @Param("from") LocalDateTime from);
}
