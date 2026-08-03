package com.builderconnect.service;

import com.builderconnect.dto.request.SupplierProfileUpdateRequest;
import com.builderconnect.dto.response.MaterialOrderResponse;
import com.builderconnect.dto.response.SupplierProfileResponse;
import com.builderconnect.dto.response.SupplierRevenueResponse;
import com.builderconnect.dto.response.SupplierStatsResponse;
import com.builderconnect.entity.MaterialOrder;
import com.builderconnect.entity.SupplierProfile;
import com.builderconnect.entity.User;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.repository.MaterialOrderRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for supplier profile self-management.
 */
@Service
@RequiredArgsConstructor
public class SupplierProfileService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /** Statuses counted as "active" (accepted but not yet fully delivered). */
    private static final List<MaterialOrder.OrderStatus> ACTIVE_ORDER_STATUSES = List.of(
            MaterialOrder.OrderStatus.CONFIRMED,
            MaterialOrder.OrderStatus.PROCESSING,
            MaterialOrder.OrderStatus.READY_FOR_DELIVERY,
            MaterialOrder.OrderStatus.OUT_FOR_DELIVERY,
            MaterialOrder.OrderStatus.PARTIALLY_DELIVERED);

    private final SupplierProfileRepository supplierProfileRepository;
    private final MaterialOrderRepository materialOrderRepository;
    private final MaterialRepository materialRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public SupplierProfileResponse getMyProfile(User user) {
        SupplierProfile profile = supplierProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier profile not found"));
        return SupplierProfileResponse.fromEntity(profile);
    }

    @Transactional
    public SupplierProfileResponse updateMyProfile(User user, SupplierProfileUpdateRequest request) {
        SupplierProfile profile = supplierProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier profile not found"));

        if (request.getCompanyName() != null) profile.setCompanyName(request.getCompanyName());
        if (request.getDescription() != null) profile.setDescription(request.getDescription());
        if (request.getBusinessRegistrationNumber() != null) {
            profile.setBusinessRegistrationNumber(request.getBusinessRegistrationNumber());
        }
        if (request.getTaxId() != null) profile.setTaxId(request.getTaxId());
        if (request.getCategories() != null) profile.setCategories(toJsonArray(request.getCategories()));
        if (request.getWarehouseAddress() != null) profile.setWarehouseAddress(request.getWarehouseAddress());
        if (request.getDeliveryAreas() != null) profile.setDeliveryAreas(toJsonArray(request.getDeliveryAreas()));
        if (request.getMinimumOrderValue() != null) profile.setMinimumOrderValue(request.getMinimumOrderValue());

        SupplierProfile saved = supplierProfileRepository.save(profile);

        auditService.logAction(user, "SUPPLIER_PROFILE_UPDATED", "SUPPLIER_PROFILE", saved.getId(),
                "Supplier updated their profile");

        return SupplierProfileResponse.fromEntity(saved);
    }

    /**
     * Dashboard statistics for the current supplier: order counts by lifecycle stage,
     * COD revenue collected, and catalog/low-stock counts.
     */
    @Transactional(readOnly = true)
    public SupplierStatsResponse getMyStats(User user) {
        Long supplierId = user.getId();
        return SupplierStatsResponse.builder()
                .pendingOrders(materialOrderRepository.countBySupplierIdAndStatus(
                        supplierId, MaterialOrder.OrderStatus.PENDING_CONFIRMATION))
                .activeOrders(materialOrderRepository.countBySupplierIdAndStatusIn(supplierId, ACTIVE_ORDER_STATUSES))
                .deliveredOrders(materialOrderRepository.countBySupplierIdAndStatus(
                        supplierId, MaterialOrder.OrderStatus.DELIVERED))
                .unpaidCodOrders(materialOrderRepository.countBySupplierIdAndStatusAndPaymentStatus(
                        supplierId, MaterialOrder.OrderStatus.DELIVERED, MaterialOrder.PaymentStatus.PENDING))
                .revenue(materialOrderRepository.sumRevenueBySupplier(supplierId))
                .catalogItems(materialRepository.countBySupplierIdAndIsAvailableTrue(supplierId))
                .lowStockItems(materialRepository.countLowStockBySupplier(supplierId))
                .build();
    }

    /**
     * Revenue summary for the current supplier: total collected COD revenue, paid-order count,
     * revenue collected this calendar month, and per-month buckets. Totals derive from the same
     * query as the dashboard {@code SupplierStats.revenue}, so the two figures always agree.
     */
    @Transactional(readOnly = true)
    public SupplierRevenueResponse getMyRevenue(User user) {
        Long supplierId = user.getId();
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        List<SupplierRevenueResponse.MonthlyBucket> monthly =
                materialOrderRepository.getMonthlyRevenueBySupplier(supplierId, MaterialOrder.PaymentStatus.PAID)
                        .stream()
                        .map(row -> SupplierRevenueResponse.MonthlyBucket.builder()
                                .month(String.format("%d-%02d",
                                        ((Number) row[0]).intValue(), ((Number) row[1]).intValue()))
                                .orders(((Number) row[2]).longValue())
                                .total((BigDecimal) row[3])
                                .build())
                        .toList();

        return SupplierRevenueResponse.builder()
                .totalRevenue(materialOrderRepository.sumRevenueBySupplier(supplierId))
                .paidOrders(materialOrderRepository.countBySupplierIdAndPaymentStatus(
                        supplierId, MaterialOrder.PaymentStatus.PAID))
                .thisMonthRevenue(materialOrderRepository.sumRevenueBySupplierSince(
                        supplierId, MaterialOrder.PaymentStatus.PAID, startOfMonth))
                .monthly(monthly)
                .build();
    }

    /** Paginated PAID orders for the current supplier, newest payment first. */
    @Transactional(readOnly = true)
    public Page<MaterialOrderResponse> getMyRevenueOrders(User user, Pageable pageable) {
        return materialOrderRepository.findBySupplierIdAndPaymentStatusOrderByPaidAtDesc(
                        user.getId(), MaterialOrder.PaymentStatus.PAID, pageable)
                .map(MaterialOrderResponse::fromEntity);
    }

    /** Serializes a list to the JSON string form these columns store (same as MaterialService). */
    private String toJsonArray(List<String> values) {
        try {
            return OBJECT_MAPPER.writeValueAsString(values);
        } catch (Exception e) {
            throw new BadRequestException("Failed to serialize list");
        }
    }
}
