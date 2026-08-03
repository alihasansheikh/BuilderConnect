package com.builderconnect.dto.response;

import com.builderconnect.entity.ChangeRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeRequestResponse {

    private Long id;
    private Long projectId;
    private String changeType;
    private String title;
    private String description;
    private String proposedValue;
    private String currentValue;
    private String status;
    private UserResponse requestedBy;
    private UserResponse reviewedBy;
    private LocalDateTime reviewedAt;
    private String rejectionReason;
    private LocalDateTime createdAt;

    public static ChangeRequestResponse fromEntity(ChangeRequest cr) {
        return ChangeRequestResponse.builder()
                .id(cr.getId())
                .projectId(cr.getProject().getId())
                .changeType(cr.getChangeType().name())
                .title(cr.getTitle())
                .description(cr.getDescription())
                .proposedValue(cr.getProposedValue())
                .currentValue(cr.getCurrentValue())
                .status(cr.getStatus().name())
                .requestedBy(UserResponse.basicFromEntity(cr.getRequestedBy()))
                .reviewedBy(cr.getReviewedBy() != null ? UserResponse.basicFromEntity(cr.getReviewedBy()) : null)
                .reviewedAt(cr.getReviewedAt())
                .rejectionReason(cr.getRejectionReason())
                .createdAt(cr.getCreatedAt())
                .build();
    }
}
