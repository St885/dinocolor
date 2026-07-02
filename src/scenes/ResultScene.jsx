/**
 * ResultScene.jsx
 * -----------------------------------------------------------------------------
 * Pantalla de resultado: victoria (celebratoria) o derrota (amistosa/motivadora),
 * con la mascota T-Rexo reaccionando, estadísticas y acciones.
 * -----------------------------------------------------------------------------
 */

import Button from '../components/ui/Button.jsx'
import Panel from '../components/ui/Panel.jsx'
import DinoMascot from '../components/game/DinoMascot.jsx'

/**
 * Animaciones de Oliver/T-Rexo por resultado, en ORDEN DE PRIORIDAD (se usa la
 * primera disponible en el GLB cargado). Referencias a nivel de módulo para que
 * sean estables entre renders (no reinician la animación).
 *   - Victoria: baile/salto alegre.
 *   - Derrota:  ánimo/alerta suave (sin animaciones agresivas).
 * `oliver_character.glb` (principal) trae 1 sola clip → cae a ella de forma segura;
 * la prioridad se aplica con `oliver_master.glb` (fallback, 11 clips).
 */
const WIN_ANIM = ['Shake_It_Off_Dance', 'Jump_with_Arms_Open', 'Big_Wave_Hello', 'Idle_02']
const LOSE_ANIM = ['Alert', 'Idle_03', 'Idle_02']

export default function ResultScene({ result, hasNextLevel, onNext, onRetry, onMenu }) {
  const won = result.outcome === 'won'

  const title = won ? '¡Nivel superado!' : 'Inténtalo otra vez'
  const mascotMsg = won
    ? hasNextLevel
      ? '¡Muy bien! ¡Nuevo nivel desbloqueado!'
      : '¡Increíble! ¡Completaste todos los niveles!'
    : '¡Casi lo logras! No te rindas, ¡tú puedes!'

  return (
    <div className={`scene scene--result ${won ? 'scene--won' : 'scene--lost'}`}>
      {won && <div className="result-rays" aria-hidden="true" />}

      <h1 className="result-title">{title}</h1>

      {/* Mascota oficial Oliver/T-Rexo (mismo sistema que StartScene:
          character.glb → master.glb → dino → SVG). Más pequeña que en inicio y
          reencuadrada (targetHeight/baseY) para verse completa, sin cortes ni
          tapar el título/globo/panel. */}
      <DinoMascot
        className="mascot--result"
        model="oliver"
        message={mascotMsg}
        mood={won ? 'cheer' : 'sad'}
        animation={won ? WIN_ANIM : LOSE_ANIM}
        size={172}
        targetHeight={1.15}
        baseY={-0.58}
      />

      <Panel className="result-stats">
        <div className="stat-row">
          <span>⭐ Puntuación</span>
          <strong>{result.score}</strong>
        </div>
        <div className="stat-row">
          <span>🎯 Meta</span>
          <strong>{result.targetScore}</strong>
        </div>
        <div className="stat-row">
          <span>✔ Aciertos</span>
          <strong className="stat-good">{result.hits}</strong>
        </div>
        <div className="stat-row">
          <span>✘ Fallos</span>
          <strong className="stat-bad">{result.misses}</strong>
        </div>
        <div className="stat-row">
          <span>🔥 Mejor combo</span>
          <strong>x{result.bestCombo}</strong>
        </div>
      </Panel>

      <div className="scene-actions">
        {won && hasNextLevel && (
          <Button variant="primary" size="lg" block onClick={onNext}>
            ▶ Siguiente nivel
          </Button>
        )}
        {!won && (
          <Button variant="primary" size="lg" block onClick={onRetry}>
            ↻ Reintentar
          </Button>
        )}
        <Button variant="secondary" size="lg" block onClick={onMenu}>
          ☰ Menú
        </Button>
      </div>
    </div>
  )
}
