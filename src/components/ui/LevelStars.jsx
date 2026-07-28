/**
 * LevelStars.jsx
 * -----------------------------------------------------------------------------
 * Fila de tres estrellas (ganadas / vacías). Se usa en las tarjetas del menú
 * (`size="sm"`) y en la pantalla de resultado (`size="lg"`, con entrada animada).
 *
 * Es DOM y no un SVG: son tres glifos con estilo CSS, así que no añade nodos caros
 * al HUD ni al menú (que puede pintar diez tarjetas a la vez).
 * -----------------------------------------------------------------------------
 */

const SLOTS = [0, 1, 2]

export default function LevelStars({ value = 0, size = 'sm', animated = false }) {
  const earned = Math.max(0, Math.min(3, value || 0))
  return (
    <span
      className={`stars stars--${size} ${animated ? 'stars--animated' : ''}`}
      role="img"
      aria-label={`${earned} de 3 estrellas`}
    >
      {SLOTS.map((i) => (
        <i
          key={i}
          className={i < earned ? 'star is-on' : 'star'}
          /* Escalonado de la animación: las estrellas entran de una en una, que es lo
             que hace que se sientan como una recompensa y no como un icono más. */
          style={animated && i < earned ? { animationDelay: `${0.12 + i * 0.16}s` } : undefined}
          aria-hidden="true"
        >
          ★
        </i>
      ))}
    </span>
  )
}
