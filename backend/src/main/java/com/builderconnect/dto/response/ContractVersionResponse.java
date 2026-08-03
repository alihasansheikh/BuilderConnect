package com.builderconnect.dto.response;

import com.builderconnect.entity.ContractVersion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractVersionResponse {

    private Long id;
    private Long contractId;
    private Integer versionNumber;
    private String scopeOfWork;
    private String termsAndConditions;
    private BigDecimal totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String changeSummary;
    private UserResponse createdBy;
    private LocalDateTime createdAt;

    public static ContractVersionResponse fromEntity(ContractVersion cv) {
        return ContractVersionResponse.builder()
                .id(cv.getId())
                .contractId(cv.getContract().getId())
                .versionNumber(cv.getVersionNumber())
                .scopeOfWork(cv.getScopeOfWork())
                .termsAndConditions(cv.getTermsAndConditions())
                .totalAmount(cv.getTotalAmount())
                .startDate(cv.getStartDate())
                .endDate(cv.getEndDate())
                .changeSummary(cv.getChangeSummary())
                .createdBy(cv.getCreatedBy() != null ? UserResponse.basicFromEntity(cv.getCreatedBy()) : null)
                .createdAt(cv.getCreatedAt())
                .build();
    }
}
