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

/*
 * Background removal.
 *
 * The model runs in a Web Worker (src/lib/cutout.worker.ts) so the rest of the page stays usable
 * while it works. If the worker can't be created or fails, we fall back to running it on the main
 * thread, which works but freezes the page for a few seconds per photo.
 *
 * Kept behind cutOutBackground / preloadCutoutModel so the implementation can be swapped (e.g. for
 * a server API). NOTE: @imgly/background-removal is AGPL-licensed; fine for a personal project, but
 * revisit before any commercial release (see docs/architecture.md).
 */

function progressStatus(key: string, current: number, total: number): string {
  return key.startsWith('fetch') && total > 0
    ? `Downloading model… ${Math.round((current / total) * 100)}%`
    : 'Cutting out…'
}

// ---- Worker path -----------------------------------------------------------------------------

interface PendingCut {
  resolve: (blob: Blob) => void
  reject: (error: Error) => void
  onStatus?: (status: string) => void
}

let worker: Worker | null | undefined // undefined = not created yet, null = unavailable
let nextRequestId = 1
const pending = new Map<number, PendingCut>()

function failAllPending(error: Error) {
  pending.forEach((p) => p.reject(error))
  pending.clear()
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    const w = new Worker(new URL('./cutout.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as
        | { type: 'progress'; id: number; key: string; current: number; total: number }
        | { type: 'done'; id: number; blob: Blob }
        | { type: 'error'; id: number; message: string }
      const p = pending.get(m.id)
      if (!p) return
      if (m.type === 'progress') {
        p.onStatus?.(progressStatus(m.key, m.current, m.total))
      } else {
        pending.delete(m.id)
        if (m.type === 'done') p.resolve(m.blob)
        else p.reject(new Error(m.message))
      }
    }
    w.onerror = () => {
      // The worker itself broke (e.g. failed to load): stop using it and fall back from now on.
      failAllPending(new Error('The background-removal worker failed.'))
      w.terminate()
      worker = null
    }
    worker = w
  } catch {
    worker = null
  }
  return worker
}

// ---- Main-thread fallback --------------------------------------------------------------------

// Whoever is currently waiting on a cutout gets progress updates, whether the files are being
// fetched by the background preload or by the cutout itself.
let statusListener: ((status: string) => void) | undefined

// preload() and removeBackground() must share the same config, or they fetch different files.
const MAIN_THREAD_CONFIG = {
  output: { format: 'image/png' as const },
  progress: (key: string, current: number, total: number) =>
    statusListener?.(progressStatus(key, current, total)),
}

let mainPreloadPromise: Promise<void> | null = null

function preloadOnMainThread() {
  if (mainPreloadPromise) return
  mainPreloadPromise = new Promise<void>((resolve) => {
    // Let the UI paint first; the download starts when the browser is idle.
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 1000 })
    else setTimeout(resolve, 200)
  })
    .then(() => import('@imgly/background-removal'))
    .then((mod) => mod.preload(MAIN_THREAD_CONFIG))
    .catch(() => {
      mainPreloadPromise = null
    })
}

async function cutOutOnMainThread(
  image: PreparedImage,
  onStatus?: (status: string) => void,
): Promise<PreparedImage> {
  statusListener = onStatus
  try {
    // If a preload is still in flight, wait for it (the caller shows the loading state).
    if (mainPreloadPromise) {
      onStatus?.('Downloading model…')
      await mainPreloadPromise
    }
    // Lazy-loaded so the model code stays out of the main bundle.
    const { removeBackground } = await import('@imgly/background-removal')
    onStatus?.('Cutting out…')
    const blob = await removeBackground(image.blob, MAIN_THREAD_CONFIG)
    return { blob, ext: 'png' }
  } finally {
    statusListener = undefined
  }
}

// ---- Public API ------------------------------------------------------------------------------

let preloadRequested = false

/**
 * Starts downloading the cutout model in the background. Safe to call repeatedly and never
 * throws: if it fails, the cutout itself just downloads what it needs when requested.
 */
export function preloadCutoutModel(): void {
  if (preloadRequested) return
  preloadRequested = true
  const w = getWorker()
  if (w) w.postMessage({ type: 'preload' })
  else preloadOnMainThread()
}

/** Removes the background and returns a transparent PNG. */
export async function cutOutBackground(
  image: PreparedImage,
  onStatus?: (status: string) => void,
): Promise<PreparedImage> {
  const w = getWorker()
  if (w) {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const id = nextRequestId++
        pending.set(id, { resolve, reject, onStatus })
        onStatus?.('Cutting out…')
        w.postMessage({ type: 'cut', id, blob: image.blob })
      })
      return { blob, ext: 'png' }
    } catch (err) {
      console.warn('Background removal in a worker failed; retrying on the main thread.', err)
    }
  }
  return cutOutOnMainThread(image, onStatus)
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
