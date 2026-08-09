import { create } from 'zustand'
import {
  beginLogin,
  clearToken,
  exchangeCodeForToken,
  getStoredToken,
  getValidAccessToken,
  hasClientId,
} from './auth'
import {
  getMe,
  getRecentlyPlayed,
  isDeviceNotFoundError,
  playUri,
  searchTracks,
  transferPlayback,
} from './api'
import type { PlaybackState, SpotifyPlayer, SpotifyTrack, SpotifyUser } from './types'

type PlayerStore = {
  ready: boolean
  authenticated: boolean
  premium: boolean | null
  user: SpotifyUser | null
  deviceId: string | null
  player: SpotifyPlayer | null
  playing: boolean
  position: number
  duration: number
  current: SpotifyTrack | null
  results: SpotifyTrack[]
  recent: SpotifyTrack[]
  query: string
  error: string | null
  volume: number
  needsClientId: boolean
  init: () => Promise<void>
  handleCallback: (code: string) => Promise<void>
  login: () => Promise<void>
  logout: () => void
  setQuery: (q: string) => void
  search: () => Promise<void>
  playTrack: (track: SpotifyTrack) => Promise<void>
  togglePlay: () => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  setVolume: (v: number) => Promise<void>
  seek: (ms: number) => Promise<void>
}

let sdkPromise: Promise<void> | null = null
let playerGeneration = 0

function loadSpotifySDK(): Promise<void> {
  if (window.Spotify) return Promise.resolve()
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.onerror = () => reject(new Error('No se pudo cargar Spotify Web Playback SDK'))
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => resolve()
  })

  return sdkPromise
}

function trackFromPlayback(state: PlaybackState): SpotifyTrack {
  const t = state.track_window.current_track
  return {
    id: t.id ?? t.uri,
    name: t.name,
    uri: t.uri,
    duration_ms: t.duration_ms,
    preview_url: null,
    artists: t.artists.map((a, i) => ({ id: String(i), name: a.name })),
    album: {
      id: t.album.uri,
      name: t.album.name,
      images: t.album.images.map((img) => ({
        url: img.url,
        height: null,
        width: null,
      })),
    },
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function waitForDevice(getDeviceId: () => string | null, timeoutMs = 8000): Promise<string> {
  const existing = getDeviceId()
  if (existing) return existing

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await sleep(150)
    const id = getDeviceId()
    if (id) return id
  }
  throw new Error('El tocadiscos web aún no está listo. Recarga e inténtalo de nuevo.')
}

async function startOnDevice(deviceId: string, uris: string[]) {
  // activate + transfer primero; si el device "durmió", play falla con 404
  try {
    await transferPlayback(deviceId, false)
  } catch {
    // sin dispositivo activo previo, transfer puede fallar; seguimos al play
  }
  await sleep(200)
  await playUri(deviceId, uris)
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ready: false,
  authenticated: false,
  premium: null,
  user: null,
  deviceId: null,
  player: null,
  playing: false,
  position: 0,
  duration: 0,
  current: null,
  results: [],
  recent: [],
  query: '',
  error: null,
  volume: 0.7,
  needsClientId: !hasClientId(),

  init: async () => {
    const generation = ++playerGeneration
    const existing = get().player
    if (existing) {
      existing.disconnect()
      set({ player: null, deviceId: null })
    }

    set({ needsClientId: !hasClientId(), error: null })

    const token = getStoredToken()
    if (!token) {
      set({ ready: true, authenticated: false })
      return
    }

    try {
      const access = await getValidAccessToken()
      if (!access) {
        set({ ready: true, authenticated: false })
        return
      }

      const user = await getMe()
      const premium = user.product === 'premium'
      set({ authenticated: true, user, premium })

      let recent: SpotifyTrack[] = []
      try {
        recent = await getRecentlyPlayed()
      } catch {
        recent = []
      }
      set({ recent })

      if (!premium) {
        set({
          ready: true,
          error:
            'Spotify Web Playback requiere cuenta Premium. Puedes buscar, pero la reproducción en el navegador no estará disponible.',
        })
        return
      }

      await loadSpotifySDK()
      if (generation !== playerGeneration) return

      const player = new window.Spotify.Player({
        name: 'Vinilo',
        getOAuthToken: (cb) => {
          void getValidAccessToken().then((t) => {
            if (t) cb(t)
          })
        },
        volume: get().volume,
      })

      player.addListener('ready', (data) => {
        if (generation !== playerGeneration) return
        const { device_id } = data as { device_id: string }
        set({ deviceId: device_id, error: null })
      })

      player.addListener('not_ready', (data) => {
        if (generation !== playerGeneration) return
        const { device_id } = data as { device_id: string }
        if (get().deviceId === device_id) {
          set({ deviceId: null })
        }
      })

      player.addListener('player_state_changed', (raw) => {
        if (generation !== playerGeneration) return
        const state = raw as PlaybackState | null
        if (!state) {
          set({ playing: false })
          return
        }
        set({
          playing: !state.paused,
          position: state.position,
          duration: state.duration,
          current: trackFromPlayback(state),
        })
      })

      player.addListener('initialization_error', (e) => {
        if (generation !== playerGeneration) return
        set({ error: `Init: ${(e as { message: string }).message}` })
      })
      player.addListener('authentication_error', (e) => {
        if (generation !== playerGeneration) return
        set({ error: `Auth: ${(e as { message: string }).message}` })
      })
      player.addListener('account_error', (e) => {
        if (generation !== playerGeneration) return
        set({
          error: `Cuenta: ${(e as { message: string }).message}. ¿Tu Spotify es Premium?`,
        })
      })

      const connected = await player.connect()
      if (generation !== playerGeneration) {
        player.disconnect()
        return
      }

      if (!connected) {
        set({ error: 'No se pudo conectar el reproductor de Spotify' })
      }

      set({ player, ready: true })
    } catch (err) {
      if (generation !== playerGeneration) return
      clearToken()
      set({
        ready: true,
        authenticated: false,
        error: err instanceof Error ? err.message : 'Error al iniciar sesión',
      })
    }
  },

  handleCallback: async (code) => {
    await exchangeCodeForToken(code)
    window.history.replaceState({}, '', '/')
    await get().init()
  },

  login: async () => {
    await beginLogin()
  },

  logout: () => {
    playerGeneration += 1
    get().player?.disconnect()
    clearToken()
    set({
      authenticated: false,
      user: null,
      player: null,
      deviceId: null,
      current: null,
      playing: false,
      results: [],
      recent: [],
      premium: null,
      error: null,
    })
  },

  setQuery: (q) => set({ query: q }),

  search: async () => {
    const { query } = get()
    try {
      const results = await searchTracks(query)
      set({ results, error: null })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error en la búsqueda' })
    }
  },

  playTrack: async (track) => {
    const { player } = get()
    if (!player) {
      set({
        error:
          'El reproductor no está conectado. ¿Cuenta Premium? Prueba recargar la página.',
      })
      return
    }

    try {
      // Debe ir en el mismo gesto del usuario (clic)
      await player.activateElement()

      let deviceId = await waitForDevice(() => get().deviceId)

      const attempt = async () => {
        await startOnDevice(deviceId, [track.uri])
      }

      try {
        await attempt()
      } catch (err) {
        if (!isDeviceNotFoundError(err)) throw err
        // Reconectar y reintentar una vez
        await player.activateElement()
        try {
          await player.disconnect()
        } catch {
          /* ignore */
        }
        set({ deviceId: null })
        await player.connect()
        deviceId = await waitForDevice(() => get().deviceId, 10000)
        await sleep(400)
        await attempt()
      }

      set({ current: track, playing: true, error: null })
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'No se pudo reproducir'
      const friendly = isDeviceNotFoundError(err)
        ? 'Spotify no encontró el tocadiscos web. Abre Spotify en el móvil/PC, pon pausa, vuelve aquí y prueba de nuevo (o recarga).'
        : raw
      set({ error: friendly })
    }
  },

  togglePlay: async () => {
    const { player, deviceId, current, playing } = get()
    if (!player) return

    try {
      await player.activateElement()
      if (!playing && current && deviceId) {
        // Si no hay estado activo, toggle solo no basta
        const state = await player.getCurrentState()
        if (!state) {
          await startOnDevice(deviceId, [current.uri])
          return
        }
      }
      await player.togglePlay()
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'No se pudo pausar/reproducir',
      })
    }
  },

  next: async () => {
    await get().player?.nextTrack()
  },

  previous: async () => {
    await get().player?.previousTrack()
  },

  setVolume: async (v) => {
    set({ volume: v })
    await get().player?.setVolume(v)
  },

  seek: async (ms) => {
    await get().player?.seek(ms)
    set({ position: ms })
  },
}))
