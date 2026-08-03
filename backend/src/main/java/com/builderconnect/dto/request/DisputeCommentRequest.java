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
public class DisputeCommentRequest {

    @NotBlank(message = "Comment is required")
    private String comment;

    private Boolean isInternal;
}
