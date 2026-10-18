import { useEffect, useRef, useState } from 'react'
import { getSignedUrls } from './images'

/**
 * Turns storage paths into short-lived signed URLs, fetching each path only once.
 * Returns a map of path -> URL that fills in as the URLs arrive.
 */
export function useImageUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const requested = useRef(new Set<string>())
  const key = paths.filter(Boolean).join('|')

  useEffect(() => {
    const missing = key.split('|').filter((path) => path && !requested.current.has(path))
    if (missing.length === 0) return
    missing.forEach((path) => requested.current.add(path))
    getSignedUrls(missing)
      .then((map) => setUrls((prev) => ({ ...prev, ...map })))
      .catch(() => missing.forEach((path) => requested.current.delete(path)))
  }, [key])

  return urls
}
