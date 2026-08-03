package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Material entity representing items in a supplier's catalog.
 */
@Entity
@Table(name = "materials")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Material extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private User supplier;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(length = 100)
    private String brand;

    @Column(name = "unit_of_measure", nullable = false, length = 50)
    private String unit;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Builder.Default
    @Column(name = "minimum_order_quantity")
    private Integer minOrderQuantity = 1;

    @Builder.Default
    @Column(name = "stock_quantity")
    private Integer stockQuantity = 0;

    @Builder.Default
    @Column(name = "is_in_stock")
    private Boolean isAvailable = true;

    @Column(columnDefinition = "JSON")
    private String images;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(columnDefinition = "JSON")
    private String specifications;

    @Builder.Default
    @Column(name = "is_featured")
    private Boolean isFeatured = false;

    @Builder.Default
    @Column(name = "average_rating", precision = 3, scale = 2)
    private BigDecimal averageRating = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_reviews")
    private Integer totalReviews = 0;

    @Builder.Default
    @Column(name = "total_orders")
    private Integer totalOrders = 0;

    public void updateRating(BigDecimal newRating) {
        // Weighted average calculation
        BigDecimal totalRatingSum = this.averageRating.multiply(BigDecimal.valueOf(this.totalReviews));
        this.totalReviews++;
        this.averageRating = totalRatingSum.add(newRating).divide(BigDecimal.valueOf(this.totalReviews), 2, java.math.RoundingMode.HALF_UP);
    }
}
