/**
 * levelValidation.js
 * -----------------------------------------------------------------------------
 * Validador PURO de la definición de niveles (sin React, sin estado, sin import.meta).
 * Se puede llamar desde `levels.js` en desarrollo, desde un test o desde un script.
 *
 * Devuelve una lista de strings con los problemas encontrados (vacía = todo OK).
 * No lanza ni corrige nada: solo informa, para poder decidir qué hacer.
 * -----------------------------------------------------------------------------
 */

const DIFFICULTIES = new Set(['facil', 'media', 'dificil', 'extrema'])
const REQUIRED = [
  'name',
  'layout',
  'activeBalls',
  'totalTime',
  'reactionTime',
  'targetScore',
  'penalty',
  'activeColor',
  'difficulty',
]

// Pace (puntos/segundo requeridos = targetScore/totalTime) por encima del cual la meta
// es probablemente inalcanzable para un jugador humano (tope de toques/seg × puntos/toque
// con combo). Es un aviso, no un error: los niveles bien equilibrados quedan muy por
// debajo. Sube este número solo si de verdad quieres metas más agresivas.
const MAX_REASONABLE_PACE = 130

/**
 * @param {Array} levels  array de niveles (src/data/levels.js)
 * @param {Object} layouts  BOARD_LAYOUTS (src/data/boardLayouts.js) para contar celdas
 * @returns {string[]} problemas encontrados (vacío si todo válido)
 */
export function validateLevels(levels, layouts) {
  const issues = []
  if (!Array.isArray(levels) || levels.length === 0) {
    return ['No hay niveles definidos (LEVELS vacío o no es un array).']
  }

  const seenIds = new Set()
  const cellCount = (layoutId) => layouts?.[layoutId]?.cells?.length ?? 0

  levels.forEach((lvl, i) => {
    const tag = `Nivel ${lvl?.id ?? '?'} [índice ${i}]`
    if (!lvl || typeof lvl !== 'object') {
      issues.push(`${tag}: entrada inválida`)
      return
    }

    // id único y secuencial (1..N, en orden)
    if (typeof lvl.id !== 'number' || !Number.isFinite(lvl.id)) {
      issues.push(`${tag}: id no es un número`)
    } else {
      if (seenIds.has(lvl.id)) issues.push(`${tag}: id duplicado`)
      seenIds.add(lvl.id)
      if (lvl.id !== i + 1) issues.push(`${tag}: id fuera de secuencia (esperado ${i + 1})`)
    }

    // campos requeridos presentes
    for (const f of REQUIRED) {
      if (lvl[f] === undefined || lvl[f] === null) issues.push(`${tag}: falta el campo "${f}"`)
    }

    // layout existe
    if (lvl.layout && !layouts?.[lvl.layout]) {
      issues.push(`${tag}: layout "${lvl.layout}" no existe en BOARD_LAYOUTS`)
    }

    // valores en rango sano
    if (typeof lvl.totalTime === 'number' && lvl.totalTime <= 0) issues.push(`${tag}: totalTime <= 0`)
    if (typeof lvl.reactionTime === 'number') {
      if (lvl.reactionTime <= 0) issues.push(`${tag}: reactionTime <= 0`)
      else if (lvl.reactionTime < 1.0) issues.push(`${tag}: reactionTime ${lvl.reactionTime}s puede ser injusto (< 1.0s)`)
    }
    if (typeof lvl.targetScore === 'number' && lvl.targetScore <= 0) issues.push(`${tag}: targetScore <= 0`)
    if (typeof lvl.activeBalls === 'number' && lvl.activeBalls < 1) issues.push(`${tag}: activeBalls < 1`)
    if (typeof lvl.penalty === 'number' && lvl.penalty < 0) issues.push(`${tag}: penalty negativo`)

    // activeBalls no puede superar las celdas del tablero
    const cells = cellCount(lvl.layout)
    if (cells && typeof lvl.activeBalls === 'number' && lvl.activeBalls > cells) {
      issues.push(`${tag}: activeBalls (${lvl.activeBalls}) > celdas del layout "${lvl.layout}" (${cells})`)
    }

    // difficulty con estilo CSS existente (evita tarjetas sin color)
    if (lvl.difficulty && !DIFFICULTIES.has(lvl.difficulty)) {
      issues.push(`${tag}: difficulty "${lvl.difficulty}" sin estilo; usa facil/media/dificil/extrema`)
    }

    // color hex válido
    if (lvl.activeColor && !/^#[0-9a-fA-F]{6}$/.test(lvl.activeColor)) {
      issues.push(`${tag}: activeColor "${lvl.activeColor}" no es un hex #rrggbb`)
    }

    // meta alcanzable (heurística)
    if (typeof lvl.targetScore === 'number' && typeof lvl.totalTime === 'number' && lvl.totalTime > 0) {
      const pace = lvl.targetScore / lvl.totalTime
      if (pace > MAX_REASONABLE_PACE) {
        issues.push(`${tag}: meta probablemente inalcanzable (${pace.toFixed(0)} pts/s > ${MAX_REASONABLE_PACE})`)
      }
    }
  })

  return issues
}

export default validateLevels
