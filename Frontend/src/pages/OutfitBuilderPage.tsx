import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AddOutlined from '@mui/icons-material/AddOutlined'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import DragIndicatorOutlined from '@mui/icons-material/DragIndicatorOutlined'
import ImageOutlined from '@mui/icons-material/ImageOutlined'
import KeyboardArrowDownOutlined from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlined from '@mui/icons-material/KeyboardArrowUpOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { useAuth } from '../auth/AuthContext'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import PageHeader from '../components/PageHeader'
import { binName, fetchBins, type Bin } from '../lib/bins'
import {
  buildTree,
  categoryPath,
  fetchCategories,
  findNode,
  flattenTree,
  subtreeIds,
  type Category,
} from '../lib/categories'
import {
  prepareImage,
  removePieceImage,
  uploadOutfitCover,
  type PreparedImage,
} from '../lib/images'
import {
  MAX_TAGS,
  cleanTag,
  createOutfit,
  deleteOutfit,
  fetchOutfit,
  updateOutfit,
  wearOutfit,
  type Outfit,
} from '../lib/outfits'
import { fetchPieces, type Piece } from '../lib/pieces'
import { useImageUrls } from '../lib/useImageUrls'
import './OutfitBuilderPage.css'

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

interface NewCover {
  image: PreparedImage
  previewUrl: string
}

/** A new look starts with a few empty slots to fill from the top down. */
const STARTING_SLOTS = 3

export default function OutfitBuilderPage() {
  const { id } = useParams() // undefined when creating a new look
  const isNew = !id
  const navigate = useNavigate()
  const { user } = useAuth()
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pieces, setPieces] = useState<Piece[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [bins, setBins] = useState<Bin[]>([])
  const [outfit, setOutfit] = useState<Outfit | null>(null)

  // The look being built. `slots` runs top to bottom; null is an empty slot.
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    Array.from({ length: STARTING_SLOTS }, () => null),
  )
  const [activeSlot, setActiveSlot] = useState<number | null>(0)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [coverPath, setCoverPath] = useState<string | null>(null) // the saved cover
  const [newCover, setNewCover] = useState<NewCover | null>(null) // a picked, unsaved cover

  // The closet picker.
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const [saving, setSaving] = useState(false)
  const [wearing, setWearing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchPieces(),
      fetchCategories(),
      id ? fetchOutfit(id) : Promise.resolve(null),
      fetchBins(),
    ])
      .then(([loadedPieces, loadedCategories, loadedOutfit, loadedBins]) => {
        if (cancelled) return
        setPieces(loadedPieces)
        setCategories(loadedCategories)
        setBins(loadedBins)
        if (id) {
          if (!loadedOutfit) return setLoadState('missing')
          setOutfit(loadedOutfit)
          setName(loadedOutfit.name)
          setNotes(loadedOutfit.notes ?? '')
          setTags(loadedOutfit.tags)
          setCoverPath(loadedOutfit.cover_image_path)
          setSlots(loadedOutfit.piece_ids.filter((pid) => loadedPieces.some((p) => p.id === pid)))
          setActiveSlot(null)
        }
        setLoadState('ready')
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message)
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Free a picked cover's preview URL when it's replaced or the page closes.
  useEffect(() => {
    const url = newCover?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [newCover])

  const urls = useImageUrls([...pieces.map((p) => p.image_path), coverPath])
  const pieceById = new Map(pieces.map((p) => [p.id, p]))
  const urlFor = (p: Piece) => (p.image_path ? (urls[p.image_path] ?? null) : null)

  const filledIds = slots.filter((pid): pid is string => !!pid)

  // Picker filtering: every typed word must match, and the category includes its subcategories.
  const tree = buildTree(categories)
  const categoryNode = categoryId ? findNode(tree, categoryId) : null
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const pickable = pieces.filter((p) => {
    if (categoryNode && !subtreeIds(categoryNode).includes(p.category_id ?? '')) return false
    if (terms.length === 0) return true
    const haystack = [p.name, p.brand, categoryPath(categories, p.category_id), p.color_name]
      .join(' ')
      .toLowerCase()
    return terms.every((t) => haystack.includes(t))
  })

  const coverPreview = newCover?.previewUrl ?? (coverPath ? (urls[coverPath] ?? null) : null)

  // --- slot editing -------------------------------------------------------------------------

  function addSlot() {
    setSlots((prev) => [...prev, null])
    setActiveSlot(slots.length)
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index))
    setActiveSlot((a) => (a === null || a === index ? null : a > index ? a - 1 : a))
  }

  /** Moves a slot and keeps the highlighted slot pointing at the same piece. */
  function moveSlot(from: number, to: number) {
    if (from === to || to < 0 || to >= slots.length) return
    setSlots((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved ?? null)
      return next
    })
    setActiveSlot((a) => {
      if (a === null) return null
      if (a === from) return to
      if (from < a && a <= to) return a - 1
      if (to <= a && a < from) return a + 1
      return a
    })
  }

  /** Click a piece in the closet: fills the highlighted slot, or adds a new slot if none is. */
  function pickPiece(pid: string) {
    const existing = slots.indexOf(pid)
    if (existing !== -1) {
      setActiveSlot(existing) // already in the look; jump to its slot
      return
    }
    if (activeSlot !== null && activeSlot < slots.length) {
      setSlots((prev) => prev.map((s, i) => (i === activeSlot ? pid : s)))
      // Move on to the next empty slot, if there is one.
      const nextEmpty = slots.findIndex((s, i) => i > activeSlot && s === null)
      setActiveSlot(nextEmpty === -1 ? null : nextEmpty)
    } else {
      setSlots((prev) => [...prev, pid])
    }
  }

  // --- tags and cover -----------------------------------------------------------------------

  function commitTag(raw: string, current: string[]): string[] {
    const tag = cleanTag(raw)
    if (!tag || current.includes(tag)) return current
    if (current.length >= MAX_TAGS) {
      setError(`You can add up to ${MAX_TAGS} tags.`)
      return current
    }
    return [...current, tag]
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      setTags(commitTag(tagInput, tags))
      setTagInput('')
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  async function handleCoverFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const image = await prepareImage(file)
      setNewCover({ image, previewUrl: URL.createObjectURL(image.blob) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that image.')
    }
  }

  // --- save / wear --------------------------------------------------------------------------

  async function handleSave() {
    setError(null)
    setNotice(null)
    const trimmed = name.trim()
    if (!trimmed) return setError('Give this look a name.')
    if (filledIds.length === 0) return setError('Fill at least one slot with a piece.')
    if (!user) return setError('You need to be signed in.')

    const finalTags = commitTag(tagInput, tags)
    setSaving(true)
    const outfitId = id ?? crypto.randomUUID()
    let uploaded: string | null = null
    try {
      if (newCover) uploaded = await uploadOutfitCover(user.id, outfitId, newCover.image)
      const cover = uploaded ?? coverPath
      const values = {
        name: trimmed,
        notes: notes.trim() || null,
        tags: finalTags,
        cover_image_path: cover,
      }
      // Empty slots are dropped; the filled ones keep their top-to-bottom order.
      if (isNew) await createOutfit(outfitId, values, filledIds)
      else await updateOutfit(outfitId, values, filledIds)

      // Remove the previous cover file if it was replaced or removed.
      const previous = outfit?.cover_image_path
      if (previous && previous !== cover) await removePieceImage(previous)
      navigate('/outfits')
    } catch (err) {
      if (uploaded) await removePieceImage(uploaded) // don't leave an orphaned upload
      setError(err instanceof Error ? err.message : 'Could not save this look.')
      setSaving(false)
    }
  }

  async function handleWear() {
    if (!id) return
    setWearing(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await wearOutfit(id)
      setPieces((prev) => prev.map((p) => updated.find((u) => u.id === p.id) ?? p))
      setNotice(`Logged a wear for ${updated.length} ${updated.length === 1 ? 'piece' : 'pieces'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log the wear.')
    } finally {
      setWearing(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isNew ? 'The Archive' : 'Your look'}
        title={isNew ? 'New Look' : (outfit?.name ?? 'Look')}
      >
        <div className="ob-actions">
          <Link to="/outfits" className="btn">
            <ArrowBackOutlined sx={{ fontSize: 18 }} />
            YOUR LOOKS
          </Link>
          {loadState === 'ready' && !isNew && (
            <>
              <button
                type="button"
                className="btn"
                disabled={wearing}
                onClick={handleWear}
                title="Adds a wear to every piece in the saved look"
              >
                {wearing ? 'LOGGING…' : 'WEAR THIS OUTFIT'}
              </button>
              <button type="button" className="btn ob-delete" onClick={() => setConfirmingDelete(true)}>
                DELETE
              </button>
            </>
          )}
          {loadState === 'ready' && (
            <button type="button" className="btn btn--primary" disabled={saving} onClick={handleSave}>
              {saving ? 'SAVING…' : 'SAVE LOOK'}
            </button>
          )}
        </div>
      </PageHeader>

      {loadState === 'loading' && <p className="ob-status">Loading…</p>}
      {loadState === 'missing' && (
        <p className="ob-status">That look doesn't exist. It may have been deleted.</p>
      )}
      {loadState === 'error' && <p className="ob-status ob-status--error">{loadError}</p>}

      {loadState === 'ready' && (
        <div className="ob">
          <section className="ob__picker">
            <div className="ob__bar">
              <label className="ob__search">
                <SearchOutlined sx={{ fontSize: 18 }} />
                <input
                  type="search"
                  placeholder="Search your closet..."
                  aria-label="Search your closet"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                className="ob__select"
                aria-label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All categories</option>
                {flattenTree(tree).map((c) => (
                  <option key={c.id} value={c.id}>
                    {'    '.repeat(c.depth - 1)}
                    {c.depth > 1 ? '↳ ' : ''}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="ob__hint">
              {activeSlot !== null && activeSlot < slots.length
                ? `Pick a piece for slot ${activeSlot + 1}.`
                : 'Select a slot on the right, then pick a piece. Clicking a piece with no slot selected adds a new slot.'}
            </p>

            {pieces.length === 0 && <p className="ob-status">Add some pieces to your closet first.</p>}
            {pieces.length > 0 && pickable.length === 0 && (
              <p className="ob-status">No pieces match.</p>
            )}

            <div className="ob__grid">
              {pickable.map((p) => {
                const slotIndex = slots.indexOf(p.id)
                const used = slotIndex !== -1
                const url = urlFor(p)
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`pick${used ? ' is-on' : ''}`}
                    aria-pressed={used}
                    title={used ? `In slot ${slotIndex + 1}` : undefined}
                    onClick={() => pickPiece(p.id)}
                  >
                    <span className="pick__image">
                      {url ? <img src={url} alt="" /> : <ImageOutlined sx={{ fontSize: 22 }} />}
                      {used && (
                        <span className="pick__badge" aria-hidden="true">
                          {slotIndex + 1}
                        </span>
                      )}
                    </span>
                    <span className="pick__name">{p.name}</span>
                    {p.bin_id && <span className="pick__bin">In {binName(bins, p.bin_id)}</span>}
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="ob__side">
            <ol className="slots">
              {slots.map((pid, i) => {
                const piece = pid ? pieceById.get(pid) : undefined
                const url = piece ? urlFor(piece) : null
                return (
                  <li
                    key={i}
                    className={[
                      'slot',
                      activeSlot === i ? 'slot--active' : '',
                      dragFrom === i ? 'slot--dragging' : '',
                      dragOver === i && dragFrom !== i ? 'slot--over' : '',
                    ].join(' ')}
                    draggable
                    onDragStart={(e) => {
                      setDragFrom(i)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (dragOver !== i) setDragOver(i)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragFrom !== null) moveSlot(dragFrom, i)
                      setDragFrom(null)
                      setDragOver(null)
                    }}
                    onDragEnd={() => {
                      setDragFrom(null)
                      setDragOver(null)
                    }}
                  >
                    <span className="slot__grip" aria-hidden="true" title="Drag to reorder">
                      <DragIndicatorOutlined sx={{ fontSize: 18 }} />
                    </span>

                    <button
                      type="button"
                      className="slot__thumb"
                      aria-label={`Select slot ${i + 1}`}
                      onClick={() => setActiveSlot(i)}
                    >
                      {piece ? (
                        url ? (
                          <img src={url} alt="" />
                        ) : (
                          <ImageOutlined sx={{ fontSize: 24 }} />
                        )
                      ) : (
                        <AddOutlined sx={{ fontSize: 24 }} />
                      )}
                    </button>

                    <div className="slot__meta">
                      <span className="slot__num">Slot {i + 1}</span>
                      {piece ? (
                        <>
                          <strong>{piece.name}</strong>
                          <span>
                            {[
                              categoryPath(categories, piece.category_id),
                              piece.brand,
                              piece.bin_id ? `In ${binName(bins, piece.bin_id)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </>
                      ) : (
                        <span className="slot__empty">
                          {activeSlot === i ? 'Pick a piece from your closet' : 'Empty'}
                        </span>
                      )}
                    </div>

                    <div className="slot__controls">
                      <button
                        type="button"
                        aria-label={`Move slot ${i + 1} up`}
                        disabled={i === 0}
                        onClick={() => moveSlot(i, i - 1)}
                      >
                        <KeyboardArrowUpOutlined sx={{ fontSize: 18 }} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move slot ${i + 1} down`}
                        disabled={i === slots.length - 1}
                        onClick={() => moveSlot(i, i + 1)}
                      >
                        <KeyboardArrowDownOutlined sx={{ fontSize: 18 }} />
                      </button>
                      <button
                        type="button"
                        className="slot__remove"
                        aria-label={`Remove slot ${i + 1}`}
                        onClick={() => removeSlot(i)}
                      >
                        <CloseOutlined sx={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>

            <button type="button" className="slot-add" onClick={addSlot}>
              <AddOutlined sx={{ fontSize: 18 }} />
              ADD SLOT
            </button>

            {error && (
              <p className="ob__error" role="alert">
                {error}
              </p>
            )}
            {notice && <p className="ob__notice">{notice}</p>}

            <label className="ob__field">
              <span>Name</span>
              <input
                value={name}
                maxLength={120}
                placeholder="Friday dinner"
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="ob__field">
              <span>Occasion / season tags</span>
              <div className="ob__tags">
                {tags.map((t) => (
                  <span key={t} className="ob__tag">
                    {t}
                    <button
                      type="button"
                      aria-label={`Remove tag ${t}`}
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  placeholder={tags.length === 0 ? 'work, winter… (press Enter)' : ''}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  onBlur={() => {
                    setTags(commitTag(tagInput, tags))
                    setTagInput('')
                  }}
                />
              </div>
            </div>

            <label className="ob__field">
              <span>Notes</span>
              <textarea
                rows={3}
                value={notes}
                placeholder="Anything worth remembering about this look"
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <div className="ob__field">
              <span>Cover photo (optional)</span>
              <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverFile} />
              {coverPreview ? (
                <div className="ob__cover">
                  <img src={coverPreview} alt="Cover" />
                  <div>
                    <button type="button" className="btn" onClick={() => coverInputRef.current?.click()}>
                      REPLACE
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setNewCover(null)
                        setCoverPath(null)
                      }}
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="ob__cover-add" onClick={() => coverInputRef.current?.click()}>
                  <ImageOutlined sx={{ fontSize: 22 }} />
                  Add a photo of the look
                </button>
              )}
              <small>A cover replaces the stacked pieces on your Looks page.</small>
            </div>
          </aside>
        </div>
      )}

      {confirmingDelete && outfit && (
        <ConfirmDeleteModal
          title="Delete this look?"
          subject={
            <div className="confirm__meta">
              <strong>{outfit.name}</strong>
              <span>
                {outfit.piece_ids.length} {outfit.piece_ids.length === 1 ? 'piece' : 'pieces'}
              </span>
            </div>
          }
          message={
            <>
              The look is removed. <strong>Your pieces are not deleted.</strong> This can't be undone.
            </>
          }
          confirmLabel="DELETE LOOK"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            await deleteOutfit(outfit)
            navigate('/outfits')
          }}
        />
      )}
    </>
  )
}
