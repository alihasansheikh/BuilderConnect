package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Individual line item within a material order.
 */
@Entity
@Table(name = "material_order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialOrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private MaterialOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    // Product snapshot at time of order (NOT NULL in DB)
    @Column(name = "material_name", nullable = false, length = 200)
    private String materialName;

    @Column(name = "material_sku", nullable = false, length = 50)
    private String materialSku;

    @Column(name = "unit_of_measure", nullable = false, length = 50)
    private String unitOfMeasure;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPrice;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /**
     * Calculate total price from quantity and unit price.
     */
    public void calculateTotal() {
        this.totalPrice = this.unitPrice.multiply(BigDecimal.valueOf(this.quantity));
    }
}
