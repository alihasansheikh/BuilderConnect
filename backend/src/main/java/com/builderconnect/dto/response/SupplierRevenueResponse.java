package com.builderconnect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for the supplier revenue page: collected COD revenue totals plus monthly buckets.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierRevenueResponse {

    private BigDecimal totalRevenue;
    private long paidOrders;
    private BigDecimal thisMonthRevenue;
    private List<MonthlyBucket> monthly;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyBucket {

        /** Month key formatted as "YYYY-MM" (e.g. "2026-07"). */
        private String month;
        private long orders;
        private BigDecimal total;
    }
}
