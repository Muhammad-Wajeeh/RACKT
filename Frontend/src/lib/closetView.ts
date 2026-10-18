import { colorLightness } from './colors'
import type { Piece } from './pieces'

export type SortKey =
  | 'newest'
  | 'oldest'
  | 'price-desc'
  | 'price-asc'
  | 'color-light'
  | 'color-dark'
  | 'worn-desc'
  | 'worn-asc'
  | 'cpw-asc'
  | 'cpw-desc'

export const DEFAULT_SORT: SortKey = 'newest'

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'color-light', label: 'Color: light to dark' },
  { key: 'color-dark', label: 'Color: dark to light' },
  { key: 'worn-desc', label: 'Most worn' },
  { key: 'worn-asc', label: 'Least worn' },
  { key: 'cpw-asc', label: 'Cost per wear: low to high' },
  { key: 'cpw-desc', label: 'Cost per wear: high to low' },
]

/** Stands in for "no color detected" in the color filter. */
export const NO_COLOR = '__none__'

/** Number inputs are kept as strings so they can be typed freely. */
export type BinMode = 'any' | 'in' | 'out'

export interface Filters {
  colors: string[] // colour names, or NO_COLOR
  priceMin: string
  priceMax: string
  wornMin: string
  wornMax: string
  brands: string[]
  binMode: BinMode // any piece, only pieces in a bin, or only pieces not in a bin
  bins: string[] // bin ids; when set, only pieces in one of these bins
}

export const EMPTY_FILTERS: Filters = {
  colors: [],
  priceMin: '',
  priceMax: '',
  wornMin: '',
  wornMax: '',
  brands: [],
  binMode: 'any',
  bins: [],
}

function num(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Compares two optional numbers; pieces missing the value always sort last. */
function cmp(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return dir * (a - b)
}

export function sortPieces(pieces: Piece[], sort: SortKey): Piece[] {
  const lightness = (p: Piece) => (p.color_hex ? colorLightness(p.color_hex) : null)
  const created = (p: Piece) => new Date(p.created_at).getTime()

  const compare: Record<SortKey, (a: Piece, b: Piece) => number> = {
    newest: (a, b) => created(b) - created(a),
    oldest: (a, b) => created(a) - created(b),
    'price-desc': (a, b) => cmp(a.price, b.price, -1),
    'price-asc': (a, b) => cmp(a.price, b.price, 1),
    'color-light': (a, b) => cmp(lightness(a), lightness(b), -1),
    'color-dark': (a, b) => cmp(lightness(a), lightness(b), 1),
    'worn-desc': (a, b) => b.wear_count - a.wear_count,
    'worn-asc': (a, b) => a.wear_count - b.wear_count,
    'cpw-asc': (a, b) => cmp(a.cost_per_wear, b.cost_per_wear, 1),
    'cpw-desc': (a, b) => cmp(a.cost_per_wear, b.cost_per_wear, -1),
  }
  return [...pieces].sort(compare[sort])
}

/** Filters combine with AND; within colors and within brands, a piece matches any selected value. */
export function filterPieces(pieces: Piece[], f: Filters): Piece[] {
  const priceMin = num(f.priceMin)
  const priceMax = num(f.priceMax)
  const wornMin = num(f.wornMin)
  const wornMax = num(f.wornMax)

  return pieces.filter((p) => {
    if (f.colors.length > 0 && !f.colors.includes(p.color_name ?? NO_COLOR)) return false

    if (priceMin !== null || priceMax !== null) {
      if (p.price == null) return false // unpriced pieces can't satisfy a price range
      if (priceMin !== null && p.price < priceMin) return false
      if (priceMax !== null && p.price > priceMax) return false
    }

    if (wornMin !== null && p.wear_count < wornMin) return false
    if (wornMax !== null && p.wear_count > wornMax) return false

    if (f.brands.length > 0 && !f.brands.includes(p.brand ?? '')) return false

    if (f.binMode === 'in' && !p.bin_id) return false
    if (f.binMode === 'out' && p.bin_id) return false
    if (f.bins.length > 0 && !f.bins.includes(p.bin_id ?? '')) return false
    return true
  })
}

/** How many filter groups are active (colour, price, worn, brand each count once). */
export function activeFilterCount(f: Filters): number {
  return (
    (f.colors.length > 0 ? 1 : 0) +
    (f.priceMin.trim() !== '' || f.priceMax.trim() !== '' ? 1 : 0) +
    (f.wornMin.trim() !== '' || f.wornMax.trim() !== '' ? 1 : 0) +
    (f.brands.length > 0 ? 1 : 0) +
    (f.binMode !== 'any' || f.bins.length > 0 ? 1 : 0)
  )
}

/** Distinct values with how many pieces have each, most common first. */
export function countBy(pieces: Piece[], key: (p: Piece) => string | null): [string, number][] {
  const counts = new Map<string, number>()
  for (const p of pieces) {
    const v = key(p)
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
