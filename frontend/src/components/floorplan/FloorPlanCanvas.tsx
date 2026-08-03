import { useEffect, useRef, type Ref } from 'react'
import { Arc, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { LaidOutPlan, LaidOutRoom } from '@/lib/floorplan/layout'
import type { DoorFixture, FurniturePlacement, PlanFixtures, WindowFixture } from '@/lib/floorplan/fixtures'
import { fitScale, formatFeet, formatSqft } from '@/lib/floorplan/units'
import { COLORS, floorStyle, type FloorStyle } from './palette'
import { FurnitureSymbol } from './symbols/FurnitureSymbol'

const PADDING_PX = 46
const EXTERIOR_WALL_PX = 5
const INTERIOR_WALL_PX = 1.6
const SELECT_STROKE = '#f97316'
const MIN_ROOM_FT = 2

/** New geometry for a room after a drag or resize (feet). */
export interface RoomChange {
  xFt: number
  yFt: number
  wFt: number
  hFt: number
}

/** Where to float the inline rename input, in stage (== container) pixels. */
export interface RenameRequest {
  x: number
  y: number
  width: number
}

interface FloorPlanCanvasProps {
  plan: LaidOutPlan
  fixtures: PlanFixtures
  widthPx: number
  heightPx: number
  /** When true rooms become draggable + Transformer-resizable and support rename. */
  editable?: boolean
  selectedId?: string | null
  onSelectRoom?: (id: string | null) => void
  onRoomChange?: (id: string, change: RoomChange) => void
  onRequestRename?: (id: string, screen: RenameRequest) => void
  /** Forwarded to the Konva Stage so the studio can export it (PNG/PDF). */
  stageRef?: Ref<Konva.Stage>
}

interface Projection {
  scale: number
  toX: (ft: number) => number
  toY: (ft: number) => number
  len: (ft: number) => number
}

function clampFont(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Wood plank / tile grid texture lines, clipped to a local room rectangle. */
function textureLines(rx: number, ry: number, rw: number, rh: number, style: FloorStyle) {
  const lines: JSX.Element[] = []
  if (style.kind === 'wood') {
    const horizontal = rw >= rh
    const step = Math.max(10, Math.min(rw, rh) * 0.28)
    if (horizontal) {
      for (let y = ry + step; y < ry + rh - 1; y += step) {
        lines.push(<Line key={`p${y}`} points={[rx, y, rx + rw, y]} stroke={style.line} strokeWidth={0.8} />)
      }
    } else {
      for (let x = rx + step; x < rx + rw - 1; x += step) {
        lines.push(<Line key={`p${x}`} points={[x, ry, x, ry + rh]} stroke={style.line} strokeWidth={0.8} />)
      }
    }
  } else {
    const step = Math.max(12, Math.min(rw, rh) * 0.34)
    for (let x = rx + step; x < rx + rw - 1; x += step) {
      lines.push(<Line key={`gx${x}`} points={[x, ry, x, ry + rh]} stroke={style.line} strokeWidth={0.8} />)
    }
    for (let y = ry + step; y < ry + rh - 1; y += step) {
      lines.push(<Line key={`gy${y}`} points={[rx, y, rx + rw, y]} stroke={style.line} strokeWidth={0.8} />)
    }
  }
  return (
    <Group clipX={rx} clipY={ry} clipWidth={rw} clipHeight={rh} listening={false}>
      {lines}
    </Group>
  )
}

/** An ensuite bath drawn inside its parent bedroom's local frame (rides along). */
function BathSub({
  bath,
  room,
  scale,
  furniture,
}: {
  bath: LaidOutRoom
  room: LaidOutRoom
  scale: number
  furniture?: FurniturePlacement[]
}) {
  const bx = (bath.xFt - room.xFt) * scale
  const by = (bath.yFt - room.yFt) * scale
  const bw = bath.wFt * scale
  const bh = bath.hFt * scale
  const style = floorStyle('BATHROOM')
  const nameFont = clampFont(scale * 0.8, 7, 11)

  return (
    <Group listening={false}>
      <Rect x={bx} y={by} width={bw} height={bh} fill={style.fill} stroke={COLORS.interiorWall} strokeWidth={INTERIOR_WALL_PX} />
      {textureLines(bx, by, bw, bh, style)}
      {furniture?.map((item, i) => (
        <FurnitureSymbol
          key={i}
          type={item.type}
          x={(item.xFt - room.xFt) * scale}
          y={(item.yFt - room.yFt) * scale}
          width={item.wFt * scale}
          height={item.hFt * scale}
          rotationDeg={item.rotationDeg}
        />
      ))}
      {bw > 30 && bh > 22 && (
        <Text x={bx} y={by + bh / 2 - nameFont / 2} width={bw} align="center" text={bath.name} fontSize={nameFont} fontStyle="bold" fill={COLORS.roomLabel} />
      )}
    </Group>
  )
}

interface RoomGroupProps {
  room: LaidOutRoom
  bath?: LaidOutRoom
  furniture?: FurniturePlacement[]
  bathFurniture?: FurniturePlacement[]
  scale: number
  originX: number
  originY: number
  editable: boolean
  selected: boolean
  onSelect: () => void
  onChange: (change: RoomChange) => void
  onRequestRename?: (id: string, screen: RenameRequest) => void
  registerRef: (node: Konva.Group | null) => void
}

/**
 * One room rendered in its OWN local coordinate frame: the Group is positioned
 * at the room origin and every child (floor, texture, furniture, ensuite bath,
 * labels) is relative to it. This lets Konva drag/resize the whole room as a
 * unit — furniture and labels ride along — in the editable studio.
 */
function RoomGroup({
  room,
  bath,
  furniture,
  bathFurniture,
  scale,
  originX,
  originY,
  editable,
  selected,
  onSelect,
  onChange,
  onRequestRename,
  registerRef,
}: RoomGroupProps) {
  const wPx = room.wFt * scale
  const hPx = room.hFt * scale
  const style = floorStyle(room.type)

  const nameFont = clampFont(scale * 1.0, 9, 15)
  const areaFont = clampFont(scale * 0.72, 7, 11)
  const dimFont = clampFont(scale * 0.6, 7, 10)
  const showArea = hPx > 46 && wPx > 46
  const showWidthDim = wPx > 44
  const showLengthDim = hPx > 56

  const groupX = originX + room.xFt * scale
  const groupY = originY + room.yFt * scale

  const requestRename = () =>
    onRequestRename?.(room.id, { x: groupX, y: groupY + hPx / 2 - 14, width: wPx })

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target
    onChange({
      xFt: (node.x() - originX) / scale,
      yFt: (node.y() - originY) / scale,
      wFt: room.wFt,
      hFt: room.hFt,
    })
  }

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target as Konva.Group
    const sx = node.scaleX()
    const sy = node.scaleY()
    const xFt = (node.x() - originX) / scale
    const yFt = (node.y() - originY) / scale
    node.scaleX(1)
    node.scaleY(1)
    onChange({
      xFt,
      yFt,
      wFt: Math.max(MIN_ROOM_FT, room.wFt * sx),
      hFt: Math.max(MIN_ROOM_FT, room.hFt * sy),
    })
  }

  return (
    <Group
      ref={registerRef}
      x={groupX}
      y={groupY}
      draggable={editable}
      onMouseDown={editable ? onSelect : undefined}
      onTap={editable ? onSelect : undefined}
      onDblClick={editable && onRequestRename ? requestRename : undefined}
      onDblTap={editable && onRequestRename ? requestRename : undefined}
      onDragEnd={editable ? handleDragEnd : undefined}
      onTransformEnd={editable ? handleTransformEnd : undefined}
    >
      <Rect
        x={0}
        y={0}
        width={wPx}
        height={hPx}
        fill={style.fill}
        stroke={selected ? SELECT_STROKE : COLORS.interiorWall}
        strokeWidth={selected ? 2.2 : INTERIOR_WALL_PX}
      />
      {textureLines(0, 0, wPx, hPx, style)}

      {furniture?.map((item, i) => (
        <FurnitureSymbol
          key={i}
          type={item.type}
          x={(item.xFt - room.xFt) * scale}
          y={(item.yFt - room.yFt) * scale}
          width={item.wFt * scale}
          height={item.hFt * scale}
          rotationDeg={item.rotationDeg}
        />
      ))}

      {bath && <BathSub bath={bath} room={room} scale={scale} furniture={bathFurniture} />}

      {showWidthDim && (
        <Text x={0} y={2} width={wPx} align="center" text={formatFeet(room.wFt)} fontSize={dimFont} fill={COLORS.dimText} listening={false} />
      )}
      {showLengthDim && (
        <Text x={2} y={hPx} width={hPx} align="center" text={formatFeet(room.hFt)} fontSize={dimFont} fill={COLORS.dimText} rotation={270} listening={false} />
      )}

      <Text
        x={0}
        y={hPx / 2 - (showArea ? nameFont : nameFont / 2)}
        width={wPx}
        align="center"
        text={room.name}
        fontSize={nameFont}
        fontStyle="bold"
        fill={COLORS.roomLabel}
        listening={false}
      />
      {showArea && (
        <Text
          x={0}
          y={hPx / 2 + 3}
          width={wPx}
          align="center"
          text={formatSqft(room.wFt * room.hFt)}
          fontSize={areaFont}
          fill={COLORS.dimText}
          listening={false}
        />
      )}
    </Group>
  )
}

function DoorMark({ door, proj }: { door: DoorFixture; proj: Projection }) {
  const hx = proj.toX(door.hingeXFt)
  const hy = proj.toY(door.hingeYFt)
  const radius = proj.len(door.radiusFt)
  const verticalWall = door.leafDeg === 0 || door.leafDeg === 180
  const gap: number[] = verticalWall ? [hx, hy, hx, hy + radius] : [hx, hy, hx + radius, hy]

  return (
    <Group listening={false}>
      <Line points={gap} stroke="#ffffff" strokeWidth={door.exterior ? EXTERIOR_WALL_PX + 3 : INTERIOR_WALL_PX + 3} />
      <Arc
        x={hx}
        y={hy}
        innerRadius={0}
        outerRadius={radius}
        angle={90}
        rotation={door.startDeg}
        stroke={COLORS.door}
        strokeWidth={1}
      />
    </Group>
  )
}

function WindowMark({ win, proj }: { win: WindowFixture; proj: Projection }) {
  const x1 = proj.toX(win.x1Ft)
  const y1 = proj.toY(win.y1Ft)
  const x2 = proj.toX(win.x2Ft)
  const y2 = proj.toY(win.y2Ft)
  const vertical = Math.abs(win.x1Ft - win.x2Ft) < 1e-6
  const d = 2

  return (
    <Group listening={false}>
      <Line points={[x1, y1, x2, y2]} stroke="#ffffff" strokeWidth={EXTERIOR_WALL_PX + 2} />
      {vertical ? (
        <>
          <Line points={[x1 - d, y1, x2 - d, y2]} stroke={COLORS.window} strokeWidth={0.9} />
          <Line points={[x1 + d, y1, x2 + d, y2]} stroke={COLORS.window} strokeWidth={0.9} />
        </>
      ) : (
        <>
          <Line points={[x1, y1 - d, x2, y2 - d]} stroke={COLORS.window} strokeWidth={0.9} />
          <Line points={[x1, y1 + d, x2, y2 + d]} stroke={COLORS.window} strokeWidth={0.9} />
        </>
      )}
    </Group>
  )
}

/**
 * Renders a laid-out floor plan in the image-1 vector aesthetic: exterior wall,
 * floor-textured rooms with furniture symbols, door swings, windows, and
 * name/area/dimension labels. With `editable`, each room becomes draggable and
 * resizable (via a Konva Transformer) and its label can be double-clicked to
 * rename; doors/windows are re-derived by the parent from the edited geometry.
 */
export function FloorPlanCanvas({
  plan,
  fixtures,
  widthPx,
  heightPx,
  editable = false,
  selectedId = null,
  onSelectRoom,
  onRoomChange,
  onRequestRename,
  stageRef,
}: FloorPlanCanvasProps) {
  const scale = fitScale(plan.plotWidthFt, plan.plotLengthFt, widthPx, heightPx, PADDING_PX)
  const planWpx = plan.plotWidthFt * scale
  const planHpx = plan.plotLengthFt * scale
  const originX = (widthPx - planWpx) / 2
  const originY = (heightPx - planHpx) / 2

  const proj: Projection = {
    scale,
    toX: (ft) => originX + ft * scale,
    toY: (ft) => originY + ft * scale,
    len: (ft) => ft * scale,
  }

  const trRef = useRef<Konva.Transformer>(null)
  const nodeMap = useRef(new Map<string, Konva.Group>())

  // Attach the Transformer to the selected room's node whenever the selection
  // or the geometry changes (room nodes are recreated on each plan update).
  useEffect(() => {
    if (!editable) return
    const tr = trRef.current
    if (!tr) return
    const node = selectedId ? nodeMap.current.get(selectedId) ?? null : null
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  }, [editable, selectedId, plan, widthPx, heightPx])

  const bathByParent = new Map<string, LaidOutRoom>()
  for (const r of plan.rooms) {
    if (r.nested && r.parentId) bathByParent.set(r.parentId, r)
  }
  const topRooms = plan.rooms.filter((r) => !r.nested)

  const clearSelection = (e: Konva.KonvaEventObject<Event>) => {
    if (e.target === e.target.getStage()) onSelectRoom?.(null)
  }

  return (
    <Stage
      ref={stageRef}
      width={widthPx}
      height={heightPx}
      onMouseDown={editable ? clearSelection : undefined}
      onTouchStart={editable ? clearSelection : undefined}
    >
      <Layer>
        <Rect x={originX} y={originY} width={planWpx} height={planHpx} fill="#ffffff" listening={false} />

        {topRooms.map((room) => {
          const bath = bathByParent.get(room.id)
          return (
            <RoomGroup
              key={room.id}
              room={room}
              bath={bath}
              furniture={fixtures.furnitureByRoom[room.id]}
              bathFurniture={bath ? fixtures.furnitureByRoom[bath.id] : undefined}
              scale={scale}
              originX={originX}
              originY={originY}
              editable={editable}
              selected={selectedId === room.id}
              onSelect={() => onSelectRoom?.(room.id)}
              onChange={(change) => onRoomChange?.(room.id, change)}
              onRequestRename={onRequestRename}
              registerRef={(node) => {
                if (node) nodeMap.current.set(room.id, node)
                else nodeMap.current.delete(room.id)
              }}
            />
          )
        })}

        <Rect
          x={originX}
          y={originY}
          width={planWpx}
          height={planHpx}
          stroke={COLORS.exteriorWall}
          strokeWidth={EXTERIOR_WALL_PX}
          listening={false}
        />

        {fixtures.windows.map((win, i) => (
          <WindowMark key={`w${i}`} win={win} proj={proj} />
        ))}
        {fixtures.doors.map((door, i) => (
          <DoorMark key={`d${i}`} door={door} proj={proj} />
        ))}

        {editable && (
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            flipEnabled={false}
            keepRatio={false}
            anchorSize={9}
            anchorStroke={SELECT_STROKE}
            anchorCornerRadius={2}
            borderStroke={SELECT_STROKE}
            borderDash={[4, 4]}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 24 || newBox.height < 24 ? oldBox : newBox
            }
          />
        )}
      </Layer>
    </Stage>
  )
}
