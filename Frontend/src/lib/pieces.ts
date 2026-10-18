import { removePieceImage } from './images'
import { supabase } from './supabase'

export interface Piece {
  id: string
  name: string
  brand: string | null
  /** Null = uncategorized. See lib/categories.ts. */
  category_id: string | null
  /** The bin this piece is stored in, or null. See lib/bins.ts. */
  bin_id: string | null
  price: number | null
  wear_count: number
  image_path: string | null
  cost_per_wear: number | null
  color_hex: string | null
  color_name: string | null
  created_at: string
  updated_at: string
}

/** The fields the add and edit forms share. */
export interface PieceFormValues {
  name: string
  brand: string | null
  category_id: string | null
  price: number | null
  wear_count: number
}

export interface NewPiece extends PieceFormValues {
  id: string
  image_path: string | null
  color_hex: string | null
  color_name: string | null
}

/** Reads the shared piece form fields. Throws an Error with a user-facing message if invalid. */
export function parsePieceForm(form: FormData): PieceFormValues {
  const name = String(form.get('name') ?? '').trim()
  if (!name) throw new Error('Name is required.')
  const brand = String(form.get('brand') ?? '').trim()
  const price = String(form.get('price') ?? '').trim()
  const wears = String(form.get('wear_count') ?? '').trim()
  return {
    name,
    brand: brand || null,
    category_id: String(form.get('category_id') ?? '') || null,
    price: price === '' ? null : Number(price),
    wear_count: wears === '' ? 0 : Number(wears),
  }
}

export async function fetchPieces(): Promise<Piece[]> {
  const { data, error } = await supabase
    .from('pieces')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Piece[]
}

/** How many pieces you own (a cheap count query, no rows downloaded). */
export async function fetchPieceCount(): Promise<number> {
  const { count, error } = await supabase
    .from('pieces')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

/** Saves edited fields and returns the updated piece (with a recalculated `cost_per_wear`). */
export async function updatePiece(id: string, values: PieceFormValues): Promise<Piece> {
  const { data, error } = await supabase
    .from('pieces')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Piece
}

/**
 * Adds one wear and returns the updated piece. The database recalculates `cost_per_wear`
 * (price / wear_count) itself, so the returned row already has the new value.
 */
export async function logWear(piece: Piece): Promise<Piece> {
  const { data, error } = await supabase
    .from('pieces')
    .update({ wear_count: piece.wear_count + 1 })
    .eq('id', piece.id)
    .select()
    .single()
  if (error) throw error
  return data as Piece
}

/** Deletes the row, then its photo. Throws if nothing was deleted (not found, or not yours). */
export async function deletePiece(piece: Piece): Promise<void> {
  const { data, error } = await supabase.from('pieces').delete().eq('id', piece.id).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Could not delete this piece.')
  // Best effort: if this fails we only leave an orphaned file, not a broken piece.
  if (piece.image_path) await removePieceImage(piece.image_path).catch(() => {})
}

// user_id is filled in by the database (default auth.uid()).
export async function createPiece(piece: NewPiece): Promise<Piece> {
  const { data, error } = await supabase.from('pieces').insert(piece).select().single()
  if (error) throw error
  return data as Piece
}
