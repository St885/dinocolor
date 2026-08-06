/**
 * rewardSystem.js
 * -----------------------------------------------------------------------------
 * Lógica PURA de la recompensa de una partida, en HUESOS 🦴 (la moneda local).
 *
 * Qué son los huesos: una recompensa local y decorativa. No se compran, no salen
 * del dispositivo y NO afectan a la dificultad ni desbloquean niveles — el progreso
 * sigue dependiendo solo de superar niveles. Existen para que una partida buena
 * deje algo tangible aunque el nivel ya estuviera superado.
 *
 * Por qué se paga por MEJORAR y no por repetir: las estrellas nuevas y los récords
 * solo se cobran cuando superan lo que ya tenías. Repetir en bucle el nivel 1 da los
 * 5 huesos de la victoria y nada más, así que no compensa hacerlo en vez de avanzar.
 * -----------------------------------------------------------------------------
 */

/** Tarifa de huesos. Un único sitio donde tocar el equilibrio. */
export const BONES = {
  win: 5, // superar el nivel
  newStar: 10, // por cada estrella que MEJORA la marca de ese nivel
  record: 10, // batir tu récord de puntuación en ese nivel
}

/**
 * Recompensa de una partida, desglosada para poder enseñarla línea a línea.
 *
 * @param {object} run
 *   won            si se superó el nivel
 *   stars          estrellas de ESTA partida (0..3)
 *   previousStars  las que ya tenía guardadas ese nivel
 *   isRecord       si la puntuación ha sido récord del nivel
 * @returns {{ total:number, parts:Array<{icon:string,label:string,amount:number}> }}
 */
export function computeRunReward({ won, stars = 0, previousStars = 0, isRecord = false } = {}) {
  const parts = []
  let total = 0

  if (won) {
    total += BONES.win
    parts.push({ icon: '🏆', label: 'Nivel superado', amount: BONES.win })
  }

  const newStars = Math.max(0, (Math.floor(stars) || 0) - (Math.floor(previousStars) || 0))
  if (newStars > 0) {
    const amount = newStars * BONES.newStar
    total += amount
    parts.push({
      icon: '⭐',
      label: newStars === 1 ? 'Estrella nueva' : `${newStars} estrellas nuevas`,
      amount,
    })
  }

  if (isRecord) {
    total += BONES.record
    parts.push({ icon: '📈', label: 'Nuevo récord', amount: BONES.record })
  }

  return { total, parts }
}
