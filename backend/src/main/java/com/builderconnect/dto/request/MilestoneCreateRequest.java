package com.builderconnect.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request body for a builder creating or editing a milestone in the project schedule.
 * Used by POST /v1/projects/{projectId}/milestones and PUT /v1/milestones/{id}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneCreateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @Size(max = 2000, message = "Description must be at most 2000 characters")
    private String description;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.0", message = "Amount must be at least Rs 1")
    private BigDecimal amount;

    private LocalDate dueDate;
}
