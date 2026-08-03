-- V34: Drop the retired Payment/Invoice/Escrow/Payout tables.
-- Syntax targets H2 (MODE=MySQL) like V29. On real MySQL, replace the CASCADE drops with
-- explicit ALTER TABLE ... DROP FOREIGN KEY <name> using information_schema lookups.

-- 1) Named FK from a SURVIVING table into the subsystem (V4:165-167).
--    Column milestones.payment_transaction_id stays (mapped at Milestone.java:86).
ALTER TABLE milestones DROP CONSTRAINT IF EXISTS fk_milestone_payment_tx;

-- 2) Drop tables children -> parents.
DROP TABLE IF EXISTS builder_payouts;              -- FKs only to users (V4:262); no Java entity
DROP TABLE IF EXISTS invoices;                      -- outgoing FK payment_id -> payments dies with the table
DROP TABLE IF EXISTS payments CASCADE;              -- CASCADE removes the inbound FKs:
                                                    --   escrow_transactions.fk_escrow_tx_payment (V4:170-172, breaks the cycle)
                                                    --   material_orders.payment_id unnamed FK (V7:153)
DROP TABLE IF EXISTS escrow_transactions CASCADE;   -- belt-and-braces for any residual reference
DROP TABLE IF EXISTS escrow_accounts;

-- 3) Orphan column cleanup (only columns NOT mapped by any surviving Java entity).
ALTER TABLE material_orders DROP COLUMN IF EXISTS payment_id;   -- verified unmapped in MaterialOrder.java

-- 4) Dead system setting seeded by V9:293.
DELETE FROM system_settings WHERE setting_key = 'escrow_release_delay_hours';
