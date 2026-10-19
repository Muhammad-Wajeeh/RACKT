import { getPalette } from 'colorthief'

export interface DetectedColor {
  hex: string
  name: string
}

// Clothing-friendly names. Detected colors snap to the nearest one in CIELAB.
const NAMED_COLORS: Record<string, string> = {
  Black: '#111111',
  Charcoal: '#36393d',
  Gray: '#808080',
  'Light gray': '#c8c8c8',
  White: '#f5f5f5',
  Cream: '#f3ead3',
  Beige: '#d8c3a5',
  Tan: '#b98f5f',
  Brown: '#6b4226',
  Burgundy: '#6d1a2c',
  Red: '#c62828',
  Pink: '#f0a1b5',
  Orange: '#ef7d22',
  Mustard: '#d9a521',
  Yellow: '#f2d531',
  Olive: '#6b6b2a',
  Green: '#2e7d32',
  Sage: '#a3b79a',
  Teal: '#1b7f7a',
  'Light blue': '#9cc7e8',
  Blue: '#2a62c9',
  Navy: '#1b2a49',
  Lavender: '#b9a7d9',
  Purple: '#6a3d9a',
}

/** The colours you can pick by hand: every name we can detect, with its reference colour. */
export const COLOR_CHOICES: DetectedColor[] = Object.entries(NAMED_COLORS).map(([name, hex]) => ({
  name,
  hex,
}))

type Lab = [number, number, number]

function hexToLab(hex: string): Lab {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const r = lin(parseInt(hex.slice(1, 3), 16))
  const g = lin(parseInt(hex.slice(3, 5), 16))
  const b = lin(parseInt(hex.slice(5, 7), 16))

  // sRGB -> XYZ (D65), normalised by the reference white.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

const NAMED_LAB = Object.entries(NAMED_COLORS).map(
  ([name, hex]) => [name, hexToLab(hex)] as const,
)

/** A reference hex for a colour name from our list, for drawing swatches. */
export function swatchFor(name: string): string | undefined {
  return NAMED_COLORS[name]
}

/** Perceptual lightness (CIELAB L*): 0 = black, 100 = white. */
export function colorLightness(hex: string): number {
  return hexToLab(hex)[0]
}

export function nameColor(hex: string): string {
  const lab = hexToLab(hex)
  let best = NAMED_LAB[0]![0]
  let bestDist = Infinity
  for (const [name, ref] of NAMED_LAB) {
    const d = (lab[0] - ref[0]) ** 2 + (lab[1] - ref[1]) ** 2 + (lab[2] - ref[2]) ** 2
    if (d < bestDist) {
      bestDist = d
      best = name
    }
  }
  return best
}

const SAMPLE_SIDE = 160

/**
 * Finds the dominant colour of a background-removed (transparent PNG) image.
 * Transparent pixels are ignored, so only the garment is measured.
 * Returns null if nothing opaque was found.
 */
export async function detectColor(cutout: Blob): Promise<DetectedColor | null> {
  const bitmap = await createImageBitmap(cutout)
  const scale = Math.min(1, SAMPLE_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const palette = await getPalette(canvas, {
    colorCount: 5,
    quality: 1,
    colorSpace: 'oklch',
    ignoreWhite: false, // white garments are legitimate; the cutout already removed the backdrop
    alphaThreshold: 200, // skip the semi-transparent fringe around the cutout
  })
  if (!palette || palette.length === 0) return null

  const main = palette.reduce((a, b) => (b.proportion > a.proportion ? b : a))
  const hex = main.hex()
  return { hex, name: nameColor(hex) }
}
