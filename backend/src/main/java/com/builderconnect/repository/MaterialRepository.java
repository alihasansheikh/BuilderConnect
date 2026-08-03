package com.builderconnect.repository;

import com.builderconnect.entity.Material;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface MaterialRepository extends JpaRepository<Material, Long> {

    Page<Material> findBySupplierId(Long supplierId, Pageable pageable);

    @Query("SELECT m FROM Material m WHERE m.supplier.id = :supplierId AND " +
           "(:search IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.sku) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Material> findBySupplierIdWithSearch(
            @Param("supplierId") Long supplierId,
            @Param("search") String search,
            Pageable pageable);

    Page<Material> findByIsAvailableTrue(Pageable pageable);

    Page<Material> findBySupplierIdAndIsAvailableTrue(Long supplierId, Pageable pageable);

    @Query("SELECT m FROM Material m WHERE m.isAvailable = true AND " +
           "(LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Material> searchByName(@Param("query") String query, Pageable pageable);

    @Query("SELECT m FROM Material m WHERE m.isAvailable = true AND m.supplier.deleted = false AND " +
           "(:categoryId IS NULL OR m.categoryId = :categoryId) AND " +
           "(:supplierId IS NULL OR m.supplier.id = :supplierId) AND " +
           "(:query IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:minPrice IS NULL OR m.unitPrice >= :minPrice) AND " +
           "(:maxPrice IS NULL OR m.unitPrice <= :maxPrice) AND " +
           "(:inStock IS NULL OR :inStock = FALSE OR m.stockQuantity > 0)")
    Page<Material> findWithFilters(
            @Param("categoryId") Long categoryId,
            @Param("supplierId") Long supplierId,
            @Param("query") String query,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("inStock") Boolean inStock,
            Pageable pageable);

    List<Material> findByIdIn(List<Long> ids);

    /**
     * Loads materials with a pessimistic write lock for stock check/decrement.
     * Ascending id order prevents deadlock between concurrent multi-item orders.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Material m WHERE m.id IN :ids ORDER BY m.id")
    List<Material> findByIdInForUpdate(@Param("ids") List<Long> ids);

    boolean existsBySupplierIdAndSkuIgnoreCase(Long supplierId, String sku);

    long countBySupplierIdAndIsAvailableTrue(Long supplierId);

    @Query("SELECT COUNT(m) FROM Material m WHERE m.supplier.id = :supplierId AND " +
           "m.isAvailable = TRUE AND m.stockQuantity < m.minOrderQuantity * 2")
    long countLowStockBySupplier(@Param("supplierId") Long supplierId);
}
