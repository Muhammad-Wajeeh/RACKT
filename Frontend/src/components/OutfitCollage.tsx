import ImageOutlined from '@mui/icons-material/ImageOutlined'
import './OutfitCollage.css'

export interface CollageTile {
  id: string
  name: string
  url: string | null
}

interface OutfitCollageProps {
  /** Pieces from top to bottom. */
  tiles: CollageTile[]
  /** A cover photo replaces the stack when present. */
  coverUrl?: string | null
}

/** An outfit's pieces stacked vertically, top to bottom, in a portrait frame. */
export default function OutfitCollage({ tiles, coverUrl }: OutfitCollageProps) {
  if (coverUrl) {
    return (
      <div className="collage collage--cover">
        <img src={coverUrl} alt="" />
      </div>
    )
  }

  if (tiles.length === 0) {
    return (
      <div className="collage collage--empty">
        <ImageOutlined sx={{ fontSize: 26 }} />
        <span>No pieces yet</span>
      </div>
    )
  }

  return (
    <div className="collage">
      {tiles.map((t) => (
        <div key={t.id} className="collage__tile" title={t.name}>
          {t.url ? <img src={t.url} alt={t.name} /> : <span>{t.name}</span>}
        </div>
      ))}
    </div>
  )
}
