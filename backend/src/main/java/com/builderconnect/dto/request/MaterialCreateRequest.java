package com.builderconnect.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialCreateRequest {

    @NotBlank(message = "Material name is required")
    @Size(max = 200, message = "Name must be at most 200 characters")
    private String name;

    private String description;

    @NotBlank(message = "SKU is required")
    @Size(max = 50, message = "SKU must be at most 50 characters")
    private String sku;

    @Size(max = 100, message = "Brand must be at most 100 characters")
    private String brand;

    @NotBlank(message = "Unit is required")
    @Size(max = 50, message = "Unit must be at most 50 characters")
    private String unit;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.01", message = "Unit price must be greater than 0")
    private BigDecimal unitPrice;

    @Min(value = 1, message = "Minimum order quantity must be at least 1")
    private Integer minOrderQuantity;

    @Min(value = 0, message = "Stock quantity cannot be negative")
    private Integer stockQuantity;

    private Long categoryId;

    private String images;

    private String specifications;
}
