import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AddOutlined from '@mui/icons-material/AddOutlined'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import CategoryNameModal from '../components/CategoryNameModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import PageHeader from '../components/PageHeader'
import {
  MAX_DEPTH,
  buildTree,
  categoryPath,
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchCategoryCounts,
  flattenTree,
  renameCategory,
  subtreeIds,
  type Category,
  type CategoryNode,
} from '../lib/categories'
import './CategoriesPage.css'

type Dialog =
  | { kind: 'add'; parent: CategoryNode | null }
  | { kind: 'rename'; node: CategoryNode }
  | { kind: 'delete'; node: CategoryNode }

const LEVEL_NAMES = ['type', 'subtype', 'sub-subtype']

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)

  useEffect(() => {
    Promise.all([fetchCategories(), fetchCategoryCounts()])
      .then(([loadedCategories, loadedCounts]) => {
        setCategories(loadedCategories)
        setCounts(loadedCounts)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const rows = flattenTree(buildTree(categories))

  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Categories">
        <div className="cats-actions">
          <Link to="/closet" className="btn">
            <ArrowBackOutlined sx={{ fontSize: 18 }} />
            THE CLOSET
          </Link>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setDialog({ kind: 'add', parent: null })}
          >
            <AddOutlined sx={{ fontSize: 18 }} />
            NEW TYPE
          </button>
        </div>
      </PageHeader>

      <div className="cats-scroll">
        <div className="cats">
          <p className="cats__hint">
            Organise your closet with types and subtypes, up to {MAX_DEPTH} levels deep. Deleting a
            category also deletes what's inside it, and any pieces in it become uncategorized.
          </p>

          {error && <p className="cats__status cats__status--error">{error}</p>}
          {loading && <p className="cats__status">Loading…</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="cats__status">No categories yet. Create your first type.</p>
          )}

          <ul className="cats__list">
            {rows.map((node) => (
              <li
                key={node.id}
                className="cat"
                style={{ paddingLeft: 16 + (node.depth - 1) * 28 }}
              >
                <span className="cat__name">
                  {node.depth > 1 && <span className="cat__guide">↳</span>}
                  {node.name}
                </span>
                <span className="cat__count">
                  {counts[node.id] ?? 0} {(counts[node.id] ?? 0) === 1 ? 'piece' : 'pieces'}
                </span>
                <span className="cat__actions">
                  {node.depth < MAX_DEPTH && (
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'add', parent: node })}
                      aria-label={`Add a ${LEVEL_NAMES[node.depth]} inside ${node.name}`}
                      title={`Add ${LEVEL_NAMES[node.depth]}`}
                    >
                      <AddOutlined sx={{ fontSize: 18 }} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: 'rename', node })}
                    aria-label={`Rename ${node.name}`}
                    title="Rename"
                  >
                    <EditOutlined sx={{ fontSize: 18 }} />
                  </button>
                  <button
                    type="button"
                    className="cat__delete"
                    onClick={() => setDialog({ kind: 'delete', node })}
                    aria-label={`Delete ${node.name}`}
                    title="Delete"
                  >
                    <DeleteOutlineOutlined sx={{ fontSize: 18 }} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {dialog?.kind === 'add' && (
        <CategoryNameModal
          title={dialog.parent ? `New ${LEVEL_NAMES[dialog.parent.depth]}` : 'New type'}
          eyebrow={dialog.parent ? `Inside ${categoryPath(categories, dialog.parent.id)}` : 'Categories'}
          submitLabel="ADD"
          onClose={() => setDialog(null)}
          onSubmit={async (name) => {
            const parentId = dialog.parent?.id ?? null
            const siblings = categories.filter((c) => c.parent_id === parentId)
            const next = Math.max(0, ...siblings.map((c) => c.sort_order)) + 1
            const created = await createCategory(name, parentId, next)
            setCategories((prev) => [...prev, created])
          }}
        />
      )}

      {dialog?.kind === 'rename' && (
        <CategoryNameModal
          title="Rename"
          eyebrow={categoryPath(categories, dialog.node.id)}
          initialName={dialog.node.name}
          submitLabel="SAVE"
          onClose={() => setDialog(null)}
          onSubmit={async (name) => {
            const updated = await renameCategory(dialog.node.id, name)
            setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
          }}
        />
      )}

      {dialog?.kind === 'delete' && (
        <DeleteCategoryDialog
          node={dialog.node}
          categories={categories}
          counts={counts}
          onCancel={() => setDialog(null)}
          onDeleted={(removedIds) => {
            setCategories((prev) => prev.filter((c) => !removedIds.includes(c.id)))
            setDialog(null)
          }}
        />
      )}
    </>
  )
}

interface DeleteCategoryDialogProps {
  node: CategoryNode
  categories: Category[]
  counts: Record<string, number>
  onCancel: () => void
  onDeleted: (removedIds: string[]) => void
}

function DeleteCategoryDialog({
  node,
  categories,
  counts,
  onCancel,
  onDeleted,
}: DeleteCategoryDialogProps) {
  const removedIds = subtreeIds(node)
  const subcategories = removedIds.length - 1
  const pieces = removedIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0)

  return (
    <ConfirmDeleteModal
      title="Delete this category?"
      subject={
        <div className="confirm__meta">
          <strong>{node.name}</strong>
          <span>{categoryPath(categories, node.id)}</span>
        </div>
      }
      message={
        <>
          {subcategories > 0 && (
            <>
              Its <strong>{subcategories}</strong> {subcategories === 1 ? 'subcategory' : 'subcategories'}{' '}
              will be deleted too.{' '}
            </>
          )}
          {pieces > 0 ? (
            <>
              <strong>{pieces}</strong> {pieces === 1 ? 'piece' : 'pieces'} will become uncategorized.
            </>
          ) : (
            'No pieces are in it.'
          )}
        </>
      }
      confirmLabel="DELETE CATEGORY"
      onCancel={onCancel}
      onConfirm={async () => {
        await deleteCategory(node.id)
        onDeleted(removedIds)
      }}
    />
  )
}
