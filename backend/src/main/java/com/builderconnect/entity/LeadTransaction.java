package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Tracks lead credit usage and acquisition for builders.
 */
@Entity
@Table(name = "lead_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeadTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "builder_profile_id", nullable = false)
    private BuilderProfile builderProfile;

    public enum TransactionType {
        CREDIT, DEBIT, BONUS, REFUND, SUBSCRIPTION_RENEWAL
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private TransactionType transactionType;

    @Column(nullable = false)
    private Integer amount;

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(name = "reference_type", length = 50)
    private String referenceType; // e.g. "BID", "SUBSCRIPTION", "PURCHASE"

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(length = 500)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
