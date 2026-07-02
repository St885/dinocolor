/**
 * ProgressBar.jsx — barra de progreso (tiempo, puntuación…).
 *
 * Props:
 *   - value  number  0..1 (se clampa)
 *   - kind   string  'time' | 'score' | 'danger' | string (clase de color)
 *   - label  string  texto opcional dentro/encima
 */

export default function ProgressBar({ value = 0, kind = 'time', label }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`progressbar progressbar--${kind}`}>
      <div className="progressbar-fill" style={{ width: `${pct}%` }} />
      {label && <span className="progressbar-label">{label}</span>}
    </div>
  )
}
