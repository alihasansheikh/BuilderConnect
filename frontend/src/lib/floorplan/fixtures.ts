import type { FurnitureType, RoomType } from './schema'
import type { LaidOutPlan, LaidOutRoom } from './layout'

/**
 * Deterministic placement of the ARCHITECTURAL details on top of a laid-out
 * plan: doors on shared/exterior walls (with a swing arc), windows on exterior
 * walls, and furniture per room from type-driven templates. Everything is in
 * FEET relative to the plan; the canvas converts to pixels.
 */

const EPS = 1e-3
const DOOR_MIN_FT = 2.4
const WALL_MARGIN_FT = 0.5

type Wall = 'top' | 'bottom' | 'left' | 'right'

interface Region {
  xFt: number
  yFt: number
  wFt: number
  hFt: number
}

export interface FurniturePlacement {
  type: FurnitureType
  xFt: number
  yFt: number
  wFt: number
  hFt: number
  /** Canonical symbol orientation: top=0, right=90, bottom=180, left=270. */
  rotationDeg: number
}

export interface DoorFixture {
  hingeXFt: number
  hingeYFt: number
  radiusFt: number
  /** Konva arc start angle (degrees, clockwise, y-down). */
  startDeg: number
  /** Angle of the open leaf from the hinge. */
  leafDeg: number
  exterior: boolean
}

export interface WindowFixture {
  x1Ft: number
  y1Ft: number
  x2Ft: number
  y2Ft: number
}

export interface PlanFixtures {
  doors: DoorFixture[]
  windows: WindowFixture[]
  furnitureByRoom: Record<string, FurniturePlacement[]>
}

/** Priority order for the room a door should connect a private room TO. */
const CIRCULATION_PRIORITY: RoomType[] = ['LOBBY', 'LIVING', 'DRAWING', 'DINING', 'KITCHEN']

const HABITABLE: ReadonlySet<RoomType> = new Set<RoomType>([
  'BEDROOM',
  'LIVING',
  'DRAWING',
  'DINING',
  'KITCHEN',
])

const ROTATION_BY_WALL: Record<Wall, number> = { top: 0, right: 90, bottom: 180, left: 270 }

// --- geometry helpers -------------------------------------------------------

function clampNum(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Position a piece of furniture flush against one wall of a region. `canonLen`
 * runs along the wall, `canonDepth` reaches into the room. Returns an
 * axis-aligned footprint plus the canonical rotation for that wall.
 */
function placeAgainstWall(
  region: Region,
  wall: Wall,
  canonLen: number,
  canonDepth: number,
  alongFrac = 0.5,
  margin = WALL_MARGIN_FT,
): Omit<FurniturePlacement, 'type'> {
  const horizontal = wall === 'top' || wall === 'bottom'
  const wallSpan = horizontal ? region.wFt : region.hFt
  const perpSpan = horizontal ? region.hFt : region.wFt

  const len = clampNum(canonLen, 0.5, Math.max(0.5, wallSpan - 2 * margin))
  const depth = clampNum(canonDepth, 0.4, Math.max(0.4, perpSpan - margin))
  const slide = Math.max(0, wallSpan - 2 * margin - len) * clampNum(alongFrac, 0, 1)

  const rotationDeg = ROTATION_BY_WALL[wall]

  if (horizontal) {
    const x = region.xFt + margin + slide
    const y = wall === 'top' ? region.yFt + margin : region.yFt + region.hFt - margin - depth
    return { xFt: x, yFt: y, wFt: len, hFt: depth, rotationDeg }
  }
  const y = region.yFt + margin + slide
  const x = wall === 'left' ? region.xFt + margin : region.xFt + region.wFt - margin - depth
  return { xFt: x, yFt: y, wFt: depth, hFt: len, rotationDeg }
}

function placeCentered(
  region: Region,
  wFt: number,
  hFt: number,
  rotationDeg = 0,
): Omit<FurniturePlacement, 'type'> {
  const w = clampNum(wFt, 0.5, region.wFt * 0.9)
  const h = clampNum(hFt, 0.5, region.hFt * 0.9)
  return {
    xFt: region.xFt + (region.wFt - w) / 2,
    yFt: region.yFt + (region.hFt - h) / 2,
    wFt: w,
    hFt: h,
    rotationDeg,
  }
}

function opposite(wall: Wall): Wall {
  switch (wall) {
    case 'top':
      return 'bottom'
    case 'bottom':
      return 'top'
    case 'left':
      return 'right'
    case 'right':
      return 'left'
  }
}

/**
 * Largest rectangular remainder of a bedroom after an ensuite bath (always a
 * corner) is removed — furniture goes here so it never sits under the bath.
 */
function regionExcludingBath(room: LaidOutRoom, bath: LaidOutRoom): Region {
  const cutVerticalArea = (room.wFt - bath.wFt) * room.hFt
  const cutHorizontalArea = room.wFt * (room.hFt - bath.hFt)
  if (cutVerticalArea >= cutHorizontalArea) {
    const bathOnLeft = Math.abs(bath.xFt - room.xFt) < EPS
    return {
      xFt: bathOnLeft ? bath.xFt + bath.wFt : room.xFt,
      yFt: room.yFt,
      wFt: room.wFt - bath.wFt,
      hFt: room.hFt,
    }
  }
  const bathOnTop = Math.abs(bath.yFt - room.yFt) < EPS
  return {
    xFt: room.xFt,
    yFt: bathOnTop ? bath.yFt + bath.hFt : room.yFt,
    wFt: room.wFt,
    hFt: room.hFt - bath.hFt,
  }
}

// --- furniture templates ----------------------------------------------------

const DEFAULT_FURNITURE: Record<RoomType, FurnitureType[]> = {
  BEDROOM: ['BED', 'WARDROBE', 'SIDE_TABLE'],
  BATHROOM: ['TOILET', 'SINK', 'SHOWER'],
  KITCHEN: ['KITCHEN_COUNTER', 'STOVE', 'SINK', 'FRIDGE'],
  LIVING: ['SOFA', 'COFFEE_TABLE', 'TV'],
  DRAWING: ['SOFA', 'COFFEE_TABLE', 'TV'],
  DINING: ['DINING_TABLE', 'CHAIR'],
  LOBBY: [],
  CAR_PORCH: ['CAR'],
  STORE: [],
}

function effectiveFurniture(room: LaidOutRoom): Set<FurnitureType> {
  const requested = room.furniture ?? []
  const list = requested.length > 0 ? requested : DEFAULT_FURNITURE[room.type]
  return new Set(list)
}

function bedroomFurniture(region: Region, items: Set<FurnitureType>): FurniturePlacement[] {
  const out: FurniturePlacement[] = []
  const bedWall: Wall = region.hFt >= region.wFt ? 'top' : 'left'

  if (items.has('BED')) {
    out.push({ type: 'BED', ...placeAgainstWall(region, bedWall, 5, 6.6, 0.5) })
    if (items.has('SIDE_TABLE')) {
      out.push({ type: 'SIDE_TABLE', ...placeAgainstWall(region, bedWall, 1.6, 1.6, 0.04) })
      out.push({ type: 'SIDE_TABLE', ...placeAgainstWall(region, bedWall, 1.6, 1.6, 0.96) })
    }
  } else if (items.has('SIDE_TABLE')) {
    out.push({ type: 'SIDE_TABLE', ...placeAgainstWall(region, bedWall, 1.6, 1.6, 0.1) })
  }

  if (items.has('WARDROBE')) {
    const wardrobeWall: Wall = region.hFt >= region.wFt ? 'right' : 'bottom'
    out.push({ type: 'WARDROBE', ...placeAgainstWall(region, wardrobeWall, 5, 2, 0.5) })
  }
  if (items.has('TV')) {
    out.push({ type: 'TV', ...placeAgainstWall(region, opposite(bedWall), 3.6, 0.8, 0.5) })
  }
  return out
}

function bathroomFurniture(region: Region, items: Set<FurnitureType>): FurniturePlacement[] {
  const out: FurniturePlacement[] = []
  if (items.has('TOILET')) {
    out.push({ type: 'TOILET', ...placeAgainstWall(region, 'top', 1.8, 2.4, 0.15, 0.3) })
  }
  if (items.has('SINK')) {
    out.push({ type: 'SINK', ...placeAgainstWall(region, 'top', 1.8, 1.6, 0.85, 0.3) })
  }
  if (items.has('BATHTUB')) {
    out.push({ type: 'BATHTUB', ...placeAgainstWall(region, 'bottom', 5, 2.6, 0.5, 0.3) })
  } else if (items.has('SHOWER')) {
    out.push({ type: 'SHOWER', ...placeAgainstWall(region, 'left', 2.6, 2.6, 0.95, 0.3) })
  }
  return out
}

function kitchenFurniture(region: Region, items: Set<FurnitureType>): FurniturePlacement[] {
  const out: FurniturePlacement[] = []
  if (items.has('KITCHEN_COUNTER')) {
    out.push({ type: 'KITCHEN_COUNTER', ...placeAgainstWall(region, 'top', region.wFt, 2, 0.5, 0.3) })
    if (region.hFt >= 8) {
      out.push({ type: 'KITCHEN_COUNTER', ...placeAgainstWall(region, 'left', region.hFt - 2, 2, 1, 0.3) })
    }
  }
  if (items.has('STOVE')) {
    out.push({ type: 'STOVE', ...placeAgainstWall(region, 'top', 2, 2, 0.35, 0.3) })
  }
  if (items.has('SINK')) {
    out.push({ type: 'SINK', ...placeAgainstWall(region, 'top', 1.8, 1.6, 0.68, 0.3) })
  }
  if (items.has('FRIDGE')) {
    out.push({ type: 'FRIDGE', ...placeAgainstWall(region, 'right', 2.6, 2.6, 0.02, 0.3) })
  }
  return out
}

function loungeFurniture(region: Region, items: Set<FurnitureType>): FurniturePlacement[] {
  const out: FurniturePlacement[] = []
  if (items.has('SOFA')) {
    out.push({ type: 'SOFA', ...placeAgainstWall(region, 'bottom', Math.min(7, region.wFt * 0.7), 2.6, 0.5) })
  }
  if (items.has('COFFEE_TABLE')) {
    out.push({ type: 'COFFEE_TABLE', ...placeCentered(region, 3.6, 2) })
  }
  if (items.has('TV')) {
    out.push({ type: 'TV', ...placeAgainstWall(region, 'top', 4, 0.9, 0.5) })
  }
  return out
}

function diningFurniture(region: Region, items: Set<FurnitureType>): FurniturePlacement[] {
  const out: FurniturePlacement[] = []
  if (items.has('DINING_TABLE')) {
    const tableW = Math.min(5.5, region.wFt * 0.55)
    const tableH = Math.min(3, region.hFt * 0.45)
    const table = placeCentered(region, tableW, tableH)
    out.push({ type: 'DINING_TABLE', ...table })

    if (items.has('CHAIR')) {
      const seatsPerSide = tableW >= 4.5 ? 3 : 2
      for (let i = 0; i < seatsPerSide; i++) {
        const frac = (i + 1) / (seatsPerSide + 1)
        const cx = table.xFt + table.wFt * frac
        out.push({ type: 'CHAIR', xFt: cx - 0.7, yFt: table.yFt - 1.6, wFt: 1.4, hFt: 1.4, rotationDeg: 0 })
        out.push({ type: 'CHAIR', xFt: cx - 0.7, yFt: table.yFt + table.hFt + 0.2, wFt: 1.4, hFt: 1.4, rotationDeg: 180 })
      }
    }
  } else if (items.has('CHAIR')) {
    out.push({ type: 'CHAIR', ...placeCentered(region, 1.4, 1.4) })
  }
  return out
}

function carPorchFurniture(region: Region, items: Set<FurnitureType>): FurniturePlacement[] {
  if (!items.has('CAR')) return []
  const alongVertical = region.hFt >= region.wFt
  const length = Math.min(alongVertical ? region.hFt * 0.85 : region.wFt * 0.85, 14)
  const width = Math.min(alongVertical ? region.wFt * 0.6 : region.hFt * 0.6, 6.5)
  if (alongVertical) {
    return [{ type: 'CAR', ...placeCentered(region, width, length, 0) }]
  }
  return [{ type: 'CAR', ...placeCentered(region, length, width, 90) }]
}

function furnitureForRoom(room: LaidOutRoom, region: Region): FurniturePlacement[] {
  const items = effectiveFurniture(room)
  switch (room.type) {
    case 'BEDROOM':
      return bedroomFurniture(region, items)
    case 'BATHROOM':
      return bathroomFurniture(region, items)
    case 'KITCHEN':
      return kitchenFurniture(region, items)
    case 'LIVING':
    case 'DRAWING':
      return loungeFurniture(region, items)
    case 'DINING':
      return diningFurniture(region, items)
    case 'CAR_PORCH':
      return carPorchFurniture(region, items)
    case 'LOBBY':
    case 'STORE':
      return []
  }
}

// --- doors ------------------------------------------------------------------

interface Shared {
  orientation: 'V' | 'H'
  at: number
  lo: number
  hi: number
}

/** Detect a shared wall (with a door-wide overlap) between two rectangles. */
function sharedWall(a: LaidOutRoom, b: LaidOutRoom): Shared | null {
  const aRight = a.xFt + a.wFt
  const bRight = b.xFt + b.wFt
  const aBottom = a.yFt + a.hFt
  const bBottom = b.yFt + b.hFt

  if (Math.abs(aRight - b.xFt) < EPS || Math.abs(bRight - a.xFt) < EPS) {
    const lo = Math.max(a.yFt, b.yFt)
    const hi = Math.min(aBottom, bBottom)
    if (hi - lo >= DOOR_MIN_FT) {
      return { orientation: 'V', at: Math.abs(aRight - b.xFt) < EPS ? aRight : a.xFt, lo, hi }
    }
  }
  if (Math.abs(aBottom - b.yFt) < EPS || Math.abs(bBottom - a.yFt) < EPS) {
    const lo = Math.max(a.xFt, b.xFt)
    const hi = Math.min(aRight, bRight)
    if (hi - lo >= DOOR_MIN_FT) {
      return { orientation: 'H', at: Math.abs(aBottom - b.yFt) < EPS ? aBottom : a.yFt, lo, hi }
    }
  }
  return null
}

/** Build a door on a shared wall, swinging into `into`. */
function doorOnWall(wall: Shared, into: LaidOutRoom, exterior: boolean): DoorFixture {
  const doorWidth = clampNum(Math.min(2.8, (wall.hi - wall.lo) * 0.8), 2, 3)
  const start = wall.lo + (wall.hi - wall.lo - doorWidth) / 2

  if (wall.orientation === 'V') {
    const intoPositiveX = into.xFt >= wall.at - EPS
    return intoPositiveX
      ? { hingeXFt: wall.at, hingeYFt: start, radiusFt: doorWidth, startDeg: 0, leafDeg: 0, exterior }
      : { hingeXFt: wall.at, hingeYFt: start, radiusFt: doorWidth, startDeg: 90, leafDeg: 180, exterior }
  }
  const intoPositiveY = into.yFt >= wall.at - EPS
  return intoPositiveY
    ? { hingeXFt: start, hingeYFt: wall.at, radiusFt: doorWidth, startDeg: 0, leafDeg: 90, exterior }
    : { hingeXFt: start, hingeYFt: wall.at, radiusFt: doorWidth, startDeg: 270, leafDeg: 270, exterior }
}

/** Exterior entrance door on whichever plot boundary the entrance room touches. */
function entranceDoor(room: LaidOutRoom, plan: LaidOutPlan): DoorFixture | null {
  const doorWidth = 3
  if (room.yFt < EPS) {
    const x = room.xFt + room.wFt / 2 - doorWidth / 2
    return { hingeXFt: x, hingeYFt: 0, radiusFt: doorWidth, startDeg: 0, leafDeg: 90, exterior: true }
  }
  if (room.xFt < EPS) {
    const y = room.yFt + room.hFt / 2 - doorWidth / 2
    return { hingeXFt: 0, hingeYFt: y, radiusFt: doorWidth, startDeg: 0, leafDeg: 0, exterior: true }
  }
  if (Math.abs(room.xFt + room.wFt - plan.plotWidthFt) < EPS) {
    const y = room.yFt + room.hFt / 2 - doorWidth / 2
    return { hingeXFt: plan.plotWidthFt, hingeYFt: y, radiusFt: doorWidth, startDeg: 90, leafDeg: 180, exterior: true }
  }
  if (Math.abs(room.yFt + room.hFt - plan.plotLengthFt) < EPS) {
    const x = room.xFt + room.wFt / 2 - doorWidth / 2
    return { hingeXFt: x, hingeYFt: plan.plotLengthFt, radiusFt: doorWidth, startDeg: 270, leafDeg: 270, exterior: true }
  }
  return null
}

/** Door between an ensuite bath and its bedroom, on the bath's interior wall. */
function nestedBathDoor(bath: LaidOutRoom, parent: LaidOutRoom): DoorFixture {
  const bathOnLeft = Math.abs(bath.xFt - parent.xFt) < EPS
  const doorWidth = clampNum(Math.min(2.4, bath.hFt * 0.7), 1.8, 2.4)
  const start = bath.yFt + (bath.hFt - doorWidth) / 2
  if (bathOnLeft) {
    // interior-facing wall is the bath's right edge; swing into the bath (-x)
    return { hingeXFt: bath.xFt + bath.wFt, hingeYFt: start, radiusFt: doorWidth, startDeg: 90, leafDeg: 180, exterior: false }
  }
  return { hingeXFt: bath.xFt, hingeYFt: start, radiusFt: doorWidth, startDeg: 0, leafDeg: 0, exterior: false }
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function circulationScore(type: RoomType): number {
  const idx = CIRCULATION_PRIORITY.indexOf(type)
  return idx === -1 ? CIRCULATION_PRIORITY.length : idx
}

function computeDoors(plan: LaidOutPlan, entrance?: LaidOutRoom): DoorFixture[] {
  const doors: DoorFixture[] = []
  const top = plan.rooms.filter((r) => !r.nested)
  const nested = plan.rooms.filter((r) => r.nested)

  if (entrance) {
    const door = entranceDoor(entrance, plan)
    if (door) doors.push(door)
  }

  const connected = new Set<string>()
  const ordered = [...top].sort((a, b) => a.id.localeCompare(b.id))
  for (const room of ordered) {
    let best: LaidOutRoom | null = null
    let bestWall: Shared | null = null
    let bestScore = Infinity
    let bestOverlap = 0
    for (const other of top) {
      if (other.id === room.id) continue
      const wall = sharedWall(room, other)
      if (!wall) continue
      const score = circulationScore(other.type)
      const overlap = wall.hi - wall.lo
      if (score < bestScore || (score === bestScore && overlap > bestOverlap)) {
        best = other
        bestWall = wall
        bestScore = score
        bestOverlap = overlap
      }
    }
    if (best && bestWall) {
      const key = pairKey(room.id, best.id)
      if (!connected.has(key)) {
        connected.add(key)
        doors.push(doorOnWall(bestWall, room, false))
      }
    }
  }

  const topById = new Map(top.map((r) => [r.id, r]))
  for (const bath of nested) {
    const parent = bath.parentId ? topById.get(bath.parentId) : undefined
    if (parent) doors.push(nestedBathDoor(bath, parent))
  }

  return doors
}

// --- windows ----------------------------------------------------------------

function windowsForRoom(room: LaidOutRoom, plan: LaidOutPlan): WindowFixture[] {
  const out: WindowFixture[] = []
  const spanH = Math.min(4, room.wFt * 0.5)
  const spanV = Math.min(4, room.hFt * 0.5)
  const cx = room.xFt + room.wFt / 2
  const cy = room.yFt + room.hFt / 2

  if (room.yFt < EPS) {
    out.push({ x1Ft: cx - spanH / 2, y1Ft: 0, x2Ft: cx + spanH / 2, y2Ft: 0 })
  }
  if (Math.abs(room.yFt + room.hFt - plan.plotLengthFt) < EPS) {
    out.push({ x1Ft: cx - spanH / 2, y1Ft: plan.plotLengthFt, x2Ft: cx + spanH / 2, y2Ft: plan.plotLengthFt })
  }
  if (room.xFt < EPS) {
    out.push({ x1Ft: 0, y1Ft: cy - spanV / 2, x2Ft: 0, y2Ft: cy + spanV / 2 })
  }
  if (Math.abs(room.xFt + room.wFt - plan.plotWidthFt) < EPS) {
    out.push({ x1Ft: plan.plotWidthFt, y1Ft: cy - spanV / 2, x2Ft: plan.plotWidthFt, y2Ft: cy + spanV / 2 })
  }
  return out
}

// --- orchestrator -----------------------------------------------------------

export function computeFixtures(plan: LaidOutPlan, entranceRoomId?: string): PlanFixtures {
  const top = plan.rooms.filter((r) => !r.nested)
  const entrance =
    (entranceRoomId ? top.find((r) => r.id === entranceRoomId) : undefined) ??
    top.find((r) => r.type === 'LOBBY')

  const furnitureByRoom: Record<string, FurniturePlacement[]> = {}
  const bathByParent = new Map<string, LaidOutRoom>()
  for (const bath of plan.rooms) {
    if (bath.nested && bath.parentId) bathByParent.set(bath.parentId, bath)
  }

  for (const room of plan.rooms) {
    const bath = bathByParent.get(room.id)
    const region: Region = bath ? regionExcludingBath(room, bath) : room
    furnitureByRoom[room.id] = furnitureForRoom(room, region)
  }

  const windows = plan.rooms
    .filter((r) => !r.nested && HABITABLE.has(r.type))
    .flatMap((r) => windowsForRoom(r, plan))

  return {
    doors: computeDoors(plan, entrance),
    windows,
    furnitureByRoom,
  }
}
