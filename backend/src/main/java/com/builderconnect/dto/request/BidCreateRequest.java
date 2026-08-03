package com.builderconnect.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO for bid creation request.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BidCreateRequest {

    @NotNull(message = "Project ID is required")
    private Long projectId;

    @NotNull(message = "Bid amount is required")
    @DecimalMin(value = "1000", message = "Bid amount must be at least 1000")
    private BigDecimal amount;

    @NotBlank(message = "Proposal is required")
    @Size(min = 100, max = 5000, message = "Proposal must be between 100 and 5000 characters")
    private String proposal;

    @Size(max = 5000, message = "Work plan must be less than 5000 characters")
    private String workPlan;

    @NotNull(message = "Estimated duration is required")
    @Min(value = 1, message = "Estimated duration must be at least 1 day")
    private Integer estimatedDurationDays;

    // Cost breakdown (optional)
    private BigDecimal laborCost;
    private BigDecimal materialCost;
    private BigDecimal otherCost;
    private String costBreakdownJson;

    // Attachments
    private List<String> attachmentUrls;

    // Validity
    @FutureOrPresent(message = "Valid until date must be in the future")
    private LocalDate validUntil;
}
