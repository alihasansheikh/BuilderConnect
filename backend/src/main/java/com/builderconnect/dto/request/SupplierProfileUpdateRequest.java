package com.builderconnect.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request body for a supplier updating their own profile.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierProfileUpdateRequest {

    @NotBlank(message = "Company name is required")
    @Size(max = 200, message = "Company name must be at most 200 characters")
    private String companyName;

    private String description;

    @Size(max = 100, message = "Business registration number must be at most 100 characters")
    private String businessRegistrationNumber;

    @Size(max = 50, message = "Tax ID must be at most 50 characters")
    private String taxId;

    private List<String> categories;

    @Size(max = 500, message = "Warehouse address must be at most 500 characters")
    private String warehouseAddress;

    private List<String> deliveryAreas;

    @DecimalMin(value = "0", message = "Minimum order value cannot be negative")
    private BigDecimal minimumOrderValue;
}
