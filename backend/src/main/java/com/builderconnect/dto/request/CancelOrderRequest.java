package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for cancelling (buyer) or declining (supplier) a material order.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelOrderRequest {

    @NotBlank(message = "Reason is required")
    @Size(max = 500, message = "Reason must be at most 500 characters")
    private String reason;
}
