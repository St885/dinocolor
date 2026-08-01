/**
 * ResultScene.jsx
 * -----------------------------------------------------------------------------
 * Pantalla de resultado: victoria (celebratoria) o derrota (amistosa/motivadora),
 * con T-Rexo reaccionando, estrellas, estadísticas y acciones.
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
 *
 * ITERACIÓN 2026-07-28 — la pantalla no explicaba NADA:
 *   - Ganar raspando y ganar de sobra daban el mismo resultado visual → ⭐ 1–3.
 *   - No se decía por qué habías ganado o perdido, solo la cifra desnuda → la línea de
 *     meta ahora dice el margen ("superada por 60" / "te faltaron 90 puntos").
 *   - No había ningún gancho para repetir un nivel ya superado → "Repetir" aparece
 *     cuando quedan estrellas por conseguir, con los puntos exactos que faltan.
 *
 * PRESUPUESTO VERTICAL: esta pantalla ya se salió del marco una vez. La fila de
 * estrellas se paga encogiendo un poco a la mascota (`.mascot--result`) y el texto
 * motivador va DENTRO del globo de diálogo, que ya existía: cero altura extra.
 * -----------------------------------------------------------------------------
 */

import { useEffect } from 'react'
import Button from '../components/ui/Button.jsx'
import Panel from '../components/ui/Panel.jsx'
import DinoMascot from '../components/game/DinoMascot.jsx'
import LevelStars from '../components/ui/LevelStars.jsx'
import { Sounds } from '../systems/audioSystem.js'
import { pointsToNextStar } from '../systems/scoringSystem.js'

/**
 * Mensaje de T-Rexo. Habla del RENDIMIENTO real, no una frase fija: el jugador debe
 * salir sabiendo qué hizo bien o qué le costó el nivel.
 */
function mascotMessage({ won, stars, hasNextLevel, accuracy, misses, isRecord }) {
  if (won) {
    if (stars >= 3) return '¡PERFECTO! No se puede hacer mejor. 🌟'
    if (isRecord) return '¡Nuevo récord en este nivel! 🏆'
    if (accuracy >= 90) return '¡Qué puntería! Casi no fallaste.'
    if (stars === 2) return '¡Muy bien! Una estrella más y es perfecto.'
    return hasNextLevel
      ? '¡Muy bien! ¡Nuevo nivel desbloqueado!'
      : '¡Increíble! ¡Completaste todos los niveles!'
  }
  if (misses >= 6) return 'Se te apagaron muchas. ¡Tócalas en cuanto brillen!'
  if (accuracy >= 80) return 'Apuntas genial, solo te falta ir más rápido.'
  return '¡Casi lo logras! No te rindas, ¡tú puedes!'
}

export default function ResultScene({ result, hasNextLevel, onNext, onRetry, onMenu }) {
  const won = result.outcome === 'won'

  useEffect(() => {
    if (won) Sounds.win()
    else Sounds.lose()
  }, [won])

  // Precisión: un dato que el jugador entiende de un vistazo y que invita a repetir.
  const attempts = result.hits + result.misses
  const accuracy = attempts > 0 ? Math.round((result.hits / attempts) * 100) : 0

  const stars = result.stars || 0
  const bestStars = result.bestStars || stars
  const isNewStars = stars > (result.previousStars || 0)

  // Margen respecto a la meta: el "por qué" de la victoria o la derrota, en puntos.
  const margin = result.score - result.targetScore
  const missing = pointsToNextStar(result.score, result.targetScore, stars)

  const title = won ? (stars >= 3 ? '¡Perfecto!' : '¡Nivel superado!') : 'Inténtalo otra vez'

  return (
    <div className={`scene scene--result ${won ? 'scene--won' : 'scene--lost'}`}>
      {won && <div className="result-rays" aria-hidden="true" />}

      <h1 className="result-title">{title}</h1>

      {/* Estrellas: la recompensa visible. Entran una a una (ver LevelStars). */}
      <div className="result-stars-row">
        <LevelStars value={stars} size="lg" animated={won} />
        {won && isNewStars && <span className="result-stars-new">¡NUEVO!</span>}
        {won && !isNewStars && bestStars > stars && (
          <span className="result-stars-best">Mejor: {bestStars} ⭐</span>
        )}
      </div>

      {/* mood 'cheer' -> pose de salto; mood 'sad' -> pose cabizbaja. */}
      <DinoMascot
        className="mascot--result"
        message={mascotMessage({
          won,
          stars,
          hasNextLevel,
          accuracy,
          misses: result.misses,
          isRecord: result.isRecord,
        })}
        mood={won ? 'cheer' : 'sad'}
        size={172}
        /* Mismo criterio de encuadre que StartScene (ver allí el cálculo): el
           modelo v3 es más estrecho, así que a la altura antigua se veía pequeño
           justo en la pantalla donde tiene que celebrar. */
        targetHeight={1.32}
        baseY={-0.66}
      />

      {/* Panel compacto: la puntuación manda arriba y el resto va en una rejilla de
          2x2. Antes eran 5 filas apiladas y, con el título + la mascota + dos botones,
          la pantalla se salía del marco en móviles normales (contenido recortado, sin
          scroll posible). */}
      <Panel className="result-stats">
        <div className="result-score">
          <span className="result-score-label">
            ⭐ Puntuación
            {result.isRecord && <b className="result-record">RÉCORD</b>}
          </span>
          <strong className="result-score-value">{result.score}</strong>
          {/* El margen convierte una cifra desnuda en una explicación. */}
          <span className="result-score-target">
            🎯 Meta {result.targetScore} ·{' '}
            {won ? (
              <b className="stat-good">superada por {margin}</b>
            ) : (
              <b className="stat-bad">te faltaron {Math.abs(margin)}</b>
            )}
          </span>
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
        {/* Gancho para repetir: dice EXACTAMENTE lo que falta para la siguiente estrella. */}
        {won && stars < 3 && missing > 0 && (
          <p className="result-next-star">
            +{missing} puntos para la estrella {stars + 1} ⭐
          </p>
        )}
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

        {/* Tras ganar sin las 3 estrellas, "repetir" convive con "menú" en una fila:
            así el gancho de las estrellas existe sin añadir un tercer botón alto. */}
        {won && hasNextLevel && stars < 3 ? (
          <div className="result-actions-row">
            <Button variant="secondary" size="md" onClick={onRetry}>
              ↻ Repetir
            </Button>
            <Button variant="ghost" size="md" onClick={onMenu}>
              ☰ Menú
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="lg" block onClick={onMenu}>
            ☰ Menú
          </Button>
        )}
      </div>
    </div>
  )
}
