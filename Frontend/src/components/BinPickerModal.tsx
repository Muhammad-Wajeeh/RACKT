import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import type { Bin } from '../lib/bins'
import './AddPieceModal.css' // shared modal styles
import './BinModals.css'

interface BinPickerModalProps {
  title: string
  /** Small line above the title, e.g. the piece's name or "3 pieces". */
  eyebrow: string
  bins: Bin[]
  /** The bin id to start on, or '' for "Not in a bin". */
  initial: string
  submitLabel: string
  onClose: () => void
  /** Moves the pieces; null means "not in a bin". Rejects with an Error (shown) if it fails. */
  onSubmit: (binId: string | null) => Promise<void>
}

export default function BinPickerModal({
  title,
  eyebrow,
  bins,
  initial,
  submitLabel,
  onClose,
  onSubmit,
}: BinPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      await onSubmit(selected || null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move the pieces.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      style={{ width: 400 }}
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
            <span className="modal__eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
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

        <div className="binlist" role="radiogroup" aria-label="Bins">
          <label className={`binopt${selected === '' ? ' is-on' : ''}`}>
            <input
              type="radio"
              name="bin"
              checked={selected === ''}
              onChange={() => setSelected('')}
            />
            <span className="binopt__name">Not in a bin</span>
          </label>
          {bins.map((b) => (
            <label key={b.id} className={`binopt${selected === b.id ? ' is-on' : ''}`}>
              <input
                type="radio"
                name="bin"
                checked={selected === b.id}
                onChange={() => setSelected(b.id)}
              />
              <Inventory2Outlined sx={{ fontSize: 18 }} />
              <span className="binopt__name">{b.name}</span>
            </label>
          ))}
        </div>

        {bins.length === 0 && (
          <p className="binmodal__note">
            You don't have any bins yet. <Link to="/bins">Create one on the Bins page.</Link>
          </p>
        )}

        {error && (
          <p className="modal__error" role="alert">
            {error}
          </p>
        )}

        <footer className="modal__actions">
          <button type="button" className="btn" disabled={busy} onClick={onClose}>
            CANCEL
          </button>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={handleSubmit}>
            {busy ? 'MOVING…' : submitLabel}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
