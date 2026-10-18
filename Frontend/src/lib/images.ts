import { supabase } from './supabase'

const BUCKET = 'piece-images'
const MAX_SIDE = 1600

export interface PreparedImage {
  blob: Blob
  ext: 'jpg' | 'png'
}

/** Decode a picked file, fix its orientation, and downscale it so uploads stay small. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error("Couldn't read that image. Try a JPEG or PNG.")
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image processing is not available in this browser.')
  // JPEG has no transparency, so flatten onto white first.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  )
  if (!blob) throw new Error('Could not process that image.')
  return { blob, ext: 'jpg' }
}

/**
 * Removes the background in the browser and returns a transparent PNG.
 * Kept behind this one function so the implementation can be swapped (e.g. for a server API).
 * NOTE: @imgly/background-removal is AGPL-licensed; fine for a personal project, but revisit
 * before any commercial release (see docs/architecture.md).
 */
// Whoever is currently waiting on a cutout gets progress updates, whether the files are
// being fetched by the background preload or by the cutout itself.
let statusListener: ((status: string) => void) | undefined

// preload() and removeBackground() must share the same config, or they fetch different files.
const CUTOUT_CONFIG = {
  output: { format: 'image/png' as const },
  progress: (key: string, current: number, total: number) => {
    if (key.startsWith('fetch') && total > 0) {
      statusListener?.(`Downloading model… ${Math.round((current / total) * 100)}%`)
    } else {
      statusListener?.('Cutting out…')
    }
  },
}

let preloadPromise: Promise<void> | null = null

/**
 * Starts downloading the cutout model in the background. Safe to call repeatedly and never
 * throws: if it fails, the cutout itself just downloads what it needs when requested.
 */
export function preloadCutoutModel(): void {
  if (preloadPromise) return
  preloadPromise = new Promise<void>((resolve) => {
    // Let the UI paint first; the download starts when the browser is idle.
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 1000 })
    else setTimeout(resolve, 200)
  })
    .then(() => import('@imgly/background-removal'))
    .then((mod) => mod.preload(CUTOUT_CONFIG))
    .catch(() => {
      preloadPromise = null
    })
}

export async function cutOutBackground(
  image: PreparedImage,
  onStatus?: (status: string) => void,
): Promise<PreparedImage> {
  statusListener = onStatus
  try {
    // If the preload is still in flight, wait for it (the caller shows the loading state).
    if (preloadPromise) {
      onStatus?.('Downloading model…')
      await preloadPromise
    }
    // Lazy-loaded so the model code stays out of the main bundle.
    const { removeBackground } = await import('@imgly/background-removal')
    onStatus?.('Cutting out…')
    const blob = await removeBackground(image.blob, CUTOUT_CONFIG)
    return { blob, ext: 'png' }
  } finally {
    statusListener = undefined
  }
}

/** Uploads to "<userId>/<pieceId>.<ext>" and returns the storage path. */
export async function uploadPieceImage(
  userId: string,
  pieceId: string,
  image: PreparedImage,
): Promise<string> {
  const path = `${userId}/${pieceId}.${image.ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, image.blob, {
    contentType: image.blob.type,
  })
  if (error) throw error
  return path
}

/**
 * Uploads an outfit cover photo to "<userId>/outfit-<outfitId>-<timestamp>.<ext>". Each upload gets
 * a fresh path, so a replaced cover never shows a stale cached image.
 */
export async function uploadOutfitCover(
  userId: string,
  outfitId: string,
  image: PreparedImage,
): Promise<string> {
  const path = `${userId}/outfit-${outfitId}-${Date.now()}.${image.ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, image.blob, {
    contentType: image.blob.type,
  })
  if (error) throw error
  return path
}

/** Uploads a profile picture to "<userId>/avatar-<timestamp>.<ext>" and returns the storage path. */
export async function uploadAvatar(userId: string, image: PreparedImage): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.${image.ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, image.blob, {
    contentType: image.blob.type,
  })
  if (error) throw error
  return path
}

/** Uploads a bin photo to "<userId>/bin-<binId>-<timestamp>.<ext>" and returns the storage path. */
export async function uploadBinPhoto(
  userId: string,
  binId: string,
  image: PreparedImage,
): Promise<string> {
  const path = `${userId}/bin-${binId}-${Date.now()}.${image.ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, image.blob, {
    contentType: image.blob.type,
  })
  if (error) throw error
  return path
}

export async function removePieceImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}

/** Returns a map of storage path -> short-lived signed URL. */
export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
  if (error) throw error
  const urls: Record<string, string> = {}
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
  }
  return urls
}
