package com.builderconnect.repository;

import com.builderconnect.entity.Project;
import com.builderconnect.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Project entity operations.
 */
@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    Optional<Project> findByProjectNumber(String projectNumber);

    Optional<Project> findByIdAndDeletedFalse(Long id);

    List<Project> findByIdInAndDeletedFalse(List<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    Optional<Project> findByIdForUpdate(@Param("id") Long id);

    Page<Project> findByDeletedFalse(Pageable pageable);

    // Client projects
    Page<Project> findByClientIdAndDeletedFalse(Long clientId, Pageable pageable);

    Page<Project> findByClientIdAndStatusAndDeletedFalse(Long clientId, ProjectStatus status, Pageable pageable);

    // Builder projects
    Page<Project> findByAwardedBuilderIdAndDeletedFalse(Long builderId, Pageable pageable);

    Page<Project> findByAwardedBuilderIdAndStatusAndDeletedFalse(Long builderId, ProjectStatus status, Pageable pageable);

    // Open projects for marketplace — a deleted client's projects can never be awarded,
    // so they must not surface (builders would burn lead credits bidding on them).
    @Query("SELECT p FROM Project p WHERE p.deleted = false AND p.client.deleted = false " +
           "AND p.status IN :statuses AND p.isPublic = true")
    Page<Project> findOpenProjects(@Param("statuses") List<ProjectStatus> statuses, Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.deleted = false AND p.client.deleted = false " +
           "AND p.status IN :statuses AND p.city = :city AND p.isPublic = true")
    Page<Project> findOpenProjectsByCity(
        @Param("statuses") List<ProjectStatus> statuses,
        @Param("city") String city,
        Pageable pageable
    );

    // Search and filter. Budget predicates are NULL-tolerant and overlap-based so
    // OPEN_TO_QUOTES projects (null budgets) survive a budget filter.
    @Query("SELECT p FROM Project p WHERE p.deleted = false AND p.client.deleted = false " +
           "AND p.isPublic = true AND " +
           "p.status IN :statuses AND " +
           "(:city IS NULL OR p.city = :city) AND " +
           "(:categoryId IS NULL OR p.categoryId = :categoryId) AND " +
           "(:propertyType IS NULL OR p.propertyType = :propertyType) AND " +
           "(:province IS NULL OR p.province = :province) AND " +
           "(:minBudget IS NULL OR p.budgetMax IS NULL OR p.budgetMax >= :minBudget) AND " +
           "(:maxBudget IS NULL OR p.budgetMin IS NULL OR p.budgetMin <= :maxBudget)")
    Page<Project> searchProjects(
        @Param("statuses") List<ProjectStatus> statuses,
        @Param("city") String city,
        @Param("categoryId") Long categoryId,
        @Param("propertyType") String propertyType,
        @Param("province") String province,
        @Param("minBudget") BigDecimal minBudget,
        @Param("maxBudget") BigDecimal maxBudget,
        Pageable pageable
    );

    @Query("SELECT p FROM Project p WHERE p.deleted = false AND " +
           "(LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Project> searchByKeyword(@Param("query") String query, Pageable pageable);

    // Statistics
    @Query("SELECT COUNT(p) FROM Project p WHERE p.deleted = false AND p.status = :status")
    long countByStatus(@Param("status") ProjectStatus status);

    @Query("SELECT COUNT(p) FROM Project p WHERE p.deleted = false AND p.client.id = :clientId")
    long countByClientId(@Param("clientId") Long clientId);

    @Query("SELECT COUNT(p) FROM Project p WHERE p.deleted = false AND p.awardedBuilder.id = :builderId")
    long countByBuilderId(@Param("builderId") Long builderId);

    @Query("SELECT COALESCE(SUM(p.finalBudget), 0) FROM Project p WHERE p.deleted = false AND p.awardedBuilder.id = :builderId AND p.status = com.builderconnect.enums.ProjectStatus.COMPLETED")
    BigDecimal sumCompletedProjectValueByBuilder(@Param("builderId") Long builderId);

    // Project number generation
    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(project_number, 10) AS BIGINT)), 0) + 1 FROM projects WHERE project_number LIKE :prefix%", nativeQuery = true)
    Long getNextProjectNumber(@Param("prefix") String prefix);

    // Builder project counts by status
    long countByAwardedBuilderIdAndStatusAndDeletedFalse(Long builderId, ProjectStatus status);

    // Active projects a user is committed to, as client OR awarded builder — gates self-deletion.
    @Query("SELECT COUNT(p) FROM Project p WHERE p.deleted = false AND p.status IN :statuses " +
           "AND (p.client.id = :userId OR p.awardedBuilder.id = :userId)")
    long countActiveForUser(@Param("userId") Long userId, @Param("statuses") Collection<ProjectStatus> statuses);

    // Featured projects
    Page<Project> findByIsFeaturedTrueAndDeletedFalseAndStatusIn(List<ProjectStatus> statuses, Pageable pageable);
}
