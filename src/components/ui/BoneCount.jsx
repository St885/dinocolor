/**
 * BoneCount.jsx
 * -----------------------------------------------------------------------------
 * Contador de huesos 🦴 (la moneda local). Se usa en el menú y en la pantalla de
 * resultado, así que vive aquí para que ambos enseñen exactamente lo mismo.
 *
 * El número se formatea con separador de miles en español: "1.240 🦴" se lee de un
 * vistazo, "1240" no.
 * -----------------------------------------------------------------------------
 */

const nf = new Intl.NumberFormat('es-ES')

export default function BoneCount({ value = 0, size = 'md', className = '' }) {
  const n = Number.isFinite(value) ? Math.max(0, value) : 0
  return (
    <span className={`bones bones--${size} ${className}`}>
      <span className="bones-ico" aria-hidden="true">
        🦴
      </span>
      <strong className="bones-value">{nf.format(n)}</strong>
      <span className="sr-only">huesos</span>
    </span>
  )
}
