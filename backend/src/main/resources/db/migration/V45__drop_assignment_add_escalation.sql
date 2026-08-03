-- V45: Support/admin split — remove ticket & dispute assignment (agents work,
-- admins oversee) and add an escalation flag on tickets.
-- Append-only: the V16 seed INSERTs into assigned_to/assigned_mediator/assigned_at
-- ran earlier while those columns still existed, so dropping them now is safe.

-- Support tickets: drop assignment, add escalation flag
ALTER TABLE support_tickets DROP COLUMN assigned_to;
ALTER TABLE support_tickets DROP COLUMN assigned_at;
ALTER TABLE support_tickets ADD COLUMN escalated BOOLEAN NOT NULL DEFAULT FALSE;

-- Disputes: drop mediator assignment
ALTER TABLE disputes DROP COLUMN assigned_mediator;
ALTER TABLE disputes DROP COLUMN assigned_at;
