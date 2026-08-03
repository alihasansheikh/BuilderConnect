package com.builderconnect.dto.response;

import com.builderconnect.entity.Contract;
import com.builderconnect.enums.ContractStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for contract response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractResponse {

    private Long id;
    private String contractNumber;
    private Long projectId;
    private String projectTitle;
    private ContractStatus status;

    // Parties
    private UserResponse client;
    private UserResponse builder;

    // Terms
    private BigDecimal totalAmount;
    private String paymentTerms;
    private String scopeOfWork;
    private String termsAndConditions;
    private String specialClauses;

    // Timeline
    private LocalDate startDate;
    private LocalDate endDate;

    // Signatures
    private LocalDateTime clientSignedAt;
    private LocalDateTime builderSignedAt;
    private boolean fullySigned;

    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ContractResponse fromEntity(Contract contract) {
        return ContractResponse.builder()
            .id(contract.getId())
            .contractNumber(contract.getContractNumber())
            .projectId(contract.getProject().getId())
            .projectTitle(contract.getProject().getTitle())
            .status(contract.getStatus())
            .client(contract.getClient() != null ? UserResponse.basicFromEntity(contract.getClient()) : null)
            .builder(contract.getBuilder() != null ? UserResponse.basicFromEntity(contract.getBuilder()) : null)
            .totalAmount(contract.getTotalAmount())
            .paymentTerms(contract.getPaymentTerms())
            .scopeOfWork(contract.getScopeOfWork())
            .termsAndConditions(contract.getTermsAndConditions())
            .specialClauses(contract.getSpecialClauses())
            .startDate(contract.getStartDate())
            .endDate(contract.getEndDate())
            .clientSignedAt(contract.getClientSignedAt())
            .builderSignedAt(contract.getBuilderSignedAt())
            .fullySigned(contract.isFullySigned())
            .createdAt(contract.getCreatedAt())
            .updatedAt(contract.getUpdatedAt())
            .build();
    }
}
