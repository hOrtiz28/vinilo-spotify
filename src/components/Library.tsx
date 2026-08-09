import { usePlayerStore } from '../spotify/store'
import type { SpotifyTrack } from '../spotify/types'

function TrackRow({
  track,
  active,
  onPlay,
}: {
  track: SpotifyTrack
  active: boolean
  onPlay: () => void
}) {
  const cover = track.album.images[track.album.images.length - 1]?.url
  return (
    <button
      type="button"
      className={`track-row ${active ? 'is-active' : ''}`}
      onClick={onPlay}
    >
      {cover ? <img src={cover} alt="" /> : <div className="track-row-fallback" />}
      <div>
        <p className="track-row-title">{track.name}</p>
        <p className="track-row-meta">
          {track.artists.map((a) => a.name).join(', ')} · {track.album.name}
        </p>
      </div>
      {active && <span className="eq" aria-hidden><i /><i /><i /></span>}
    </button>
  )
}

export function Library() {
  const { query, setQuery, search, results, recent, playTrack, current, playing } = usePlayerStore()
  const list = results.length > 0 ? results : recent
  const label = results.length > 0 ? 'Resultados' : 'Recientes'

  return (
    <aside className="library">
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <input
          type="search"
          placeholder="Buscar en Spotify…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar canciones"
        />
        <button type="submit">Buscar</button>
      </form>

      <div className="library-list">
        <p className="library-label">{label}</p>
        {list.length === 0 ? (
          <p className="library-empty">Busca un artista o canción para poner el vinilo a girar.</p>
        ) : (
          list.map((track) => (
            <TrackRow
              key={`${track.id}-${track.uri}`}
              track={track}
              active={playing && current?.uri === track.uri}
              onPlay={() => void playTrack(track)}
            />
          ))
        )}
      </div>

      {current && (
        <p className="now-chip">
          En el plato: <strong>{current.name}</strong>
        </p>
      )}
    </aside>
  )
}
