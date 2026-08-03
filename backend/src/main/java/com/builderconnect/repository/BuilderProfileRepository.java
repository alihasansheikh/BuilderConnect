package com.builderconnect.repository;

import com.builderconnect.entity.BuilderProfile;
import com.builderconnect.enums.VerificationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

/**
 * Repository for BuilderProfile entity operations.
 */
@Repository
public interface BuilderProfileRepository extends JpaRepository<BuilderProfile, Long> {

    Optional<BuilderProfile> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT bp FROM BuilderProfile bp WHERE bp.user.id = :userId")
    Optional<BuilderProfile> findByUserIdForUpdate(@Param("userId") Long userId);

    Page<BuilderProfile> findByIsVerifiedTrue(Pageable pageable);

    Page<BuilderProfile> findByIsVerifiedFalse(Pageable pageable);

    Page<BuilderProfile> findByVerificationStatus(VerificationStatus status, Pageable pageable);

    Page<BuilderProfile> findByIsVerifiedFalseAndVerificationStatusIn(
        Collection<VerificationStatus> statuses, Pageable pageable);

    long countByVerificationStatus(VerificationStatus status);

    Page<BuilderProfile> findByIsAvailableTrue(Pageable pageable);

    long countByIsVerifiedTrue();

    long countByIsVerifiedFalse();

    // Featured-first ranking: builders on a plan with featuredListing whose subscription is
    // unexpired sort ahead; Spring Data appends the Pageable sort (default averageRating DESC)
    // AFTER this static ORDER BY, so ordering is featured-first, then rating.
    // The unexpired predicate (expiry IS NULL OR in the future) mirrors
    // BuilderProfile.isSubscriptionExpired() — SQL can't call the entity method; keep in sync.
    @Query("SELECT bp FROM BuilderProfile bp " +
           "LEFT JOIN SubscriptionPlan p ON p.tier = bp.subscriptionTier " +
           "WHERE bp.isVerified = true AND bp.isAvailable = true AND bp.user.deleted = false " +
           "ORDER BY CASE WHEN p.featuredListing = true " +
           "AND (bp.subscriptionExpiresAt IS NULL OR bp.subscriptionExpiresAt > CURRENT_TIMESTAMP) " +
           "THEN 0 ELSE 1 END")
    Page<BuilderProfile> findAvailableVerifiedBuilders(Pageable pageable);

    @Query("SELECT bp FROM BuilderProfile bp JOIN bp.user u " +
           "WHERE bp.isVerified = true AND u.deleted = false AND u.city = :city")
    Page<BuilderProfile> findVerifiedBuildersInCity(@Param("city") String city, Pageable pageable);

    // Same featured-first ORDER BY CASE as findAvailableVerifiedBuilders (see comment there);
    // the unexpired predicate mirrors BuilderProfile.isSubscriptionExpired().
    // Availability defaults to available-only (matching findAvailableVerifiedBuilders) unless the
    // caller passes isAvailable=false to explicitly include unavailable builders:
    // (:isAvailable = false OR bp.isAvailable = true) — a null param leaves the left side unknown,
    // so only available rows pass.
    @Query("SELECT bp FROM BuilderProfile bp JOIN bp.user u " +
           "LEFT JOIN SubscriptionPlan p ON p.tier = bp.subscriptionTier " +
           "WHERE bp.isVerified = true AND u.deleted = false AND " +
           "(:city IS NULL OR u.city = :city) AND " +
           "(:minExperience IS NULL OR bp.yearsOfExperience >= :minExperience) AND " +
           "(:maxExperience IS NULL OR bp.yearsOfExperience <= :maxExperience) AND " +
           "(:minRating IS NULL OR bp.averageRating >= :minRating) AND " +
           "(:isAvailable = false OR bp.isAvailable = true) AND " +
           "(:specialization IS NULL OR bp.specializations LIKE CONCAT('%', :specialization, '%')) AND " +
           "(:text IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :text, '%')) " +
           "OR LOWER(bp.companyName) LIKE LOWER(CONCAT('%', :text, '%'))) " +
           "ORDER BY CASE WHEN p.featuredListing = true " +
           "AND (bp.subscriptionExpiresAt IS NULL OR bp.subscriptionExpiresAt > CURRENT_TIMESTAMP) " +
           "THEN 0 ELSE 1 END")
    Page<BuilderProfile> searchBuilders(
        @Param("city") String city,
        @Param("minExperience") Integer minExperience,
        @Param("maxExperience") Integer maxExperience,
        @Param("minRating") Double minRating,
        @Param("isAvailable") Boolean isAvailable,
        @Param("specialization") String specialization,
        @Param("text") String text,
        Pageable pageable
    );
}
