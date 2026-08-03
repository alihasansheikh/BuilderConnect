package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Tracks version history for contracts when changes are approved.
 */
@Entity
@Table(name = "contract_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "scope_of_work", columnDefinition = "TEXT")
    private String scopeOfWork;

    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    private String termsAndConditions;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "change_summary", columnDefinition = "TEXT")
    private String changeSummary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
