/**
 * TutorialOverlay.jsx
 * -----------------------------------------------------------------------------
 * Explicación breve del nivel 1, la PRIMERA vez que se juega.
 *
 * POR QUÉ EXISTE: el juego lanzaba al jugador directamente a la partida. La única
 * pista era una línea pequeña en la portada ("toca las pelotas que se iluminan"),
 * fácil de perder, y nada explicaba la meta, el cronómetro ni que fallar resta
 * puntos. Los primeros 30 segundos de un juego de reflejos son los que deciden si
 * alguien sigue jugando: merecen una pantalla propia.
 *
 * No cambia la mecánica. Mientras está abierto, la partida arranca CONGELADA
 * (`startPaused` en useGameLoop): el cronómetro no corre y el tablero está apagado,
 * así que leer no cuesta tiempo ni una bola perdida.
 *
 * Se muestra UNA sola vez (`dinocolor.tutorialSeen` en localStorage). El jugador
 * puede volver a verlo borrando el progreso.
 * -----------------------------------------------------------------------------
 */

import Button from '../ui/Button.jsx'

export default function TutorialOverlay({ level, onStart }) {
  return (
    <div
      className="tutorial-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Cómo se juega"
    >
      <div className="tutorial-card">
        <span className="tutorial-eyebrow">Cómo se juega</span>
        <h2 className="tutorial-title">¡Vamos, {level.name}!</h2>

        <ul className="tutorial-steps">
          <li>
            <span className="tutorial-ico tutorial-ico--tap" aria-hidden="true" />
            <span>
              <strong>Toca la pelota que se ilumina.</strong> Cuanto más rápido, más
              puntos.
            </span>
          </li>
          <li>
            <span className="tutorial-ico" aria-hidden="true">
              ⏱
            </span>
            <span>
              Tienes <strong>{level.totalTime} segundos</strong>. Si se apaga sin que la
              toques, pierdes puntos.
            </span>
          </li>
          <li>
            <span className="tutorial-ico" aria-hidden="true">
              🎯
            </span>
            <span>
              Llega a <strong>{level.targetScore} puntos</strong> para superar el nivel.
            </span>
          </li>
          <li>
            <span className="tutorial-ico" aria-hidden="true">
              ⭐
            </span>
            <span>
              Pasa de sobra y ganarás hasta <strong>3 estrellas</strong>.
            </span>
          </li>
        </ul>

        <div className="scene-actions">
          <Button variant="primary" size="lg" block onClick={onStart}>
            ▶ ¡Empezar!
          </Button>
        </div>
      </div>
    </div>
  )
}
