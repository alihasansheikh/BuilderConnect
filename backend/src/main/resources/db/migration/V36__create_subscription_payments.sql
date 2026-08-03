-- =====================================================
-- V36: Subscription payments — real Stripe builder billing
-- =====================================================
-- Local ledger of paid Stripe Checkout sessions (mode=payment, 30-day
-- periods). Written idempotently by BOTH the signature-verified webhook
-- and the success-redirect confirm endpoint: UNIQUE(stripe_session_id)
-- is the real double-fire guard (DataIntegrityViolationException is
-- caught as already-applied in StripeService).
-- Feeds admin revenue reporting (monthly buckets computed in Java —
-- no DATE_FORMAT in JPQL, keeps dev H2 happy).
-- H2 MODE=MySQL safe: separate CREATE INDEX statements, no ON UPDATE;
-- updated_at is maintained by the entity's @PreUpdate.
-- =====================================================

CREATE TABLE subscription_payments (
    id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
    builder_profile_id    BIGINT NOT NULL,
    user_id               BIGINT NOT NULL,
    plan_id               BIGINT NOT NULL,
    tier                  VARCHAR(20) NOT NULL,
    amount                DECIMAL(12,2) NOT NULL,
    currency              VARCHAR(3) NOT NULL DEFAULT 'PKR',
    stripe_session_id     VARCHAR(255) NOT NULL,
    stripe_payment_intent VARCHAR(255) NULL,
    paid_at               TIMESTAMP NOT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_subpay_session UNIQUE (stripe_session_id),
    CONSTRAINT fk_subpay_profile FOREIGN KEY (builder_profile_id) REFERENCES builder_profiles(id),
    CONSTRAINT fk_subpay_user    FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_subpay_plan    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX idx_subpay_paid_at ON subscription_payments(paid_at);
CREATE INDEX idx_subpay_tier ON subscription_payments(tier);
