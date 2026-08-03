package com.builderconnect.dto.response;

import com.builderconnect.entity.Material;
import com.builderconnect.entity.SupplierProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialResponse {

    private Long id;
    private String name;
    private String description;
    private String sku;
    private String brand;
    private String unit;
    private BigDecimal unitPrice;
    private Integer minOrderQuantity;
    private Integer stockQuantity;
    private Boolean isAvailable;
    private Long categoryId;
    private String images;
    private String thumbnailUrl;
    private String specifications;
    private BigDecimal averageRating;
    private Integer totalReviews;
    private Integer totalOrders;
    private Boolean isFeatured;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Supplier info
    private Long supplierId;
    private String supplierName;
    private Boolean supplierVerified;

    public static MaterialResponse fromEntity(Material material) {
        MaterialResponseBuilder builder = MaterialResponse.builder()
                .id(material.getId())
                .name(material.getName())
                .description(material.getDescription())
                .sku(material.getSku())
                .brand(material.getBrand())
                .unit(material.getUnit())
                .unitPrice(material.getUnitPrice())
                .minOrderQuantity(material.getMinOrderQuantity())
                .stockQuantity(material.getStockQuantity())
                .isAvailable(material.getIsAvailable())
                .categoryId(material.getCategoryId())
                .images(material.getImages())
                .thumbnailUrl(material.getThumbnailUrl())
                .specifications(material.getSpecifications())
                .averageRating(material.getAverageRating())
                .totalReviews(material.getTotalReviews())
                .totalOrders(material.getTotalOrders())
                .isFeatured(material.getIsFeatured())
                .createdAt(material.getCreatedAt())
                .updatedAt(material.getUpdatedAt());

        if (material.getSupplier() != null) {
            builder.supplierId(material.getSupplier().getId())
                    .supplierName(material.getSupplier().getName());

            SupplierProfile profile = material.getSupplier().getSupplierProfile();
            if (profile != null) {
                builder.supplierVerified(profile.getIsVerified());
            }
        }

        return builder.build();
    }
}
