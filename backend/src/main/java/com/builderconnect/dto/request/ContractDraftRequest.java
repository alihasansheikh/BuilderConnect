package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for a builder authoring or editing the project contract.
 * The contract total is NEVER taken from this request — it is server-set
 * from the awarded bid amount (project.finalBudget).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractDraftRequest {

    @NotBlank(message = "Scope of work is required")
    @Size(max = 5000, message = "Scope of work must not exceed 5000 characters")
    private String scopeOfWork;

    @NotBlank(message = "Payment terms are required")
    @Size(max = 5000, message = "Payment terms must not exceed 5000 characters")
    private String paymentTerms;

    @Size(max = 10000, message = "Terms and conditions must not exceed 10000 characters")
    private String termsAndConditions;

    @Size(max = 5000, message = "Special clauses must not exceed 5000 characters")
    private String specialClauses;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;
}
