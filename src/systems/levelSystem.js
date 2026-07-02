/**
 * levelSystem.js
 * -----------------------------------------------------------------------------
 * Acceso y navegación de niveles. Capa fina sobre src/data/levels.js para que el
 * resto del juego no dependa de la forma del array.
 * -----------------------------------------------------------------------------
 */

import LEVELS from '../data/levels.js'

/** Número total de niveles definidos. */
export function totalLevels() {
  return LEVELS.length
}

/** Lista completa de niveles (solo lectura). */
export function getAllLevels() {
  return LEVELS
}

/** Devuelve el nivel con ese id, o undefined si no existe. */
export function getLevelById(id) {
  return LEVELS.find((lvl) => lvl.id === id)
}

/** Primer nivel (id menor). */
export function getFirstLevel() {
  return LEVELS[0]
}

/** Devuelve el siguiente nivel tras `id`, o null si era el último. */
export function getNextLevel(id) {
  const idx = LEVELS.findIndex((lvl) => lvl.id === id)
  if (idx === -1 || idx + 1 >= LEVELS.length) return null
  return LEVELS[idx + 1]
}

/** ¿Es `id` el último nivel? */
export function isLastLevel(id) {
  return getNextLevel(id) === null
}

/** Id máximo de nivel existente. */
export function maxLevelId() {
  return LEVELS.reduce((max, lvl) => Math.max(max, lvl.id), 0)
}
