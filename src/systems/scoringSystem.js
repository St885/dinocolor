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
