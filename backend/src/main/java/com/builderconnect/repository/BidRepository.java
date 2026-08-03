package com.builderconnect.repository;

import com.builderconnect.entity.Bid;
import com.builderconnect.enums.BidStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Bid entity operations.
 */
@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {

    Optional<Bid> findByBidNumber(String bidNumber);

    // Find bids for a project
    List<Bid> findByProjectId(Long projectId);

    Page<Bid> findByProjectId(Long projectId, Pageable pageable);

    List<Bid> findByProjectIdAndStatus(Long projectId, BidStatus status);

    // Find bids by builder
    Page<Bid> findByBuilderId(Long builderId, Pageable pageable);

    Page<Bid> findByBuilderIdAndStatus(Long builderId, BidStatus status, Pageable pageable);

    List<Bid> findByBuilderIdAndStatusIn(Long builderId, List<BidStatus> statuses);

    // Check if builder already bid on project
    boolean existsByProjectIdAndBuilderId(Long projectId, Long builderId);

    // Check if builder has a bid on project that is not in the given status (e.g. not WITHDRAWN,
    // so a builder may re-bid after withdrawing)
    boolean existsByProjectIdAndBuilderIdAndStatusNot(Long projectId, Long builderId, BidStatus status);

    Optional<Bid> findByProjectIdAndBuilderId(Long projectId, Long builderId);

    // Count bids
    long countByProjectId(Long projectId);

    long countByProjectIdAndStatus(Long projectId, BidStatus status);

    long countByBuilderId(Long builderId);

    long countByBuilderIdAndStatus(Long builderId, BidStatus status);

    // Active-bid count for subscription plan-limit enforcement (statuses = BidStatus.isActive())
    long countByBuilderIdAndStatusIn(Long builderId, Collection<BidStatus> statuses);

    // Stale bids for the daily expiry sweep
    List<Bid> findByStatusInAndValidUntilBefore(Collection<BidStatus> statuses, LocalDate date);

    // Active-bid counts for a set of projects, grouped by project id (one query per marketplace page)
    @Query("SELECT b.project.id, COUNT(b) FROM Bid b WHERE b.project.id IN :projectIds AND b.status IN :statuses GROUP BY b.project.id")
    List<Object[]> countActiveBidsByProjectIds(@Param("projectIds") List<Long> projectIds,
                                               @Param("statuses") List<BidStatus> statuses);

    // Statistics
    @Query("SELECT COUNT(b) FROM Bid b WHERE b.builder.id = :builderId AND b.status = com.builderconnect.enums.BidStatus.ACCEPTED")
    long countAcceptedBidsByBuilder(@Param("builderId") Long builderId);

    @Query("SELECT AVG(b.amount) FROM Bid b WHERE b.project.id = :projectId AND b.status != com.builderconnect.enums.BidStatus.WITHDRAWN")
    Double getAverageBidAmountForProject(@Param("projectId") Long projectId);

    // Bid number generation
    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(bid_number, 10) AS BIGINT)), 0) + 1 FROM bids WHERE bid_number LIKE :prefix%", nativeQuery = true)
    Long getNextBidNumber(@Param("prefix") String prefix);

    // Find first bid matching project and status (e.g., accepted bid)
    Optional<Bid> findFirstByProjectIdAndStatus(Long projectId, BidStatus status);

    // Monthly bid analytics: [year, month, bidCount, wonCount] grouped over createdAt.
    @Query("SELECT YEAR(b.createdAt), MONTH(b.createdAt), COUNT(b), " +
           "SUM(CASE WHEN b.status = com.builderconnect.enums.BidStatus.ACCEPTED THEN 1 ELSE 0 END) " +
           "FROM Bid b WHERE b.builder.id = :builderId AND b.createdAt >= :from " +
           "GROUP BY YEAR(b.createdAt), MONTH(b.createdAt)")
    List<Object[]> getMonthlyBidStats(@Param("builderId") Long builderId,
                                      @Param("from") LocalDateTime from);
}
