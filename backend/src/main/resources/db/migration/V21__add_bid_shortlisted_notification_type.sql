-- V21: Add BID_SHORTLISTED to notification_type
-- H2 does not support ALTER COLUMN to add values to an ENUM type.
-- Convert notification_type from ENUM to VARCHAR to support all Java enum values.
ALTER TABLE notifications ALTER COLUMN notification_type VARCHAR(50) NOT NULL;
