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
// Antes el menú solo distinguía "superado / no superado" (una ⭐ de adorno), así que
// ganar raspando y ganar de sobra se veían idénticos: no había ninguna razón para
// volver a un nivel ya pasado. Las estrellas dan ese motivo sin tocar la mecánica ni
// las condiciones de victoria: se calculan a partir de la puntuación final, que ya
// existía. Superar la meta SIEMPRE da al menos 1 estrella (si ganaste, no puedes
// quedarte en cero); las otras dos premian el margen.

/** Umbrales de estrella 2 y 3 como múltiplo de la meta del nivel. */
export const STAR_THRESHOLDS = { two: 1.2, three: 1.5 }

/**
 * Estrellas conseguidas (0..3).
 * @param {number} score        puntuación final
 * @param {number} targetScore  meta del nivel
 * @param {boolean} won         si se superó el nivel
 */
export function computeStars(score, targetScore, won) {
  if (!won || !(targetScore > 0)) return 0
  const ratio = score / targetScore
  if (ratio >= STAR_THRESHOLDS.three) return 3
  if (ratio >= STAR_THRESHOLDS.two) return 2
  return 1
}

/** Puntos que faltan para la siguiente estrella (0 si ya tiene las 3). */
export function pointsToNextStar(score, targetScore, stars) {
  if (!(targetScore > 0) || stars >= 3) return 0
  const need = stars === 0 ? targetScore : targetScore * (stars === 1 ? STAR_THRESHOLDS.two : STAR_THRESHOLDS.three)
  return Math.max(0, Math.ceil(need - score))
}
