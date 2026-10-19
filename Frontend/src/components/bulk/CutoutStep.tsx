import CheckOutlined from '@mui/icons-material/CheckOutlined'
import type { BulkItem } from '../../lib/bulkItems'
import './Bulk.css'

interface CutoutStepProps {
  items: BulkItem[]
  /** Ids of the photos chosen for background removal. */
  chosen: string[]
  onToggle: (id: string) => void
  onChooseAll: () => void
  onChooseNone: () => void
  onBack: () => void
  onContinue: () => void
}

export default function CutoutStep({
  items,
  chosen,
  onToggle,
  onChooseAll,
  onChooseNone,
  onBack,
  onContinue,
}: CutoutStepProps) {
  return (
    <div className="bk-step">
      <p className="bk-lead">
        Choose the photos you want the background removed from. They'll be processed one at a time in
        the background while you fill in details, and you can always do more later.
      </p>

      <div className="bk-bar">
        <span>
          {chosen.length} of {items.length} chosen
        </span>
        <button type="button" className="btn" onClick={onChooseAll}>
          CHOOSE ALL
        </button>
        <button type="button" className="btn" disabled={chosen.length === 0} onClick={onChooseNone}>
          CHOOSE NONE
        </button>
      </div>

      <div className="bk-thumbs bk-thumbs--large">
        {items.map((item) => {
          const on = chosen.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              className={`bk-thumb bk-thumb--pick${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onToggle(item.id)}
            >
              <img src={item.original.previewUrl} alt={item.fileName} />
              {on && (
                <span className="bk-thumb__check" aria-hidden="true">
                  <CheckOutlined sx={{ fontSize: 14 }} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="bk-footer">
        <button type="button" className="btn" onClick={onBack}>
          BACK
        </button>
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          {chosen.length === 0 ? 'CONTINUE WITHOUT CUTOUTS' : `CONTINUE (${chosen.length} CUTOUTS)`}
        </button>
      </div>
    </div>
  )
}
