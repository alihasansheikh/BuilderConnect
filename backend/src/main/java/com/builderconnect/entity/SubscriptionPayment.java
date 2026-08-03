package com.builderconnect.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A paid Stripe Checkout session for a builder subscription period (30 days).
 * Written idempotently by both the webhook and the success-redirect confirm
 * path — {@code stripe_session_id} is UNIQUE and acts as the double-fire guard.
 */
@Entity
@Table(name = "subscription_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "builder_profile_id", nullable = false)
    private BuilderProfile builderProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(nullable = false, length = 20)
    private String tier; // BASIC, PROFESSIONAL, ENTERPRISE

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Builder.Default
    @Column(nullable = false, length = 3)
    private String currency = "PKR";

    @Column(name = "stripe_session_id", nullable = false, unique = true, length = 255)
    private String stripeSessionId;

    @Column(name = "stripe_payment_intent", length = 255)
    private String stripePaymentIntent;

    @Column(name = "paid_at", nullable = false)
    private LocalDateTime paidAt;

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
