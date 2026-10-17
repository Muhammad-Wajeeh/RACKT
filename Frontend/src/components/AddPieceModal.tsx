import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  cutOutBackground,
  prepareImage,
  preloadCutoutModel,
  removePieceImage,
  uploadPieceImage,
  type PreparedImage,
} from '../lib/images'
import { detectColor, type DetectedColor } from '../lib/colors'
import { CATEGORIES, createPiece, type Category, type Piece } from '../lib/pieces'
import './AddPieceModal.css'

interface AddPieceModalProps {
  onClose: () => void
  onCreated: (piece: Piece) => void
}

interface Photo {
  image: PreparedImage
  previewUrl: string
}

function toPhoto(image: PreparedImage): Photo {
  return { image, previewUrl: URL.createObjectURL(image.blob) }
}

export default function AddPieceModal({ onClose, onCreated }: AddPieceModalProps) {
  const { user } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [original, setOriginal] = useState<Photo | null>(null)
  const [cutout, setCutout] = useState<Photo | null>(null)
  const [useCutout, setUseCutout] = useState(false)
  const [color, setColor] = useState<DetectedColor | null>(null)
  const [cutStatus, setCutStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
    preloadCutoutModel()
  }, [])

  // Free each preview's object URL when it's replaced or the modal closes.
  useEffect(() => {
    const url = original?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [original])

  useEffect(() => {
    const url = cutout?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [cutout])

  const shown = useCutout && cutout ? cutout : original
  const cutting = cutStatus !== null

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const image = await prepareImage(file)
      setOriginal(toPhoto(image))
      setCutout(null)
      setUseCutout(false)
      setColor(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that image.')
    }
  }

  function clearPhoto() {
    setOriginal(null)
    setCutout(null)
    setUseCutout(false)
    setColor(null)
  }

  async function handleCutout() {
    if (!original) return
    setError(null)
    setCutStatus('Cutting out…')
    try {
      const image = await cutOutBackground(original.image, setCutStatus)
      setCutout(toPhoto(image))
      setUseCutout(true)
      // Colour detection is best-effort; a failure just means no colour is saved.
      setColor(await detectColor(image.blob).catch(() => null))
    } catch (err) {
      setError(
        err instanceof Error ? `Background removal failed: ${err.message}` : 'Background removal failed.',
      )
    } finally {
      setCutStatus(null)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const brand = String(form.get('brand') ?? '').trim()
    const price = String(form.get('price') ?? '').trim()
    const wears = String(form.get('wear_count') ?? '').trim()

    if (!name) return setError('Name is required.')
    if (!user) return setError('You need to be signed in.')

    setBusy(true)
    const id = crypto.randomUUID()
    let imagePath: string | null = null
    try {
      if (shown) imagePath = await uploadPieceImage(user.id, id, shown.image)
      // Only cutouts get an auto-detected colour.
      const savedColor = useCutout && cutout ? color : null
      const piece = await createPiece({
        id,
        image_path: imagePath,
        color_hex: savedColor?.hex ?? null,
        color_name: savedColor?.name ?? null,
        name,
        brand: brand || null,
        category: form.get('category') as Category,
        price: price === '' ? null : Number(price),
        wear_count: wears === '' ? 0 : Number(wears),
      })
      onCreated(piece)
      onClose()
    } catch (err) {
      // Don't leave an orphaned upload behind if the row insert failed.
      if (imagePath) await removePieceImage(imagePath)
      setError(err instanceof Error ? err.message : 'Could not add the piece.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="modal__form" onSubmit={handleSubmit}>
        <header className="modal__header">
          <div>
            <span className="modal__eyebrow">Catalogue</span>
            <h2>Add piece</h2>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal__photo">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFile}
          />
          {shown ? (
            <>
              <img
                src={shown.previewUrl}
                alt="Selected piece"
                className={useCutout && cutout ? 'modal__photo-img--cutout' : undefined}
              />
              {cutting && <div className="modal__photo-busy">{cutStatus}</div>}
              <div className="modal__photo-actions">
                {cutout ? (
                  <div className="modal__toggle" role="group" aria-label="Photo version">
                    <button
                      type="button"
                      className={!useCutout ? 'is-active' : undefined}
                      onClick={() => setUseCutout(false)}
                    >
                      ORIGINAL
                    </button>
                    <button
                      type="button"
                      className={useCutout ? 'is-active' : undefined}
                      onClick={() => setUseCutout(true)}
                    >
                      CUTOUT
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn" disabled={cutting} onClick={handleCutout}>
                    REMOVE BACKGROUND
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  disabled={cutting}
                  onClick={() => fileRef.current?.click()}
                >
                  REPLACE
                </button>
                <button type="button" className="btn" disabled={cutting} onClick={clearPhoto}>
                  REMOVE
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="modal__photo-empty"
              onClick={() => fileRef.current?.click()}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <span>Add a photo</span>
              <small>optional</small>
            </button>
          )}
        </div>

        {useCutout && cutout && color && (
          <p className="modal__color">
            <i style={{ background: color.hex }} aria-hidden="true" />
            Detected color: <strong>{color.name}</strong>
          </p>
        )}

        <label className="modal__field">
          <span>Name</span>
          <input name="name" required maxLength={120} placeholder="Ribbed Turtleneck" autoFocus />
        </label>

        <label className="modal__field">
          <span>Brand</span>
          <input name="brand" placeholder="Isadora Studio" />
        </label>

        <label className="modal__field">
          <span>Category</span>
          <select name="category" defaultValue="Clothing">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="modal__row">
          <label className="modal__field">
            <span>Price ($)</span>
            <input name="price" type="number" min="0" step="0.01" placeholder="0.00" />
          </label>
          <label className="modal__field">
            <span>Times worn</span>
            <input name="wear_count" type="number" min="0" step="1" placeholder="0" />
          </label>
        </div>

        {error && (
          <p className="modal__error" role="alert">
            {error}
          </p>
        )}

        <footer className="modal__actions">
          <button type="button" className="btn" onClick={onClose}>
            CANCEL
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || cutting}>
            {busy ? 'ADDING…' : 'ADD PIECE'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
