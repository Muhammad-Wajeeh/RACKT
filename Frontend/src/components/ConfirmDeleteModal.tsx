import { useEffect, useRef, useState, type ReactNode } from 'react'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import './ConfirmDeleteModal.css'

interface ConfirmDeleteModalProps {
  /** e.g. "Delete this piece?" */
  title: string
  /** A summary of what's being deleted, shown in a strip (see `.confirm__thumb` / `.confirm__meta`). */
  subject: ReactNode
  /** The explanation under the strip. */
  message: ReactNode
  confirmLabel: string
  onCancel: () => void
  /** Performs the delete; rejects with an Error if it fails. */
  onConfirm: () => Promise<void>
}

export default function ConfirmDeleteModal({
  title,
  subject,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm() // on success the parent removes the item (and this dialog)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this item.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm"
      aria-labelledby="confirm-title"
      // Esc and backdrop clicks cancel, except while the delete is running.
      onCancel={(e) => {
        if (busy) e.preventDefault()
      }}
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div className="confirm__body">
        <div className="confirm__icon" aria-hidden="true">
          <DeleteOutlineOutlined sx={{ fontSize: 26 }} />
        </div>

        <div className="confirm__head">
          <span className="confirm__eyebrow">Confirm</span>
          <h2 id="confirm-title">{title}</h2>
        </div>

        <div className="confirm__subject">{subject}</div>

        <p className="confirm__text">{message}</p>

        {error && (
          <p className="confirm__error" role="alert">
            {error}
          </p>
        )}

        <div className="confirm__actions">
          <button type="button" className="btn" disabled={busy} onClick={onCancel} autoFocus>
            CANCEL
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={handleConfirm}
          >
            {busy ? 'DELETING…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
