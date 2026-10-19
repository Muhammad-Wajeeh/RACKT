import { useRef, useState, type DragEvent } from 'react'
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import { MAX_BULK_PHOTOS, type BulkItem } from '../../lib/bulkItems'
import './Bulk.css'

interface UploadStepProps {
  items: BulkItem[]
  /** Set while photos are being read; the page adds each one as soon as it's ready. */
  reading: { done: number; total: number } | null
  /** Photos that couldn't be read, or other notes from the last upload. */
  messages: string[]
  onFiles: (files: File[]) => void
  onRemove: (id: string) => void
  onContinue: () => void
}

export default function UploadStep({
  items,
  reading,
  messages,
  onFiles,
  onRemove,
  onContinue,
}: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))
    if (files.length > 0) onFiles(files)
  }

  const full = items.length >= MAX_BULK_PHOTOS

  return (
    <div className="bk-step">
      <div
        className={`bk-drop${dragging ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            if (files.length > 0) onFiles(files)
          }}
        />
        <AddPhotoAlternateOutlined sx={{ fontSize: 34 }} />
        <p className="bk-drop__title">Drop photos here</p>
        <p className="bk-drop__hint">or</p>
        <button
          type="button"
          className="btn"
          disabled={full || reading !== null}
          onClick={() => inputRef.current?.click()}
        >
          CHOOSE PHOTOS
        </button>
        <p className="bk-drop__hint">
          Up to {MAX_BULK_PHOTOS} photos per batch. One piece per photo.
        </p>
      </div>

      {reading && (
        <p className="bk-note">
          Preparing photos… {reading.done} of {reading.total}
        </p>
      )}
      {messages.map((m) => (
        <p key={m} className="bk-note bk-note--error">
          {m}
        </p>
      ))}

      {items.length > 0 && (
        <>
          <p className="bk-count">
            {items.length} {items.length === 1 ? 'photo' : 'photos'} ready
          </p>
          <div className="bk-thumbs">
            {items.map((item) => (
              <div key={item.id} className="bk-thumb">
                <img src={item.original.previewUrl} alt={item.fileName} />
                <button
                  type="button"
                  className="bk-thumb__remove"
                  aria-label={`Remove ${item.fileName}`}
                  onClick={() => onRemove(item.id)}
                >
                  <CloseOutlined sx={{ fontSize: 14 }} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="bk-footer">
        <button
          type="button"
          className="btn btn--primary"
          disabled={items.length === 0 || reading !== null}
          onClick={onContinue}
        >
          CONTINUE
        </button>
      </div>
    </div>
  )
}
