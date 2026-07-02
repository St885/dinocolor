/**
 * TreasureChest.jsx — cofre decorativo (SVG) para la esquina inferior derecha del
 * área de juego, según el diseño aprobado. Por ahora es decorativo/reservado para
 * futuras recompensas (no cambia mecánica). Botón táctil con pequeño feedback.
 */

export default function TreasureChest({ onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`ghud-chest ${className}`}
      onClick={onClick}
      aria-label="Cofre de recompensas (próximamente)"
    >
      <svg width="64" height="60" viewBox="0 0 64 60" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a9642e" />
            <stop offset="100%" stopColor="#6e3c17" />
          </linearGradient>
          <linearGradient id="chestLid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c07a3a" />
            <stop offset="100%" stopColor="#8a4d20" />
          </linearGradient>
          <linearGradient id="chestGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe08a" />
            <stop offset="100%" stopColor="#f2a838" />
          </linearGradient>
          <radialGradient id="chestGlow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffe89a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffe89a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Resplandor cálido detrás */}
        <ellipse cx="32" cy="30" rx="30" ry="26" fill="url(#chestGlow)" />

        {/* Cuerpo del cofre */}
        <rect x="9" y="28" width="46" height="26" rx="5" fill="url(#chestWood)" stroke="#4a2a10" strokeWidth="1.5" />
        {/* Tapa arqueada */}
        <path
          d="M9 30 C9 18 18 12 32 12 C46 12 55 18 55 30 L55 32 L9 32 Z"
          fill="url(#chestLid)"
          stroke="#4a2a10"
          strokeWidth="1.5"
        />
        {/* Bandas doradas verticales */}
        <rect x="17" y="12" width="4" height="42" rx="1.5" fill="url(#chestGold)" />
        <rect x="43" y="12" width="4" height="42" rx="1.5" fill="url(#chestGold)" />
        {/* Banda dorada horizontal (unión tapa/cuerpo) */}
        <rect x="9" y="30" width="46" height="4" fill="url(#chestGold)" />
        {/* Cerradura */}
        <rect x="28" y="30" width="8" height="11" rx="2" fill="url(#chestGold)" stroke="#8a5a12" strokeWidth="0.8" />
        <circle cx="32" cy="35" r="1.7" fill="#5a3a0c" />
        <rect x="31.2" y="35" width="1.6" height="3.5" rx="0.8" fill="#5a3a0c" />
        {/* Brillo del oro */}
        <circle cx="19" cy="18" r="1.3" fill="#fff6d8" opacity="0.9" />
      </svg>
    </button>
  )
}
