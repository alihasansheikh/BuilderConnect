package com.builderconnect.dto.response;

import com.builderconnect.entity.Certification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response shape for a profile certification (matches the frontend Certification type).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificationResponse {

    private Long id;
    private Long userId;
    private String name;
    private String issuingOrganization;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    private String credentialId;
    private String credentialUrl;
    private String documentUrl;
    private LocalDateTime createdAt;

    public static CertificationResponse fromEntity(Certification certification) {
        return CertificationResponse.builder()
                .id(certification.getId())
                .userId(certification.getUserId())
                .name(certification.getName())
                .issuingOrganization(certification.getIssuingOrganization())
                .issueDate(certification.getIssueDate())
                .expiryDate(certification.getExpiryDate())
                .credentialId(certification.getCredentialId())
                .credentialUrl(certification.getCredentialUrl())
                .documentUrl(certification.getDocumentUrl())
                .createdAt(certification.getCreatedAt())
                .build();
    }
}
