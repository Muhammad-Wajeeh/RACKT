import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AddOutlined from '@mui/icons-material/AddOutlined'
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined'
import ChecklistOutlined from '@mui/icons-material/ChecklistOutlined'
import CheckroomOutlined from '@mui/icons-material/CheckroomOutlined'
import CheckOutlined from '@mui/icons-material/CheckOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import ImageOutlined from '@mui/icons-material/ImageOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import AddPieceModal from '../components/AddPieceModal'
import BinPickerModal from '../components/BinPickerModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import PageHeader from '../components/PageHeader'
import PieceDetails from '../components/PieceDetails'
import SortFilterMenu from '../components/SortFilterMenu'
import { binName, fetchBins, movePiecesToBin, type Bin } from '../lib/bins'
import {
  buildTree,
  categoryName,
  categoryPath,
  fetchCategories,
  findNode,
  subtreeIds,
  type Category,
  type CategoryNode,
} from '../lib/categories'
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  activeFilterCount,
  filterPieces,
  sortPieces,
  type Filters,
  type SortKey,
} from '../lib/closetView'
import { deletePiece, deletePieces, fetchPieces, logWear, type Piece } from '../lib/pieces'
import { useImageUrls } from '../lib/useImageUrls'
import { useClosetCount } from '../layouts/ClosetCount'
import './ClosetPage.css'

/** `null` = all pieces, UNCATEGORIZED = pieces with no category, otherwise a category id. */
const UNCATEGORIZED = 'uncategorized'
type Filter = string | null

function priceLabel(p: Piece) {
  if (p.cost_per_wear != null) return `$${p.cost_per_wear.toFixed(2)} / wear`
  if (p.price != null) return `$${p.price.toFixed(2)}`
  return ''
}

export default function ClosetPage() {
  const [pieces, setPieces] = useState<Piece[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT)
  const [viewFilters, setViewFilters] = useState<Filters>(EMPTY_FILTERS)
  const [bins, setBins] = useState<Bin[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [bulkMoving, setBulkMoving] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    Promise.all([fetchPieces(), fetchCategories(), fetchBins()])
      .then(([loadedPieces, loadedCategories, loadedBins]) => {
        setPieces(loadedPieces)
        setCategories(loadedCategories)
        setBins(loadedBins)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const urls = useImageUrls(pieces.map((p) => p.image_path))

  // Keep the sidebar's "items catalogued" count in step with adds and deletes.
  const { setCount } = useClosetCount()
  useEffect(() => {
    if (!loading && !error) setCount(pieces.length)
  }, [pieces.length, loading, error, setCount])

  /** Applies the pieces returned by a move to local state. */
  function applyMoved(updated: Piece[]) {
    setPieces((prev) => prev.map((p) => updated.find((u) => u.id === p.id) ?? p))
  }

  function leaveSelectMode() {
    setSelectMode(false)
    setCheckedIds([])
  }

  function toggleChecked(id: string) {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const tree = buildTree(categories)
  const selectedNode = filter && filter !== UNCATEGORIZED ? findNode(tree, filter) : null

  // The chain from a top-level type down to the selected category.
  const pathNodes: CategoryNode[] = []
  for (let cur = selectedNode; cur; ) {
    pathNodes.unshift(cur)
    const parentId: string | null = cur.parent_id
    cur = parentId ? findNode(tree, parentId) : null
  }

  // One row of chips per level: the top-level types, then the children of each selected node.
  const rows: { parent: CategoryNode | null; chips: CategoryNode[] }[] = [
    { parent: null, chips: tree },
    ...pathNodes.filter((n) => n.children.length > 0).map((n) => ({ parent: n, chips: n.children })),
  ]

  const hasUncategorized = pieces.some((p) => !p.category_id)

  const matchesCategory = (p: Piece) => {
    if (filter === null) return true
    if (filter === UNCATEGORIZED) return !p.category_id
    if (!selectedNode) return true // the selected category no longer exists
    return subtreeIds(selectedNode).includes(p.category_id ?? '')
  }

  // Every word typed must appear in the piece's name, brand, category path, colour or bin name.
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matchesSearch = (p: Piece) => {
    if (terms.length === 0) return true
    const haystack = [
      p.name,
      p.brand,
      categoryPath(categories, p.category_id),
      p.color_name,
      binName(bins, p.bin_id),
    ]
      .join(' ')
      .toLowerCase()
    return terms.every((t) => haystack.includes(t))
  }

  const visible = sortPieces(
    filterPieces(
      pieces.filter((p) => matchesCategory(p) && matchesSearch(p)),
      viewFilters,
    ),
    sort,
  )

  const selected = pieces.find((p) => p.id === selectedId) ?? null

  return (
    <>
      <PageHeader eyebrow="Catalogue" title="The Closet">
        <label className="closet-search">
          <SearchOutlined sx={{ fontSize: 18 }} />
          <input
            type="search"
            placeholder="Search your closet..."
            aria-label="Search your closet"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="closet-actions">
          <SortFilterMenu
            pieces={pieces}
            bins={bins}
            sort={sort}
            onSortChange={setSort}
            filters={viewFilters}
            onFiltersChange={setViewFilters}
            shownCount={visible.length}
          />
          <button
            type="button"
            className="btn"
            aria-pressed={selectMode}
            onClick={() => (selectMode ? leaveSelectMode() : setSelectMode(true))}
          >
            <ChecklistOutlined sx={{ fontSize: 18 }} />
            {selectMode ? 'DONE' : 'SELECT'}
          </button>
          <Link to="/closet/bulk" className="btn closet-bulk">
            <AddPhotoAlternateOutlined sx={{ fontSize: 18 }} />
            BULK ADD
          </Link>
          <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
            <AddOutlined sx={{ fontSize: 18 }} />
            ADD PIECE
          </button>
        </div>
      </PageHeader>

      <div className="closet-body">
        <section className="closet-main">
          {rows.map((row, i) => {
            const allActive = row.parent ? filter === row.parent.id : filter === null
            return (
              <div key={row.parent?.id ?? 'root'} className="closet-filters">
                <button
                  type="button"
                  className={`chip${allActive ? ' chip--active' : ''}`}
                  onClick={() => setFilter(row.parent ? row.parent.id : null)}
                >
                  {row.parent ? `All ${row.parent.name}` : 'All'}
                </button>
                {row.chips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip${pathNodes.some((n) => n.id === c.id) ? ' chip--active' : ''}`}
                    onClick={() => setFilter(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
                {i === 0 && hasUncategorized && (
                  <button
                    type="button"
                    className={`chip${filter === UNCATEGORIZED ? ' chip--active' : ''}`}
                    onClick={() => setFilter(UNCATEGORIZED)}
                  >
                    Uncategorized
                  </button>
                )}
              </div>
            )
          })}

          {selectMode && (
            <div className="closet-selectbar">
              <span>
                {checkedIds.length} selected
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setCheckedIds(visible.map((p) => p.id))}
              >
                SELECT ALL SHOWN
              </button>
              <button
                type="button"
                className="btn"
                disabled={checkedIds.length === 0}
                onClick={() => setCheckedIds([])}
              >
                CLEAR
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={checkedIds.length === 0}
                onClick={() => setBulkMoving(true)}
              >
                <Inventory2Outlined sx={{ fontSize: 16 }} />
                MOVE TO BIN
              </button>
              <button
                type="button"
                className="btn closet-selectbar__delete"
                disabled={checkedIds.length === 0}
                onClick={() => setBulkDeleting(true)}
              >
                <DeleteOutlineOutlined sx={{ fontSize: 16 }} />
                DELETE
              </button>
            </div>
          )}

          {error && <p className="closet-status closet-status--error">{error}</p>}
          {loading && <p className="closet-status">Loading your closet…</p>}
          {!loading && !error && pieces.length === 0 && (
            <p className="closet-status">Nothing here yet. Add your first piece.</p>
          )}
          {!loading && !error && pieces.length > 0 && visible.length === 0 && (
            <p className="closet-status">
              {terms.length > 0 || activeFilterCount(viewFilters) > 0
                ? 'No pieces match your search or filters.'
                : 'No pieces in this category.'}
            </p>
          )}

          <div className="closet-grid">
            {visible.map((p) => {
              const label = categoryName(categories, p.category_id)
              const inBin = binName(bins, p.bin_id)
              const checked = checkedIds.includes(p.id)
              const activate = () => (selectMode ? toggleChecked(p.id) : setSelectedId(p.id))
              return (
                <article
                  key={p.id}
                  className={`piece${
                    selectMode ? (checked ? ' piece--selected' : '') : p.id === selectedId ? ' piece--selected' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectMode ? checked : p.id === selectedId}
                  onClick={activate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      activate()
                    }
                  }}
                >
                  <div className="piece__image">
                    {selectMode && (
                      <span className={`piece__check${checked ? ' is-on' : ''}`} aria-hidden="true">
                        {checked && <CheckOutlined sx={{ fontSize: 14 }} />}
                      </span>
                    )}
                    {inBin && (
                      <span className="piece__bin" title={`In ${inBin}`}>
                        <Inventory2Outlined sx={{ fontSize: 12 }} />
                        <span>{inBin}</span>
                      </span>
                    )}
                    {p.image_path && urls[p.image_path] ? (
                      <img className="piece__photo" src={urls[p.image_path]} alt={p.name} />
                    ) : (
                      <>
                        <ImageOutlined sx={{ fontSize: 26 }} />
                        <span className="piece__drop">{label}</span>
                      </>
                    )}
                  </div>
                  <div className="piece__info">
                    <span className="piece__category">
                      {categoryPath(categories, p.category_id)}
                      {p.color_hex && (
                        <i
                          className="swatch"
                          style={{ background: p.color_hex }}
                          title={p.color_name ?? undefined}
                        />
                      )}
                    </span>
                    <h3>{p.name}</h3>
                    <div className="piece__meta">
                      <span>{p.brand}</span>
                      <span>{priceLabel(p)}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className={`closet-details${selected ? ' closet-details--filled' : ''}`}>
          {selected ? (
            <PieceDetails
              key={selected.id}
              piece={selected}
              categories={categories}
              bins={bins}
              imageUrl={selected.image_path ? (urls[selected.image_path] ?? null) : null}
              onClose={() => setSelectedId(null)}
              onMoveToBin={async (binId) => applyMoved(await movePiecesToBin(binId, [selected.id]))}
              onUpdated={(updated) =>
                setPieces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
              onLogWear={async () => {
                const updated = await logWear(selected)
                setPieces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }}
              onDelete={async () => {
                await deletePiece(selected)
                setPieces((prev) => prev.filter((p) => p.id !== selected.id))
                setSelectedId(null)
              }}
            />
          ) : (
            <>
              <CheckroomOutlined sx={{ fontSize: 32 }} />
              <p>Select a piece to see details.</p>
            </>
          )}
        </aside>
      </div>

      {bulkMoving && (
        <BinPickerModal
          title="Move to bin"
          eyebrow={`${checkedIds.length} ${checkedIds.length === 1 ? 'piece' : 'pieces'}`}
          bins={bins}
          initial={bins[0]?.id ?? ''}
          submitLabel="MOVE"
          onClose={() => setBulkMoving(false)}
          onSubmit={async (binId) => {
            applyMoved(await movePiecesToBin(binId, checkedIds))
            leaveSelectMode()
          }}
        />
      )}

      {bulkDeleting && (
        <ConfirmDeleteModal
          title={`Delete ${checkedIds.length} ${checkedIds.length === 1 ? 'piece' : 'pieces'}?`}
          subject={
            <div className="confirm__meta">
              <strong>
                {checkedIds.length} {checkedIds.length === 1 ? 'piece' : 'pieces'} selected
              </strong>
              <span>
                {pieces
                  .filter((p) => checkedIds.includes(p.id))
                  .slice(0, 3)
                  .map((p) => p.name)
                  .join(', ')}
                {checkedIds.length > 3 ? ` and ${checkedIds.length - 3} more` : ''}
              </span>
            </div>
          }
          message={
            <>
              They will be permanently removed from your closet, along with their photos.{' '}
              <strong>This can't be undone.</strong>
            </>
          }
          confirmLabel={`DELETE ${checkedIds.length}`}
          onCancel={() => setBulkDeleting(false)}
          onConfirm={async () => {
            await deletePieces(pieces.filter((p) => checkedIds.includes(p.id)))
            setPieces((prev) => prev.filter((p) => !checkedIds.includes(p.id)))
            if (selectedId && checkedIds.includes(selectedId)) setSelectedId(null)
            setBulkDeleting(false)
            leaveSelectMode()
          }}
        />
      )}

      {adding && (
        <AddPieceModal
          categories={categories}
          onClose={() => setAdding(false)}
          onCreated={(piece) => setPieces((prev) => [piece, ...prev])}
        />
      )}
    </>
  )
}
