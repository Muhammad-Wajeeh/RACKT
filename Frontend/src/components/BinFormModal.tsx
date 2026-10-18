import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import ImageOutlined from '@mui/icons-material/ImageOutlined'
import { useAuth } from '../auth/AuthContext'
import { createBin, updateBin, type Bin } from '../lib/bins'
import { prepareImage, removePieceImage, uploadBinPhoto, type PreparedImage } from '../lib/images'
import './AddPieceModal.css' // shared modal styles
import './BinModals.css'

interface BinFormModalProps {
  /** Omit to create a new bin. */
  bin?: Bin
  /** The current photo's signed URL when editing a bin that has one. */
  photoUrl?: string | null
  onClose: () => void
  onSaved: (bin: Bin) => void
}

interface NewPhoto {
  image: PreparedImage
  previewUrl: string
}

export default function BinFormModal({ bin, photoUrl, onClose, onSaved }: BinFormModalProps) {
  const { user } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [newPhoto, setNewPhoto] = useState<NewPhoto | null>(null)
  const [keepExisting, setKeepExisting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal() ignores React's autoFocus, so focus the first field ourselves.
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  // Free a picked photo's preview URL when it's replaced or the dialog closes.
  useEffect(() => {
    const url = newPhoto?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [newPhoto])

  const preview = newPhoto?.previewUrl ?? (keepExisting ? (photoUrl ?? null) : null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const image = await prepareImage(file)
      setNewPhoto({ image, previewUrl: URL.createObjectURL(image.blob) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that image.')
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const notes = String(form.get('notes') ?? '').trim()
    if (!name) return setError('Name is required.')
    if (!user) return setError('You need to be signed in.')

    setBusy(true)
    const id = bin?.id ?? crypto.randomUUID()
    let uploaded: string | null = null
    try {
      if (newPhoto) uploaded = await uploadBinPhoto(user.id, id, newPhoto.image)
      const photo_path = uploaded ?? (keepExisting ? (bin?.photo_path ?? null) : null)
      const values = { name, notes: notes || null, photo_path }
      const saved = bin ? await updateBin(id, values) : await createBin(id, values)

      // Remove the previous photo file if it was replaced or removed.
      if (bin?.photo_path && bin.photo_path !== photo_path) {
        await removePieceImage(bin.photo_path)
      }
      onSaved(saved)
      onClose()
    } catch (err) {
      if (uploaded) await removePieceImage(uploaded) // don't leave an orphaned upload
      setError(err instanceof Error ? err.message : 'Could not save this bin.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
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
            <span className="modal__eyebrow">Storage</span>
            <h2>{bin ? 'Edit bin' : 'New bin'}</h2>
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
            maxLength={80}
            defaultValue={bin?.name}
            placeholder="Winter storage"
            data-autofocus
          />
        </label>

        <label className="modal__field">
          <span>Notes</span>
          <textarea
            name="notes"
            rows={3}
            defaultValue={bin?.notes ?? ''}
            placeholder="Where it lives, what goes in it…"
            className="binmodal__textarea"
          />
        </label>

        <div className="modal__field">
          <span>Photo (optional)</span>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
          {preview ? (
            <div className="binmodal__photo">
              <img src={preview} alt="Bin" />
              <div>
                <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                  REPLACE
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setNewPhoto(null)
                    setKeepExisting(false)
                  }}
                >
                  REMOVE
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="binmodal__photo-add"
              onClick={() => fileRef.current?.click()}
            >
              <ImageOutlined sx={{ fontSize: 22 }} />
              Add a photo of the bin
            </button>
          )}
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
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'SAVING…' : bin ? 'SAVE CHANGES' : 'CREATE BIN'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
