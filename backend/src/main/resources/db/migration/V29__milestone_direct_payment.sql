-- =====================================================
-- V29: Direct milestone payment (escrow removed)
-- =====================================================
-- The escrow model (fund a pool → release per milestone) is gone. Payment is now a direct,
-- record-only act: the client marks a milestone PAID and attaches proof (image/PDF) of a payment
-- made outside the platform; the builder is notified and confirms receipt (→ CONFIRMED).
--
-- milestones.status is an ENUM; H2 (MySQL mode) can't add values to an ENUM in place, so — exactly
-- as V21 did for notification_type — convert it to VARCHAR(30). The Java MilestoneStatus enum
-- (now including PAID and CONFIRMED) is the source of truth for allowed values.
-- =====================================================

ALTER TABLE milestones ALTER COLUMN status VARCHAR(30) NOT NULL;

-- Payment record kept on the milestone itself (the client's proof + the two timestamps).
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS paid_at              DATETIME;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS payment_proof_url    VARCHAR(500);
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS payment_confirmed_at DATETIME;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS payment_note         VARCHAR(1000);
