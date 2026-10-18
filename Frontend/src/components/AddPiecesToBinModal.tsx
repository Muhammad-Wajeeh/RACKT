import { useEffect, useRef, useState } from 'react'
import ImageOutlined from '@mui/icons-material/ImageOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { binName, type Bin } from '../lib/bins'
import type { Piece } from '../lib/pieces'
import './AddPieceModal.css' // shared modal styles
import './BinModals.css'

interface AddPiecesToBinModalProps {
  bin: Bin
  pieces: Piece[]
  bins: Bin[]
  /** Signed photo URLs keyed by storage path. */
  urls: Record<string, string>
  onClose: () => void
  /** Moves the chosen pieces into the bin; rejects with an Error (shown) if it fails. */
  onSubmit: (pieceIds: string[]) => Promise<void>
}

export default function AddPiecesToBinModal({
  bin,
  pieces,
  bins,
  urls,
  onClose,
  onSubmit,
}: AddPiecesToBinModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [chosen, setChosen] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal() ignores React's autoFocus, so focus the first field ourselves.
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const candidates = pieces
    .filter((p) => p.bin_id !== bin.id)
    .filter((p) => {
      if (terms.length === 0) return true
      const haystack = [p.name, p.brand, binName(bins, p.bin_id)].join(' ').toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })

  function toggle(id: string) {
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      await onSubmit(chosen)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add those pieces.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      style={{ width: 600 }}
      onCancel={(e) => {
        if (busy) e.preventDefault()
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div className="modal__form">
        <header className="modal__header">
          <div>
            <span className="modal__eyebrow">{bin.name}</span>
            <h2>Add pieces</h2>
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <label className="binmodal__search">
          <SearchOutlined sx={{ fontSize: 18 }} />
          <input
            type="search"
            placeholder="Search your closet..."
            aria-label="Search your closet"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-autofocus
          />
        </label>

        <p className="binmodal__note">
          A piece can only be in one bin, so choosing one that's already in another bin moves it here.
        </p>

        <div className="addpieces">
          {candidates.length === 0 && (
            <p className="binmodal__note">
              {pieces.length === 0 ? 'Your closet is empty.' : 'No pieces to add.'}
            </p>
          )}
          {candidates.map((p) => {
            const on = chosen.includes(p.id)
            const url = p.image_path ? urls[p.image_path] : undefined
            const elsewhere = binName(bins, p.bin_id)
            return (
              <button
                key={p.id}
                type="button"
                className={`addpiece${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(p.id)}
              >
                <span className="addpiece__image">
                  {url ? <img src={url} alt="" /> : <ImageOutlined sx={{ fontSize: 22 }} />}
                  {on && <span className="addpiece__check">✓</span>}
                </span>
                <span className="addpiece__name">{p.name}</span>
                {elsewhere && <span className="addpiece__bin">in {elsewhere}</span>}
              </button>
            )
          })}
        </div>

        {error && (
          <p className="modal__error" role="alert">
            {error}
          </p>
        )}

        <footer className="modal__actions">
          <button type="button" className="btn" disabled={busy} onClick={onClose}>
            CANCEL
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || chosen.length === 0}
            onClick={handleSubmit}
          >
            {busy ? 'ADDING…' : `ADD ${chosen.length || ''} ${chosen.length === 1 ? 'PIECE' : 'PIECES'}`.replace(/\s+/g, ' ').trim()}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
