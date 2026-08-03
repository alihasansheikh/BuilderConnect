import type { RoomType } from '@/lib/floorplan/schema'

/**
 * Shared colour system for the Floor Plan Studio, tuned to the clean vector
 * "architectural drawing" reference (dark-navy line-art on soft tinted floors).
 */
export const COLORS = {
  exteriorWall: '#2b3a5b',
  interiorWall: '#3b4a6b',
  furnitureStroke: '#3b4a6b',
  furnitureFill: '#f4f6fb',
  fixtureFill: '#e8f0fb',
  roomLabel: '#2b3a5b',
  dimText: '#64748b',
  door: '#3b4a6b',
  window: '#2b3a5b',
} as const

export type FloorKind = 'wood' | 'bath' | 'tile'

export interface FloorStyle {
  fill: string
  line: string
  kind: FloorKind
}

const WOOD: FloorStyle = { fill: '#f0e2cd', line: '#e2cdb0', kind: 'wood' }
const BATH: FloorStyle = { fill: '#dcebfb', line: '#c3d9f5', kind: 'bath' }
const TILE: FloorStyle = { fill: '#eef1f6', line: '#dde3ec', kind: 'tile' }

/** Floor texture (fill + pattern-line colour + pattern kind) for a room type. */
export function floorStyle(type: RoomType): FloorStyle {
  switch (type) {
    case 'BATHROOM':
      return BATH
    case 'KITCHEN':
    case 'CAR_PORCH':
      return TILE
    case 'BEDROOM':
    case 'LIVING':
    case 'DRAWING':
    case 'DINING':
    case 'LOBBY':
    case 'STORE':
      return WOOD
  }
}
