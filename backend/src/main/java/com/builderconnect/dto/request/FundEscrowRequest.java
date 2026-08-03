package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FundEscrowRequest {

    @NotNull(message = "Project ID is required")
    private Long projectId;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    private BigDecimal amount;

    /**
     * Optional milestone this deposit is earmarked for. When present, the milestone must belong
     * to the project and the escrow transaction is stamped with the milestone title.
     */
    private Long milestoneId;
}
