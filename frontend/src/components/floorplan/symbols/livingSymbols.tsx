import { Group, Line, Rect } from 'react-konva'
import { ACCENT, FILL, HAIRLINE, STROKE, SW, type SymbolProps } from './common'

/** Sofa, backrest along the top edge, armrests at the sides. */
export function Sofa({ w, h }: SymbolProps) {
  const arm = w * 0.12
  const seats = 3
  const dividers = []
  for (let i = 1; i < seats; i++) {
    const x = arm + ((w - 2 * arm) * i) / seats
    dividers.push(<Line key={i} points={[x, h * 0.24, x, h * 0.96]} stroke={STROKE} strokeWidth={HAIRLINE} />)
  }
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={Math.min(w, h) * 0.08} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Rect x={0} y={0} width={w} height={h * 0.22} cornerRadius={3} fill={ACCENT} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Rect x={0} y={h * 0.18} width={arm} height={h * 0.82} cornerRadius={3} fill={ACCENT} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Rect x={w - arm} y={h * 0.18} width={arm} height={h * 0.82} cornerRadius={3} fill={ACCENT} stroke={STROKE} strokeWidth={HAIRLINE} />
      {dividers}
    </Group>
  )
}

/** Wall-mounted television (dark screen with a stand). */
export function Tv({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h * 0.62} cornerRadius={1} fill="#3b4a6b" stroke={STROKE} strokeWidth={HAIRLINE} />
      <Line points={[w / 2, h * 0.62, w / 2, h * 0.82]} stroke={STROKE} strokeWidth={HAIRLINE} />
      <Line points={[w * 0.3, h * 0.9, w * 0.7, h * 0.9]} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}

/** Coffee table (rounded rectangle with an inner outline). */
export function CoffeeTable({ w, h }: SymbolProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} cornerRadius={Math.min(w, h) * 0.18} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Rect x={w * 0.12} y={h * 0.16} width={w * 0.76} height={h * 0.68} cornerRadius={Math.min(w, h) * 0.12} stroke={STROKE} strokeWidth={HAIRLINE} />
    </Group>
  )
}
