import { Group } from 'react-konva'
import type { FurnitureType } from '@/lib/floorplan/schema'
import type { SymbolProps } from './common'
import { Bed, SideTable, Wardrobe } from './bedroomSymbols'
import { CoffeeTable, Sofa, Tv } from './livingSymbols'
import { Chair, DiningTable } from './diningSymbols'
import { Bathtub, Shower, Sink, Toilet } from './bathroomSymbols'
import { Fridge, KitchenCounter, Stove } from './kitchenSymbols'
import { Car } from './miscSymbols'

const REGISTRY: Record<FurnitureType, (props: SymbolProps) => JSX.Element> = {
  BED: Bed,
  WARDROBE: Wardrobe,
  SIDE_TABLE: SideTable,
  SOFA: Sofa,
  TV: Tv,
  COFFEE_TABLE: CoffeeTable,
  DINING_TABLE: DiningTable,
  CHAIR: Chair,
  TOILET: Toilet,
  SINK: Sink,
  BATHTUB: Bathtub,
  SHOWER: Shower,
  KITCHEN_COUNTER: KitchenCounter,
  STOVE: Stove,
  FRIDGE: Fridge,
  CAR: Car,
}

interface FurnitureSymbolProps {
  type: FurnitureType
  /** Axis-aligned footprint in pixels. */
  x: number
  y: number
  width: number
  height: number
  /** 0 / 90 / 180 / 270 — the canonical symbol is rotated around the footprint centre. */
  rotationDeg: number
}

/**
 * Places a canonical furniture symbol inside its footprint. For 90/270 the
 * local box dimensions are swapped so that, once rotated, the symbol's bounding
 * box exactly fills the requested footprint.
 */
export function FurnitureSymbol({ type, x, y, width, height, rotationDeg }: FurnitureSymbolProps) {
  const swapped = Math.abs(rotationDeg % 180) === 90
  const localW = swapped ? height : width
  const localH = swapped ? width : height
  const SymbolShape = REGISTRY[type]

  return (
    <Group
      x={x + width / 2}
      y={y + height / 2}
      offsetX={localW / 2}
      offsetY={localH / 2}
      rotation={rotationDeg}
      listening={false}
    >
      <SymbolShape w={localW} h={localH} />
    </Group>
  )
}
