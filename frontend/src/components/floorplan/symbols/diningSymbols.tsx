import { Group, Rect } from 'react-konva'
import { FILL, HAIRLINE, STROKE, SW, type SymbolProps } from './common'

/** Dining table with a placemat inset. */
export function DiningTable({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={Math.min(w, h) * 0.12} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Rect x={w * 0.1} y={h * 0.14} width={w * 0.8} height={h * 0.72} cornerRadius={Math.min(w, h) * 0.08} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}

/** Single chair, backrest along the top edge. */
export function Chair({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={w * 0.08} y={h * 0.26} width={w * 0.84} height={h * 0.7} cornerRadius={2} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Rect x={0} y={0} width={w} height={h * 0.22} cornerRadius={2} fill={FILL} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}
