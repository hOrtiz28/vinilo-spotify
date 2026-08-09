import { usePlayerStore } from '../spotify/store'

export function LoginScreen() {
  const { login, needsClientId, error } = usePlayerStore()

  return (
    <section className="login">
      <div className="login-glow" />
      <div className="login-copy">
        <p className="brand-mark">Vinilo</p>
        <h1>Pon el disco. Baja la aguja. Escucha.</h1>
        <p className="lede">
          Un tocadiscos digital conectado a Spotify: portada en el centro del vinilo, brazo que
          cae al reproducir y una sala de escucha hecha para perderse en la música.
        </p>

        {needsClientId ? (
          <div className="setup-box">
            <p>
              Crea una app en el{' '}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                Spotify Developer Dashboard
              </a>
              , copia el Client ID a <code>.env</code> y añade la Redirect URI:
            </p>
            <code className="uri">{window.location.origin}/callback</code>
          </div>
        ) : (
          <button type="button" className="cta" onClick={() => void login()}>
            Conectar con Spotify
          </button>
        )}

        {error && <p className="error-banner">{error}</p>}

        <p className="fine-print">Reproducción en el navegador requiere Spotify Premium.</p>
      </div>

      <div className="login-visual" aria-hidden>
        <div className="login-float">
          <div className="vinyl-disc spin slow">
            <div className="vinyl-grooves" />
            <div className="vinyl-label">
              <div className="vinyl-cover placeholder">
                <span>VINILO</span>
              </div>
            </div>
            <div className="vinyl-spindle" />
            <div className="vinyl-shine" />
          </div>
        </div>
      </div>
    </section>
  )
}
