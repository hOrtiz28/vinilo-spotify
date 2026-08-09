import { useEffect, useState } from 'react'
import {
  DEFAULT_PALETTE,
  applyPalette,
  extractPaletteFromImage,
  type AlbumPalette,
} from '../lib/colors'

export function useAlbumAtmosphere(coverUrl: string | null | undefined) {
  const [palette, setPalette] = useState<AlbumPalette>(DEFAULT_PALETTE)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!coverUrl) {
      applyPalette(DEFAULT_PALETTE)
      setPalette(DEFAULT_PALETTE)
      setReady(true)
      return
    }

    setReady(false)
    void extractPaletteFromImage(coverUrl).then((next) => {
      if (cancelled) return
      applyPalette(next)
      setPalette(next)
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [coverUrl])

  return { palette, ready }
}
