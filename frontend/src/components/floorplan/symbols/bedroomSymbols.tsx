import { Circle, Group, Line, Rect } from 'react-konva'
import { ACCENT, FILL, HAIRLINE, STROKE, SW, type SymbolProps } from './common'

/** Double bed, headboard along the top edge. */
export function Bed({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={Math.min(w, h) * 0.06} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Rect x={0} y={0} width={w} height={h * 0.13} cornerRadius={2} fill={ACCENT} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Rect x={w * 0.07} y={h * 0.17} width={w * 0.38} height={h * 0.15} cornerRadius={3} fill="#ffffff" stroke={STROKE} strokeWidth={HAIRLINE} />
      <Rect x={w * 0.55} y={h * 0.17} width={w * 0.38} height={h * 0.15} cornerRadius={3} fill="#ffffff" stroke={STROKE} strokeWidth={HAIRLINE} />
      <Line points={[w * 0.04, h * 0.44, w * 0.96, h * 0.44]} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}

/** Wardrobe / closet, sliding-door line with two handles. */
export function Wardrobe({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Line points={[w / 2, 0, w / 2, h]} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w * 0.44} y={h / 2} radius={Math.min(w, h) * 0.06} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w * 0.56} y={h / 2} radius={Math.min(w, h) * 0.06} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}

/** Bedside table with a small lamp. */
export function SideTable({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={2} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Circle x={w / 2} y={h / 2} radius={Math.min(w, h) * 0.22} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}
