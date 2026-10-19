import { useRef, useState } from 'react'
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined'
import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import type { Bin } from '../../lib/bins'
import {
  bulkItemProblem,
  shownPhoto,
  type BulkItem,
  type CutState,
} from '../../lib/bulkItems'
import { buildTree, flattenTree, type Category } from '../../lib/categories'
import ColorPicker from '../ColorPicker'
import '../AddPieceModal.css' // shared modal field styles
import './Bulk.css'

/** In the bulk-apply bar, this value means "set to nothing" (vs '' = leave unchanged). */
const CLEAR = '__clear__'

const CUT_LABELS: Record<CutState, string | null> = {
  none: null,
  queued: 'Queued',
  working: 'Cutting out…',
  done: 'Cut out',
  failed: 'Cutout failed',
}

interface DetailsStepProps {
  items: BulkItem[]
  categories: Category[]
  bins: Bin[]
  activeId: string | null
  onActive: (id: string) => void
  /** Ids ticked for "apply to several at once". */
  checked: string[]
  onChecked: (ids: string[]) => void
  onPatch: (id: string, patch: Partial<BulkItem>) => void
  onRemove: (id: string) => void
  onQueueCutout: (id: string) => void
  onApply: (ids: string[], patch: Partial<BulkItem>) => void
  onAddFiles: (files: File[]) => void
  reading: { done: number; total: number } | null
}

export default function DetailsStep({
  items,
  categories,
  bins,
  activeId,
  onActive,
  checked,
  onChecked,
  onPatch,
  onRemove,
  onQueueCutout,
  onApply,
  onAddFiles,
  reading,
}: DetailsStepProps) {
  const moreRef = useRef<HTMLInputElement>(null)
  const categoryOptions = flattenTree(buildTree(categories))

  // The bulk-apply bar's own choices.
  const [applyCategory, setApplyCategory] = useState('')
  const [applyBin, setApplyBin] = useState('')
  const [applyBrand, setApplyBrand] = useState('')

  const index = items.findIndex((i) => i.id === activeId)
  const active = index === -1 ? null : items[index]!
  const missing = items.filter((i) => bulkItemProblem(i)).length

  function toggleChecked(id: string) {
    onChecked(checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id])
  }

  function applyToChecked() {
    const patch: Partial<BulkItem> = {}
    if (applyCategory) patch.categoryId = applyCategory === CLEAR ? '' : applyCategory
    if (applyBin) patch.binId = applyBin === CLEAR ? '' : applyBin
    if (applyBrand.trim()) patch.brand = applyBrand.trim()
    if (Object.keys(patch).length === 0) return
    onApply(checked, patch)
    setApplyCategory('')
    setApplyBin('')
    setApplyBrand('')
  }

  const canApply = applyCategory !== '' || applyBin !== '' || applyBrand.trim() !== ''

  return (
    <div className="bk-details">
      <section className="bk-details__list">
        <div className="bk-bar">
          <label className="bk-check">
            <input
              type="checkbox"
              checked={items.length > 0 && checked.length === items.length}
              onChange={(e) => onChecked(e.target.checked ? items.map((i) => i.id) : [])}
            />
            Select all
          </label>
          <span className="bk-bar__info">
            {items.length} {items.length === 1 ? 'piece' : 'pieces'}
            {missing > 0 && ` · ${missing} still need details`}
          </span>
          <input
            ref={moreRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])]
              e.target.value = ''
              if (files.length > 0) onAddFiles(files)
            }}
          />
          <button
            type="button"
            className="btn"
            disabled={reading !== null}
            onClick={() => moreRef.current?.click()}
          >
            <AddPhotoAlternateOutlined sx={{ fontSize: 16 }} />
            {reading ? `ADDING ${reading.done}/${reading.total}…` : 'ADD MORE PHOTOS'}
          </button>
        </div>

        {checked.length > 0 && (
          <div className="bk-apply">
            <strong>Apply to {checked.length} selected</strong>
            <select value={applyCategory} onChange={(e) => setApplyCategory(e.target.value)} aria-label="Category">
              <option value="">Category: leave as is</option>
              <option value={CLEAR}>Category: uncategorized</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {'  '.repeat(c.depth - 1)}
                  {c.name}
                </option>
              ))}
            </select>
            <select value={applyBin} onChange={(e) => setApplyBin(e.target.value)} aria-label="Bin">
              <option value="">Bin: leave as is</option>
              <option value={CLEAR}>Bin: not in a bin</option>
              {bins.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              value={applyBrand}
              placeholder="Brand: leave as is"
              aria-label="Brand"
              onChange={(e) => setApplyBrand(e.target.value)}
            />
            <button type="button" className="btn btn--primary" disabled={!canApply} onClick={applyToChecked}>
              APPLY
            </button>
          </div>
        )}

        <div className="bk-tiles">
          {items.map((item) => {
            const problem = bulkItemProblem(item)
            const label = CUT_LABELS[item.cutState]
            return (
              <div
                key={item.id}
                className={`bk-tile${item.id === activeId ? ' is-active' : ''}${item.error ? ' has-error' : ''}`}
              >
                <label className="bk-tile__check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={checked.includes(item.id)}
                    onChange={() => toggleChecked(item.id)}
                    aria-label={`Select ${item.name || item.fileName}`}
                  />
                </label>
                <button
                  type="button"
                  className="bk-tile__remove"
                  aria-label={`Remove ${item.name || item.fileName} from the batch`}
                  title="Remove from batch"
                  onClick={() => onRemove(item.id)}
                >
                  <CloseOutlined sx={{ fontSize: 14 }} />
                </button>
                <button type="button" className="bk-tile__main" onClick={() => onActive(item.id)}>
                  <span className={`bk-tile__image${item.useCutout && item.cutout ? ' is-cutout' : ''}`}>
                    <img src={shownPhoto(item).previewUrl} alt="" />
                    {label && (
                      <span className={`bk-badge bk-badge--${item.cutState}`}>{label}</span>
                    )}
                  </span>
                  <span className={`bk-tile__name${problem ? ' is-missing' : ''}`}>
                    {item.name.trim() || 'Needs a name'}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <aside className="bk-details__editor">
        {active ? (
          <ItemEditor
            key={active.id}
            item={active}
            position={`${index + 1} of ${items.length}`}
            categoryOptions={categoryOptions}
            bins={bins}
            hasPrevious={index > 0}
            hasNext={index < items.length - 1}
            onPrevious={() => onActive(items[index - 1]!.id)}
            onNext={() => onActive(items[index + 1]!.id)}
            onPatch={(patch) => onPatch(active.id, patch)}
            onQueueCutout={() => onQueueCutout(active.id)}
          />
        ) : (
          <p className="bk-empty">Select a photo to add its details.</p>
        )}
      </aside>
    </div>
  )
}

interface ItemEditorProps {
  item: BulkItem
  position: string
  categoryOptions: ReturnType<typeof flattenTree>
  bins: Bin[]
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  onPatch: (patch: Partial<BulkItem>) => void
  onQueueCutout: () => void
}

function ItemEditor({
  item,
  position,
  categoryOptions,
  bins,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onPatch,
  onQueueCutout,
}: ItemEditorProps) {
  const problem = bulkItemProblem(item)
  const hasCutout = item.cutState === 'done' && item.cutout !== null

  return (
    <div className="bk-editor">
      <div className="bk-editor__nav">
        <button type="button" className="btn btn--icon" onClick={onPrevious} disabled={!hasPrevious} aria-label="Previous piece">
          <ChevronLeftOutlined sx={{ fontSize: 18 }} />
        </button>
        <span>{position}</span>
        <button type="button" className="btn btn--icon" onClick={onNext} disabled={!hasNext} aria-label="Next piece">
          <ChevronRightOutlined sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className={`bk-editor__image${item.useCutout && item.cutout ? ' is-cutout' : ''}`}>
        <img src={shownPhoto(item).previewUrl} alt={item.fileName} />
      </div>

      <div className="bk-editor__cut">
        {hasCutout && (
          <div className="modal__toggle" role="group" aria-label="Photo version">
            <button type="button" className={!item.useCutout ? 'is-active' : undefined} onClick={() => onPatch({ useCutout: false })}>
              ORIGINAL
            </button>
            <button type="button" className={item.useCutout ? 'is-active' : undefined} onClick={() => onPatch({ useCutout: true })}>
              CUTOUT
            </button>
          </div>
        )}
        {(item.cutState === 'none' || item.cutState === 'failed') && (
          <button type="button" className="btn" onClick={onQueueCutout}>
            {item.cutState === 'failed' ? 'RETRY BACKGROUND REMOVAL' : 'REMOVE BACKGROUND'}
          </button>
        )}
        {item.cutState === 'queued' && <span className="bk-status">Waiting in line for background removal…</span>}
        {item.cutState === 'working' && <span className="bk-status">Removing the background…</span>}
        {item.cutState === 'failed' && <span className="bk-status bk-status--error">The cutout failed; the original photo will be used.</span>}
      </div>

      <label className="modal__field">
        <span>Name</span>
        <input
          value={item.name}
          maxLength={120}
          placeholder="Ribbed Turtleneck"
          onChange={(e) => onPatch({ name: e.target.value })}
        />
      </label>

      <label className="modal__field">
        <span>Brand</span>
        <input value={item.brand} placeholder="Isadora Studio" onChange={(e) => onPatch({ brand: e.target.value })} />
      </label>

      <label className="modal__field">
        <span>Category</span>
        <select value={item.categoryId} onChange={(e) => onPatch({ categoryId: e.target.value })}>
          <option value="">Uncategorized</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {'    '.repeat(c.depth - 1)}
              {c.depth > 1 ? '↳ ' : ''}
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="modal__field">
        <span>Bin</span>
        <select value={item.binId} onChange={(e) => onPatch({ binId: e.target.value })}>
          <option value="">Not in a bin</option>
          {bins.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <div className="modal__row">
        <label className="modal__field">
          <span>Price ($)</span>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={item.price} onChange={(e) => onPatch({ price: e.target.value })} />
        </label>
        <label className="modal__field">
          <span>Times worn</span>
          <input type="number" min="0" step="1" placeholder="0" value={item.wearCount} onChange={(e) => onPatch({ wearCount: e.target.value })} />
        </label>
      </div>

      <ColorPicker
        value={item.color}
        onChange={(color) => onPatch({ color, colorManual: true })}
        hint={item.color && !item.colorManual ? 'detected from the cutout, change it if it looks wrong' : undefined}
      />

      {item.error && <p className="modal__error" role="alert">{item.error}</p>}
      {problem && !item.error && <p className="bk-status bk-status--warn">{problem}</p>}
    </div>
  )
}
