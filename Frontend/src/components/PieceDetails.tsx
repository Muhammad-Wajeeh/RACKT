import { useState } from 'react'
import { binName, type Bin } from '../lib/bins'
import { categoryPath, type Category } from '../lib/categories'
import type { Piece } from '../lib/pieces'
import BinPickerModal from './BinPickerModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import EditPieceModal from './EditPieceModal'
import './PieceDetails.css'

interface PieceDetailsProps {
  piece: Piece
  categories: Category[]
  bins: Bin[]
  imageUrl: string | null
  onClose: () => void
  /** Should delete the piece; rejects with an Error if it fails. */
  onDelete: () => Promise<void>
  /** Should add one wear to the piece; rejects with an Error if it fails. */
  onLogWear: () => Promise<void>
  /** Called with the saved piece after an edit. */
  onUpdated: (piece: Piece) => void
  /** Should move the piece into a bin (null = out of any bin); rejects with an Error if it fails. */
  onMoveToBin: (binId: string | null) => Promise<void>
}

const money = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`)
const date = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

export default function PieceDetails({
  piece,
  categories,
  bins,
  imageUrl,
  onClose,
  onDelete,
  onLogWear,
  onUpdated,
  onMoveToBin,
}: PieceDetailsProps) {
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [moving, setMoving] = useState(false)
  const currentBin = binName(bins, piece.bin_id)
  const [logging, setLogging] = useState(false)
  const [wearError, setWearError] = useState<string | null>(null)
  const path = categoryPath(categories, piece.category_id)

  async function handleLogWear() {
    setLogging(true)
    setWearError(null)
    try {
      await onLogWear()
    } catch (err) {
      setWearError(err instanceof Error ? err.message : 'Could not log that wear.')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="pd">
      <div className="pd__top">
        <span className="pd__eyebrow">{path}</span>
        <button type="button" className="pd__close" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </div>
      <h2>{piece.name}</h2>
      {piece.brand && <p className="pd__brand">{piece.brand}</p>}

      <div className="pd__image">
        {imageUrl ? (
          <img src={imageUrl} alt={piece.name} />
        ) : (
          <span>No photo yet</span>
        )}
      </div>

      <div className="pd__stats">
        <div>
          <strong>{money(piece.price)}</strong>
          <span>Price</span>
        </div>
        <div>
          <strong>{piece.wear_count}</strong>
          <span>Worn</span>
        </div>
        <div>
          <strong>{money(piece.cost_per_wear)}</strong>
          <span>Per wear</span>
        </div>
      </div>

      <dl className="pd__list">
        <div>
          <dt>Category</dt>
          <dd>{path}</dd>
        </div>
        <div>
          <dt>Bin</dt>
          <dd>{currentBin ?? 'Not in a bin'}</dd>
        </div>
        <div>
          <dt>Color</dt>
          <dd>
            {piece.color_hex ? (
              <span className="pd__color">
                <i style={{ background: piece.color_hex }} aria-hidden="true" />
                {piece.color_name}
              </span>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>Added</dt>
          <dd>{date(piece.created_at)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{date(piece.updated_at)}</dd>
        </div>
      </dl>

      <div className="pd__buttons">
        <button type="button" className="btn btn--primary" onClick={() => setEditing(true)}>
          EDIT PIECE
        </button>
        <button type="button" className="btn" disabled={logging} onClick={handleLogWear}>
          {logging ? 'LOGGING…' : 'LOG A WEAR'}
        </button>
        <button type="button" className="btn" onClick={() => setMoving(true)}>
          MOVE TO BIN
        </button>
        <button type="button" className="btn pd__delete" onClick={() => setConfirming(true)}>
          DELETE
        </button>
      </div>

      {wearError && (
        <p className="pd__error" role="alert">
          {wearError}
        </p>
      )}

      {moving && (
        <BinPickerModal
          title="Move to bin"
          eyebrow={piece.name}
          bins={bins}
          initial={piece.bin_id ?? ''}
          submitLabel="MOVE"
          onClose={() => setMoving(false)}
          onSubmit={onMoveToBin}
        />
      )}

      {editing && (
        <EditPieceModal
          piece={piece}
          categories={categories}
          onClose={() => setEditing(false)}
          onSaved={onUpdated}
        />
      )}

      {confirming && (
        <ConfirmDeleteModal
          title="Delete this piece?"
          subject={
            <>
              <div className="confirm__thumb">{imageUrl ? <img src={imageUrl} alt="" /> : null}</div>
              <div className="confirm__meta">
                <strong>{piece.name}</strong>
                <span>{[path, piece.brand].filter(Boolean).join(' · ')}</span>
              </div>
            </>
          }
          message={
            <>
              It will be permanently removed from your closet, along with its photo.{' '}
              <strong>This can't be undone.</strong>
            </>
          }
          confirmLabel="DELETE PIECE"
          onCancel={() => setConfirming(false)}
          onConfirm={onDelete}
        />
      )}
    </div>
  )
}
