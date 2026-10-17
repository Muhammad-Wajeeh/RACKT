import { supabase } from './supabase'

export const CATEGORIES = [
  'Clothing',
  'Tops',
  'Bottoms',
  'Footwear',
  'Jewelry',
  'Headwear',
  'Accessories',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface Piece {
  id: string
  name: string
  brand: string | null
  category: Category
  price: number | null
  wear_count: number
  image_path: string | null
  cost_per_wear: number | null
  created_at: string
  updated_at: string
}

export interface NewPiece {
  id: string
  image_path: string | null
  name: string
  brand: string | null
  category: Category
  price: number | null
  wear_count: number
}

export async function fetchPieces(): Promise<Piece[]> {
  const { data, error } = await supabase
    .from('pieces')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Piece[]
}

/** Returns null when the piece doesn't exist or isn't yours (RLS hides it). */
export async function fetchPiece(id: string): Promise<Piece | null> {
  const { data, error } = await supabase.from('pieces').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Piece | null
}

// user_id is filled in by the database (default auth.uid()).
export async function createPiece(piece: NewPiece): Promise<Piece> {
  const { data, error } = await supabase.from('pieces').insert(piece).select().single()
  if (error) throw error
  return data as Piece
}
