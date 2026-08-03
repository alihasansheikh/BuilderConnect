package com.builderconnect.dto.response;

import com.builderconnect.entity.MaterialOrder;
import com.builderconnect.entity.MaterialOrderItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialOrderResponse {

    private Long id;
    private String orderNumber;
    private String status;
    private String paymentStatus;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal deliveryFee;
    private BigDecimal totalAmount;
    private String deliveryAddress;
    private String deliveryCity;
    private String deliveryContactName;
    private String deliveryContactPhone;
    private String deliveryInstructions;
    private String paymentMethod;
    private LocalDateTime paidAt;
    private LocalDate deliveryDate;
    private String notes;
    private String cancellationReason;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Project info
    private Long projectId;
    private String projectTitle;

    // Supplier info
    private Long supplierId;
    private String supplierName;

    // Ordered by info
    private Long orderedById;
    private String orderedByName;

    // Items
    private Integer itemCount;
    private List<OrderItemResponse> items;

    // Deliveries
    private List<DeliveryResponse> deliveries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemResponse {

        private Long id;
        private Long materialId;
        private String materialName;
        private String materialSku;
        private String materialUnit;
        private String unitOfMeasure;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private String notes;

        public static OrderItemResponse fromEntity(MaterialOrderItem item) {
            // Use the item's snapshot columns (materialName/materialSku/unitOfMeasure),
            // not the lazy Material association.
            OrderItemResponseBuilder builder = OrderItemResponse.builder()
                    .id(item.getId())
                    .materialName(item.getMaterialName())
                    .materialSku(item.getMaterialSku())
                    .materialUnit(item.getUnitOfMeasure())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .totalPrice(item.getTotalPrice())
                    .notes(item.getNotes());

            if (item.getMaterial() != null) {
                builder.materialId(item.getMaterial().getId());
            }

            return builder.build();
        }
    }

    public static MaterialOrderResponse fromEntity(MaterialOrder order) {
        return fromEntity(order, true);
    }

    public static MaterialOrderResponse fromEntity(MaterialOrder order, boolean includeDetails) {
        MaterialOrderResponseBuilder builder = MaterialOrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus().name())
                .paymentStatus(order.getPaymentStatus().name())
                .subtotal(order.getSubtotal())
                .taxAmount(order.getTaxAmount())
                .deliveryFee(order.getDeliveryFee())
                .totalAmount(order.getTotalAmount())
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryCity(order.getDeliveryCity())
                .deliveryContactName(order.getDeliveryContactName())
                .deliveryContactPhone(order.getDeliveryContactPhone())
                .deliveryInstructions(order.getDeliveryInstructions())
                .paymentMethod(order.getPaymentMethod())
                .paidAt(order.getPaidAt())
                .deliveryDate(order.getDeliveryDate())
                .notes(order.getNotes())
                .cancellationReason(order.getCancellationReason())
                .cancelledAt(order.getCancelledAt())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt());

        if (order.getProject() != null) {
            builder.projectId(order.getProject().getId())
                    .projectTitle(order.getProject().getTitle());
        }

        if (order.getSupplier() != null) {
            builder.supplierId(order.getSupplier().getId())
                    .supplierName(order.getSupplier().getName());
        }

        if (order.getOrderedBy() != null) {
            builder.orderedById(order.getOrderedBy().getId())
                    .orderedByName(order.getOrderedBy().getName());
        }

        if (includeDetails) {
            if (order.getItems() != null) {
                builder.itemCount(order.getItems().size())
                        .items(order.getItems().stream()
                                .map(OrderItemResponse::fromEntity)
                                .toList());
            }

            if (order.getDeliveries() != null) {
                builder.deliveries(order.getDeliveries().stream()
                        .map(DeliveryResponse::fromEntity)
                        .toList());
            }
        } else {
            // Summary rows use the @Formula count — never the lazy items collection
            builder.itemCount(order.getItemCount());
        }

        return builder.build();
    }
}
