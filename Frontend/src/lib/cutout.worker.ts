/// Runs background removal off the main thread, so the page stays responsive while it works.
/// Talks to src/lib/images.ts (cutOutBackground / preloadCutoutModel).
import { preload, removeBackground, type Config } from '@imgly/background-removal'

type Request = { type: 'preload' } | { type: 'cut'; id: number; blob: Blob }

// Minimal typing for the worker global (the app's TypeScript config targets the DOM, not workers).
const ctx = self as unknown as {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent<Request>) => void) | null
}

// The request whose progress is being reported. Requests are queued by the caller, one at a time.
let currentId = -1

// preload() and removeBackground() must share the same config, or they fetch different files.
const config: Config = {
  output: { format: 'image/png' },
  progress: (key, current, total) =>
    ctx.postMessage({ type: 'progress', id: currentId, key, current, total }),
}

ctx.onmessage = async (event) => {
  const msg = event.data
  try {
    if (msg.type === 'preload') {
      await preload(config)
      return
    }
    currentId = msg.id
    const blob = await removeBackground(msg.blob, config)
    ctx.postMessage({ type: 'done', id: msg.id, blob })
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      id: msg.type === 'cut' ? msg.id : -1,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
