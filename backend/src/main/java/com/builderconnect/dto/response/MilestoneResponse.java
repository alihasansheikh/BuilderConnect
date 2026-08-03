package com.builderconnect.dto.response;

import com.builderconnect.entity.Milestone;
import com.builderconnect.enums.MilestoneStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for milestone response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneResponse {

    private Long id;
    private Long projectId;
    private String title;
    private String description;
    private Integer sequenceOrder;
    private BigDecimal paymentAmount;
    private BigDecimal paymentPercentage;
    private LocalDate startDate;
    private LocalDate dueDate;
    private LocalDateTime completedAt;
    private LocalDateTime approvedAt;
    private MilestoneStatus status;
    private Integer progressPercentage;
    private String deliverables;
    private String completionEvidence;
    private String rejectionReason;
    private LocalDateTime paymentReleasedAt;
    private LocalDateTime paidAt;
    private String paymentProofUrl;
    private LocalDateTime paymentConfirmedAt;
    private String paymentNote;
    private LocalDateTime createdAt;

    public static MilestoneResponse fromEntity(Milestone milestone) {
        return MilestoneResponse.builder()
            .id(milestone.getId())
            .projectId(milestone.getProject() != null ? milestone.getProject().getId() : null)
            .title(milestone.getTitle())
            .description(milestone.getDescription())
            .sequenceOrder(milestone.getSequenceOrder())
            .paymentAmount(milestone.getPaymentAmount())
            .paymentPercentage(milestone.getPaymentPercentage())
            .startDate(milestone.getStartDate())
            .dueDate(milestone.getDueDate())
            .completedAt(milestone.getCompletedAt())
            .approvedAt(milestone.getApprovedAt())
            .status(milestone.getStatus())
            .progressPercentage(milestone.getProgressPercentage())
            .deliverables(milestone.getDeliverables())
            .completionEvidence(milestone.getCompletionEvidence())
            .rejectionReason(milestone.getRejectionReason())
            .paymentReleasedAt(milestone.getPaymentReleasedAt())
            .paidAt(milestone.getPaidAt())
            .paymentProofUrl(milestone.getPaymentProofUrl())
            .paymentConfirmedAt(milestone.getPaymentConfirmedAt())
            .paymentNote(milestone.getPaymentNote())
            .createdAt(milestone.getCreatedAt())
            .build();
    }
}
