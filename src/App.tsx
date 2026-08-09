import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { AmbientBackdrop } from './components/AmbientBackdrop'
import { Controls } from './components/Controls'
import { Library } from './components/Library'
import { LoginScreen } from './components/LoginScreen'
import { Tonearm } from './components/Tonearm'
import { VinylDisc } from './components/VinylDisc'
import { useAlbumAtmosphere } from './hooks/useAlbumAtmosphere'
import { usePlayerStore } from './spotify/store'
import './App.css'

export default function App() {
  const {
    ready,
    authenticated,
    init,
    handleCallback,
    logout,
    user,
    playing,
    current,
    error,
    togglePlay,
    deviceId,
  } = usePlayerStore()

  const deckRef = useRef<HTMLDivElement>(null)
  const bootstrapped = useRef(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    const path = window.location.pathname
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if ((path === '/callback' || code) && code) {
      void handleCallback(code)
      return
    }

    void init()
  }, [handleCallback, init])

  const cover =
    current?.album.images[0]?.url ??
    current?.album.images[1]?.url ??
    null

  useAlbumAtmosphere(cover)

  const onDeckMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = deckRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -8, y: px * 10 })
  }

  const resetTilt = () => setTilt({ x: 0, y: 0 })

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot-disc" />
        <p>Calibrando el plato…</p>
      </div>
    )
  }

  if (!authenticated) {
    return <LoginScreen />
  }

  const deckStyle = {
    '--tilt-x': `${tilt.x}deg`,
    '--tilt-y': `${tilt.y}deg`,
  } as CSSProperties

  return (
    <div className={`app ${playing ? 'is-playing' : ''}`}>
      <AmbientBackdrop coverUrl={cover} playing={playing} />

      <header className="topbar">
        <p className="brand-mark">Vinilo</p>
        <div className="user-chip">
          <span
            className={`device-dot ${deviceId ? 'on' : ''}`}
            title={deviceId ? 'Tocadiscos listo' : 'Conectando…'}
          />
          <span>{user?.display_name ?? 'Oyente'}</span>
          <button type="button" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <main className="stage">
        <section className="deck">
          <div
            ref={deckRef}
            className="deck-wood"
            style={deckStyle}
            onPointerMove={onDeckMove}
            onPointerLeave={resetTilt}
          >
            <div className="deck-glow" />
            <VinylDisc
              coverUrl={cover}
              spinning={playing}
              title={current?.name}
              onToggle={() => void togglePlay()}
            />
            <Tonearm lowered={playing} onToggle={() => void togglePlay()} />
          </div>
          {!deviceId && <p className="device-wait">Conectando el tocadiscos a Spotify…</p>}
          <Controls />
          {error && <p className="error-banner deck-error">{error}</p>}
        </section>

        <Library />
      </main>
    </div>
  )
}
