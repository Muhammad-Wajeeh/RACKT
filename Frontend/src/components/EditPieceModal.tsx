import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Category } from '../lib/categories'
import { parsePieceForm, updatePiece, type Piece } from '../lib/pieces'
import PieceFields from './PieceFields'
import './AddPieceModal.css' // shared modal styles

interface EditPieceModalProps {
  piece: Piece
  categories: Category[]
  onClose: () => void
  onSaved: (piece: Piece) => void
}

export default function EditPieceModal({
  piece,
  categories,
  onClose,
  onSaved,
}: EditPieceModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal() ignores React's autoFocus, so focus the first field ourselves.
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    let values
    try {
      values = parsePieceForm(new FormData(e.currentTarget))
    } catch (err) {
      return setError(err instanceof Error ? err.message : 'Check the form and try again.')
    }

    setBusy(true)
    try {
      onSaved(await updatePiece(piece.id, values))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      // Esc and backdrop clicks close it, except while saving.
      onCancel={(e) => {
        if (busy) e.preventDefault()
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <form className="modal__form" onSubmit={handleSubmit}>
        <header className="modal__header">
          <div>
            <span className="modal__eyebrow">Catalogue</span>
            <h2>Edit piece</h2>
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

        <PieceFields piece={piece} categories={categories} />

        {error && (
          <p className="modal__error" role="alert">
            {error}
          </p>
        )}

        <footer className="modal__actions">
          <button type="button" className="btn" disabled={busy} onClick={onClose}>
            CANCEL
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'SAVING…' : 'SAVE CHANGES'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
