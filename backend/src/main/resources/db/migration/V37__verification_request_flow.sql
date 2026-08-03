-- =====================================================
-- V37: Verification request flow
-- =====================================================
-- Builders/suppliers explicitly request verification (optional documents);
-- admins approve or reject with a reason.
-- Status: UNSUBMITTED -> PENDING -> VERIFIED | REJECTED (REJECTED may resubmit).

ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'UNSUBMITTED';
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS verification_requested_at DATETIME NULL;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS verification_rejection_reason VARCHAR(500) NULL;

ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'UNSUBMITTED';
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS verification_requested_at DATETIME NULL;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS verification_rejection_reason VARCHAR(500) NULL;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS verification_documents JSON NULL;

UPDATE builder_profiles SET verification_status = 'VERIFIED' WHERE is_verified = TRUE;
UPDATE supplier_profiles SET verification_status = 'VERIFIED' WHERE is_verified = TRUE;
