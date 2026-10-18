import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchPieceCount } from '../lib/pieces'

interface ClosetCountValue {
  /** Null until the first count arrives. */
  count: number | null
  setCount: (count: number) => void
}

const ClosetCountContext = createContext<ClosetCountValue | undefined>(undefined)

/**
 * Holds the number of pieces for the sidebar footer. It's fetched once when you're signed in, and
 * the Closet page keeps it current as pieces are added or deleted.
 */
export function ClosetCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetchPieceCount()
      .then(setCount)
      .catch(() => {}) // the footer just keeps its placeholder
  }, [])

  return <ClosetCountContext.Provider value={{ count, setCount }}>{children}</ClosetCountContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClosetCount() {
  const ctx = useContext(ClosetCountContext)
  if (!ctx) throw new Error('useClosetCount must be used inside <ClosetCountProvider>')
  return ctx
}
