/**
 * StartScene.jsx — Pantalla de inicio. Logo, mascota T-Rexo (foco emocional) y
 * botón Jugar. La mascota es la protagonista visual de la pantalla.
 *
 * T-Rexo saluda con el CUERPO (pose "greet": se inclina hacia el jugador y se balancea).
 * El modelo actual no tiene esqueleto, así que TODA la expresividad viene de las
 * poses de cuerpo entero de `MascotRig` — ver `src/data/mascot.js`.
 */

import { useCallback } from 'react'
import Button from '../components/ui/Button.jsx'
import DinoMascot from '../components/game/DinoMascot.jsx'
import { MASCOT_NAME } from '../data/mascot.js'
import { unlock } from '../systems/audioSystem.js'

export default function StartScene({ onStart, soundEnabled, onToggleSound, skin }) {
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
            <strong className="bubble-title">¡Hola! Soy {MASCOT_NAME}</strong>
            <span className="bubble-sub">¿Entrenamos tus reflejos?</span>
          </span>
        }
        mood="happy"
        /* El tamaño real lo decide el CSS (.mascot--hero usa clamp() con vh): en
           pantallas bajitas el héroe se encoge en vez de recortarse. Este número es
           solo el valor por defecto de --mascot-size. */
        size={272}
        /* Encuadre del héroe. Los números salen de la geometría de la cámara, no
           de probar a ojo: con fov 30 a distancia 2.8, la altura visible en z=0 es
           2·2.8·tan(15°) ≈ 1.50, o sea y ∈ [-0.75, 0.75]. Con targetHeight 1.32 y
           baseY -0.66 el modelo ocupa y ∈ [-0.66, 0.66]: 88 % del encuadre, con
           9 px de aire arriba y abajo. Ni se corta la cabeza ni queda flotando.
           Se subió desde 1.15 porque el modelo nuevo es MÁS ESTRECHO que el
           anterior (0.56 de ancho por alto, frente a 0.86): a igual altura se
           veía bastante más pequeño. */
        targetHeight={1.32}
        baseY={-0.66}
        skin={skin}
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
