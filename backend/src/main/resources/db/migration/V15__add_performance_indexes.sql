-- Performance indexes for frequently queried columns

-- Payments: queried by status + type, payer + status, payee + status
CREATE INDEX IF NOT EXISTS idx_payments_status_type ON payments(status, payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_payer_status ON payments(payer_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_payee_status ON payments(payee_id, status);

-- Escrow transactions: queried by escrow account ordered by date
CREATE INDEX IF NOT EXISTS idx_escrow_tx_account_date ON escrow_transactions(escrow_account_id, created_at DESC);

-- Audit logs: queried by user, action_category, date
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(action_category, created_at DESC);

-- Notifications: queried by user + read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
