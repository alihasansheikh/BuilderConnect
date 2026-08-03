import { clamp } from './units'
import type { FurnitureType, RoomType, SemanticPlan, SemanticRoom } from './schema'

/**
 * Deterministic geometry engine. The LLM decides the PROGRAM (which rooms,
 * relative sizes, zones); this code decides the PIXELS. It packs every room
 * into non-overlapping rectangles that tile the plot, honouring relative
 * `targetAreaSqft` and `zone` hints, then carves each ensuite bathroom into a
 * corner of its parent bedroom.
 *
 * Algorithm: recursive weight-balanced slicing. At each node the LONGER side of
 * the current rectangle is cut (the squarified principle — keeps aspect ratios
 * sane), rooms are ordered along that axis by their zone rank, and the cut is
 * placed so each sub-rectangle's area is proportional to its group's weight.
 * By construction the result always tiles the plot with no overlaps or gaps.
 */

export const MIN_PLOT_FT = 8
export const MAX_PLOT_FT = 500

const MIN_ROOM_WEIGHT = 15
const EPS = 1e-4

export interface LaidOutRoom {
  id: string
  name: string
  type: RoomType
  xFt: number
  yFt: number
  wFt: number
  hFt: number
  /** The room's requested furniture, carried through for fixture placement. */
  furniture: FurnitureType[]
  /** True for an ensuite bath carved inside its parent bedroom. */
  nested?: boolean
  /** The bedroom id this bath is nested inside. */
  parentId?: string
}

export interface LaidOutPlan {
  plotWidthFt: number
  plotLengthFt: number
  rooms: LaidOutRoom[]
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface PackRoom {
  room: SemanticRoom
  weight: number
  xRank: number
  yRank: number
}

/** left=0, center=1, right=2 from the zone hint (type default when absent). */
function xRank(room: SemanticRoom): number {
  const z = room.zone
  if (z) {
    if (z.includes('left')) return 0
    if (z.includes('right')) return 2
    return 1
  }
  return 1
}

/** front=0, center=1, back=2 from the zone hint, nudged by room type. */
function yRank(room: SemanticRoom): number {
  const z = room.zone
  if (z) {
    if (z.includes('front')) return 0
    if (z.includes('back')) return 2
    return 1
  }
  // Street-facing rooms default toward the front when unzoned.
  if (room.type === 'CAR_PORCH' || room.type === 'LOBBY') return 0
  return 1
}

function toPackRoom(room: SemanticRoom): PackRoom {
  return {
    room,
    weight: Math.max(room.targetAreaSqft, MIN_ROOM_WEIGHT),
    xRank: xRank(room),
    yRank: yRank(room),
  }
}

function sumWeight(rooms: PackRoom[]): number {
  return rooms.reduce((acc, r) => acc + r.weight, 0)
}

function byAxis(vertical: boolean) {
  return (a: PackRoom, b: PackRoom): number => {
    const ar = vertical ? a.xRank : a.yRank
    const br = vertical ? b.xRank : b.yRank
    if (ar !== br) return ar - br
    if (a.weight !== b.weight) return b.weight - a.weight
    return a.room.id.localeCompare(b.room.id)
  }
}

/**
 * Choose the prefix cut index that best balances weight between the two groups
 * while keeping both non-empty. Returns the index (1..n-1) and the weight of
 * the prefix group.
 */
function balancedSplit(sorted: PackRoom[]): { index: number; prefixWeight: number } {
  const total = sumWeight(sorted)
  const target = total / 2
  let running = 0
  let bestIndex = 1
  let bestDiff = Infinity
  let bestPrefix = sorted[0].weight
  for (let i = 0; i < sorted.length - 1; i++) {
    running += sorted[i].weight
    const diff = Math.abs(running - target)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = i + 1
      bestPrefix = running
    }
  }
  return { index: bestIndex, prefixWeight: bestPrefix }
}

function sliceLayout(rect: Rect, rooms: PackRoom[], out: Map<string, Rect>): void {
  if (rooms.length === 0) return
  if (rooms.length === 1) {
    out.set(rooms[0].room.id, rect)
    return
  }

  const vertical = rect.w >= rect.h
  const sorted = [...rooms].sort(byAxis(vertical))
  const { index, prefixWeight } = balancedSplit(sorted)
  const total = sumWeight(sorted)
  const fraction = clamp(prefixWeight / total, 0.12, 0.88)

  const groupA = sorted.slice(0, index)
  const groupB = sorted.slice(index)

  if (vertical) {
    const wA = rect.w * fraction
    sliceLayout({ x: rect.x, y: rect.y, w: wA, h: rect.h }, groupA, out)
    sliceLayout({ x: rect.x + wA, y: rect.y, w: rect.w - wA, h: rect.h }, groupB, out)
  } else {
    const hA = rect.h * fraction
    sliceLayout({ x: rect.x, y: rect.y, w: rect.w, h: hA }, groupA, out)
    sliceLayout({ x: rect.x, y: rect.y + hA, w: rect.w, h: rect.h - hA }, groupB, out)
  }
}

interface Partitioned {
  topLevel: SemanticRoom[]
  /** bedroom id -> the bath room nested inside it. */
  nestedBath: Map<string, SemanticRoom>
}

/** Pull ensuite baths out of the top-level packing; they are carved into their bedroom. */
function partitionRooms(plan: SemanticPlan): Partitioned {
  const byId = new Map(plan.rooms.map((r) => [r.id, r]))
  const nestedBath = new Map<string, SemanticRoom>()
  const claimed = new Set<string>()

  for (const room of plan.rooms) {
    if (room.attachedBath) {
      const bath = byId.get(room.attachedBath)
      if (bath && bath.type === 'BATHROOM' && !claimed.has(bath.id)) {
        nestedBath.set(room.id, bath)
        claimed.add(bath.id)
      }
    }
  }

  const topLevel = plan.rooms.filter((r) => !claimed.has(r.id))
  return { topLevel, nestedBath }
}

/**
 * Carve a rectangle for an ensuite bath into a corner of its parent bedroom.
 * The corner nearest the plot centre is chosen so the wet wall sits toward the
 * building interior. The result is always contained within the bedroom rect.
 */
function carveCorner(parent: Rect, bath: SemanticRoom, plotW: number, plotL: number): Rect {
  const parentArea = parent.w * parent.h
  const desired = bath.targetAreaSqft > 0 ? bath.targetAreaSqft : parentArea * 0.2
  const bathArea = clamp(desired, 25, parentArea * 0.32)

  const bw = clamp(Math.sqrt(bathArea * 1.1), parent.w * 0.3, parent.w * 0.55)
  const bh = clamp(bathArea / bw, parent.h * 0.3, parent.h * 0.55)

  const parentCx = parent.x + parent.w / 2
  const parentCy = parent.y + parent.h / 2
  const interiorLeft = parentCx > plotW / 2
  const interiorTop = parentCy > plotL / 2

  const x = interiorLeft ? parent.x : parent.x + parent.w - bw
  const y = interiorTop ? parent.y : parent.y + parent.h - bh
  return { x, y, w: bw, h: bh }
}

/** Turn a validated semantic plan into non-overlapping room geometry (feet). */
export function layoutPlan(plan: SemanticPlan): LaidOutPlan {
  const plotWidthFt = clamp(plan.plotWidthFt, MIN_PLOT_FT, MAX_PLOT_FT)
  const plotLengthFt = clamp(plan.plotLengthFt, MIN_PLOT_FT, MAX_PLOT_FT)

  const { topLevel, nestedBath } = partitionRooms(plan)
  const bathById = new Map<string, SemanticRoom>()
  for (const bath of nestedBath.values()) bathById.set(bath.id, bath)

  const placed = new Map<string, Rect>()
  sliceLayout(
    { x: 0, y: 0, w: plotWidthFt, h: plotLengthFt },
    topLevel.map(toPackRoom),
    placed,
  )

  const rooms: LaidOutRoom[] = []
  for (const room of topLevel) {
    const rect = placed.get(room.id)
    if (!rect) continue
    rooms.push({
      id: room.id,
      name: room.name,
      type: room.type,
      xFt: rect.x,
      yFt: rect.y,
      wFt: rect.w,
      hFt: rect.h,
      furniture: room.furniture,
    })

    const bath = nestedBath.get(room.id)
    if (bath) {
      const bathRect = carveCorner(rect, bath, plotWidthFt, plotLengthFt)
      rooms.push({
        id: bath.id,
        name: bath.name,
        type: 'BATHROOM',
        xFt: bathRect.x,
        yFt: bathRect.y,
        wFt: bathRect.w,
        hFt: bathRect.h,
        furniture: bath.furniture,
        nested: true,
        parentId: room.id,
      })
    }
  }

  return { plotWidthFt, plotLengthFt, rooms }
}

/**
 * Pure self-check used for guards/tests: returns a list of geometry problems
 * (overlapping or out-of-bounds top-level rooms, uncovered plot area, or a
 * nested bath escaping its parent). An empty array means a valid layout.
 */
export function validateLayout(plan: LaidOutPlan): string[] {
  const problems: string[] = []
  const top = plan.rooms.filter((r) => !r.nested)
  const nested = plan.rooms.filter((r) => r.nested)
  const plotArea = plan.plotWidthFt * plan.plotLengthFt

  for (const room of top) {
    if (
      room.xFt < -EPS ||
      room.yFt < -EPS ||
      room.xFt + room.wFt > plan.plotWidthFt + EPS ||
      room.yFt + room.hFt > plan.plotLengthFt + EPS
    ) {
      problems.push(`Room ${room.id} is out of bounds`)
    }
  }

  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const a = top[i]
      const b = top[j]
      const overlapW = Math.min(a.xFt + a.wFt, b.xFt + b.wFt) - Math.max(a.xFt, b.xFt)
      const overlapH = Math.min(a.yFt + a.hFt, b.yFt + b.hFt) - Math.max(a.yFt, b.yFt)
      if (overlapW > EPS && overlapH > EPS) {
        problems.push(`Rooms ${a.id} and ${b.id} overlap`)
      }
    }
  }

  const covered = top.reduce((acc, r) => acc + r.wFt * r.hFt, 0)
  if (Math.abs(covered - plotArea) > plotArea * 0.02) {
    problems.push('Rooms do not fully tile the plot')
  }

  const byId = new Map(top.map((r) => [r.id, r]))
  for (const bath of nested) {
    const parent = bath.parentId ? byId.get(bath.parentId) : undefined
    if (!parent) {
      problems.push(`Nested bath ${bath.id} has no parent`)
      continue
    }
    if (
      bath.xFt < parent.xFt - EPS ||
      bath.yFt < parent.yFt - EPS ||
      bath.xFt + bath.wFt > parent.xFt + parent.wFt + EPS ||
      bath.yFt + bath.hFt > parent.yFt + parent.hFt + EPS
    ) {
      problems.push(`Nested bath ${bath.id} escapes its parent`)
    }
  }

  return problems
}
