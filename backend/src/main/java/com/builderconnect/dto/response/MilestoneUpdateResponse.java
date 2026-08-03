package com.builderconnect.dto.response;

import com.builderconnect.entity.MilestoneUpdate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneUpdateResponse {

    private Long id;
    private Long milestoneId;
    private String updateType;
    private String message;
    private Integer progressPercentage;
    private String attachments;
    private UserResponse createdBy;
    private LocalDateTime createdAt;

    public static MilestoneUpdateResponse fromEntity(MilestoneUpdate update) {
        return MilestoneUpdateResponse.builder()
                .id(update.getId())
                .milestoneId(update.getMilestone().getId())
                .updateType(update.getUpdateType().name())
                .message(update.getMessage())
                .progressPercentage(update.getProgressPercentage())
                .attachments(update.getAttachments())
                .createdBy(UserResponse.basicFromEntity(update.getCreatedBy()))
                .createdAt(update.getCreatedAt())
                .build();
    }
}
