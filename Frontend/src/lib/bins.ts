import { removePieceImage } from './images'
import type { Piece } from './pieces'
import { supabase } from './supabase'

export interface Bin {
  id: string
  name: string
  notes: string | null
  photo_path: string | null
  created_at: string
  updated_at: string
}

export interface BinValues {
  name: string
  notes: string | null
  photo_path: string | null
}

function toError(err: { code?: string; message: string }): Error {
  // 23505 = unique violation (another bin already has this name).
  if (err.code === '23505') return new Error('You already have a bin with that name.')
  return new Error(err.message)
}

export async function fetchBins(): Promise<Bin[]> {
  const { data, error } = await supabase.from('bins').select('*').order('name')
  if (error) throw toError(error)
  return data as Bin[]
}

export async function createBin(id: string, values: BinValues): Promise<Bin> {
  const { data, error } = await supabase
    .from('bins')
    .insert({ id, ...values })
    .select()
    .single()
  if (error) throw toError(error)
  return data as Bin
}

export async function updateBin(id: string, values: BinValues): Promise<Bin> {
  const { data, error } = await supabase
    .from('bins')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw toError(error)
  return data as Bin
}

/** Deletes the bin (its pieces are released, not deleted), then its photo. */
export async function deleteBin(bin: Bin): Promise<void> {
  const { data, error } = await supabase.from('bins').delete().eq('id', bin.id).select('id')
  if (error) throw toError(error)
  if (!data || data.length === 0) throw new Error('Could not delete this bin.')
  if (bin.photo_path) await removePieceImage(bin.photo_path).catch(() => {})
}

/** Moves pieces into a bin, or out of any bin when `binId` is null. Returns the updated pieces. */
export async function movePiecesToBin(binId: string | null, pieceIds: string[]): Promise<Piece[]> {
  const { data, error } = await supabase.rpc('move_pieces_to_bin', {
    p_bin: binId,
    p_pieces: pieceIds,
  })
  if (error) throw toError(error)
  return data as Piece[]
}

export function binName(bins: Bin[], id: string | null): string | null {
  return bins.find((b) => b.id === id)?.name ?? null
}
