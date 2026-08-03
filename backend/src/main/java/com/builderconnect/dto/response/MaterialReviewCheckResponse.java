package com.builderconnect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of checking whether the current user has (or can) review a material.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialReviewCheckResponse {

    private boolean hasReviewed;
    private boolean canReview;
    private ReviewResponse review;
}
