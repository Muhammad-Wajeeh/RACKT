import { useEffect, useState } from 'react'
import AddOutlined from '@mui/icons-material/AddOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import ImageOutlined from '@mui/icons-material/ImageOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import AddPiecesToBinModal from '../components/AddPiecesToBinModal'
import BinFormModal from '../components/BinFormModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import PageHeader from '../components/PageHeader'
import { deleteBin, fetchBins, movePiecesToBin, type Bin } from '../lib/bins'
import { fetchPieces, type Piece } from '../lib/pieces'
import { useImageUrls } from '../lib/useImageUrls'
import './BinsPage.css'

type Dialog = 'new' | 'edit' | 'delete' | 'add'

export default function BinsPage() {
  const [bins, setBins] = useState<Bin[]>([])
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchBins(), fetchPieces()])
      .then(([loadedBins, loadedPieces]) => {
        setBins(loadedBins)
        setPieces(loadedPieces)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const urls = useImageUrls([...pieces.map((p) => p.image_path), ...bins.map((b) => b.photo_path)])
  const selected = bins.find((b) => b.id === selectedId) ?? null
  const piecesIn = (binId: string) => pieces.filter((p) => p.bin_id === binId)
  const urlFor = (path: string | null) => (path ? (urls[path] ?? null) : null)

  /** Applies the pieces returned by a move to local state. */
  function applyMoved(updated: Piece[]) {
    setPieces((prev) => prev.map((p) => updated.find((u) => u.id === p.id) ?? p))
  }

  async function removeFromBin(pieceId: string) {
    setActionError(null)
    try {
      applyMoved(await movePiecesToBin(null, [pieceId]))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not remove that piece.')
    }
  }

  return (
    <>
      <PageHeader eyebrow="Storage" title="Bins">
        <button type="button" className="btn btn--primary bins-new" onClick={() => setDialog('new')}>
          <AddOutlined sx={{ fontSize: 18 }} />
          NEW BIN
        </button>
      </PageHeader>

      <div className="bins-body">
        <section className="bins-main">
          {error && <p className="bins-status bins-status--error">{error}</p>}
          {loading && <p className="bins-status">Loading your bins…</p>}
          {!loading && !error && bins.length === 0 && (
            <p className="bins-status">No bins yet. Create your first one.</p>
          )}

          <div className="bins-grid">
            {bins.map((b) => {
              const count = piecesIn(b.id).length
              const photo = urlFor(b.photo_path)
              return (
                <article
                  key={b.id}
                  className={`bin${b.id === selectedId ? ' bin--selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={b.id === selectedId}
                  onClick={() => {
                    setSelectedId(b.id)
                    setActionError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedId(b.id)
                      setActionError(null)
                    }
                  }}
                >
                  <div className="bin__top">
                    {photo ? <img className="bin__thumb" src={photo} alt="" /> : <Inventory2Outlined sx={{ fontSize: 20 }} />}
                    <span className="bin__count">
                      {count} {count === 1 ? 'piece' : 'pieces'}
                    </span>
                  </div>
                  <h3>{b.name}</h3>
                  {b.notes && <p>{b.notes}</p>}
                </article>
              )
            })}
          </div>
        </section>

        <aside className={`bins-details${selected ? ' bins-details--filled' : ''}`}>
          {selected ? (
            <div className="bd" key={selected.id}>
              <div className="bd__top">
                <span className="bd__eyebrow">Bin</span>
                <button
                  type="button"
                  className="bd__close"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                >
                  ×
                </button>
              </div>
              <h2>{selected.name}</h2>
              {selected.notes && <p className="bd__notes">{selected.notes}</p>}

              {urlFor(selected.photo_path) && (
                <img className="bd__photo" src={urlFor(selected.photo_path)!} alt={selected.name} />
              )}

              <div className="bd__buttons">
                <button type="button" className="btn btn--primary" onClick={() => setDialog('add')}>
                  <AddOutlined sx={{ fontSize: 16 }} />
                  ADD PIECES
                </button>
                <button type="button" className="btn" onClick={() => setDialog('edit')}>
                  <EditOutlined sx={{ fontSize: 16 }} />
                  EDIT
                </button>
                <button type="button" className="btn bd__delete" onClick={() => setDialog('delete')}>
                  <DeleteOutlineOutlined sx={{ fontSize: 16 }} />
                  DELETE
                </button>
              </div>

              {actionError && <p className="bd__error">{actionError}</p>}

              <h3 className="bd__section">In this bin</h3>
              {piecesIn(selected.id).length === 0 ? (
                <p className="bd__empty">Nothing in this bin yet.</p>
              ) : (
                <ul className="bd__list">
                  {piecesIn(selected.id).map((p) => (
                    <li key={p.id}>
                      <span className="bd__thumb">
                        {urlFor(p.image_path) ? (
                          <img src={urlFor(p.image_path)!} alt="" />
                        ) : (
                          <ImageOutlined sx={{ fontSize: 18 }} />
                        )}
                      </span>
                      <span className="bd__name">{p.name}</span>
                      <button
                        type="button"
                        aria-label={`Take ${p.name} out of this bin`}
                        title="Take out of this bin"
                        onClick={() => removeFromBin(p.id)}
                      >
                        <CloseOutlined sx={{ fontSize: 16 }} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <Inventory2Outlined sx={{ fontSize: 32 }} />
              <p>Select a bin to see what's inside.</p>
            </>
          )}
        </aside>
      </div>

      {dialog === 'new' && (
        <BinFormModal
          onClose={() => setDialog(null)}
          onSaved={(bin) => {
            setBins((prev) => [...prev, bin].sort((a, b) => a.name.localeCompare(b.name)))
            setSelectedId(bin.id)
          }}
        />
      )}

      {dialog === 'edit' && selected && (
        <BinFormModal
          bin={selected}
          photoUrl={urlFor(selected.photo_path)}
          onClose={() => setDialog(null)}
          onSaved={(bin) =>
            setBins((prev) =>
              prev.map((b) => (b.id === bin.id ? bin : b)).sort((a, b) => a.name.localeCompare(b.name)),
            )
          }
        />
      )}

      {dialog === 'add' && selected && (
        <AddPiecesToBinModal
          bin={selected}
          pieces={pieces}
          bins={bins}
          urls={urls}
          onClose={() => setDialog(null)}
          onSubmit={async (ids) => applyMoved(await movePiecesToBin(selected.id, ids))}
        />
      )}

      {dialog === 'delete' && selected && (
        <ConfirmDeleteModal
          title="Delete this bin?"
          subject={
            <>
              <div className="confirm__thumb">
                {urlFor(selected.photo_path) ? <img src={urlFor(selected.photo_path)!} alt="" /> : null}
              </div>
              <div className="confirm__meta">
                <strong>{selected.name}</strong>
                <span>
                  {piecesIn(selected.id).length} {piecesIn(selected.id).length === 1 ? 'piece' : 'pieces'}
                </span>
              </div>
            </>
          }
          message={
            <>
              The bin is removed.{' '}
              <strong>Its pieces are not deleted</strong>; they just won't be in any bin.
            </>
          }
          confirmLabel="DELETE BIN"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            await deleteBin(selected)
            // The database released this bin's pieces; mirror that here.
            setPieces((prev) => prev.map((p) => (p.bin_id === selected.id ? { ...p, bin_id: null } : p)))
            setBins((prev) => prev.filter((b) => b.id !== selected.id))
            setSelectedId(null)
            setDialog(null)
          }}
        />
      )}
    </>
  )
}
