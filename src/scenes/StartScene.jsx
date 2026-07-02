/**
 * StartScene.jsx — Pantalla de inicio. Logo, mascota T-Rexo (foco emocional) y
 * botón Jugar. La mascota es el protagonista visual de la pantalla.
 */

import Button from '../components/ui/Button.jsx'
import DinoMascot from '../components/game/DinoMascot.jsx'

export default function StartScene({ onStart, soundEnabled, onToggleSound }) {
  return (
    <div className="scene scene--start">
      <button
        className="sound-toggle"
        onClick={onToggleSound}
        aria-label={soundEnabled ? 'Silenciar' : 'Activar sonido'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      <div className="brand">
        <h1 className="logo">
          <span className="logo-dino">Dino</span>
          <span className="logo-color">Color</span>
        </h1>
        <p className="tagline">Pulsa rápido. Gana el reto.</p>
      </div>

      <DinoMascot
        className="mascot--hero"
        model="oliver"
        message={
          <span>
            <strong className="bubble-title">Hola, soy T-Rexo</strong>
            <span className="bubble-sub">¿Listo para entrenar tus reflejos?</span>
          </span>
        }
        mood="happy"
        animation="idle"
        size={256}
        /* Encuadre del héroe: el modelo ocupa algo MENOS del frame (targetHeight)
           y se apoya un poco más abajo (baseY) para que la cabeza se vea COMPLETA,
           con aire bajo el globo y sin recortarse por arriba. Sólo afecta a esta
           instancia; la normalización por bounding-box del componente no cambia. */
        targetHeight={1.15}
        baseY={-0.58}
      />

      <div className="scene-actions">
        <Button variant="primary" size="lg" block onClick={onStart}>
          ▶ Jugar
        </Button>
      </div>

      <p className="hint">Toca las pelotas que se iluminan antes de que se apaguen.</p>
    </div>
  )
}
