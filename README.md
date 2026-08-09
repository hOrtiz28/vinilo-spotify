# Vinilo

Tocadiscos web conectado a Spotify: el disco gira con la portada, el brazo baja al reproducir y los colores del ambiente siguen cada canción.

## Requisitos

- Cuenta Spotify **Premium** (Web Playback SDK)
- Node.js 18+
- App en el [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## Desarrollo local

1. Copia el entorno:

```bash
copy .env.example .env
```

2. Pon tu Client ID en `.env` y la Redirect URI:

```
VITE_SPOTIFY_CLIENT_ID=tu_client_id
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
```

3. En Spotify Dashboard → Settings, añade exactamente:

`http://127.0.0.1:5173/callback`

4. Arranca:

```bash
npm install
npm run dev
```

Abre `http://127.0.0.1:5173` (preferible a `localhost`).

## Desplegar en Vercel (acceso público)

1. Importa este repo en [vercel.com](https://vercel.com)
2. Añade variables de entorno:
   - `VITE_SPOTIFY_CLIENT_ID` = tu Client ID
   - `VITE_SPOTIFY_REDIRECT_URI` = `https://TU-PROYECTO.vercel.app/callback`
3. Deploy
4. En Spotify Dashboard, añade también:

`https://TU-PROYECTO.vercel.app/callback`

Cualquiera con el enlace puede entrar e iniciar sesión con su Spotify.

## Stack

- Vite + React + TypeScript
- Spotify OAuth PKCE + Web Playback SDK
- Zustand
