package com.builderconnect.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for submitting a product (material) review.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductReviewRequest {

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer overallRating;

    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @Size(max = 2000, message = "Comment must be at most 2000 characters")
    private String comment;
}
