package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for voting a review helpful or not helpful.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewVoteRequest {

    @NotNull(message = "helpful is required")
    private Boolean helpful;
}
