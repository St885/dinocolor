/**
 * ProviderButton.jsx
 * -----------------------------------------------------------------------------
 * Botón de acceso con proveedor externo (Google / Apple).
 *
 * Los logos van como SVG EN LÍNEA, no como imagen remota: la CSP del juego es
 * `img-src 'self' data:` y, sobre todo, cargar el logo de un CDN de Google
 * significaría una petición a un tercero en la primera pantalla — justo lo que
 * `docs/SECURITY.md` presume no hacer. En línea son unos bytes y funcionan sin
 * conexión.
 *
 * Ambos logos respetan las guías de marca: Google sobre fondo blanco con su "G"
 * de cuatro colores; Apple en negro con la manzana blanca.
 * -----------------------------------------------------------------------------
 */

import { Sounds, unlock } from '../../systems/audioSystem.js'

function GoogleLogo() {
  return (
    <svg className="provider-logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg className="provider-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17.05 12.72c-.03-2.62 2.14-3.88 2.24-3.94-1.22-1.79-3.12-2.03-3.79-2.06-1.61-.16-3.15.95-3.97.95-.82 0-2.08-.93-3.42-.9-1.76.03-3.38 1.02-4.29 2.6-1.83 3.17-.47 7.86 1.31 10.43.87 1.26 1.91 2.67 3.28 2.62 1.32-.05 1.82-.85 3.41-.85 1.59 0 2.04.85 3.43.82 1.42-.02 2.31-1.28 3.17-2.55.99-1.46 1.4-2.88 1.43-2.95-.03-.01-2.74-1.05-2.77-4.17M14.5 4.87c.72-.88 1.21-2.1 1.08-3.31-1.04.04-2.3.69-3.05 1.56-.67.78-1.25 2.02-1.09 3.21 1.16.09 2.34-.59 3.06-1.46"
      />
    </svg>
  )
}

const LOGOS = { google: GoogleLogo, apple: AppleLogo }

/**
 * @param {'google'|'apple'} provider
 * @param {boolean} disabled  proveedor no configurado o petición en curso
 * @param {boolean} busy      esta acción concreta está en curso
 */
export default function ProviderButton({
  provider,
  label,
  onClick,
  disabled = false,
  busy = false,
  hint,
}) {
  const Logo = LOGOS[provider]

  const handleClick = (e) => {
    unlock()
    Sounds.click()
    onClick && onClick(e)
  }

  return (
    <button
      type="button"
      className={`provider-btn provider-btn--${provider} ${busy ? 'is-busy' : ''}`}
      onClick={handleClick}
      disabled={disabled || busy}
      // `title` da el motivo al pasar el ratón; `aria-describedby` no sirve aquí
      // porque la pista no siempre se pinta.
      title={hint || undefined}
    >
      <span className="provider-btn-icon">{Logo ? <Logo /> : null}</span>
      <span className="provider-btn-label">{busy ? 'Conectando…' : label}</span>
      {busy && <span className="provider-spinner" aria-hidden="true" />}
    </button>
  )
}
