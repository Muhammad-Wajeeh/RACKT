import type { DetectedColor } from './colors'
import type { PreparedImage } from './images'

export interface BulkPhoto {
  image: PreparedImage
  previewUrl: string
}

/** none = no cutout asked for; queued/working = in the background queue; done/failed = finished. */
export type CutState = 'none' | 'queued' | 'working' | 'done' | 'failed'

/** One photo in a batch, with the details being filled in for it. Text fields are kept as strings. */
export interface BulkItem {
  /** Also becomes the piece's id when it is saved. */
  id: string
  fileName: string
  original: BulkPhoto
  cutout: BulkPhoto | null
  cutState: CutState
  /** Show / save the cutout rather than the original (only when a cutout exists). */
  useCutout: boolean
  color: DetectedColor | null
  /** A colour you picked yourself is never replaced by auto-detection. */
  colorManual: boolean
  name: string
  brand: string
  /** '' = uncategorized. */
  categoryId: string
  /** '' = not in a bin. */
  binId: string
  price: string
  wearCount: string
  /** The error from the last failed save attempt, if any. */
  error: string | null
}

export const MAX_BULK_PHOTOS = 40

export function toBulkPhoto(image: PreparedImage): BulkPhoto {
  return { image, previewUrl: URL.createObjectURL(image.blob) }
}

export function newBulkItem(fileName: string, image: PreparedImage): BulkItem {
  return {
    id: crypto.randomUUID(),
    fileName,
    original: toBulkPhoto(image),
    cutout: null,
    cutState: 'none',
    useCutout: false,
    color: null,
    colorManual: false,
    name: '',
    brand: '',
    categoryId: '',
    binId: '',
    price: '',
    wearCount: '',
    error: null,
  }
}

/** The photo currently chosen for this piece. */
export function shownPhoto(item: BulkItem): BulkPhoto {
  return item.useCutout && item.cutout ? item.cutout : item.original
}

/** Frees the browser memory held by an item's preview images. */
export function revokeBulkItem(item: BulkItem) {
  URL.revokeObjectURL(item.original.previewUrl)
  if (item.cutout) URL.revokeObjectURL(item.cutout.previewUrl)
}

/** A user-facing reason the piece can't be saved yet, or null if it's ready. */
export function bulkItemProblem(item: BulkItem): string | null {
  if (!item.name.trim()) return 'Needs a name'
  const price = item.price.trim()
  if (price !== '' && !(Number(price) >= 0)) return 'Price must be 0 or more'
  const wears = item.wearCount.trim()
  if (wears !== '' && !(Number.isInteger(Number(wears)) && Number(wears) >= 0)) {
    return 'Times worn must be a whole number'
  }
  return null
}

/** True while a cutout is still on its way (so saving now would save the plain photo). */
export const cutoutPending = (item: BulkItem) =>
  item.cutState === 'queued' || item.cutState === 'working'
