import { getValidAccessToken } from './auth'
import type { SearchResponse, SpotifyTrack, SpotifyUser } from './types'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getValidAccessToken()
  if (!token) throw new Error('No hay sesión de Spotify')

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers,
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Spotify API error ${res.status}`)
  }

  return res.json() as Promise<T>
}

export async function getMe(): Promise<SpotifyUser> {
  return apiFetch<SpotifyUser>('/me')
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({
    q,
    type: 'track',
    limit: '10',
    market: 'from_token',
  })

  const data = await apiFetch<SearchResponse>(`/search?${params}`)
  return data.tracks?.items ?? []
}

export async function transferPlayback(deviceId: string, play = false): Promise<void> {
  await apiFetch('/me/player', {
    method: 'PUT',
    body: JSON.stringify({ device_ids: [deviceId], play }),
  })
}

export async function playUri(deviceId: string, uris: string[]): Promise<void> {
  const params = new URLSearchParams({ device_id: deviceId })
  await apiFetch(`/me/player/play?${params}`, {
    method: 'PUT',
    body: JSON.stringify({ uris }),
  })
}

export function isDeviceNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /device not found/i.test(msg) || /NO_ACTIVE_DEVICE/i.test(msg)
}

export async function getRecentlyPlayed(): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ limit: '20' })
  const data = await apiFetch<{ items: { track: SpotifyTrack }[] }>(
    `/me/player/recently-played?${params}`,
  )
  return data.items.map((i) => i.track)
}
