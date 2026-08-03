export const TRADES = ['Masonry', 'Carpentry', 'Plumbing', 'Electrical', 'Painting', 'Roofing',
  'Flooring', 'Tiling', 'HVAC', 'Welding', 'Drywall', 'Landscaping', 'Excavation', 'Concrete',
  'Waterproofing', 'Glass & Aluminium', 'General Contractor', 'Other'] as const

export const PROPERTY_TYPES = ['House', 'Apartment/Flat', 'Commercial Building', 'Shop/Retail',
  'Office', 'Warehouse', 'Industrial', 'Plot/Land', 'Farmhouse', 'Other'] as const

export const AREA_UNITS = [
  { value: 'MARLA', label: 'Marla' },
  { value: 'KANAL', label: 'Kanal' },
  { value: 'SQ_YARD', label: 'Sq Yard (Gaz)' },
  { value: 'SQ_FT', label: 'Sq Ft' },
] as const
export type AreaUnit = typeof AREA_UNITS[number]['value']

export const AREA_UNIT_TO_SQFT: Record<AreaUnit, number> =
  { MARLA: 225, KANAL: 4500, SQ_YARD: 9, SQ_FT: 1 }
export const toSqFt = (value: string | number, unit: AreaUnit): number =>
  Math.round((Number(value) || 0) * AREA_UNIT_TO_SQFT[unit])

export const BUDGET_TYPES = [
  { value: 'FIXED_RANGE', label: 'Fixed range (min / max)' },
  { value: 'OPEN_TO_QUOTES', label: 'Open to quotes' },
] as const
export type BudgetType = typeof BUDGET_TYPES[number]['value']

export const MATERIALS_PROVIDED_BY = [
  { value: 'CLIENT', label: "I'll provide the materials" },
  { value: 'CONTRACTOR', label: 'Contractor provides materials' },
  { value: 'DECIDE_LATER', label: 'Decide later' },
] as const

export const STRUCTURE_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor / Needs major work'] as const

// Province -> cities.
export const PROVINCE_CITIES: Record<string, string[]> = {
  'Punjab': ['Lahore', 'Rawalpindi', 'Faisalabad', 'Multan', 'Gujranwala', 'Sialkot'],
  'Sindh': ['Karachi'],
  'Islamabad Capital Territory': ['Islamabad'],
  'Khyber Pakhtunkhwa': ['Peshawar'],
  'Balochistan': ['Quetta'],
}
export const PROVINCES = Object.keys(PROVINCE_CITIES)
