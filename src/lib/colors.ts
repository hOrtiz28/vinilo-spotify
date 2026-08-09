export type AlbumPalette = {
  accent: string
  accentSoft: string
  accentDeep: string
  glow: string
  wash: string
  ink: string
  text: string
}

export const DEFAULT_PALETTE: AlbumPalette = {
  accent: '#d4a35c',
  accentSoft: '#f0c57a',
  accentDeep: '#8a5a28',
  glow: 'rgba(212, 163, 92, 0.35)',
  wash: 'rgba(212, 163, 92, 0.16)',
  ink: '#120e0c',
  text: '#e8dcc8',
}

type RGB = { r: number; g: number; b: number }

function clamp(n: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, n))
}

function toHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, '0')).join('')}`
}

function toRgba({ r, g, b }: RGB, a: number): string {
  return `rgba(${clamp(Math.round(r))}, ${clamp(Math.round(g))}, ${clamp(Math.round(b))}, ${a})`
}

function luminance({ r, g, b }: RGB): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function saturation({ r, g, b }: RGB): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

function scoreColor(c: RGB): number {
  const l = luminance(c)
  const s = saturation(c)
  const mid = 1 - Math.abs(l - 0.45) * 1.6
  return s * 1.8 + mid
}

function paletteFromDominant(c: RGB): AlbumPalette {
  const deep = mix(c, { r: 20, g: 12, b: 8 }, 0.55)
  const soft = mix(c, { r: 255, g: 245, b: 220 }, 0.35)
  const text = luminance(c) > 0.55 ? { r: 18, g: 14, b: 12 } : { r: 240, g: 232, b: 220 }

  return {
    accent: toHex(c),
    accentSoft: toHex(soft),
    accentDeep: toHex(deep),
    glow: toRgba(c, 0.42),
    wash: toRgba(c, 0.2),
    ink: '#120e0c',
    text: toHex(text),
  }
}

export function applyPalette(palette: AlbumPalette, target: HTMLElement = document.documentElement) {
  target.style.setProperty('--accent', palette.accent)
  target.style.setProperty('--accent-soft', palette.accentSoft)
  target.style.setProperty('--accent-deep', palette.accentDeep)
  target.style.setProperty('--glow', palette.glow)
  target.style.setProperty('--wash', palette.wash)
  target.style.setProperty('--theme-ink', palette.ink)
  target.style.setProperty('--theme-on-accent', palette.text)
  target.style.setProperty('--amber', palette.accent)
  target.style.setProperty('--amber-bright', palette.accentSoft)
}

export async function extractPaletteFromImage(url: string): Promise<AlbumPalette> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'

    const fail = () => resolve(DEFAULT_PALETTE)

    img.onerror = fail
    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return fail()

        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        const buckets = new Map<string, { sum: RGB; n: number; w: number }>()

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue
          const color = { r: data[i], g: data[i + 1], b: data[i + 2] }
          const l = luminance(color)
          if (l < 0.08 || l > 0.92) continue

          const key = `${color.r >> 4},${color.g >> 4},${color.b >> 4}`
          const slot = buckets.get(key) ?? { sum: { r: 0, g: 0, b: 0 }, n: 0, w: 0 }
          const w = 0.4 + saturation(color) * 1.4
          slot.sum.r += color.r
          slot.sum.g += color.g
          slot.sum.b += color.b
          slot.n += 1
          slot.w += w
          buckets.set(key, slot)
        }

        if (buckets.size === 0) return fail()

        let winner: RGB | null = null
        let winnerScore = -1
        for (const slot of buckets.values()) {
          const color = {
            r: slot.sum.r / slot.n,
            g: slot.sum.g / slot.n,
            b: slot.sum.b / slot.n,
          }
          const s = scoreColor(color) * slot.w
          if (s > winnerScore) {
            winnerScore = s
            winner = color
          }
        }

        if (!winner) return fail()
        resolve(paletteFromDominant(winner))
      } catch {
        fail()
      }
    }

    img.src = url
  })
}
