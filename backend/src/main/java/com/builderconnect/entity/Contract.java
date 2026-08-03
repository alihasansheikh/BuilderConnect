package com.builderconnect.entity;

import com.builderconnect.enums.ContractStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Contract entity representing legal agreements between client and builder.
 */
@Entity
@Table(name = "contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract extends BaseEntity {

    @Column(name = "contract_number", nullable = false, unique = true, length = 30)
    private String contractNumber;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "builder_id", nullable = false)
    private User builder;

    // Terms
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "payment_terms", columnDefinition = "TEXT")
    private String paymentTerms;

    @Column(name = "scope_of_work", columnDefinition = "TEXT")
    private String scopeOfWork;

    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    private String termsAndConditions;

    @Column(name = "special_clauses", columnDefinition = "TEXT")
    private String specialClauses;

    // Timeline
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ContractStatus status = ContractStatus.DRAFT;

    // Signatures
    @Column(name = "client_signed_at")
    private LocalDateTime clientSignedAt;

    @Column(name = "client_ip_address", length = 45)
    private String clientIpAddress;

    @Column(name = "builder_signed_at")
    private LocalDateTime builderSignedAt;

    @Column(name = "builder_ip_address", length = 45)
    private String builderIpAddress;

    // Document
    @Column(name = "document_url", length = 500)
    private String documentUrl;

    // Helper methods

    public void signByClient(String ipAddress) {
        if (this.clientSignedAt != null) {
            throw new IllegalStateException("Client has already signed this contract");
        }
        this.clientSignedAt = LocalDateTime.now();
        this.clientIpAddress = ipAddress;
        updateStatusAfterSignature();
    }

    public void signByBuilder(String ipAddress) {
        if (this.builderSignedAt != null) {
            throw new IllegalStateException("Builder has already signed this contract");
        }
        this.builderSignedAt = LocalDateTime.now();
        this.builderIpAddress = ipAddress;
        updateStatusAfterSignature();
    }

    private void updateStatusAfterSignature() {
        if (isFullySigned()) {
            this.status = ContractStatus.ACTIVE;
        } else if (this.clientSignedAt != null && this.builderSignedAt == null) {
            this.status = ContractStatus.PENDING_BUILDER;
        } else if (this.builderSignedAt != null && this.clientSignedAt == null) {
            this.status = ContractStatus.PENDING_CLIENT;
        }
    }

    public boolean isFullySigned() {
        return this.clientSignedAt != null && this.builderSignedAt != null;
    }

    public void complete() {
        this.status = ContractStatus.COMPLETED;
    }

    public void terminate() {
        this.status = ContractStatus.TERMINATED;
    }
}
