-- V17: Add banner image URL to builder profiles
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS banner_image_url VARCHAR(500) NULL;
