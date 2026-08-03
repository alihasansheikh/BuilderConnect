package com.builderconnect.repository;

import com.builderconnect.entity.MaterialOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MaterialOrderRepository extends JpaRepository<MaterialOrder, Long> {

    Page<MaterialOrder> findByProjectIdOrderByCreatedAtDesc(Long projectId, Pageable pageable);

    Page<MaterialOrder> findBySupplierIdOrderByCreatedAtDesc(Long supplierId, Pageable pageable);

    Page<MaterialOrder> findByOrderedByIdOrderByCreatedAtDesc(Long orderedById, Pageable pageable);

    Optional<MaterialOrder> findByOrderNumber(String orderNumber);

    /**
     * Pessimistic write-lock on a single order row. Serializes concurrent
     * confirm/cancel/decline/status/payment writes on the same order.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM MaterialOrder o WHERE o.id = :id")
    Optional<MaterialOrder> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT o FROM MaterialOrder o WHERE o.supplier.id = :supplierId AND " +
           "(:status IS NULL OR o.status = :status) AND " +
           "(:paymentStatus IS NULL OR o.paymentStatus = :paymentStatus) AND " +
           "(:search IS NULL OR LOWER(o.orderNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.orderedBy.name) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:from IS NULL OR o.createdAt >= :from) AND " +
           "(:to IS NULL OR o.createdAt <= :to) " +
           "ORDER BY o.createdAt DESC")
    Page<MaterialOrder> findBySupplierWithFilter(
            @Param("supplierId") Long supplierId,
            @Param("status") MaterialOrder.OrderStatus status,
            @Param("paymentStatus") MaterialOrder.PaymentStatus paymentStatus,
            @Param("search") String search,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);

    @Query("SELECT o FROM MaterialOrder o WHERE o.orderedBy.id = :buyerId AND " +
           "(:status IS NULL OR o.status = :status) AND " +
           "(:search IS NULL OR LOWER(o.orderNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.supplier.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY o.createdAt DESC")
    Page<MaterialOrder> findByBuyerWithFilter(
            @Param("buyerId") Long buyerId,
            @Param("status") MaterialOrder.OrderStatus status,
            @Param("search") String search,
            Pageable pageable);

    long countBySupplierIdAndStatus(Long supplierId, MaterialOrder.OrderStatus status);

    long countBySupplierIdAndStatusIn(Long supplierId, Collection<MaterialOrder.OrderStatus> statuses);

    long countBySupplierIdAndStatusAndPaymentStatus(
            Long supplierId, MaterialOrder.OrderStatus status, MaterialOrder.PaymentStatus paymentStatus);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM MaterialOrder o WHERE o.supplier.id = :supplierId AND " +
           "o.paymentStatus = :paymentStatus")
    BigDecimal sumRevenueBySupplierAndPaymentStatus(
            @Param("supplierId") Long supplierId,
            @Param("paymentStatus") MaterialOrder.PaymentStatus paymentStatus);

    /** Total collected revenue for a supplier (sum of PAID order totals). */
    default BigDecimal sumRevenueBySupplier(Long supplierId) {
        return sumRevenueBySupplierAndPaymentStatus(supplierId, MaterialOrder.PaymentStatus.PAID);
    }

    Page<MaterialOrder> findBySupplierIdAndPaymentStatusOrderByPaidAtDesc(
            Long supplierId, MaterialOrder.PaymentStatus paymentStatus, Pageable pageable);

    long countBySupplierIdAndPaymentStatus(Long supplierId, MaterialOrder.PaymentStatus paymentStatus);

    @Query("SELECT YEAR(COALESCE(o.paidAt, o.updatedAt, o.createdAt)), MONTH(COALESCE(o.paidAt, o.updatedAt, o.createdAt)), " +
           "COUNT(o), COALESCE(SUM(o.totalAmount), 0) FROM MaterialOrder o " +
           "WHERE o.supplier.id = :supplierId AND o.paymentStatus = :paymentStatus " +
           "GROUP BY YEAR(COALESCE(o.paidAt, o.updatedAt, o.createdAt)), MONTH(COALESCE(o.paidAt, o.updatedAt, o.createdAt)) " +
           "ORDER BY 1 DESC, 2 DESC")
    List<Object[]> getMonthlyRevenueBySupplier(@Param("supplierId") Long supplierId,
                                               @Param("paymentStatus") MaterialOrder.PaymentStatus paymentStatus);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM MaterialOrder o " +
           "WHERE o.supplier.id = :supplierId AND o.paymentStatus = :paymentStatus " +
           "AND COALESCE(o.paidAt, o.updatedAt, o.createdAt) >= :from")
    BigDecimal sumRevenueBySupplierSince(@Param("supplierId") Long supplierId,
                                         @Param("paymentStatus") MaterialOrder.PaymentStatus paymentStatus,
                                         @Param("from") LocalDateTime from);

    long countByProjectId(Long projectId);

    // Open orders a user is party to, as buyer OR supplier — gates self-deletion.
    @Query("SELECT COUNT(o) FROM MaterialOrder o WHERE o.status IN :statuses " +
           "AND (o.orderedBy.id = :userId OR o.supplier.id = :userId)")
    long countOpenForUser(@Param("userId") Long userId, @Param("statuses") Collection<MaterialOrder.OrderStatus> statuses);
}
