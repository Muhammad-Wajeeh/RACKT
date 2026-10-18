import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'rackt-theme'
const query = window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // storage can be blocked; fall back to following the system
  }
  return 'system'
}

const resolve = (pref: ThemePreference): ResolvedTheme =>
  pref === 'system' ? (query.matches ? 'dark' : 'light') : pref

let preference = readPreference()
let resolved = resolve(preference)
let snapshot = `${preference}|${resolved}`
const listeners = new Set<() => void>()

function update() {
  resolved = resolve(preference)
  document.documentElement.dataset.theme = resolved
  snapshot = `${preference}|${resolved}`
  listeners.forEach((l) => l())
}

/** Call once at startup: applies the saved theme and follows system changes when set to "system". */
export function initTheme() {
  update()
  query.addEventListener('change', () => {
    if (preference === 'system') update()
  })
}

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // not saved, but it still applies for this visit
  }
  update()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The current preference (light / dark / system) and the theme it resolves to right now. */
export function useTheme() {
  const [pref, res] = useSyncExternalStore(subscribe, () => snapshot).split('|') as [
    ThemePreference,
    ResolvedTheme,
  ]
  return { preference: pref, resolved: res, setPreference: setThemePreference }
}
