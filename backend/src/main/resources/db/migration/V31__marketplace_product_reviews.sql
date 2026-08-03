-- V31: Product marketplace reviews
-- Product reviews: link a review directly to a material
ALTER TABLE reviews ADD COLUMN material_id BIGINT NULL;
ALTER TABLE reviews ADD CONSTRAINT fk_review_material
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE;
CREATE INDEX idx_review_material ON reviews(material_id);

-- Supplier profile review counter (running-average denominator)
ALTER TABLE supplier_profiles ADD COLUMN total_reviews INT NOT NULL DEFAULT 0;
