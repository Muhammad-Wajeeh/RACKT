import { removePieceImage } from './images'
import type { Piece } from './pieces'
import { supabase } from './supabase'

export const MAX_TAGS = 10
export const MAX_TAG_LENGTH = 30

export interface Outfit {
  id: string
  name: string
  notes: string | null
  tags: string[]
  cover_image_path: string | null
  created_at: string
  updated_at: string
  /** Piece ids in display order. */
  piece_ids: string[]
}

export interface OutfitValues {
  name: string
  notes: string | null
  tags: string[]
  cover_image_path: string | null
}

interface OutfitRow extends Omit<Outfit, 'piece_ids'> {
  outfit_pieces: { piece_id: string; position: number }[]
}

function toOutfit(row: OutfitRow): Outfit {
  const { outfit_pieces, ...rest } = row
  return {
    ...rest,
    piece_ids: [...outfit_pieces].sort((a, b) => a.position - b.position).map((p) => p.piece_id),
  }
}

const SELECT = '*, outfit_pieces(piece_id, position)'

export async function fetchOutfits(): Promise<Outfit[]> {
  const { data, error } = await supabase
    .from('outfits')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as OutfitRow[]).map(toOutfit)
}

/** Returns null when the outfit doesn't exist or isn't yours. */
export async function fetchOutfit(id: string): Promise<Outfit | null> {
  const { data, error } = await supabase.from('outfits').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? toOutfit(data as OutfitRow) : null
}

/** Normalises a typed tag: trimmed, lowercase, capped in length. */
export function cleanTag(raw: string): string {
  return raw.trim().toLowerCase().slice(0, MAX_TAG_LENGTH)
}

export async function createOutfit(
  id: string,
  values: OutfitValues,
  pieceIds: string[],
): Promise<void> {
  const { error } = await supabase.from('outfits').insert({ id, ...values })
  if (error) throw error
  const { error: piecesError } = await supabase.rpc('replace_outfit_pieces', {
    p_outfit: id,
    p_pieces: pieceIds,
  })
  if (piecesError) {
    // Don't leave a half-created outfit behind.
    await supabase.from('outfits').delete().eq('id', id)
    throw piecesError
  }
}

export async function updateOutfit(
  id: string,
  values: OutfitValues,
  pieceIds: string[],
): Promise<void> {
  const { error } = await supabase.from('outfits').update(values).eq('id', id)
  if (error) throw error
  const { error: piecesError } = await supabase.rpc('replace_outfit_pieces', {
    p_outfit: id,
    p_pieces: pieceIds,
  })
  if (piecesError) throw piecesError
}

/** Deletes the outfit (its piece links go with it), then its cover photo. */
export async function deleteOutfit(outfit: Outfit): Promise<void> {
  const { data, error } = await supabase.from('outfits').delete().eq('id', outfit.id).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Could not delete this outfit.')
  if (outfit.cover_image_path) await removePieceImage(outfit.cover_image_path).catch(() => {})
}

/** Adds one wear to every piece in the outfit; returns the updated pieces. */
export async function wearOutfit(id: string): Promise<Piece[]> {
  const { data, error } = await supabase.rpc('wear_outfit', { p_outfit: id })
  if (error) throw error
  return data as Piece[]
}
