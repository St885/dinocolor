/**
 * missionSystem.js
 * -----------------------------------------------------------------------------
 * Lógica PURA de las misiones diarias: qué tres tocan hoy y cuánto avanza cada una
 * con el resultado de una partida. Sin React y sin localStorage — igual que
 * `scoringSystem`, se puede razonar y probar de forma aislada.
 *
 * La persistencia vive en `storageSystem.js` (readDaily/writeDaily) y el pegamento
 * con la UI, en `src/hooks/useDailyMissions.js`.
 * -----------------------------------------------------------------------------
 */

import { DAILY_COUNT, MISSION_POOL, getMission } from '../data/missions.js'

/**
 * Clave del día en HORA LOCAL ('YYYY-MM-DD').
 *
 * Se construye a mano en vez de con `toISOString()` a propósito: ese método pasa a
 * UTC, así que en España a las 01:00 devolvería todavía el día anterior y las
 * misiones se renovarían a una hora rarísima. El jugador espera que el día cambie
 * a SU medianoche.
 */
export function dayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Hash entero estable de una cadena (variante de djb2). Determinista: el mismo día
 * da siempre las mismas misiones, aunque el jugador recargue o cambie de pestaña.
 *
 * Se EXPORTA para que el desafío diario elija con el mismo criterio en vez de
 * llevar su propia copia: dos funciones de hash distintas serían dos cosas que
 * mantener sincronizadas sin ninguna ventaja.
 */
export function dayHash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * Las DAILY_COUNT misiones del día, elegidas del catálogo sin repetir.
 *
 * Se recorre el catálogo con un paso primo a partir de un índice derivado del día:
 * como el paso y el tamaño del catálogo son coprimos, el recorrido pasa por todas
 * las misiones antes de repetir ninguna. Así los tres de un día siempre son
 * distintos entre sí y varían de un día para otro sin necesidad de barajar.
 */
export function pickDailyMissions(key) {
  const n = MISSION_POOL.length
  const count = Math.min(DAILY_COUNT, n)
  const h = dayHash(key)
  const start = h % n
  // Paso coprimo con n: se busca el primero que lo sea, empezando en un impar.
  let step = (h % (n - 1)) + 1
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))
  while (gcd(step, n) !== 1) step = (step % (n - 1)) + 1

  const out = []
  for (let i = 0; i < count; i++) {
    out.push(MISSION_POOL[(start + i * step) % n].id)
  }
  return out
}

/**
 * Cuánto avanza una misión con el resultado de UNA partida.
 *
 * @param {string} type  tipo de misión (ver missions.js)
 * @param {object} run   resumen de la partida:
 *   { won, stars, bestCombo, isRecord, misses }
 * @returns {number} incremento (0 si esa partida no aporta nada)
 */
export function progressFromRun(type, run) {
  if (!run) return 0
  const won = Boolean(run.won)
  const stars = Math.max(0, Math.floor(run.stars) || 0)
  const bestCombo = Math.max(0, Math.floor(run.bestCombo) || 0)
  const misses = Math.max(0, Math.floor(run.misses) || 0)

  switch (type) {
    // Jugar cuenta SIEMPRE, se gane o se pierda: es la misión "de consuelo" que
    // avanza incluso en una mala racha.
    case 'plays':
      return 1
    case 'wins':
      return won ? 1 : 0
    case 'stars':
      return won ? stars : 0
    case 'combo5':
      return bestCombo >= 5 ? 1 : 0
    case 'records':
      return run.isRecord ? 1 : 0
    // "Sin fallar" incluye tanto dejar apagarse una pelota como pulsar una apagada:
    // ambas suman en `misses`.
    case 'flawless':
      return won && misses === 0 ? 1 : 0
    case 'perfect':
      return stars >= 3 ? 1 : 0
    default:
      return 0
  }
}

/**
 * Aplica una partida a las misiones del día.
 *
 * @returns {{ progress:number[], done:boolean[], completed:object[], bones:number }}
 *   `completed` son las misiones que se han terminado JUSTO AHORA (para celebrarlas
 *   una sola vez) y `bones` la suma de sus recompensas.
 */
export function applyRun(ids, progress, done, run) {
  const nextProgress = [...progress]
  const nextDone = [...done]
  const completed = []
  let bones = 0

  ids.forEach((id, i) => {
    const mission = getMission(id)
    if (!mission || nextDone[i]) return
    const delta = progressFromRun(mission.type, run)
    if (delta <= 0) return
    nextProgress[i] = Math.min(mission.goal, (nextProgress[i] || 0) + delta)
    if (nextProgress[i] >= mission.goal) {
      nextDone[i] = true
      completed.push(mission)
      bones += mission.reward
    }
  })

  return { progress: nextProgress, done: nextDone, completed, bones }
}

/** Vista para la UI: misión + su progreso, ya resuelta contra el catálogo. */
export function describe(ids, progress, done) {
  return ids
    .map((id, i) => {
      const mission = getMission(id)
      if (!mission) return null
      return {
        ...mission,
        current: Math.min(mission.goal, progress[i] || 0),
        done: Boolean(done[i]),
      }
    })
    .filter(Boolean)
}
