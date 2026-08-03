package com.builderconnect.repository;

import com.builderconnect.entity.SubscriptionPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for SubscriptionPayment entity operations.
 * Feeds admin subscription-revenue reporting; monthly buckets are computed
 * in Java (YearMonth grouping over {@link #findByPaidAtAfterOrderByPaidAtDesc})
 * — no DATE_FORMAT in JPQL, which is MySQL-only and breaks on dev H2.
 */
@Repository
public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {

    boolean existsByStripeSessionId(String stripeSessionId);

    @Query("SELECT COALESCE(SUM(sp.amount), 0) FROM SubscriptionPayment sp")
    BigDecimal getTotalRevenue();

    /** Rows of [tier, total, count]. */
    @Query("SELECT sp.tier, COALESCE(SUM(sp.amount), 0), COUNT(sp) FROM SubscriptionPayment sp GROUP BY sp.tier")
    List<Object[]> getRevenueByTier();

    List<SubscriptionPayment> findByPaidAtAfterOrderByPaidAtDesc(LocalDateTime since);

    List<SubscriptionPayment> findTop20ByOrderByPaidAtDesc();
}
