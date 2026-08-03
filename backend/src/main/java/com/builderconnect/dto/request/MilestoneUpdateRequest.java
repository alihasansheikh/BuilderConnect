package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneUpdateRequest {

    @NotBlank(message = "Message is required")
    private String message;

    private String updateType; // PROGRESS, NOTE, ISSUE, PHOTO, COMPLETION_REQUEST

    private Integer progressPercentage; // 0-100

    private String attachments; // JSON array of URLs
}
