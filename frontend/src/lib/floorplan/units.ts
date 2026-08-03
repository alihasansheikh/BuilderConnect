/**
 * Unit conversions and canvas-fitting helpers for the Floor Plan Studio.
 * Everything downstream works in FEET; only the render layer converts to pixels.
 */

export const SQFT_PER_MARLA = 225
export const SQFT_PER_KANAL = 4500

export type PlotUnit = 'MARLA' | 'KANAL' | 'SQFT'

/** Clamp a value into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

/** Convert an entered plot size (Marla / Kanal / sq ft) to square feet. */
export function unitToSqft(value: number, unit: PlotUnit): number {
  switch (unit) {
    case 'MARLA':
      return value * SQFT_PER_MARLA
    case 'KANAL':
      return value * SQFT_PER_KANAL
    case 'SQFT':
      return value
  }
}

/**
 * Pixels-per-foot that fits a `plotWidthFt` x `plotLengthFt` plan inside a
 * `stageW` x `stageH` canvas, leaving `padding` px of margin on every side.
 */
export function fitScale(
  plotWidthFt: number,
  plotLengthFt: number,
  stageW: number,
  stageH: number,
  padding = 0,
): number {
  const usableW = Math.max(1, stageW - padding * 2)
  const usableH = Math.max(1, stageH - padding * 2)
  const safeW = plotWidthFt > 0 ? plotWidthFt : 1
  const safeL = plotLengthFt > 0 ? plotLengthFt : 1
  return Math.min(usableW / safeW, usableH / safeL)
}

/** Feet -> pixels at a given scale (px per foot). */
export function ftToPx(ft: number, scale: number): number {
  return ft * scale
}

/**
 * Render feet as an architectural dimension string, e.g. 12.5 -> `12'-6"`,
 * 10 -> `10'-0"`. Inches are rounded and carried into the foot on overflow.
 */
export function formatFeet(ft: number): string {
  const safe = Math.max(0, ft)
  let whole = Math.floor(safe)
  let inches = Math.round((safe - whole) * 12)
  if (inches === 12) {
    whole += 1
    inches = 0
  }
  return `${whole}'-${inches}"`
}

/** Render an area in whole square feet, e.g. 168.4 -> `168 sq ft`. */
export function formatSqft(area: number): string {
  return `${Math.round(Math.max(0, area))} sq ft`
}
