package com.builderconnect.dto.response;

import com.builderconnect.entity.Dispute;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisputeResponse {

    private Long id;
    private String disputeNumber;
    private String disputeType;
    private String status;
    private String title;
    private String description;
    private String evidence;
    private BigDecimal disputedAmount;
    private BigDecimal resolutionAmount;
    private String resolutionType;
    private String resolutionDetails;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Project info
    private Long projectId;
    private String projectTitle;
    private String projectNumber;

    // Milestone info (optional)
    private Long milestoneId;
    private String milestoneTitle;

    // Filed by user info
    private Long filedById;
    private String filedByName;
    private String filedByRole;

    // Filed against user info
    private Long filedAgainstId;
    private String filedAgainstName;
    private String filedAgainstRole;

    // Comment count
    private long commentCount;

    public static DisputeResponse fromEntity(Dispute dispute) {
        return fromEntity(dispute, 0);
    }

    public static DisputeResponse fromEntity(Dispute dispute, long commentCount) {
        DisputeResponseBuilder builder = DisputeResponse.builder()
                .id(dispute.getId())
                .disputeNumber(dispute.getDisputeNumber())
                .disputeType(dispute.getDisputeType().name())
                .status(dispute.getStatus().name())
                .title(dispute.getTitle())
                .description(dispute.getDescription())
                .evidence(dispute.getEvidence())
                .disputedAmount(dispute.getDisputedAmount())
                .resolutionAmount(dispute.getResolutionAmount())
                .resolutionType(dispute.getResolutionType())
                .resolutionDetails(dispute.getResolutionDetails())
                .resolvedAt(dispute.getResolvedAt())
                .createdAt(dispute.getCreatedAt())
                .updatedAt(dispute.getUpdatedAt())
                .commentCount(commentCount);

        if (dispute.getProject() != null) {
            builder.projectId(dispute.getProject().getId())
                    .projectTitle(dispute.getProject().getTitle())
                    .projectNumber(dispute.getProject().getProjectNumber());
        }

        if (dispute.getMilestone() != null) {
            builder.milestoneId(dispute.getMilestone().getId())
                    .milestoneTitle(dispute.getMilestone().getTitle());
        }

        if (dispute.getFiledBy() != null) {
            builder.filedById(dispute.getFiledBy().getId())
                    .filedByName(dispute.getFiledBy().getName())
                    .filedByRole(dispute.getFiledBy().getRole().name());
        }

        if (dispute.getFiledAgainst() != null) {
            builder.filedAgainstId(dispute.getFiledAgainst().getId())
                    .filedAgainstName(dispute.getFiledAgainst().getName())
                    .filedAgainstRole(dispute.getFiledAgainst().getRole().name());
        }

        return builder.build();
    }
}
