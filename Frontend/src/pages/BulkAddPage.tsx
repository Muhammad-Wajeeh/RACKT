import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import { useAuth } from '../auth/AuthContext'
import CutoutStep from '../components/bulk/CutoutStep'
import DetailsStep from '../components/bulk/DetailsStep'
import UploadStep from '../components/bulk/UploadStep'
import PageHeader from '../components/PageHeader'
import { fetchBins, type Bin } from '../lib/bins'
import {
  MAX_BULK_PHOTOS,
  bulkItemProblem,
  cutoutPending,
  newBulkItem,
  revokeBulkItem,
  shownPhoto,
  toBulkPhoto,
  type BulkItem,
} from '../lib/bulkItems'
import { fetchCategories, type Category } from '../lib/categories'
import { detectColor } from '../lib/colors'
import {
  cutOutBackground,
  preloadCutoutModel,
  prepareImage,
  removePieceImage,
  uploadPieceImage,
} from '../lib/images'
import { createPiece } from '../lib/pieces'
import './BulkAddPage.css'

type Step = 'upload' | 'cutouts' | 'details'

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'cutouts', label: 'Cutouts' },
  { key: 'details', label: 'Details' },
]

const patchIn = (list: BulkItem[], id: string, patch: Partial<BulkItem>) =>
  list.map((i) => (i.id === id ? { ...i, ...patch } : i))

export default function BulkAddPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState<Step>('upload')
  const [items, setItems] = useState<BulkItem[]>([])
  const [chosen, setChosen] = useState<string[]>([]) // photos picked for background removal
  const [checked, setChecked] = useState<string[]>([]) // photos ticked for "apply to several"
  const [activeId, setActiveId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [bins, setBins] = useState<Bin[]>([])
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null)
  const [messages, setMessages] = useState<string[]>([])
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The latest items, for code that runs after an await.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Ids the cutout queue has already started, so each photo is processed once.
  const startedRef = useRef(new Set<string>())

  useEffect(() => {
    Promise.all([fetchCategories(), fetchBins()])
      .then(([loadedCategories, loadedBins]) => {
        setCategories(loadedCategories)
        setBins(loadedBins)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  // Free the previews' memory when leaving the page.
  useEffect(
    () => () => {
      itemsRef.current.forEach(revokeBulkItem)
    },
    [],
  )

  // Warn before closing the tab with an unsaved batch.
  useEffect(() => {
    if (items.length === 0) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [items.length])

  // The cutout queue: one photo at a time, in the background.
  useEffect(() => {
    if (items.some((i) => i.cutState === 'working')) return
    const next = items.find((i) => i.cutState === 'queued')
    if (!next || startedRef.current.has(next.id)) return
    startedRef.current.add(next.id)
    setItems((prev) => patchIn(prev, next.id, { cutState: 'working' }))

    void (async () => {
      try {
        const result = await cutOutBackground(next.original.image)
        const detected = await detectColor(result.blob).catch(() => null)
        const photo = toBulkPhoto(result)
        if (!itemsRef.current.some((i) => i.id === next.id)) {
          URL.revokeObjectURL(photo.previewUrl) // the photo was removed while it was processing
          return
        }
        setItems((prev) =>
          prev.map((i) =>
            i.id === next.id
              ? {
                  ...i,
                  cutout: photo,
                  cutState: 'done',
                  useCutout: true,
                  // Never replace a colour the user picked themselves.
                  color: i.colorManual ? i.color : detected,
                }
              : i,
          ),
        )
      } catch {
        setItems((prev) => patchIn(prev, next.id, { cutState: 'failed' }))
      }
    })()
  }, [items])

  async function addFiles(files: File[]) {
    const room = Math.max(MAX_BULK_PHOTOS - itemsRef.current.length, 0)
    const batch = files.slice(0, room)
    const notes: string[] = []
    if (files.length > batch.length) {
      notes.push(
        `A batch holds up to ${MAX_BULK_PHOTOS} photos; ${files.length - batch.length} were skipped.`,
      )
    }
    setMessages(notes)
    if (batch.length === 0) return

    preloadCutoutModel() // start fetching the cutout model early
    setReading({ done: 0, total: batch.length })
    let firstNewId: string | null = null
    for (const [i, file] of batch.entries()) {
      try {
        const item = newBulkItem(file.name, await prepareImage(file))
        firstNewId ??= item.id
        setItems((prev) => [...prev, item])
      } catch (err) {
        notes.push(`${file.name}: ${err instanceof Error ? err.message : 'could not be read.'}`)
        setMessages([...notes])
      }
      setReading({ done: i + 1, total: batch.length })
    }
    setReading(null)
    if (firstNewId) setActiveId((prev) => prev ?? firstNewId)
  }

  function removeItem(id: string) {
    const list = itemsRef.current
    const i = list.findIndex((x) => x.id === id)
    if (i === -1) return
    revokeBulkItem(list[i]!)
    const rest = list.filter((x) => x.id !== id)
    setItems(rest)
    setChosen((prev) => prev.filter((x) => x !== id))
    setChecked((prev) => prev.filter((x) => x !== id))
    setActiveId((prev) => (prev === id ? (rest[i] ?? rest[i - 1])?.id ?? null : prev))
    if (rest.length === 0) setStep('upload')
  }

  function queueCutout(id: string) {
    startedRef.current.delete(id) // allows a retry after a failure
    setItems((prev) => patchIn(prev, id, { cutState: 'queued' }))
  }

  function startDetails() {
    setItems((prev) =>
      prev.map((i) => (chosen.includes(i.id) && i.cutState === 'none' ? { ...i, cutState: 'queued' } : i)),
    )
    setActiveId((prev) => prev ?? items[0]?.id ?? null)
    setStep('details')
  }

  const pending = items.filter(cutoutPending).length
  const needDetails = items.filter((i) => bulkItemProblem(i)).length
  const ready = items.length > 0 && needDetails === 0 && pending === 0

  async function saveAll() {
    if (!user) return setError('You need to be signed in.')
    setError(null)
    const batch = items
    const saved = new Set<string>()
    const failures: Record<string, string> = {}
    setSaving({ done: 0, total: batch.length })

    for (const [i, item] of batch.entries()) {
      let path: string | null = null
      try {
        path = await uploadPieceImage(user.id, item.id, shownPhoto(item).image)
        await createPiece({
          id: item.id,
          image_path: path,
          color_hex: item.color?.hex ?? null,
          color_name: item.color?.name ?? null,
          name: item.name.trim(),
          brand: item.brand.trim() || null,
          category_id: item.categoryId || null,
          bin_id: item.binId || null,
          price: item.price.trim() === '' ? null : Number(item.price),
          wear_count: item.wearCount.trim() === '' ? 0 : Number(item.wearCount),
        })
        saved.add(item.id)
      } catch (err) {
        if (path) await removePieceImage(path) // don't leave an orphaned upload
        failures[item.id] = err instanceof Error ? err.message : 'Could not save this piece.'
      }
      setSaving({ done: i + 1, total: batch.length })
    }
    setSaving(null)

    if (saved.size === batch.length) {
      navigate('/closet')
      return
    }

    // Keep only the pieces that failed, each with its error, so they can be fixed and retried.
    batch.filter((i) => saved.has(i.id)).forEach(revokeBulkItem)
    const remaining = batch.filter((i) => !saved.has(i.id))
    setItems(remaining.map((i) => ({ ...i, error: failures[i.id] ?? null })))
    setChecked((prev) => prev.filter((id) => !saved.has(id)))
    setActiveId((prev) => (prev && !saved.has(prev) ? prev : (remaining[0]?.id ?? null)))
    setError(
      `${saved.size} saved. ${remaining.length} could not be saved. Fix them below and try again.`,
    )
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Bulk add">
        <div className="bulk-actions">
          <Link to="/closet" className="btn">
            <ArrowBackOutlined sx={{ fontSize: 18 }} />
            THE CLOSET
          </Link>
          {step === 'details' && (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || saving !== null}
              onClick={saveAll}
            >
              {saving ? `SAVING ${saving.done}/${saving.total}…` : `SAVE ALL (${items.length})`}
            </button>
          )}
        </div>
      </PageHeader>

      <div className="bulk">
        <ol className="bulk-steps">
          {STEPS.map((s, i) => (
            <li
              key={s.key}
              className={i === stepIndex ? 'is-active' : i < stepIndex ? 'is-done' : undefined}
            >
              <span>{i + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>

        {error && (
          <p className="bulk-error" role="alert">
            {error}
          </p>
        )}
        {step === 'details' && !ready && saving === null && (
          <p className="bulk-hint">
            {needDetails > 0 && `${needDetails} ${needDetails === 1 ? 'piece needs' : 'pieces need'} a name before you can save.`}
            {needDetails > 0 && pending > 0 && ' '}
            {pending > 0 && `Waiting for ${pending} ${pending === 1 ? 'cutout' : 'cutouts'} to finish.`}
          </p>
        )}

        {step === 'upload' && (
          <UploadStep
            items={items}
            reading={reading}
            messages={messages}
            onFiles={addFiles}
            onRemove={removeItem}
            onContinue={() => setStep('cutouts')}
          />
        )}

        {step === 'cutouts' && (
          <CutoutStep
            items={items}
            chosen={chosen}
            onToggle={(id) =>
              setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
            }
            onChooseAll={() => setChosen(items.map((i) => i.id))}
            onChooseNone={() => setChosen([])}
            onBack={() => setStep('upload')}
            onContinue={startDetails}
          />
        )}

        {step === 'details' && (
          <DetailsStep
            items={items}
            categories={categories}
            bins={bins}
            activeId={activeId}
            onActive={setActiveId}
            checked={checked}
            onChecked={setChecked}
            onPatch={(id, patch) => setItems((prev) => patchIn(prev, id, patch))}
            onRemove={removeItem}
            onQueueCutout={queueCutout}
            onApply={(ids, patch) =>
              setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, ...patch } : i)))
            }
            onAddFiles={addFiles}
            reading={reading}
          />
        )}
      </div>
    </>
  )
}
