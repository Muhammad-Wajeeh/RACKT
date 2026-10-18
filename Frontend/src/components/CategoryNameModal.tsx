import { useEffect, useRef, useState, type FormEvent } from 'react'
import './AddPieceModal.css' // shared modal styles

interface CategoryNameModalProps {
  /** e.g. "New type", "New subtype", "Rename". */
  title: string
  /** Small line above the title, e.g. "Inside Tops". */
  eyebrow: string
  initialName?: string
  submitLabel: string
  onClose: () => void
  /** Saves the name; rejects with an Error (shown in the dialog) if it fails. */
  onSubmit: (name: string) => Promise<void>
}

export default function CategoryNameModal({
  title,
  eyebrow,
  initialName = '',
  submitLabel,
  onClose,
  onSubmit,
}: CategoryNameModalProps) {
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
    const name = String(new FormData(e.currentTarget).get('name') ?? '').trim()
    if (!name) return setError('Name is required.')

    setBusy(true)
    try {
      await onSubmit(name)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that name.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      style={{ width: 380 }}
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

        <label className="modal__field">
          <span>Name</span>
          <input
            name="name"
            required
            maxLength={60}
            defaultValue={initialName}
            placeholder="e.g. T-shirts"
            data-autofocus
          />
        </label>

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
            {busy ? 'SAVING…' : submitLabel}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
