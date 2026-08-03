import { z } from 'zod'

/**
 * Zod validation for the SEMANTIC floor-plan program returned by the backend
 * (`POST /v1/floorplan/generate` -> `FloorPlanResponse.planJson`). Field names
 * mirror `FloorPlanService.buildResponseSchema` on the server EXACTLY.
 *
 * The LLM is imperfect, so this layer is deliberately tolerant: numbers are
 * coerced and clamped, unknown enum members fall back to safe defaults, and
 * unrecognised furniture is dropped rather than throwing. Geometry is never
 * requested from the model — only the program (rooms, relative sizes, zones).
 */

export const ROOM_TYPES = [
  'BEDROOM',
  'BATHROOM',
  'KITCHEN',
  'LIVING',
  'DRAWING',
  'DINING',
  'LOBBY',
  'CAR_PORCH',
  'STORE',
] as const
export type RoomType = (typeof ROOM_TYPES)[number]

export const FURNITURE_TYPES = [
  'BED',
  'WARDROBE',
  'SIDE_TABLE',
  'SOFA',
  'TV',
  'COFFEE_TABLE',
  'DINING_TABLE',
  'CHAIR',
  'TOILET',
  'SINK',
  'BATHTUB',
  'SHOWER',
  'KITCHEN_COUNTER',
  'STOVE',
  'FRIDGE',
  'CAR',
] as const
export type FurnitureType = (typeof FURNITURE_TYPES)[number]

export const ZONES = [
  'front-left',
  'front',
  'front-right',
  'left',
  'center',
  'right',
  'back-left',
  'back',
  'back-right',
] as const
export type Zone = (typeof ZONES)[number]

/** Post-normalisation room: `id` is guaranteed present and unique. */
export interface SemanticRoom {
  id: string
  name: string
  type: RoomType
  targetAreaSqft: number
  zone?: Zone
  attachedBath?: string
  furniture: FurnitureType[]
}

export interface SemanticPlan {
  plotWidthFt: number
  plotLengthFt: number
  rooms: SemanticRoom[]
  entranceRoomId?: string
  notes?: string
}

const FURNITURE_SET: ReadonlySet<string> = new Set(FURNITURE_TYPES)

/** Keep only recognised furniture codes; tolerate a non-array input. */
function coerceFurniture(value: unknown): FurnitureType[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is FurnitureType => typeof item === 'string' && FURNITURE_SET.has(item),
  )
}

const roomSchema = z.object({
  id: z.string().trim().min(1).optional().catch(undefined),
  name: z.string().trim().min(1).catch(''),
  type: z.enum(ROOM_TYPES).catch('STORE'),
  targetAreaSqft: z.coerce.number().finite().catch(100),
  zone: z.enum(ZONES).optional().catch(undefined),
  attachedBath: z.string().trim().min(1).optional().catch(undefined),
  furniture: z.preprocess(coerceFurniture, z.array(z.enum(FURNITURE_TYPES))).catch([]),
})

const planSchema = z.object({
  plotWidthFt: z.coerce.number().finite().catch(30),
  plotLengthFt: z.coerce.number().finite().catch(50),
  rooms: z.array(roomSchema).catch([]),
  entranceRoomId: z.string().trim().min(1).optional().catch(undefined),
  notes: z.string().optional().catch(undefined),
})

type ParsedRoom = z.infer<typeof roomSchema>

/** Human default name when the model omits one, derived from the room type. */
function defaultName(type: RoomType): string {
  switch (type) {
    case 'BEDROOM':
      return 'Bedroom'
    case 'BATHROOM':
      return 'Bath'
    case 'KITCHEN':
      return 'Kitchen'
    case 'LIVING':
      return 'Lounge'
    case 'DRAWING':
      return 'Drawing Room'
    case 'DINING':
      return 'Dining'
    case 'LOBBY':
      return 'Lobby'
    case 'CAR_PORCH':
      return 'Car Porch'
    case 'STORE':
      return 'Store'
  }
}

/**
 * Enforce the invariants the layout engine relies on: unique room ids, positive
 * areas, an `attachedBath` that points at a real BATHROOM row (each bath claimed
 * by at most one bedroom), and an `entranceRoomId` that resolves to a real room.
 */
function normalize(parsed: z.infer<typeof planSchema>): SemanticPlan {
  const seenIds = new Set<string>()
  const rooms: SemanticRoom[] = parsed.rooms.map((raw: ParsedRoom, index: number) => {
    let id = raw.id ?? `r${index + 1}`
    while (seenIds.has(id)) id = `${id}_${index + 1}`
    seenIds.add(id)
    return {
      id,
      name: raw.name && raw.name.length > 0 ? raw.name : defaultName(raw.type),
      type: raw.type,
      targetAreaSqft: Number.isFinite(raw.targetAreaSqft) ? Math.max(raw.targetAreaSqft, 20) : 100,
      zone: raw.zone,
      attachedBath: raw.attachedBath,
      furniture: raw.furniture,
    }
  })

  const bathIds = new Set(rooms.filter((r) => r.type === 'BATHROOM').map((r) => r.id))
  const claimedBaths = new Set<string>()
  const normalizedRooms = rooms.map((room) => {
    if (
      room.attachedBath &&
      room.type === 'BEDROOM' &&
      bathIds.has(room.attachedBath) &&
      room.attachedBath !== room.id &&
      !claimedBaths.has(room.attachedBath)
    ) {
      claimedBaths.add(room.attachedBath)
      return room
    }
    return { ...room, attachedBath: undefined }
  })

  const roomIds = new Set(normalizedRooms.map((r) => r.id))
  const entranceRoomId =
    parsed.entranceRoomId && roomIds.has(parsed.entranceRoomId)
      ? parsed.entranceRoomId
      : normalizedRooms.find((r) => r.type === 'LOBBY')?.id

  return {
    plotWidthFt: parsed.plotWidthFt,
    plotLengthFt: parsed.plotLengthFt,
    rooms: normalizedRooms,
    entranceRoomId,
    notes: parsed.notes?.trim() || undefined,
  }
}

/**
 * Validate + normalise a raw plan (a JSON string from the API or an already
 * parsed object). Throws a user-facing Error when the payload is unusable
 * (not an object, or no rooms) so the studio can show the busy/retry state.
 */
export function parseSemanticPlan(raw: unknown): SemanticPlan {
  let source: unknown = raw
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw)
    } catch {
      throw new Error('The generated plan was not valid JSON.')
    }
  }

  const result = planSchema.safeParse(source)
  if (!result.success) {
    throw new Error('The generated plan was not in a usable format.')
  }

  const plan = normalize(result.data)
  if (plan.rooms.length === 0) {
    throw new Error('The generated plan contained no rooms.')
  }
  return plan
}
