-- V27: Create-Project wizard redesign (Pakistan taxonomy).
-- Adds remaining wizard columns to `projects` and re-seeds `project_categories`.

-- 1. New project columns (project_type/area_sq_ft already in V26).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS property_type          VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS province               VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_area          VARCHAR(150);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS area_value             DECIMAL(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS area_unit              VARCHAR(20);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS floors                 INT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rooms                  INT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS units                  INT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS materials_provided_by  VARCHAR(20);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_type            VARCHAR(20) DEFAULT 'FIXED_RANGE';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS structure_condition    VARCHAR(30);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS preferred_start_date   DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS verified_builders_only BOOLEAN DEFAULT FALSE;

-- 2. Re-seed project_categories to the project-nature taxonomy.
-- Re-point seed projects referencing categories about to be removed (11=Kitchen,12=Bathroom -> Renovation),
-- refresh denormalized name for id 6 (renamed to Interior Finishing).
UPDATE projects SET category_id = 2, category_name = 'Renovation' WHERE category_id IN (11, 12);
UPDATE projects SET category_name = 'Interior Finishing' WHERE category_id = 6;

-- Rename the 8 surviving rows in place.
UPDATE project_categories SET name='New Construction',   slug='new-construction',   description='Building a new structure from the ground up',            icon='building',     display_order=1, updated_at=CURRENT_TIMESTAMP WHERE id=1;
UPDATE project_categories SET name='Renovation',         slug='renovation',         description='Remodeling or upgrading an existing structure',         icon='hammer',       display_order=2, updated_at=CURRENT_TIMESTAMP WHERE id=2;
UPDATE project_categories SET name='Repair',             slug='repair',             description='Fixing damaged or faulty elements of a structure',      icon='wrench',       display_order=3, updated_at=CURRENT_TIMESTAMP WHERE id=3;
UPDATE project_categories SET name='Extension/Addition', slug='extension-addition', description='Adding area, rooms or floors to an existing structure', icon='plus-square',  display_order=4, updated_at=CURRENT_TIMESTAMP WHERE id=4;
UPDATE project_categories SET name='Demolition',         slug='demolition',         description='Tearing down all or part of an existing structure',     icon='trash-2',      display_order=5, updated_at=CURRENT_TIMESTAMP WHERE id=5;
UPDATE project_categories SET name='Interior Finishing', slug='interior-finishing', description='Interior finishing: paint, plaster, fixtures, decor',   icon='paint-roller', display_order=6, updated_at=CURRENT_TIMESTAMP WHERE id=6;
UPDATE project_categories SET name='Maintenance',        slug='maintenance',        description='Ongoing upkeep and preventive maintenance',             icon='settings',     display_order=7, updated_at=CURRENT_TIMESTAMP WHERE id=7;
UPDATE project_categories SET name='Fit-out',            slug='fit-out',            description='Fitting out a shell space for occupancy or use',        icon='layout',       display_order=8, updated_at=CURRENT_TIMESTAMP WHERE id=8;

-- Remove now-unreferenced legacy rows (Landscaping, HVAC, Kitchen, Bathroom, etc.).
DELETE FROM project_categories WHERE id > 8;
