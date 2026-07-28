/**
 * TreasureChest.jsx — cofre decorativo (SVG) para la esquina inferior derecha del
 * área de juego. Decorativo/reservado para futuras recompensas (no cambia mecánica).
 * Versión premium: madera con vetas, tapa arqueada con brillo, herrajes dorados,
 * gema central, destellos y una pequeña base luminosa que lo integra al mundo.
 *
 * RENDIMIENTO: va memoizado. Vive dentro del HUD, que se re-renderiza con cada punto
 * y cada segundo del cronómetro; sin memo, React recorría sus ~25 nodos SVG (5
 * gradientes incluidos) decenas de veces por partida para pintar exactamente lo mismo.
 */

import { memo } from 'react'

function TreasureChest({ onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`ghud-chest ${className}`}
      onClick={onClick}
      aria-label="Cofre de recompensas (próximamente)"
    >
      <svg width="66" height="64" viewBox="0 0 66 64" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b06e33" />
            <stop offset="100%" stopColor="#5f3113" />
          </linearGradient>
          <linearGradient id="chestLid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cd8442" />
            <stop offset="100%" stopColor="#814519" />
          </linearGradient>
          <linearGradient id="chestGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe89a" />
            <stop offset="55%" stopColor="#f7b53f" />
            <stop offset="100%" stopColor="#c9821f" />
          </linearGradient>
          <radialGradient id="chestGlow" cx="50%" cy="46%" r="58%">
            <stop offset="0%" stopColor="#ffe89a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffe89a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="chestGem" cx="42%" cy="36%" r="70%">
            <stop offset="0%" stopColor="#bafcff" />
            <stop offset="45%" stopColor="#3fd8ff" />
            <stop offset="100%" stopColor="#1587c9" />
          </radialGradient>
        </defs>

        {/* Resplandor cálido detrás */}
        <ellipse cx="33" cy="30" rx="32" ry="27" fill="url(#chestGlow)" />
        {/* Base luminosa (integra el cofre al suelo) */}
        <ellipse cx="33" cy="57" rx="24" ry="5" fill="#000" opacity="0.34" />
        <ellipse cx="33" cy="56.5" rx="20" ry="3.4" fill="#54ff9d" opacity="0.22" />

        {/* Cuerpo del cofre con vetas */}
        <rect x="9" y="30" width="48" height="25" rx="5" fill="url(#chestWood)" stroke="#3f2410" strokeWidth="1.6" />
        <path d="M15 34 V52 M24 34 V52 M42 34 V52 M51 34 V52" stroke="#3f2410" strokeWidth="0.8" opacity="0.45" />

        {/* Tapa arqueada */}
        <path
          d="M9 32 C9 19 19 12.5 33 12.5 C47 12.5 57 19 57 32 L57 34 L9 34 Z"
          fill="url(#chestLid)"
          stroke="#3f2410"
          strokeWidth="1.6"
        />
        {/* Brillo de la tapa */}
        <path d="M15 30 C16 21 24 16.5 33 16.5 C40 16.5 46 19 49 24" stroke="#ffd79a" strokeWidth="1.6" opacity="0.5" fill="none" strokeLinecap="round" />

        {/* Herrajes dorados verticales */}
        <rect x="16.5" y="12.5" width="4.5" height="42.5" rx="1.6" fill="url(#chestGold)" />
        <rect x="45" y="12.5" width="4.5" height="42.5" rx="1.6" fill="url(#chestGold)" />
        {/* Banda dorada horizontal (unión tapa/cuerpo) */}
        <rect x="9" y="31" width="48" height="4.5" fill="url(#chestGold)" />

        {/* Cerradura con gema */}
        <rect x="28" y="30.5" width="10" height="12.5" rx="2.4" fill="url(#chestGold)" stroke="#8a5a12" strokeWidth="0.9" />
        <circle cx="33" cy="37" r="3.1" fill="url(#chestGem)" stroke="#0e5f8a" strokeWidth="0.6" />
        <circle cx="31.9" cy="35.9" r="0.9" fill="#eafdff" opacity="0.9" />

        {/* Destellos */}
        <g fill="#fff6d8">
          <circle cx="19" cy="18" r="1.4" opacity="0.9" />
          <path d="M49 15 l0.8 2.2 2.2 0.8 -2.2 0.8 -0.8 2.2 -0.8 -2.2 -2.2 -0.8 2.2 -0.8 z" opacity="0.85" />
        </g>
      </svg>
    </button>
  )
}

export default memo(TreasureChest)
