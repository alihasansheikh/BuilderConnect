package com.builderconnect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of checking whether the current user has reviewed a project.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectReviewCheckResponse {

    private boolean hasReviewed;
    private ReviewResponse review;
}
