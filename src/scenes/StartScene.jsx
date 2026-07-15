/**
 * StartScene.jsx — Pantalla de inicio. Logo, mascota T-Rexo (foco emocional) y
 * botón Jugar. La mascota es la protagonista visual de la pantalla.
 *
 * T-Rexo saluda con el CUERPO (pose "greet": se inclina hacia el jugador y se balancea).
 * No se usa el clip `wave` del GLB porque rompe la malla — le despega la placa del
 * vientre y la boca. Ver la nota SAFE_CLIPS en DinoMascot.jsx.
 */

import { useCallback } from 'react'
import Button from '../components/ui/Button.jsx'
import DinoMascot from '../components/game/DinoMascot.jsx'
import { unlock } from '../systems/audioSystem.js'

export default function StartScene({ onStart, soundEnabled, onToggleSound }) {
  // El navegador solo deja crear el AudioContext dentro de un gesto del usuario. Si el
  // primer toque del jugador era este botón (y no <Button>, que ya lo hacía), el audio
  // se quedaba bloqueado toda la sesión.
  const handleToggleSound = useCallback(() => {
    unlock()
    onToggleSound()
  }, [onToggleSound])

  return (
    <div className="scene scene--start">
      <button
        className="sound-toggle"
        onClick={handleToggleSound}
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
        pose="greet"
        message={
          <span>
            <strong className="bubble-title">Hola, soy T-Rexo</strong>
            <span className="bubble-sub">¿Listo para entrenar tus reflejos?</span>
          </span>
        }
        mood="happy"
        /* El tamaño real lo decide el CSS (.mascot--hero usa clamp() con vh): en
           pantallas bajitas el héroe se encoge en vez de recortarse. Este número es
           solo el valor por defecto de --mascot-size. */
        size={256}
        /* Encuadre del héroe: el modelo ocupa algo MENOS del frame (targetHeight) y se
           apoya un poco más abajo (baseY) para que la cabeza se vea COMPLETA, con aire
           bajo el globo y sin recortarse por arriba. */
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
