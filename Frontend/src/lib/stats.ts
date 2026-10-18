import { supabase } from './supabase'

export interface ProfileStats {
  pieces: number
  outfits: number
  /** Total spent on worn pieces divided by total wears; null until something priced is worn. */
  avgCostPerWear: number | null
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const [pieces, outfits] = await Promise.all([
    supabase.from('pieces').select('price, wear_count'),
    supabase.from('outfits').select('id', { count: 'exact', head: true }),
  ])
  if (pieces.error) throw pieces.error
  if (outfits.error) throw outfits.error

  // Only priced pieces that have been worn say anything about cost per wear.
  let spent = 0
  let wears = 0
  for (const p of pieces.data as { price: number | null; wear_count: number }[]) {
    if (p.price != null && p.wear_count > 0) {
      spent += p.price
      wears += p.wear_count
    }
  }

  return {
    pieces: pieces.data.length,
    outfits: outfits.count ?? 0,
    avgCostPerWear: wears > 0 ? spent / wears : null,
  }
}
