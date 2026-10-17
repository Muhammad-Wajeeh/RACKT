import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { getSignedUrls } from '../lib/images'
import { fetchPiece, type Piece } from '../lib/pieces'
import './PieceDetailPage.css'

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const money = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`)
const date = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

type Load =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error'; message: string }
  | { state: 'ready'; piece: Piece; imageUrl: string | null }

export default function PieceDetailPage() {
  const { id } = useParams()
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchPiece(id)
      .then(async (piece) => {
        if (!piece) return { state: 'missing' } as const
        let imageUrl: string | null = null
        if (piece.image_path) {
          const urls = await getSignedUrls([piece.image_path]).catch(() => ({}) as Record<string, string>)
          imageUrl = urls[piece.image_path] ?? null
        }
        return { state: 'ready', piece, imageUrl } as const
      })
      .catch((err: Error) => ({ state: 'error', message: err.message }) as const)
      .then((result) => {
        if (!cancelled) setLoad(result)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const piece = load.state === 'ready' ? load.piece : null

  return (
    <>
      <PageHeader eyebrow={piece?.category ?? 'Catalogue'} title={piece?.name ?? 'Piece'}>
        <div className="detail-actions">
          <Link to="/closet" className="btn">
            <svg {...iconProps}>
              <path d="M15 6l-6 6 6 6" />
            </svg>
            THE CLOSET
          </Link>
          {piece && (
            <button type="button" className="btn btn--primary">
              <svg {...iconProps}>
                <path d="m4 20 1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1Z" />
                <path d="m14 7 3 3" />
              </svg>
              EDIT PIECE
            </button>
          )}
        </div>
      </PageHeader>

      <div className="detail-scroll">
        {load.state === 'loading' && <p className="detail-status">Loading…</p>}
        {load.state === 'missing' && (
          <p className="detail-status">That piece doesn't exist. It may have been deleted.</p>
        )}
        {load.state === 'error' && (
          <p className="detail-status detail-status--error">{load.message}</p>
        )}

        {load.state === 'ready' && (
          <div className="detail">
            <div className="detail__image">
              {load.imageUrl ? (
                <img src={load.imageUrl} alt={load.piece.name} />
              ) : (
                <div className="detail__image-empty">
                  <svg {...iconProps} width={32} height={32} strokeWidth={1.5}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <span>No photo yet</span>
                </div>
              )}
            </div>

            <div className="detail__info">
              <div className="detail__stats">
                <div>
                  <strong>{money(load.piece.price)}</strong>
                  <span>Price</span>
                </div>
                <div>
                  <strong>{load.piece.wear_count}</strong>
                  <span>Times worn</span>
                </div>
                <div>
                  <strong>{money(load.piece.cost_per_wear)}</strong>
                  <span>Cost / wear</span>
                </div>
              </div>

              <h3 className="detail__section">Details</h3>
              <dl className="detail__list">
                <div>
                  <dt>Name</dt>
                  <dd>{load.piece.name}</dd>
                </div>
                <div>
                  <dt>Brand</dt>
                  <dd>{load.piece.brand ?? '—'}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{load.piece.category}</dd>
                </div>
                <div>
                  <dt>Added</dt>
                  <dd>{date(load.piece.created_at)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{date(load.piece.updated_at)}</dd>
                </div>
              </dl>

              <div className="detail__buttons">
                <button type="button" className="btn">
                  LOG A WEAR
                </button>
                <button type="button" className="btn">
                  MOVE TO BIN
                </button>
                <button type="button" className="btn detail__delete">
                  DELETE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
