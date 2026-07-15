/**
 * PauseOverlay.jsx
 * -----------------------------------------------------------------------------
 * Pantalla de PAUSA.
 *
 * BUG QUE RESUELVE: el botón de pausa del HUD decía "Pausa / salir" pero en realidad
 * SALÍA al menú de inmediato — el cronómetro seguía corriendo hasta el desmontaje y
 * la partida se perdía sin ningún aviso. Ahora pausa de verdad (congela simulación y
 * cronómetro en useGameLoop) y ofrece las tres salidas esperadas.
 *
 * No cambia la mecánica: solo congela el tiempo y las luces mientras está abierta.
 * -----------------------------------------------------------------------------
 */

import Button from '../ui/Button.jsx'
import { formatTime } from '../../utils/formatTime.js'

export default function PauseOverlay({
  levelId,
  levelName,
  score,
  targetScore,
  timeLeft,
  onResume,
  onRestart,
  onMenu,
}) {
  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Juego en pausa">
      <div className="pause-card">
        <span className="pause-eyebrow">Nivel {levelId}</span>
        <h2 className="pause-title">Pausa</h2>
        <p className="pause-level">{levelName}</p>

        <div className="pause-stats">
          <div className="pause-stat">
            <span className="pause-stat-label">Puntos</span>
            <strong>
              {score}
              <i>/{targetScore}</i>
            </strong>
          </div>
          <div className="pause-stat">
            <span className="pause-stat-label">Tiempo</span>
            <strong>{formatTime(timeLeft)}</strong>
          </div>
        </div>

        <div className="scene-actions">
          <Button variant="primary" size="lg" block onClick={onResume}>
            ▶ Reanudar
          </Button>
          <Button variant="secondary" size="md" block onClick={onRestart}>
            ↻ Reiniciar nivel
          </Button>
          <Button variant="ghost" size="md" block onClick={onMenu}>
            ☰ Salir al menú
          </Button>
        </div>

        <p className="pause-hint">Al salir perderás el progreso de esta partida.</p>
      </div>
    </div>
  )
}
