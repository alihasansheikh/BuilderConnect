-- V26: Persist the project attributes the create wizard collects but the backend used to drop.
-- Before this, project_type and area_sq_ft were sent by the wizard and shown on the Review
-- step as "saved", but ProjectService never wrote them — a hallucination. These columns let
-- the data actually round-trip.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS area_sq_ft DECIMAL(12,2);
