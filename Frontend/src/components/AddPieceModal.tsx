import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import ImageOutlined from '@mui/icons-material/ImageOutlined'
import { useAuth } from '../auth/AuthContext'
import {
  cutOutBackground,
  prepareImage,
  preloadCutoutModel,
  removePieceImage,
  uploadPieceImage,
  type PreparedImage,
} from '../lib/images'
import type { Category } from '../lib/categories'
import { detectColor, type DetectedColor } from '../lib/colors'
import { createPiece, parsePieceForm, type Piece } from '../lib/pieces'
import ColorPicker from './ColorPicker'
import PieceFields from './PieceFields'
import './AddPieceModal.css'

interface AddPieceModalProps {
  categories: Category[]
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

export default function AddPieceModal({ categories, onClose, onCreated }: AddPieceModalProps) {
  const { user } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [original, setOriginal] = useState<Photo | null>(null)
  const [cutout, setCutout] = useState<Photo | null>(null)
  const [useCutout, setUseCutout] = useState(false)
  // The chosen colour: auto-detected from a cutout until you pick one yourself (`manual`).
  const [colorState, setColorState] = useState<{ color: DetectedColor | null; manual: boolean }>({
    color: null,
    manual: false,
  })
  const color = colorState.color
  const [cutStatus, setCutStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal() ignores React's autoFocus, so focus the first field ourselves.
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
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
      setColorState((prev) => (prev.manual ? prev : { color: null, manual: false }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that image.')
    }
  }

  function clearPhoto() {
    setOriginal(null)
    setCutout(null)
    setUseCutout(false)
    setColorState((prev) => (prev.manual ? prev : { color: null, manual: false }))
  }

  async function handleCutout() {
    if (!original) return
    setError(null)
    setCutStatus('Cutting out…')
    try {
      const image = await cutOutBackground(original.image, setCutStatus)
      setCutout(toPhoto(image))
      setUseCutout(true)
      // Colour detection is best-effort, and never overrides a colour you picked yourself.
      const detected = await detectColor(image.blob).catch(() => null)
      setColorState((prev) => (prev.manual ? prev : { color: detected, manual: false }))
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

    let values
    try {
      values = parsePieceForm(new FormData(e.currentTarget))
    } catch (err) {
      return setError(err instanceof Error ? err.message : 'Check the form and try again.')
    }
    if (!user) return setError('You need to be signed in.')

    setBusy(true)
    const id = crypto.randomUUID()
    let imagePath: string | null = null
    try {
      if (shown) imagePath = await uploadPieceImage(user.id, id, shown.image)
      const piece = await createPiece({
        id,
        image_path: imagePath,
        color_hex: color?.hex ?? null,
        color_name: color?.name ?? null,
        ...values,
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
              <ImageOutlined sx={{ fontSize: 26 }} />
              <span>Add a photo</span>
              <small>optional</small>
            </button>
          )}
        </div>

        <PieceFields categories={categories} />

        <ColorPicker
          value={color}
          onChange={(next) => setColorState({ color: next, manual: true })}
          hint={color && !colorState.manual ? 'detected from the cutout, change it if it looks wrong' : undefined}
        />

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
