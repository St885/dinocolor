/**
 * ResultScene.jsx
 * -----------------------------------------------------------------------------
 * Pantalla de resultado: victoria (celebratoria) o derrota (amistosa/motivadora),
 * con T-Rexo reaccionando, estadísticas y acciones.
 *
 * DOS BUGS QUE SE ARREGLAN AQUÍ:
 *
 *  1) Ganar y perder se veían EXACTAMENTE IGUAL. Se pedía 'Shake_It_Off_Dance' para la
 *     victoria (un clip de oliver_master.glb), pero el modelo que se cargaba de verdad
 *     era oliver_character.glb, que solo tiene UN clip: cualquier animación pedida caía
 *     en el mismo sitio. La celebración no existía.
 *     Ahora T-Rexo SALTA de alegría al ganar y se queda cabizbajo al perder — con poses
 *     de cuerpo entero, no con clips del esqueleto (los clips expresivos del GLB rompen
 *     la malla: ver SAFE_CLIPS en DinoMascot.jsx).
 *
 *  2) Sounds.win() y Sounds.lose() estaban escritos y no los llamaba NADIE: el juego
 *     terminaba en silencio. Ahora suenan al montar la pantalla.
 * -----------------------------------------------------------------------------
 */

import { useEffect } from 'react'
import Button from '../components/ui/Button.jsx'
import Panel from '../components/ui/Panel.jsx'
import DinoMascot from '../components/game/DinoMascot.jsx'
import { Sounds } from '../systems/audioSystem.js'

export default function ResultScene({ result, hasNextLevel, onNext, onRetry, onMenu }) {
  const won = result.outcome === 'won'

  useEffect(() => {
    if (won) Sounds.win()
    else Sounds.lose()
  }, [won])

  const title = won ? '¡Nivel superado!' : 'Inténtalo otra vez'
  const mascotMsg = won
    ? hasNextLevel
      ? '¡Muy bien! ¡Nuevo nivel desbloqueado!'
      : '¡Increíble! ¡Completaste todos los niveles!'
    : '¡Casi lo logras! No te rindas, ¡tú puedes!'

  // Precisión: un dato que el jugador entiende de un vistazo y que invita a repetir.
  const attempts = result.hits + result.misses
  const accuracy = attempts > 0 ? Math.round((result.hits / attempts) * 100) : 0

  return (
    <div className={`scene scene--result ${won ? 'scene--won' : 'scene--lost'}`}>
      {won && <div className="result-rays" aria-hidden="true" />}

      <h1 className="result-title">{title}</h1>

      {/* mood 'cheer' -> pose de salto; mood 'sad' -> pose cabizbaja. */}
      <DinoMascot
        className="mascot--result"
        message={mascotMsg}
        mood={won ? 'cheer' : 'sad'}
        size={172}
        targetHeight={1.15}
        baseY={-0.58}
      />

      {/* Panel compacto: la puntuación manda arriba y el resto va en una rejilla de
          2x2. Antes eran 5 filas apiladas y, con el título + la mascota + dos botones,
          la pantalla se salía del marco en móviles normales (contenido recortado, sin
          scroll posible). */}
      <Panel className="result-stats">
        <div className="result-score">
          <span className="result-score-label">⭐ Puntuación</span>
          <strong className="result-score-value">{result.score}</strong>
          <span className="result-score-target">🎯 Meta: {result.targetScore}</span>
        </div>
        <div className="result-grid">
          <div className="result-cell">
            <span>✔ Aciertos</span>
            <strong className="stat-good">{result.hits}</strong>
          </div>
          <div className="result-cell">
            <span>✘ Fallos</span>
            <strong className="stat-bad">{result.misses}</strong>
          </div>
          <div className="result-cell">
            <span>🔥 Mejor combo</span>
            <strong>x{result.bestCombo}</strong>
          </div>
          <div className="result-cell">
            <span>🎯 Precisión</span>
            <strong>{accuracy}%</strong>
          </div>
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
        {won && !hasNextLevel && (
          <Button variant="primary" size="lg" block onClick={onRetry}>
            ↻ Volver a jugar
          </Button>
        )}
        <Button variant="secondary" size="lg" block onClick={onMenu}>
          ☰ Menú
        </Button>
      </div>
    </div>
  )
}
