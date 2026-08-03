package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisputeCreateRequest {

    /** Optional — the respondent is inferred as the project counterpart; when present it must match. */
    private Long filedAgainstId;

    private Long milestoneId;

    @NotNull(message = "Dispute type is required")
    private String disputeType; // PAYMENT, QUALITY, TIMELINE, SCOPE, COMMUNICATION, ABANDONMENT, OTHER

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    private String evidence; // JSON string

    private BigDecimal disputedAmount;
}
