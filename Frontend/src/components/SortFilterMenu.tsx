import { useEffect, useRef, useState } from 'react'
import TuneOutlined from '@mui/icons-material/TuneOutlined'
import type { Bin } from '../lib/bins'
import { swatchFor } from '../lib/colors'
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  NO_COLOR,
  SORT_OPTIONS,
  activeFilterCount,
  countBy,
  type BinMode,
  type Filters,
  type SortKey,
} from '../lib/closetView'
import type { Piece } from '../lib/pieces'
import './SortFilterMenu.css'

interface SortFilterMenuProps {
  /** All pieces, used to build the colour and brand choices. */
  pieces: Piece[]
  bins: Bin[]
  sort: SortKey
  onSortChange: (sort: SortKey) => void
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  shownCount: number
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

const BIN_MODES: { mode: BinMode; label: string }[] = [
  { mode: 'any', label: 'Any' },
  { mode: 'in', label: 'In a bin' },
  { mode: 'out', label: 'Not in a bin' },
]

export default function SortFilterMenu({
  pieces,
  bins,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  shownCount,
}: SortFilterMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const colorChoices = countBy(pieces, (p) => p.color_name)
  const uncolored = pieces.filter((p) => !p.color_name).length
  const brandChoices = countBy(pieces, (p) => p.brand)

  const activeCount = activeFilterCount(filters) + (sort !== DEFAULT_SORT ? 1 : 0)
  const set = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch })

  return (
    <div className="sf" ref={rootRef}>
      <button
        type="button"
        className={`btn btn--icon${activeCount > 0 ? ' sf__trigger--active' : ''}`}
        aria-label="Sort and filter"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <TuneOutlined sx={{ fontSize: 18 }} />
        {activeCount > 0 && <span className="sf__badge">{activeCount}</span>}
      </button>

      {open && (
        <div className="sf__panel" role="dialog" aria-label="Sort and filter">
          <section className="sf__section">
            <label className="sf__label" htmlFor="sf-sort">
              Sort by
            </label>
            <select
              id="sf-sort"
              className="sf__select"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="sf__note">Pieces without a price or color always sort to the end.</p>
          </section>

          <section className="sf__section">
            <span className="sf__label">Color</span>
            {colorChoices.length === 0 && uncolored === 0 ? (
              <p className="sf__note">No pieces yet.</p>
            ) : (
              <div className="sf__chips">
                {colorChoices.map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    className={`sf__chip${filters.colors.includes(name) ? ' is-on' : ''}`}
                    aria-pressed={filters.colors.includes(name)}
                    onClick={() => set({ colors: toggle(filters.colors, name) })}
                  >
                    <i style={{ background: swatchFor(name) ?? '#ccc' }} aria-hidden="true" />
                    {name} <small>{count}</small>
                  </button>
                ))}
                {uncolored > 0 && (
                  <button
                    type="button"
                    className={`sf__chip${filters.colors.includes(NO_COLOR) ? ' is-on' : ''}`}
                    aria-pressed={filters.colors.includes(NO_COLOR)}
                    onClick={() => set({ colors: toggle(filters.colors, NO_COLOR) })}
                  >
                    No color <small>{uncolored}</small>
                  </button>
                )}
              </div>
            )}
            <p className="sf__note">Colors are detected when you remove a photo's background.</p>
          </section>

          <section className="sf__section">
            <span className="sf__label">Price</span>
            <div className="sf__range">
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Min $"
                aria-label="Minimum price"
                value={filters.priceMin}
                onChange={(e) => set({ priceMin: e.target.value })}
              />
              <span>to</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Max $"
                aria-label="Maximum price"
                value={filters.priceMax}
                onChange={(e) => set({ priceMax: e.target.value })}
              />
            </div>
            <p className="sf__note">Pieces without a price are hidden while a price range is set.</p>
          </section>

          <section className="sf__section">
            <span className="sf__label">Times worn</span>
            <div className="sf__range">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Min"
                aria-label="Minimum times worn"
                value={filters.wornMin}
                onChange={(e) => set({ wornMin: e.target.value })}
              />
              <span>to</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Max"
                aria-label="Maximum times worn"
                value={filters.wornMax}
                onChange={(e) => set({ wornMax: e.target.value })}
              />
            </div>
            <div className="sf__chips">
              <button
                type="button"
                className={`sf__chip${filters.wornMin === '' && filters.wornMax === '0' ? ' is-on' : ''}`}
                onClick={() =>
                  set(
                    filters.wornMax === '0' && filters.wornMin === ''
                      ? { wornMax: '' }
                      : { wornMin: '', wornMax: '0' },
                  )
                }
              >
                Never worn
              </button>
            </div>
          </section>

          <section className="sf__section">
            <span className="sf__label">Brand</span>
            {brandChoices.length === 0 ? (
              <p className="sf__note">No brands entered yet.</p>
            ) : (
              <div className="sf__chips sf__chips--scroll">
                {brandChoices.map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    className={`sf__chip${filters.brands.includes(name) ? ' is-on' : ''}`}
                    aria-pressed={filters.brands.includes(name)}
                    onClick={() => set({ brands: toggle(filters.brands, name) })}
                  >
                    {name} <small>{count}</small>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="sf__section">
            <span className="sf__label">Bin</span>
            <div className="sf__seg" role="group" aria-label="Bin status">
              {BIN_MODES.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  className={filters.binMode === m.mode ? 'is-on' : undefined}
                  aria-pressed={filters.binMode === m.mode}
                  onClick={() => set({ binMode: m.mode })}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {bins.length > 0 && (
              <div className="sf__chips">
                {bins.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`sf__chip${filters.bins.includes(b.id) ? ' is-on' : ''}`}
                    aria-pressed={filters.bins.includes(b.id)}
                    onClick={() => set({ bins: toggle(filters.bins, b.id) })}
                  >
                    {b.name} <small>{pieces.filter((p) => p.bin_id === b.id).length}</small>
                  </button>
                ))}
              </div>
            )}
          </section>

          <footer className="sf__footer">
            <span>
              Showing {shownCount} of {pieces.length}
            </span>
            <button
              type="button"
              className="btn"
              disabled={activeCount === 0}
              onClick={() => {
                onFiltersChange(EMPTY_FILTERS)
                onSortChange(DEFAULT_SORT)
              }}
            >
              CLEAR ALL
            </button>
          </footer>
        </div>
      )}
    </div>
  )
}
