package com.builderconnect.dto.response;

import com.builderconnect.entity.Delivery;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryResponse {

    private Long id;
    private String deliveryNumber;
    private String status;
    private String deliveryMethod;
    private String trackingNumber;
    private String driverName;
    private String driverPhone;
    private LocalDateTime estimatedDelivery;
    private LocalDateTime actualDelivery;
    private String deliveryProof;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Order info
    private Long orderId;
    private String orderNumber;

    public static DeliveryResponse fromEntity(Delivery delivery) {
        DeliveryResponseBuilder builder = DeliveryResponse.builder()
                .id(delivery.getId())
                .deliveryNumber(delivery.getDeliveryNumber())
                .status(delivery.getStatus().name())
                .deliveryMethod(delivery.getDeliveryMethod().name())
                .trackingNumber(delivery.getTrackingNumber())
                .driverName(delivery.getDriverName())
                .driverPhone(delivery.getDriverPhone())
                .estimatedDelivery(delivery.getEstimatedDelivery())
                .actualDelivery(delivery.getActualDelivery())
                .deliveryProof(delivery.getDeliveryProof())
                .notes(delivery.getNotes())
                .createdAt(delivery.getCreatedAt())
                .updatedAt(delivery.getUpdatedAt());

        if (delivery.getOrder() != null) {
            builder.orderId(delivery.getOrder().getId())
                    .orderNumber(delivery.getOrder().getOrderNumber());
        }

        return builder.build();
    }
}
