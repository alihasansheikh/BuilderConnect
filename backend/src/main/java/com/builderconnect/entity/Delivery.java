package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Delivery entity for tracking material order shipments.
 */
@Entity
@Table(name = "deliveries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Delivery extends BaseEntity {

    public enum DeliveryStatus {
        PREPARING, DISPATCHED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED_DELIVERY, RETURNED
    }

    public enum DeliveryMethod {
        SUPPLIER_DELIVERY, THIRD_PARTY, PICKUP
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private MaterialOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private User supplier;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 50)
    private String deliveryNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DeliveryStatus status = DeliveryStatus.PREPARING;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_method", nullable = false)
    @Builder.Default
    private DeliveryMethod deliveryMethod = DeliveryMethod.SUPPLIER_DELIVERY;

    @Column(name = "carrier_tracking_number", length = 100)
    private String trackingNumber;

    @Column(name = "driver_name", length = 100)
    private String driverName;

    @Column(name = "driver_phone", length = 20)
    private String driverPhone;

    @Column(name = "estimated_arrival")
    private LocalDateTime estimatedDelivery;

    @Column(name = "delivered_at")
    private LocalDateTime actualDelivery;

    @Column(name = "delivery_photos", columnDefinition = "JSON")
    private String deliveryProof;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // Helper methods

    public void markDelivered() {
        this.status = DeliveryStatus.DELIVERED;
        this.actualDelivery = LocalDateTime.now();
    }

    public boolean isCompleted() {
        return this.status == DeliveryStatus.DELIVERED;
    }
}
