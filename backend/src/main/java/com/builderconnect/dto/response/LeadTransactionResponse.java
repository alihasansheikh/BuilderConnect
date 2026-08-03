package com.builderconnect.dto.response;

import com.builderconnect.entity.LeadTransaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadTransactionResponse {

    private Long id;
    private String transactionType;
    private Integer amount;
    private Integer balanceAfter;
    private String referenceType;
    private Long referenceId;
    private String description;
    private LocalDateTime createdAt;

    public static LeadTransactionResponse fromEntity(LeadTransaction tx) {
        return LeadTransactionResponse.builder()
                .id(tx.getId())
                .transactionType(tx.getTransactionType().name())
                .amount(tx.getAmount())
                .balanceAfter(tx.getBalanceAfter())
                .referenceType(tx.getReferenceType())
                .referenceId(tx.getReferenceId())
                .description(tx.getDescription())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
