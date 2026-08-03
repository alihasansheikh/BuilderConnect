package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Reference table for subscription plans available to builders.
 */
@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(nullable = false, unique = true, length = 20)
    private String tier; // FREE, BASIC, PROFESSIONAL, ENTERPRISE

    @Builder.Default
    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "billing_cycle", nullable = false, length = 20)
    @Builder.Default
    private String billingCycle = "MONTHLY";

    @Column(name = "lead_credits_per_month", nullable = false)
    @Builder.Default
    private Integer leadCreditsPerMonth = 5;

    @Column(name = "max_active_bids", nullable = false)
    @Builder.Default
    private Integer maxActiveBids = 3;

    @Column(name = "max_portfolio_images", nullable = false)
    @Builder.Default
    private Integer maxPortfolioImages = 5;

    @Column(name = "featured_listing", nullable = false)
    @Builder.Default
    private Boolean featuredListing = false;

    @Column(name = "priority_support", nullable = false)
    @Builder.Default
    private Boolean prioritySupport = false;

    @Column(name = "analytics_access", nullable = false)
    @Builder.Default
    private Boolean analyticsAccess = false;

    @Column(name = "badge_label", length = 50)
    private String badgeLabel;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
