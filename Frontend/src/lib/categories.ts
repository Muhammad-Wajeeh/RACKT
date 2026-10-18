import { supabase } from './supabase'

/** Categories nest at most this deep (type > subtype > sub-subtype). Enforced by the database too. */
export const MAX_DEPTH = 3

export interface Category {
  id: string
  parent_id: string | null
  name: string
  sort_order: number
}

export interface CategoryNode extends Category {
  /** 1 = top-level type. */
  depth: number
  children: CategoryNode[]
}

function toError(err: { code?: string; message: string }): Error {
  // 23505 = unique violation (same name under the same parent).
  if (err.code === '23505') return new Error('You already have a category with that name here.')
  return new Error(err.message)
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, parent_id, name, sort_order')
    .order('sort_order')
    .order('name')
  if (error) throw toError(error)
  return data as Category[]
}

/** How many pieces sit directly on each category id. */
export async function fetchCategoryCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('pieces').select('category_id')
  if (error) throw toError(error)
  const counts: Record<string, number> = {}
  for (const row of data) {
    if (row.category_id) counts[row.category_id] = (counts[row.category_id] ?? 0) + 1
  }
  return counts
}

export async function createCategory(
  name: string,
  parentId: string | null,
  sortOrder: number,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim(), parent_id: parentId, sort_order: sortOrder })
    .select('id, parent_id, name, sort_order')
    .single()
  if (error) throw toError(error)
  return data as Category
}

export async function renameCategory(id: string, name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id, parent_id, name, sort_order')
    .single()
  if (error) throw toError(error)
  return data as Category
}

/** Deletes the category and its subcategories; their pieces become uncategorized. */
export async function deleteCategory(id: string): Promise<void> {
  const { data, error } = await supabase.from('categories').delete().eq('id', id).select('id')
  if (error) throw toError(error)
  if (!data || data.length === 0) throw new Error('Could not delete this category.')
}

export function buildTree(categories: Category[]): CategoryNode[] {
  const byParent = new Map<string | null, Category[]>()
  for (const c of categories) {
    const list = byParent.get(c.parent_id) ?? []
    list.push(c)
    byParent.set(c.parent_id, list)
  }
  const build = (parent: string | null, depth: number): CategoryNode[] =>
    (byParent.get(parent) ?? []).map((c) => ({ ...c, depth, children: build(c.id, depth + 1) }))
  return build(null, 1)
}

/** Depth-first, parents before children. */
export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)])
}

/** The node's id plus the ids of everything beneath it. */
export function subtreeIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)]
}

export function findNode(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const hit = findNode(n.children, id)
    if (hit) return hit
  }
  return null
}

/** "Tops › T-shirts › Graphic", or "Uncategorized" for none/unknown. */
export function categoryPath(categories: Category[], id: string | null): string {
  if (!id) return 'Uncategorized'
  const byId = new Map(categories.map((c) => [c.id, c]))
  const parts: string[] = []
  for (let cur = byId.get(id); cur; cur = cur.parent_id ? byId.get(cur.parent_id) : undefined) {
    parts.unshift(cur.name)
  }
  return parts.length ? parts.join(' › ') : 'Uncategorized'
}

/** Just the last segment, e.g. "Graphic". */
export function categoryName(categories: Category[], id: string | null): string {
  return categories.find((c) => c.id === id)?.name ?? 'Uncategorized'
}
