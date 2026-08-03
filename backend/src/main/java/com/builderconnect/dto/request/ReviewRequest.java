package com.builderconnect.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewRequest {

    @NotNull(message = "Overall rating is required")
    @Min(1) @Max(5)
    private Integer overallRating;

    @Min(1) @Max(5)
    private Integer qualityRating;

    @Min(1) @Max(5)
    private Integer communicationRating;

    @Min(1) @Max(5)
    private Integer timelinessRating;

    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @Size(max = 5000, message = "Comment must be at most 5000 characters")
    private String comment;
}
