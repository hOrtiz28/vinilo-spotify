import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'

type VinylDiscProps = {
  coverUrl?: string | null
  spinning: boolean
  title?: string
  onToggle?: () => void
}

/** ~33⅓ RPM → una vuelta cada ~1.8s */
const DEGREES_PER_MS = 360 / 1800

export function VinylDisc({ coverUrl, spinning, title, onToggle }: VinylDiscProps) {
  const discRef = useRef<HTMLDivElement>(null)
  const angleRef = useRef(0)
  const draggingRef = useRef(false)
  const dragRef = useRef<{ total: number; last: number } | null>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)

  const paint = useCallback(() => {
    if (discRef.current) {
      discRef.current.style.transform = `rotate(${angleRef.current}deg)`
    }
  }, [])

  useEffect(() => {
    if (!spinning) {
      if (hintRef.current) hintRef.current.textContent = 'Toca o gira el disco'
      return
    }

    if (hintRef.current) hintRef.current.textContent = 'Girando'
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64)
      last = now
      if (!draggingRef.current) {
        angleRef.current += dt * DEGREES_PER_MS
        paint()
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [spinning, paint])

  const angleAt = useCallback((clientX: number, clientY: number) => {
    const el = discRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI
  }, [])

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { total: 0, last: angleAt(e.clientX, e.clientY) }
    draggingRef.current = true
    e.currentTarget.parentElement?.classList.add('is-dragging')
    if (hintRef.current) hintRef.current.textContent = 'Suéltalo'
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    const next = angleAt(e.clientX, e.clientY)
    let delta = next - dragRef.current.last
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    dragRef.current.last = next
    dragRef.current.total += delta
    angleRef.current += delta
    paint()
  }

  const endDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    const { total } = dragRef.current
    dragRef.current = null
    draggingRef.current = false
    e.currentTarget.parentElement?.classList.remove('is-dragging')
    if (hintRef.current) {
      hintRef.current.textContent = spinning ? 'Girando' : 'Toca o gira el disco'
    }
    if (Math.abs(total) < 10) onToggle?.()
  }

  return (
    <div className={`vinyl-stage ${spinning ? 'is-spinning' : ''}`}>
      <div className="vinyl-rings" />
      <div className="platter-shadow" />
      <button
        type="button"
        className="vinyl-hit"
        aria-label={spinning ? `Pausar ${title ?? 'reproducción'}` : `Reproducir ${title ?? 'disco'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div ref={discRef} className="vinyl-disc">
          <div className="vinyl-grooves" />
          <div className="vinyl-label">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="vinyl-cover" />
            ) : (
              <div className="vinyl-cover placeholder">
                <span>VINILO</span>
              </div>
            )}
          </div>
          <div className="vinyl-spindle" />
          <div className="vinyl-shine" />
        </div>
      </button>
      <p ref={hintRef} className="vinyl-hint">
        Toca o gira el disco
      </p>
    </div>
  )
}
