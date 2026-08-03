-- V35: COD payment timestamp for supplier revenue reporting.
ALTER TABLE material_orders ADD COLUMN IF NOT EXISTS paid_at DATETIME;
UPDATE material_orders SET paid_at = COALESCE(updated_at, created_at)
 WHERE payment_status = 'PAID' AND paid_at IS NULL;   -- backfill V32 marketplace seed rows
