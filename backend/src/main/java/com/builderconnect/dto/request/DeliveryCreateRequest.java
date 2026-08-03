package com.builderconnect.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryCreateRequest {

    private String deliveryMethod; // SUPPLIER_DELIVERY, THIRD_PARTY, PICKUP

    private String trackingNumber;

    private String driverName;

    private String driverPhone;

    private LocalDateTime estimatedDelivery;

    private String notes;
}
