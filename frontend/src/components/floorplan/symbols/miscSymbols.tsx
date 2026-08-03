import { Group, Line, Rect } from 'react-konva'
import { FILL, HAIRLINE, STROKE, SW, type SymbolProps } from './common'

/** Top-down car, front (windshield) toward the top edge. */
export function Car({ w, h }: SymbolProps) {
  const bodyX = w * 0.12
  const bodyW = w * 0.76
  const wheelW = w * 0.12
  const wheelH = h * 0.16
  return (
    <Group>
      <Rect x={bodyX} y={0} width={bodyW} height={h} cornerRadius={Math.min(bodyW, h) * 0.22} fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <Line
        points={[bodyX + bodyW * 0.16, h * 0.2, bodyX + bodyW * 0.84, h * 0.2, bodyX + bodyW * 0.7, h * 0.34, bodyX + bodyW * 0.3, h * 0.34]}
        closed
        stroke={STROKE}
        strokeWidth={HAIRLINE}
      />
      <Line
        points={[bodyX + bodyW * 0.24, h * 0.82, bodyX + bodyW * 0.76, h * 0.82, bodyX + bodyW * 0.66, h * 0.7, bodyX + bodyW * 0.34, h * 0.7]}
        closed
        stroke={STROKE}
        strokeWidth={HAIRLINE}
      />
      <Rect x={0} y={h * 0.18} width={wheelW} height={wheelH} cornerRadius={1} fill="#3b4a6b" />
      <Rect x={w - wheelW} y={h * 0.18} width={wheelW} height={wheelH} cornerRadius={1} fill="#3b4a6b" />
      <Rect x={0} y={h * 0.66} width={wheelW} height={wheelH} cornerRadius={1} fill="#3b4a6b" />
      <Rect x={w - wheelW} y={h * 0.66} width={wheelW} height={wheelH} cornerRadius={1} fill="#3b4a6b" />
    </Group>
  )
}
