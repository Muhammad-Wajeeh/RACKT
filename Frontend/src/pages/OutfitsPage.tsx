import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AddOutlined from '@mui/icons-material/AddOutlined'
import DryCleaningOutlined from '@mui/icons-material/DryCleaningOutlined'
import OutfitCollage from '../components/OutfitCollage'
import PageHeader from '../components/PageHeader'
import { fetchOutfits, type Outfit } from '../lib/outfits'
import { fetchPieces, type Piece } from '../lib/pieces'
import { useImageUrls } from '../lib/useImageUrls'
import './OutfitsPage.css'

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tag, setTag] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchOutfits(), fetchPieces()])
      .then(([loadedOutfits, loadedPieces]) => {
        setOutfits(loadedOutfits)
        setPieces(loadedPieces)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const urls = useImageUrls([
    ...pieces.map((p) => p.image_path),
    ...outfits.map((o) => o.cover_image_path),
  ])
  const pieceById = new Map(pieces.map((p) => [p.id, p]))

  const allTags = [...new Set(outfits.flatMap((o) => o.tags))].sort()
  const visible = outfits.filter((o) => tag === null || o.tags.includes(tag))

  return (
    <>
      <PageHeader eyebrow="The Archive" title="Your Looks">
        <Link to="/outfits/new" className="btn btn--primary outfits-new">
          <AddOutlined sx={{ fontSize: 18 }} />
          NEW LOOK
        </Link>
      </PageHeader>

      <div className="outfits-scroll">
        {error && <p className="outfits-status outfits-status--error">{error}</p>}
        {loading && <p className="outfits-status">Loading your looks…</p>}

        {!loading && !error && outfits.length === 0 && (
          <div className="outfits-empty">
            <DryCleaningOutlined sx={{ fontSize: 32 }} />
            <p>No looks saved yet — build your first.</p>
          </div>
        )}

        {allTags.length > 0 && (
          <div className="look-tags">
            <button
              type="button"
              className={`look-tag${tag === null ? ' is-on' : ''}`}
              onClick={() => setTag(null)}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                className={`look-tag${tag === t ? ' is-on' : ''}`}
                onClick={() => setTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="looks">
          {visible.map((o) => {
            const tiles = o.piece_ids
              .map((id) => pieceById.get(id))
              .filter((p): p is Piece => !!p)
              .map((p) => ({
                id: p.id,
                name: p.name,
                url: p.image_path ? (urls[p.image_path] ?? null) : null,
              }))
            return (
              <Link key={o.id} to={`/outfits/${o.id}`} className="look">
                <OutfitCollage
                  tiles={tiles}
                  coverUrl={o.cover_image_path ? (urls[o.cover_image_path] ?? null) : null}
                />
                <div className="look__info">
                  <h3>{o.name}</h3>
                  <span>
                    {tiles.length} {tiles.length === 1 ? 'piece' : 'pieces'}
                    {o.tags.length > 0 && ` · ${o.tags.join(', ')}`}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
