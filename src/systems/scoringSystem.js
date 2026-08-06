/**
 * scoringSystem.js
 * -----------------------------------------------------------------------------
 * Lógica PURA de puntuación de DinoColor (sin React, sin estado global).
 * Se puede testear de forma aislada.
 *
 * Reglas (ver docs/GDD.md):
 *   - Acierto rápido:   +100 puntos
 *   - Acierto normal:   +50 puntos
 *   - Pulsar pelota apagada: penalización (por defecto -25, configurable por nivel)
 *   - No pulsar a tiempo:    -50 puntos
 *   - Combo: aciertos seguidos aumentan un multiplicador simple.
 * -----------------------------------------------------------------------------
 */

export const SCORING = {
  POINTS_FAST: 100,
  POINTS_NORMAL: 50,
  // Un acierto es "rápido" si ocurre dentro de este % del tiempo de reacción.
  FAST_RATIO: 0.45,
  // Penalización por defecto al pulsar una pelota apagada (los niveles pueden sobreescribirla).
  WRONG_TAP_PENALTY: 25,
  // Penalización al dejar expirar una pelota iluminada.
  MISS_PENALTY: 50,
  // El multiplicador sube +0.5 cada COMBO_STEP aciertos seguidos, hasta COMBO_MAX_MULT.
  COMBO_STEP: 3,
  COMBO_MAX_MULT: 3,
}

/**
 * Multiplicador de combo a partir del número de aciertos seguidos.
 * combo 0-2 -> 1x, 3-5 -> 1.5x, 6-8 -> 2x, ... (tope COMBO_MAX_MULT)
 */
export function comboMultiplier(combo) {
  const mult = 1 + Math.floor(combo / SCORING.COMBO_STEP) * 0.5
  return Math.min(mult, SCORING.COMBO_MAX_MULT)
}

/**
 * Puntos por un acierto.
 * @param {number} elapsedMs       ms transcurridos desde que la pelota se iluminó
 * @param {number} reactionTimeS   ventana de reacción del nivel (segundos)
 * @param {number} combo           combo YA actualizado (incluye este acierto)
 * @returns {{ points:number, base:number, multiplier:number, fast:boolean }}
 */
export function computeHitScore(elapsedMs, reactionTimeS, combo) {
  const fast = elapsedMs <= reactionTimeS * 1000 * SCORING.FAST_RATIO
  const base = fast ? SCORING.POINTS_FAST : SCORING.POINTS_NORMAL
  const multiplier = comboMultiplier(combo)
  return {
    points: Math.round(base * multiplier),
    base,
    multiplier,
    fast,
  }
}

/** Penalización por pulsar una pelota apagada (clamp opcional lo hace el caller). */
export function wrongTapPenalty(level) {
  return level && typeof level.penalty === 'number'
    ? level.penalty
    : SCORING.WRONG_TAP_PENALTY
}

/** Penalización por dejar expirar una pelota iluminada. */
export function missPenalty() {
  return SCORING.MISS_PENALTY
}

// --- Estrellas ----------------------------------------------------------------
//
// Las estrellas existen para dar un motivo de volver a un nivel ya superado.
//
// ⚠️ CÓMO SE CALCULABAN ANTES, Y POR QUÉ NO FUNCIONABA (bug corregido 2026-08-05):
// se derivaban del MARGEN sobre la meta (`score / targetScore`), con 2⭐ a partir de
// 1,2× y 3⭐ a partir de 1,5×. El problema: `useGameLoop` termina el nivel en el
// INSTANTE en que la puntuación alcanza la meta, así que el margen final es siempre
// ~0 y la única forma de sacar 2⭐ o 3⭐ era que el último golpe se pasase mucho —
// pura casualidad, no habilidad. Comprobado jugando: el nivel 1 terminaba con
// 300/300, la pantalla decía «superada por 0» y daba 1⭐ SIEMPRE.
//
// AHORA se miden por el TIEMPO QUE SOBRA al alcanzar la meta. En un juego de
// reflejos es lo natural (más rápido = mejor), es determinista, se explica en una
// línea («te sobraron 18 s») y no cambia ni la mecánica ni el ritmo de los niveles:
// ganar sigue siendo llegar a la meta, y el nivel sigue acabando ahí mismo.

/**
 * Fracción del tiempo total que debe QUEDAR para cada estrella.
 * Son el mando de dificultad de las estrellas: subirlos las hace más exigentes.
 * Calibrados jugando de verdad (ver docs/TECHNICAL_NOTES.md).
 */
export const STAR_TIME_THRESHOLDS = { two: 0.45, three: 0.65 }

/**
 * Estrellas conseguidas (0..3).
 * @param {boolean} won        si se superó el nivel
 * @param {number}  timeLeft   segundos que quedaban al terminar
 * @param {number}  totalTime  duración total del nivel en segundos
 */
export function computeStars(won, timeLeft, totalTime) {
  if (!won) return 0
  // Sin duración válida no podemos medir rapidez: ganar vale 1⭐ y no se castiga.
  if (!(totalTime > 0)) return 1
  const left = Math.max(0, Math.min(1, timeLeft / totalTime))
  if (left >= STAR_TIME_THRESHOLDS.three) return 3
  if (left >= STAR_TIME_THRESHOLDS.two) return 2
  return 1
}

/**
 * Segundos que habría que haber ahorrado para la siguiente estrella (0 si ya tiene
 * las 3). Sustituye a `pointsToNextStar`, que daba un consejo IMPOSIBLE de seguir:
 * pedía más puntos en un nivel que ya había terminado.
 */
export function secondsToNextStar(timeLeft, totalTime, stars) {
  if (!(totalTime > 0) || stars >= 3) return 0
  const need = stars <= 1 ? STAR_TIME_THRESHOLDS.two : STAR_TIME_THRESHOLDS.three
  return Math.max(0, Math.ceil(need * totalTime - timeLeft))
}
