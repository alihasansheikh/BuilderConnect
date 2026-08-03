package com.builderconnect.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialOrderCreateRequest {

    /** Optional — orders may be standalone or attached to one of the buyer's projects. */
    private Long projectId;

    @NotNull(message = "Supplier ID is required")
    private Long supplierId;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<OrderItemRequest> items;

    @NotBlank(message = "Delivery address is required")
    private String deliveryAddress;

    @NotBlank(message = "Delivery city is required")
    private String deliveryCity;

    private String deliveryContactName;

    private String deliveryContactPhone;

    private String deliveryInstructions;

    private LocalDate deliveryDate;

    private String notes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {

        @NotNull(message = "Material ID is required")
        private Long materialId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        private String notes;
    }
}
