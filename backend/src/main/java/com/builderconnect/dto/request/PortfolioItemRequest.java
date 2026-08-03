package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for creating/updating a portfolio item.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioItemRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    private List<String> images;

    private BigDecimal projectCost;

    private Integer durationDays;

    private Integer year;

    @Size(max = 500, message = "External URL must not exceed 500 characters")
    private String externalUrl;
}
