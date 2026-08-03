package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Certification / credential entry shown on a user's profile page.
 * Keyed on user_id so it applies to builders (and other roles later) without a schema change.
 */
@Entity
@Table(name = "certifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Certification extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "issuing_organization", length = 200)
    private String issuingOrganization;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "credential_id", length = 100)
    private String credentialId;

    @Column(name = "credential_url", length = 500)
    private String credentialUrl;

    @Column(name = "document_url", length = 500)
    private String documentUrl;
}
