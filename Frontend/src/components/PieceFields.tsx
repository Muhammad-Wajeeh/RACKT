import { buildTree, flattenTree, type Category } from '../lib/categories'
import type { Piece } from '../lib/pieces'

interface PieceFieldsProps {
  piece?: Piece
  categories: Category[]
}

/**
 * The name / brand / category / price / wear fields shared by the add and edit modals.
 * Uses the `modal__*` styles from AddPieceModal.css. Read them back with `parsePieceForm`.
 */
export default function PieceFields({ piece, categories }: PieceFieldsProps) {
  const options = flattenTree(buildTree(categories))

  return (
    <>
      <label className="modal__field">
        <span>Name</span>
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Ribbed Turtleneck"
          defaultValue={piece?.name}
          data-autofocus
        />
      </label>

      <label className="modal__field">
        <span>Brand</span>
        <input name="brand" placeholder="Isadora Studio" defaultValue={piece?.brand ?? ''} />
      </label>

      <label className="modal__field">
        <span>Category</span>
        <select name="category_id" defaultValue={piece?.category_id ?? ''}>
          <option value="">Uncategorized</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {'    '.repeat(c.depth - 1)}
              {c.depth > 1 ? '↳ ' : ''}
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="modal__row">
        <label className="modal__field">
          <span>Price ($)</span>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            defaultValue={piece?.price ?? ''}
          />
        </label>
        <label className="modal__field">
          <span>Times worn</span>
          <input
            name="wear_count"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            defaultValue={piece?.wear_count}
          />
        </label>
      </div>
    </>
  )
}
