package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportTicketCreateRequest {

    @NotBlank(message = "Subject is required")
    @Size(max = 200, message = "Subject must be at most 200 characters")
    private String subject;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Category is required")
    private String category; // ACCOUNT, BILLING, PROJECT, PAYMENT, TECHNICAL, DISPUTE, VERIFICATION, FEEDBACK, OTHER

    private String priority; // LOW, NORMAL, HIGH, URGENT (defaults to NORMAL if not provided)

    private Long projectId;

    private Long orderId;
}
