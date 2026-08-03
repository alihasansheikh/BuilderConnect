import { COLORS } from '../palette'

/** Every furniture symbol draws canonical line-art into a local `w` x `h` box
 * with its "front/back" feature at the TOP; the dispatcher handles rotation. */
export interface SymbolProps {
  w: number
  h: number
}

export const STROKE = COLORS.furnitureStroke
export const FILL = COLORS.furnitureFill
export const FIXTURE_FILL = COLORS.fixtureFill
export const ACCENT = '#e6ebf5'

/** Base + hairline stroke widths in pixels (constant regardless of zoom). */
export const SW = 1.2
export const HAIRLINE = 0.9
