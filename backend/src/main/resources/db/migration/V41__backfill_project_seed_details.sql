-- V41: Backfill wizard detail fields on the V10 seed projects so marketplace cards,
-- bid context lines, and the property-type/province filters have real data to show.
-- Values use only labels the frontend taxonomy renders (project-taxonomy.ts):
-- property_type 'House', area_unit MARLA/KANAL (MARLA = 225 sq ft, KANAL = 4500 sq ft),
-- structure_condition Excellent/Good/Fair or NULL.

-- PRJ-2026-00001 Kitchen Renovation in DHA (Karachi)
UPDATE projects SET
    property_type = 'House',
    area_value = 10,
    area_unit = 'MARLA',
    area_sq_ft = 2250,
    floors = 1,
    province = 'Sindh',
    location_area = 'DHA',
    structure_condition = 'Good',
    updated_at = CURRENT_TIMESTAMP
WHERE project_number = 'PRJ-2026-00001';

-- PRJ-2026-00002 Bathroom Upgrade (Karachi)
UPDATE projects SET
    property_type = 'House',
    area_value = 5,
    area_unit = 'MARLA',
    area_sq_ft = 1125,
    province = 'Sindh',
    structure_condition = 'Fair',
    updated_at = CURRENT_TIMESTAMP
WHERE project_number = 'PRJ-2026-00002';

-- PRJ-2026-00003 Full House Painting (Lahore)
UPDATE projects SET
    property_type = 'House',
    area_value = 1,
    area_unit = 'KANAL',
    area_sq_ft = 4500,
    province = 'Punjab',
    location_area = 'Gulberg',
    updated_at = CURRENT_TIMESTAMP
WHERE project_number = 'PRJ-2026-00003';

-- PRJ-2026-00004 New House Construction (Islamabad)
UPDATE projects SET
    property_type = 'House',
    area_value = 1,
    area_unit = 'KANAL',
    area_sq_ft = 4500,
    floors = 2,
    rooms = 5,
    province = 'Islamabad Capital Territory',
    updated_at = CURRENT_TIMESTAMP
WHERE project_number = 'PRJ-2026-00004';
