package com.builderconnect.repository;

import com.builderconnect.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    Page<Review> findByRevieweeIdAndStatus(Long revieweeId, Review.ReviewStatus status, Pageable pageable);

    boolean existsByReviewerIdAndProjectIdAndReviewType(Long reviewerId, Long projectId, Review.ReviewType reviewType);

    boolean existsByReviewerIdAndMaterialIdAndReviewType(Long reviewerId, Long materialId, Review.ReviewType reviewType);

    Optional<Review> findByReviewerIdAndMaterialIdAndReviewType(Long reviewerId, Long materialId, Review.ReviewType reviewType);

    Optional<Review> findByReviewerIdAndProjectIdAndReviewType(Long reviewerId, Long projectId, Review.ReviewType reviewType);

    Page<Review> findByMaterialIdAndStatus(Long materialId, Review.ReviewStatus status, Pageable pageable);

    // No ORDER BY here — the Pageable's (whitelisted) sort drives ordering.
    @Query("SELECT r FROM Review r WHERE r.materialId = :materialId AND r.status = :status AND " +
           "(:minRating IS NULL OR r.overallRating >= :minRating) AND " +
           "(:maxRating IS NULL OR r.overallRating <= :maxRating)")
    Page<Review> searchMaterialReviews(
        @Param("materialId") Long materialId,
        @Param("status") Review.ReviewStatus status,
        @Param("minRating") Integer minRating,
        @Param("maxRating") Integer maxRating,
        Pageable pageable
    );

    // No ORDER BY here — the Pageable's (whitelisted) sort drives ordering.
    @Query("SELECT r FROM Review r WHERE r.reviewee.id = :revieweeId AND r.status = :status AND " +
           "(:minRating IS NULL OR r.overallRating >= :minRating) AND " +
           "(:maxRating IS NULL OR r.overallRating <= :maxRating)")
    Page<Review> searchRevieweeReviews(
        @Param("revieweeId") Long revieweeId,
        @Param("status") Review.ReviewStatus status,
        @Param("minRating") Integer minRating,
        @Param("maxRating") Integer maxRating,
        Pageable pageable
    );

    Page<Review> findByStatusOrderByCreatedAtDesc(Review.ReviewStatus status, Pageable pageable);

    // No ORDER BY here — the Pageable's (whitelisted) sort drives ordering.
    @Query("SELECT r FROM Review r WHERE r.status = :status AND " +
           "(:reviewType IS NULL OR r.reviewType = :reviewType) AND " +
           "(:minRating IS NULL OR r.overallRating >= :minRating) AND " +
           "(:maxRating IS NULL OR r.overallRating <= :maxRating)")
    Page<Review> searchForModeration(
        @Param("status") Review.ReviewStatus status,
        @Param("reviewType") Review.ReviewType reviewType,
        @Param("minRating") Integer minRating,
        @Param("maxRating") Integer maxRating,
        Pageable pageable
    );

    long countByStatus(Review.ReviewStatus status);

    @Query("SELECT r.id FROM Review r WHERE r.materialId = :materialId")
    List<Long> findIdsByMaterialId(@Param("materialId") Long materialId);

    @Query("SELECT AVG(r.overallRating), COUNT(r) FROM Review r " +
           "WHERE r.materialId = :materialId AND r.status = :status AND r.reviewType = :reviewType")
    List<Object[]> aggregateRatingByMaterial(@Param("materialId") Long materialId,
                                             @Param("status") Review.ReviewStatus status,
                                             @Param("reviewType") Review.ReviewType reviewType);

    @Query("SELECT AVG(r.overallRating), COUNT(r) FROM Review r " +
           "WHERE r.reviewee.id = :revieweeId AND r.status = :status AND r.reviewType = :reviewType")
    List<Object[]> aggregateRatingByReviewee(@Param("revieweeId") Long revieweeId,
                                             @Param("status") Review.ReviewStatus status,
                                             @Param("reviewType") Review.ReviewType reviewType);

    // Monthly rating analytics for a reviewee: [year, month, avgRating, reviewCount] over createdAt.
    @Query("SELECT YEAR(r.createdAt), MONTH(r.createdAt), AVG(r.overallRating), COUNT(r) FROM Review r " +
           "WHERE r.reviewee.id = :revieweeId AND r.status = :status AND r.createdAt >= :from " +
           "GROUP BY YEAR(r.createdAt), MONTH(r.createdAt)")
    List<Object[]> getMonthlyRatingByReviewee(@Param("revieweeId") Long revieweeId,
                                              @Param("status") Review.ReviewStatus status,
                                              @Param("from") LocalDateTime from);

    // Rating distribution for a reviewee: [overallRating, count] grouped by star value.
    @Query("SELECT r.overallRating, COUNT(r) FROM Review r " +
           "WHERE r.reviewee.id = :revieweeId AND r.status = :status GROUP BY r.overallRating")
    List<Object[]> getRatingDistributionByReviewee(@Param("revieweeId") Long revieweeId,
                                                   @Param("status") Review.ReviewStatus status);
}
