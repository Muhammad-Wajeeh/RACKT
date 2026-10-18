import { binName, fetchBins } from './bins'
import { categoryPath, fetchCategories } from './categories'
import { fetchPieces } from './pieces'

/** Quotes a CSV field when it contains a comma, quote or newline. */
function cell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Downloads your whole closet as a CSV file. */
export async function exportClosetCsv(): Promise<number> {
  const [pieces, categories, bins] = await Promise.all([
    fetchPieces(),
    fetchCategories(),
    fetchBins(),
  ])

  const header = [
    'Name',
    'Brand',
    'Category',
    'Bin',
    'Color',
    'Price',
    'Times worn',
    'Cost per wear',
    'Added',
  ]
  const rows = pieces.map((p) => [
    p.name,
    p.brand,
    p.category_id ? categoryPath(categories, p.category_id) : '',
    binName(bins, p.bin_id),
    p.color_name,
    p.price,
    p.wear_count,
    p.cost_per_wear,
    p.created_at.slice(0, 10),
  ])

  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `rackt-closet-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return pieces.length
}
