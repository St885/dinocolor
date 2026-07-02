/**
 * DinoMascotPlaceholder.jsx
 * -----------------------------------------------------------------------------
 * Mascota "T-Rexo" dibujada con SVG (sin assets). Es el FALLBACK cuando el modelo
 * 3D (DinoMascot/GLB) no carga, y debe verse igualmente simpática y presentable.
 * Chibi T-Rex de frente: cabezón, ojos grandes, mejillas y barriga con gradientes.
 *
 * Props:
 *   - message    string|node  contenido del bocadillo (admite JSX para 2 líneas)
 *   - mood       'happy' | 'cheer' | 'sad'
 *   - size       number        tamaño en px
 *   - className  string        clases extra (p. ej. 'mascot--hero')
 * -----------------------------------------------------------------------------
 */

export default function DinoMascotPlaceholder({ message, mood = 'happy', size = 150, className = '' }) {
  return (
    <div className={`mascot ${className}`} style={{ '--mascot-size': `${size}px` }}>
      {message && (
        <div className={`mascot-bubble mascot-bubble--${mood}`}>{message}</div>
      )}
      <svg
        className={`mascot-svg mascot-svg--${mood}`}
        width={size}
        height={size}
        viewBox="0 0 140 150"
        role="img"
        aria-label="T-Rexo, la mascota de DinoColor"
      >
        <defs>
          <linearGradient id="trexoBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#84e87d" />
            <stop offset="100%" stopColor="#41b35a" />
          </linearGradient>
          <linearGradient id="trexoBelly" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3fff5" />
            <stop offset="100%" stopColor="#cdf3d2" />
          </linearGradient>
          <linearGradient id="trexoSpike" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc664" />
            <stop offset="100%" stopColor="#ff9e3d" />
          </linearGradient>
        </defs>

        {/* Cola */}
        <path d="M34 120 Q10 116 16 92 Q24 106 44 110 Z" fill="url(#trexoBody)" />

        {/* Patas */}
        <rect x="50" y="120" width="16" height="20" rx="8" fill="#3fa756" />
        <rect x="74" y="120" width="16" height="20" rx="8" fill="#3fa756" />

        {/* Púas dorsales */}
        <path
          d="M52 24 l7 11 7-11z M68 18 l7 11 7-11z M84 22 l7 11 7-11z"
          fill="url(#trexoSpike)"
        />

        {/* Cuerpo + cabeza (un solo cuerpo cabezón, estilo chibi) */}
        <ellipse cx="70" cy="86" rx="44" ry="42" fill="url(#trexoBody)" />
        {/* Barriga */}
        <ellipse cx="70" cy="96" rx="28" ry="28" fill="url(#trexoBelly)" />

        {/* Bracitos */}
        <path d="M30 84 q-8 2 -8 10 q6 -2 10 -2z" fill="#3fa756" />
        <path d="M110 84 q8 2 8 10 q-6 -2 -10 -2z" fill="#3fa756" />

        {/* Mejillas */}
        <circle cx="46" cy="82" r="7" fill="#ff9db6" opacity="0.85" />
        <circle cx="94" cy="82" r="7" fill="#ff9db6" opacity="0.85" />

        {/* Ojos */}
        {mood === 'sad' ? (
          <g>
            <ellipse cx="57" cy="66" rx="10" ry="11" fill="#fff" />
            <ellipse cx="83" cy="66" rx="10" ry="11" fill="#fff" />
            <circle cx="57" cy="70" r="5" fill="#26323b" />
            <circle cx="83" cy="70" r="5" fill="#26323b" />
            {/* Párpados caídos */}
            <path d="M47 62 q10 -6 20 0" stroke="#3fa756" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M73 62 q10 -6 20 0" stroke="#3fa756" strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* Lagrimita */}
            <path d="M52 80 q-3 6 0 9 q3 -3 0 -9z" fill="#7fd3ff" />
          </g>
        ) : (
          <g>
            <ellipse cx="57" cy="64" rx="11" ry="12.5" fill="#fff" />
            <ellipse cx="83" cy="64" rx="11" ry="12.5" fill="#fff" />
            <circle cx="59" cy="66" r="5.5" fill="#26323b" />
            <circle cx="81" cy="66" r="5.5" fill="#26323b" />
            <circle cx="61" cy="63" r="2" fill="#fff" />
            <circle cx="83" cy="63" r="2" fill="#fff" />
          </g>
        )}

        {/* Boca */}
        {mood === 'cheer' ? (
          <g>
            <path d="M58 84 Q70 100 82 84 Q70 90 58 84 Z" fill="#7a2b3a" />
            <path d="M62 86 Q70 95 78 86 Z" fill="#ff8fae" />
            <rect x="61" y="83.5" width="4" height="4" rx="1" fill="#fff" />
            <rect x="75" y="83.5" width="4" height="4" rx="1" fill="#fff" />
            {/* Destellos de alegría */}
            <path d="M26 50 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#ffe07a" />
            <path d="M112 56 l1.5 4.5 4.5 1.5 -4.5 1.5 -1.5 4.5 -1.5 -4.5 -4.5 -1.5 4.5 -1.5z" fill="#ffe07a" />
          </g>
        ) : mood === 'sad' ? (
          <path d="M60 90 Q70 82 80 90" stroke="#26323b" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <g>
            <path d="M58 84 Q70 96 82 84" stroke="#26323b" strokeWidth="3" fill="none" strokeLinecap="round" />
            <rect x="64" y="84" width="3.5" height="4" rx="1" fill="#fff" />
            <rect x="72" y="84" width="3.5" height="4" rx="1" fill="#fff" />
          </g>
        )}
      </svg>
    </div>
  )
}
