package com.builderconnect.service;

import com.builderconnect.entity.SubscriptionPayment;
import com.builderconnect.repository.SubscriptionPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin revenue reporting for Stripe-paid builder subscriptions. Extracted from
 * {@link AdminService} to keep each service focused and under the file-size cap.
 */
@Service
@RequiredArgsConstructor
public class AdminRevenueService {

    private final SubscriptionPaymentRepository subscriptionPaymentRepository;

    /**
     * Subscription revenue summary: totals, last-12-months monthly trends,
     * per-tier breakdown, and the 20 most recent payments. Monthly buckets are
     * computed in Java (YearMonth grouping) — DATE_FORMAT in JPQL is MySQL-only
     * and breaks on dev H2.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getRevenueSummary() {
        Map<String, Object> summary = new HashMap<>();

        summary.put("totalRevenue", subscriptionPaymentRepository.getTotalRevenue());
        summary.put("totalPayments", subscriptionPaymentRepository.count());

        YearMonth currentMonth = YearMonth.now();
        LocalDateTime trendStart = currentMonth.minusMonths(11).atDay(1).atStartOfDay();
        List<SubscriptionPayment> lastYear =
            subscriptionPaymentRepository.findByPaidAtAfterOrderByPaidAtDesc(trendStart);

        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        summary.put("revenueThisMonth", sumAmounts(lastYear.stream()
            .filter(p -> !p.getPaidAt().isBefore(startOfMonth))
            .toList()));

        // Monthly trends: every month of the last 12 (zero-filled), oldest first
        Map<YearMonth, List<SubscriptionPayment>> byMonth = new HashMap<>();
        for (SubscriptionPayment payment : lastYear) {
            byMonth.computeIfAbsent(YearMonth.from(payment.getPaidAt()), m -> new ArrayList<>())
                .add(payment);
        }
        List<Map<String, Object>> monthlyTrends = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            List<SubscriptionPayment> payments = byMonth.getOrDefault(month, List.of());
            Map<String, Object> item = new HashMap<>();
            item.put("month", month.toString()); // e.g. "2026-07"
            item.put("total", sumAmounts(payments));
            item.put("count", payments.size());
            monthlyTrends.add(item);
        }
        summary.put("monthlyTrends", monthlyTrends);

        // Breakdown by tier
        List<Map<String, Object>> byTier = new ArrayList<>();
        for (Object[] row : subscriptionPaymentRepository.getRevenueByTier()) {
            Map<String, Object> item = new HashMap<>();
            item.put("tier", row[0] != null ? row[0].toString() : "UNKNOWN");
            item.put("total", row[1]);
            item.put("count", row[2]);
            byTier.add(item);
        }
        summary.put("byTier", byTier);

        // Recent payments table
        List<Map<String, Object>> recentPayments = new ArrayList<>();
        for (SubscriptionPayment payment : subscriptionPaymentRepository.findTop20ByOrderByPaidAtDesc()) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", payment.getId());
            item.put("builderName", payment.getUser() != null ? payment.getUser().getName() : null);
            item.put("tier", payment.getTier());
            item.put("amount", payment.getAmount());
            item.put("paidAt", payment.getPaidAt());
            recentPayments.add(item);
        }
        summary.put("recentPayments", recentPayments);

        return summary;
    }

    private static BigDecimal sumAmounts(List<SubscriptionPayment> payments) {
        return payments.stream()
            .map(SubscriptionPayment::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
