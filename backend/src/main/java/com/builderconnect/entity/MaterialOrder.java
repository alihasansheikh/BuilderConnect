package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Formula;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Material order entity for tracking material purchases.
 */
@Entity
@Table(name = "material_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialOrder extends BaseEntity {

    public enum OrderStatus {
        DRAFT, PENDING_CONFIRMATION, CONFIRMED, PROCESSING, READY_FOR_DELIVERY,
        OUT_FOR_DELIVERY, DELIVERED, PARTIALLY_DELIVERED, CANCELLED, RETURNED
    }

    public enum PaymentStatus {
        PENDING, PARTIAL, PAID, REFUNDED
    }

    /**
     * Legal order status transitions. CANCELLED and RETURNED are terminal.
     * OUT_FOR_DELIVERY/PARTIALLY_DELIVERED -> CANCELLED is the failed-delivery
     * escape hatch — the service only allows it when every delivery row has
     * failed or been returned.
     */
    public static final Map<OrderStatus, Set<OrderStatus>> LEGAL_TRANSITIONS = Map.of(
            OrderStatus.DRAFT, Set.of(OrderStatus.PENDING_CONFIRMATION, OrderStatus.CANCELLED),
            OrderStatus.PENDING_CONFIRMATION, Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.PROCESSING, OrderStatus.READY_FOR_DELIVERY,
                    OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED),
            OrderStatus.PROCESSING, Set.of(OrderStatus.READY_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED),
            OrderStatus.READY_FOR_DELIVERY, Set.of(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED),
            OrderStatus.OUT_FOR_DELIVERY, Set.of(OrderStatus.DELIVERED, OrderStatus.PARTIALLY_DELIVERED, OrderStatus.CANCELLED),
            OrderStatus.PARTIALLY_DELIVERED, Set.of(OrderStatus.DELIVERED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED),
            OrderStatus.DELIVERED, Set.of(OrderStatus.RETURNED)
    );

    @Column(name = "order_number", nullable = false, unique = true, length = 20)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private User supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User orderedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private OrderStatus status = OrderStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Builder.Default
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "tax_amount", precision = 15, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "delivery_fee", precision = 15, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "delivery_address", nullable = false, columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "delivery_city", nullable = false, length = 100)
    private String deliveryCity;

    @Column(name = "delivery_contact_name", length = 100)
    private String deliveryContactName;

    @Column(name = "delivery_contact_phone", length = 20)
    private String deliveryContactPhone;

    @Column(name = "delivery_instructions", columnDefinition = "TEXT")
    private String deliveryInstructions;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "supplier_notes", columnDefinition = "TEXT")
    private String supplierNotes;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancelled_by")
    private Long cancelledBy;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "requested_delivery_date")
    private LocalDate deliveryDate;

    @Column(name = "buyer_notes", columnDefinition = "TEXT")
    private String notes;

    /** Line-item count computed in the row select, so list views never touch the lazy items. */
    @Formula("(select count(*) from material_order_items i where i.order_id = id)")
    private Integer itemCount;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MaterialOrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Delivery> deliveries = new ArrayList<>();

    // Helper methods

    public void recalculateTotals() {
        this.subtotal = items.stream()
                .map(MaterialOrderItem::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        this.totalAmount = this.subtotal
                .add(this.taxAmount != null ? this.taxAmount : BigDecimal.ZERO)
                .add(this.deliveryFee != null ? this.deliveryFee : BigDecimal.ZERO);
    }

    public void confirm() {
        this.status = OrderStatus.CONFIRMED;
    }

    public boolean canTransitionTo(OrderStatus target) {
        return LEGAL_TRANSITIONS.getOrDefault(this.status, Set.of()).contains(target);
    }

    public void cancel(Long byUserId, String reason) {
        this.status = OrderStatus.CANCELLED;
        this.cancelledAt = LocalDateTime.now();
        this.cancelledBy = byUserId;
        this.cancellationReason = reason;
    }

    public boolean isCancellable() {
        return this.status == OrderStatus.DRAFT ||
               this.status == OrderStatus.PENDING_CONFIRMATION;
    }
}
