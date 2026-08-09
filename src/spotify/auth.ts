const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined

/** Siempre la origen actual → evita mismatch con variables de entorno mal puestas */
function getRedirectUri(): string {
  return `${window.location.origin}/callback`
}

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ')

const TOKEN_KEY = 'vinilo_spotify_token'
const VERIFIER_KEY = 'vinilo_pkce_verifier'

export type SpotifyToken = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  expires_at: number
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

function randomString(length = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => charset[v % charset.length]).join('')
}

export function getStoredToken(): SpotifyToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SpotifyToken
  } catch {
    return null
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function storeToken(token: SpotifyToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
}

export function hasClientId(): boolean {
  return Boolean(CLIENT_ID && CLIENT_ID !== 'your_spotify_client_id')
}

export async function beginLogin(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('Falta VITE_SPOTIFY_CLIENT_ID en el archivo .env')
  }

  const verifier = randomString(64)
  const challenge = base64UrlEncode(await sha256(verifier))
  sessionStorage.setItem(VERIFIER_KEY, verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    show_dialog: 'true',
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCodeForToken(code: string): Promise<SpotifyToken> {
  if (!CLIENT_ID) throw new Error('Falta VITE_SPOTIFY_CLIENT_ID')

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) throw new Error('No se encontró el verificador PKCE')

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error al obtener token: ${err}`)
  }

  const data = (await res.json()) as Omit<SpotifyToken, 'expires_at'>
  const token: SpotifyToken = {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  }

  sessionStorage.removeItem(VERIFIER_KEY)
  storeToken(token)
  return token
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyToken> {
  if (!CLIENT_ID) throw new Error('Falta VITE_SPOTIFY_CLIENT_ID')

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    clearToken()
    throw new Error('No se pudo renovar la sesión de Spotify')
  }

  const data = (await res.json()) as Omit<SpotifyToken, 'expires_at'>
  const prev = getStoredToken()
  const token: SpotifyToken = {
    ...data,
    refresh_token: data.refresh_token ?? prev?.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  storeToken(token)
  return token
}

export async function getValidAccessToken(): Promise<string | null> {
  let token = getStoredToken()
  if (!token) return null

  if (Date.now() > token.expires_at - 60_000) {
    if (!token.refresh_token) {
      clearToken()
      return null
    }
    token = await refreshAccessToken(token.refresh_token)
  }

  return token.access_token
}
