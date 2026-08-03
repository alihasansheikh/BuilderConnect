package com.builderconnect.dto.response;

import com.builderconnect.entity.Bid;
import com.builderconnect.util.JsonUtils;
import com.builderconnect.enums.BidStatus;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * DTO for bid response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BidResponse {

    private Long id;
    private String bidNumber;
    private Long projectId;
    private String projectTitle;
    private String projectCity;
    private String projectPropertyType;
    private BigDecimal projectAreaValue;
    private String projectAreaUnit;
    private BigDecimal projectBudgetMin;
    private BigDecimal projectBudgetMax;
    private BigDecimal amount;
    private String proposal;
    private String workPlan;
    private Integer estimatedDurationDays;
    private BigDecimal laborCost;
    private BigDecimal materialCost;
    private BigDecimal otherCost;
    private String costBreakdown;
    private List<String> attachments;
    private BidStatus status;
    private String clientNotes;
    private String rejectionReason;
    private LocalDate validUntil;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime rejectedAt;
    private LocalDateTime withdrawnAt;
    private LocalDateTime createdAt;

    // Builder info
    private Long builderId;
    private String builderName;
    private String builderCompanyName;
    private Double builderRating;
    private String builderProfileImageUrl;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static BidResponse fromEntity(Bid bid) {
        BidResponseBuilder builder = BidResponse.builder()
            .id(bid.getId())
            .bidNumber(bid.getBidNumber())
            .amount(bid.getAmount())
            .proposal(bid.getProposal())
            .workPlan(bid.getWorkPlan())
            .estimatedDurationDays(bid.getEstimatedDurationDays())
            .laborCost(bid.getLaborCost())
            .materialCost(bid.getMaterialCost())
            .otherCost(bid.getOtherCost())
            .costBreakdown(bid.getCostBreakdown())
            .attachments(parseJsonArray(bid.getAttachments()))
            .status(bid.getStatus())
            .clientNotes(bid.getClientNotes())
            .rejectionReason(bid.getRejectionReason())
            .validUntil(bid.getValidUntil())
            .submittedAt(bid.getSubmittedAt())
            .reviewedAt(bid.getReviewedAt())
            .acceptedAt(bid.getAcceptedAt())
            .rejectedAt(bid.getRejectedAt())
            .withdrawnAt(bid.getWithdrawnAt())
            .createdAt(bid.getCreatedAt());

        if (bid.getProject() != null) {
            builder.projectId(bid.getProject().getId());
            builder.projectTitle(bid.getProject().getTitle());
            builder.projectCity(bid.getProject().getCity());
            builder.projectPropertyType(bid.getProject().getPropertyType());
            builder.projectAreaValue(bid.getProject().getAreaValue());
            builder.projectAreaUnit(bid.getProject().getAreaUnit());
            builder.projectBudgetMin(bid.getProject().getBudgetMin());
            builder.projectBudgetMax(bid.getProject().getBudgetMax());
        }

        if (bid.getBuilder() != null) {
            builder.builderId(bid.getBuilder().getId());
            builder.builderName(bid.getBuilder().getName());
            builder.builderProfileImageUrl(bid.getBuilder().getProfileImageUrl());
            if (bid.getBuilder().getBuilderProfile() != null) {
                builder.builderCompanyName(bid.getBuilder().getBuilderProfile().getCompanyName());
                if (bid.getBuilder().getBuilderProfile().getAverageRating() != null) {
                    builder.builderRating(bid.getBuilder().getBuilderProfile().getAverageRating().doubleValue());
                }
            }
        }

        return builder.build();
    }

    public static BidResponse summaryFromEntity(Bid bid) {
        BidResponseBuilder builder = BidResponse.builder()
            .id(bid.getId())
            .bidNumber(bid.getBidNumber())
            .amount(bid.getAmount())
            .estimatedDurationDays(bid.getEstimatedDurationDays())
            .status(bid.getStatus())
            .submittedAt(bid.getSubmittedAt())
            .createdAt(bid.getCreatedAt());

        if (bid.getBuilder() != null) {
            builder.builderId(bid.getBuilder().getId());
            builder.builderName(bid.getBuilder().getName());
            builder.builderProfileImageUrl(bid.getBuilder().getProfileImageUrl());
            if (bid.getBuilder().getBuilderProfile() != null) {
                builder.builderCompanyName(bid.getBuilder().getBuilderProfile().getCompanyName());
                if (bid.getBuilder().getBuilderProfile().getAverageRating() != null) {
                    builder.builderRating(bid.getBuilder().getBuilderProfile().getAverageRating().doubleValue());
                }
            }
        }

        return builder.build();
    }

    private static List<String> parseJsonArray(String json) {
        // Delegates to the shared helper, which also unwraps the double-encoded form these
        // JSON columns read back as (a single parse silently returned an empty list).
        return JsonUtils.parseStringArray(json);
    }
}
