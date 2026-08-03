package com.builderconnect.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request payload for creating/updating a profile certification.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificationRequest {

    @NotBlank(message = "Certification name is required")
    @Size(max = 200, message = "Name must not exceed 200 characters")
    private String name;

    @Size(max = 200, message = "Issuing organization must not exceed 200 characters")
    private String issuingOrganization;

    private LocalDate issueDate;

    private LocalDate expiryDate;

    @Size(max = 100, message = "Credential ID must not exceed 100 characters")
    private String credentialId;

    @Size(max = 500, message = "Credential URL must not exceed 500 characters")
    private String credentialUrl;

    @Size(max = 500, message = "Document URL must not exceed 500 characters")
    private String documentUrl;
}
