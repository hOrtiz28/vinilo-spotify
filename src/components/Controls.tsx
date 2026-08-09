import { useEffect, useState } from 'react'
import { usePlayerStore } from '../spotify/store'

function formatTime(ms: number): string {
  if (!ms || ms < 0) return '0:00'
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Controls() {
  const {
    playing,
    position,
    duration,
    current,
    volume,
    togglePlay,
    next,
    previous,
    setVolume,
    seek,
  } = usePlayerStore()

  const [localPos, setLocalPos] = useState(position)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!dragging) setLocalPos(position)
  }, [position, dragging])

  useEffect(() => {
    if (!playing || dragging) return
    const id = window.setInterval(() => {
      setLocalPos((p) => Math.min(p + 250, duration || p + 250))
    }, 250)
    return () => window.clearInterval(id)
  }, [playing, dragging, duration])

  const artists = current?.artists.map((a) => a.name).join(', ') ?? 'Elige un tema'
  const progress = duration > 0 ? (localPos / duration) * 100 : 0

  return (
    <div className={`controls ${playing ? 'is-live' : ''}`}>
      <div className="now-playing">
        <p className="track-title">{current?.name ?? 'Silencio en el salón'}</p>
        <p className="track-artist">{artists}</p>
      </div>

      <div className="transport">
        <button type="button" className="icon-btn" onClick={() => void previous()} aria-label="Anterior">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z" />
          </svg>
        </button>
        <button
          type="button"
          className="play-btn"
          onClick={() => void togglePlay()}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          )}
        </button>
        <button type="button" className="icon-btn" onClick={() => void next()} aria-label="Siguiente">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M16 6h2v12h-2V6zM6 18l8.5-6L6 6v12z" />
          </svg>
        </button>
      </div>

      <div className="scrubber">
        <span>{formatTime(localPos)}</span>
        <div className="scrubber-track">
          <div className="scrubber-fill" style={{ width: `${progress}%` }} />
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={Math.min(localPos, duration || 1)}
            onMouseDown={() => setDragging(true)}
            onTouchStart={() => setDragging(true)}
            onChange={(e) => setLocalPos(Number(e.target.value))}
            onMouseUp={(e) => {
              setDragging(false)
              void seek(Number((e.target as HTMLInputElement).value))
            }}
            onTouchEnd={(e) => {
              setDragging(false)
              void seek(Number((e.target as HTMLInputElement).value))
            }}
            aria-label="Posición"
          />
        </div>
        <span>{formatTime(duration)}</span>
      </div>

      <label className="volume">
        <span>Vol</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => void setVolume(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
