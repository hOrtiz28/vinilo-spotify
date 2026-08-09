export type SpotifyImage = {
  url: string
  height: number | null
  width: number | null
}

export type SpotifyArtist = {
  id: string
  name: string
}

export type SpotifyAlbum = {
  id: string
  name: string
  images: SpotifyImage[]
}

export type SpotifyTrack = {
  id: string
  name: string
  uri: string
  duration_ms: number
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  preview_url: string | null
}

export type SpotifyUser = {
  id: string
  display_name: string | null
  images: SpotifyImage[]
  product?: string
}

export type SearchResponse = {
  tracks: {
    items: SpotifyTrack[]
  }
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SpotifyPlayer
    }
  }
}

export type SpotifyPlayer = {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, cb: (state: unknown) => void) => void
  removeListener: (event: string, cb?: (state: unknown) => void) => void
  getCurrentState: () => Promise<PlaybackState | null>
  setName: (name: string) => Promise<void>
  getVolume: () => Promise<number>
  setVolume: (volume: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  togglePlay: () => Promise<void>
  seek: (position_ms: number) => Promise<void>
  previousTrack: () => Promise<void>
  nextTrack: () => Promise<void>
  activateElement: () => Promise<void>
}

export type PlaybackTrack = {
  uri: string
  id: string | null
  name: string
  duration_ms: number
  artists: { name: string; uri: string }[]
  album: {
    name: string
    uri: string
    images: { url: string }[]
  }
}

export type PlaybackState = {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: PlaybackTrack
    previous_tracks: PlaybackTrack[]
    next_tracks: PlaybackTrack[]
  }
}
