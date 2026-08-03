import { Circle, Ellipse, Group, Line, Rect } from 'react-konva'
import { FIXTURE_FILL, HAIRLINE, STROKE, SW, type SymbolProps } from './common'

/** Toilet, cistern along the top edge with the bowl below. */
export function Toilet({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={w * 0.15} y={0} width={w * 0.7} height={h * 0.28} cornerRadius={2} fill={FIXTURE_FILL} stroke={STROKE} strokeWidth={SW} />
      <Ellipse x={w / 2} y={h * 0.62} radiusX={w * 0.34} radiusY={h * 0.34} fill={FIXTURE_FILL} stroke={STROKE} strokeWidth={SW} />
    </Group>
  )
}

/** Wash basin set into a small counter. */
export function Sink({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={2} fill={FIXTURE_FILL} stroke={STROKE} strokeWidth={SW} />
      <Ellipse x={w / 2} y={h * 0.56} radiusX={w * 0.32} radiusY={h * 0.3} fill="#ffffff" stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w / 2} y={h * 0.16} radius={Math.min(w, h) * 0.06} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}

/** Bathtub with an inner basin and a drain. */
export function Bathtub({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={Math.min(w, h) * 0.16} fill={FIXTURE_FILL} stroke={STROKE} strokeWidth={SW} />
      <Rect x={w * 0.12} y={h * 0.12} width={w * 0.76} height={h * 0.76} cornerRadius={Math.min(w, h) * 0.12} fill="#ffffff" stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w / 2} y={h * 0.82} radius={Math.min(w, h) * 0.05} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}

/** Shower stall — tiled square with a corner head and a drain. */
export function Shower({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} fill={FIXTURE_FILL} stroke={STROKE} strokeWidth={SW} />
      <Line points={[0, 0, w, h]} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Line points={[w, 0, 0, h]} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w * 0.5} y={h * 0.5} radius={Math.min(w, h) * 0.07} fill="#ffffff" stroke={STROKE} strokeWidth={HAIRLINE} />
      <Circle x={w * 0.2} y={h * 0.2} radius={Math.min(w, h) * 0.1} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}
