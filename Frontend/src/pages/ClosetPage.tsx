import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AddPieceModal from '../components/AddPieceModal'
import PageHeader from '../components/PageHeader'
import { getSignedUrls } from '../lib/images'
import { CATEGORIES, fetchPieces, type Piece } from '../lib/pieces'
import './ClosetPage.css'

const FILTERS = ['All', ...CATEGORIES]

function priceLabel(p: Piece) {
  if (p.cost_per_wear != null) return `$${p.cost_per_wear.toFixed(2)} / wear`
  if (p.price != null) return `$${p.price.toFixed(2)}`
  return ''
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function ImageIcon({ size = 26 }: { size?: number }) {
  return (
    <svg {...iconProps} width={size} height={size} strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  )
}

export default function ClosetPage() {
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const requested = useRef(new Set<string>())

  useEffect(() => {
    fetchPieces()
      .then(setPieces)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Fetch signed URLs for any photos we haven't requested yet.
  useEffect(() => {
    const missing = pieces
      .map((p) => p.image_path)
      .filter((path): path is string => !!path && !requested.current.has(path))
    if (missing.length === 0) return
    missing.forEach((path) => requested.current.add(path))
    getSignedUrls(missing)
      .then((map) => setUrls((prev) => ({ ...prev, ...map })))
      .catch(() => missing.forEach((path) => requested.current.delete(path)))
  }, [pieces])

  return (
    <>
      <PageHeader eyebrow="Catalogue" title="The Closet">
        <label className="closet-search">
          <svg {...iconProps} width={16} height={16}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search your closet..." />
        </label>

        <div className="closet-actions">
          <button type="button" className="btn btn--icon" aria-label="Sort and filter">
            <svg {...iconProps}>
              <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="8" cy="17" r="2" />
            </svg>
          </button>
          <button type="button" className="btn">
            <svg {...iconProps}>
              <path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17M11 6.5h10M11 12.5h10M11 18.5h10" />
            </svg>
            SELECT
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
            <svg {...iconProps}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            ADD PIECE
          </button>
        </div>
      </PageHeader>

      <div className="closet-body">
        <section className="closet-main">
          <div className="closet-filters">
            {FILTERS.map((f, i) => (
              <button
                key={f}
                type="button"
                className={`chip${i === 0 ? ' chip--active' : ''}`}
              >
                {f}
              </button>
            ))}
          </div>

          {error && <p className="closet-status closet-status--error">{error}</p>}
          {loading && <p className="closet-status">Loading your closet…</p>}
          {!loading && !error && pieces.length === 0 && (
            <p className="closet-status">Nothing here yet. Add your first piece.</p>
          )}

          <div className="closet-grid">
            {pieces.map((p) => (
              <Link key={p.id} to={`/closet/${p.id}`} className="piece">
                <div className="piece__image">
                  {p.image_path && urls[p.image_path] ? (
                    <img className="piece__photo" src={urls[p.image_path]} alt={p.name} />
                  ) : (
                    <>
                      <ImageIcon />
                      <span className="piece__drop">{p.category}</span>
                    </>
                  )}
                </div>
                <div className="piece__info">
                  <span className="piece__category">{p.category}</span>
                  <h3>{p.name}</h3>
                  <div className="piece__meta">
                    <span>{p.brand}</span>
                    <span>{priceLabel(p)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="closet-details">
          <svg {...iconProps} width={32} height={32} strokeWidth={1.4}>
            <path d="M12 7.5a2.2 2.2 0 1 0-2.2-2.2" />
            <path d="M12 7.5v2L3 17a1.5 1.5 0 0 0 1 2.6h16a1.5 1.5 0 0 0 1-2.6l-9-7.5" />
          </svg>
          <p>Select a piece to see details.</p>
        </aside>
      </div>

      {adding && (
        <AddPieceModal
          onClose={() => setAdding(false)}
          onCreated={(piece) => setPieces((prev) => [piece, ...prev])}
        />
      )}
    </>
  )
}
