package com.builderconnect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for supplier dashboard statistics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierStatsResponse {

    private long pendingOrders;
    private long activeOrders;
    private long deliveredOrders;
    private long unpaidCodOrders;
    private BigDecimal revenue;
    private long catalogItems;
    private long lowStockItems;
}
