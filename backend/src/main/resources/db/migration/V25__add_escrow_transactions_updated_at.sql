-- V25: Add missing updated_at column to escrow_transactions
-- =========================================================
-- The EscrowTransaction entity extends BaseEntity (which maps an updated_at
-- column), but V4 created escrow_transactions without it and V23 skipped this
-- table. Without the column, JPA inserts fail at runtime (dev, ddl-auto: none)
-- and schema validation fails at startup (prod, ddl-auto: validate).
-- This completes updated_at coverage for every audited table except user_badges
-- (whose entity does not extend BaseEntity).

ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
