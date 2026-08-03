import { Circle, Group, Line, Rect } from 'react-konva'
import { FILL, HAIRLINE, STROKE, SW, type SymbolProps } from './common'

/** Kitchen counter run — worktop with a front edge line. */
export function KitchenCounter({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} fill="#eef1f6" stroke={STROKE} strokeWidth={SW} />
      <Line points={[0, h, w, h]} stroke={STROKE} strokeWidth={SW} />
    </Group>
  )
}

/** Cooking range with four burners. */
export function Stove({ w, h }: SymbolProps) {
  const r = Math.min(w, h) * 0.16
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={2} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Circle x={w * 0.3} y={h * 0.3} radius={r} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w * 0.7} y={h * 0.3} radius={r} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w * 0.3} y={h * 0.7} radius={r} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w * 0.7} y={h * 0.7} radius={r} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}

/** Refrigerator with a freezer divider and handle. */
export function Fridge({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={2} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Line points={[0, h * 0.36, w, h * 0.36]} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Line points={[w * 0.82, h * 0.08, w * 0.82, h * 0.28]} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Line points={[w * 0.82, h * 0.46, w * 0.82, h * 0.86]} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}
