import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined'
import { useAuth } from '../auth/AuthContext'
import { prepareImage, removePieceImage, uploadAvatar, type PreparedImage } from '../lib/images'
import { updateProfile } from '../lib/profile'
import './AddPieceModal.css' // shared modal styles
import './BinModals.css'

interface EditProfileModalProps {
  name: string
  email: string | undefined
  /** The picture to show now (an uploaded one, or a Google one), if any. */
  avatarUrl: string | null
  /** Storage path of the uploaded picture, if the user has one. */
  avatarPath: string | undefined
  onClose: () => void
}

interface NewAvatar {
  image: PreparedImage
  previewUrl: string
}

export default function EditProfileModal({
  name,
  email,
  avatarUrl,
  avatarPath,
  onClose,
}: EditProfileModalProps) {
  const { user } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [newAvatar, setNewAvatar] = useState<NewAvatar | null>(null)
  const [keepExisting, setKeepExisting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal() ignores React's autoFocus, so focus the first field ourselves.
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  // Free a picked picture's preview URL when it's replaced or the dialog closes.
  useEffect(() => {
    const url = newAvatar?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [newAvatar])

  const preview = newAvatar?.previewUrl ?? (keepExisting ? avatarUrl : null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const image = await prepareImage(file)
      setNewAvatar({ image, previewUrl: URL.createObjectURL(image.blob) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that image.')
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const displayName = String(new FormData(e.currentTarget).get('name') ?? '').trim()
    if (!displayName) return setError('Name is required.')
    if (!user) return setError('You need to be signed in.')

    setBusy(true)
    let uploaded: string | null = null
    try {
      if (newAvatar) uploaded = await uploadAvatar(user.id, newAvatar.image)
      // Keep the current uploaded picture unless it was replaced or removed.
      const nextPath = uploaded ?? (keepExisting ? (avatarPath ?? null) : null)
      await updateProfile({ displayName, avatarPath: nextPath })

      // Remove the previous uploaded file if it was replaced or removed.
      if (avatarPath && avatarPath !== nextPath) await removePieceImage(avatarPath)
      onClose()
    } catch (err) {
      if (uploaded) await removePieceImage(uploaded) // don't leave an orphaned upload
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
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
            <span className="modal__eyebrow">Account</span>
            <h2>Edit profile</h2>
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

        <div className="modal__field">
          <span>Photo</span>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
          <div className="binmodal__photo">
            {preview ? (
              <img src={preview} alt="Profile" style={{ borderRadius: '50%' }} />
            ) : (
              <div className="avatar-empty">
                <PersonOutlineOutlined sx={{ fontSize: 32 }} />
              </div>
            )}
            <div>
              <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                {preview ? 'REPLACE' : 'ADD PHOTO'}
              </button>
              {preview && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setNewAvatar(null)
                    setKeepExisting(false)
                  }}
                >
                  REMOVE
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="modal__field">
          <span>Name</span>
          <input name="name" required maxLength={80} defaultValue={name} data-autofocus />
        </label>

        <div className="modal__field">
          <span>Email</span>
          <p className="binmodal__note">{email ?? '—'} (can't be changed here)</p>
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
            {busy ? 'SAVING…' : 'SAVE CHANGES'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
