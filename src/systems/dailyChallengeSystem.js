/**
 * dailyChallengeSystem.js
 * -----------------------------------------------------------------------------
 * Lógica PURA del desafío del día: cuál toca hoy, cuánto avanza con una partida
 * y cuándo está completado. Sin React y sin localStorage.
 *
 * Comparte `dayKey` y `dayHash` con las misiones a propósito: el "día" del juego
 * debe ser UNO solo. Si el desafío tuviera su propio cálculo de fecha, un día
 * podrían renovarse las misiones y el desafío no (o al revés), y eso es
 * exactamente la clase de incoherencia que el jugador nota y no perdona.
 *
 * SIEMPRE ES COMPLETABLE con el estado actual del jugador: los retos generales no
 * dependen de ningún nivel, y el único que apunta a un nivel concreto lo elige
 * entre los DESBLOQUEADOS en el momento de crearse.
 * -----------------------------------------------------------------------------
 */

import { CHALLENGE_POOL, getChallenge } from '../data/dailyChallenges.js'
import { dayHash, dayKey } from './missionSystem.js'

export { dayKey }

/**
 * Desafío que toca hoy. Determinista por fecha: el mismo día siempre devuelve el
 * mismo, aunque el jugador recargue.
 *
 * Se desplaza el hash con un sufijo distinto al de las misiones para que ambas
 * elecciones no queden correlacionadas (si compartieran semilla, el mismo día
 * tenderían a caer siempre las mismas parejas).
 */
export function pickChallenge(key) {
  const h = dayHash(`${key}#challenge`)
  return CHALLENGE_POOL[h % CHALLENGE_POOL.length].id
}

/**
 * Nivel para los retos que apuntan a uno concreto. Se elige entre los
 * DESBLOQUEADOS y se guarda, así que desbloquear niveles a mitad del día no
 * cambia el reto en marcha.
 *
 * @param {string} key   día
 * @param {number} maxLevel  nivel máximo desbloqueado
 */
export function pickChallengeLevel(key, maxLevel) {
  const top = Math.max(1, Math.floor(Number(maxLevel)) || 1)
  // Se evita el nivel 1 cuando hay margen: pedir 3 estrellas en el tutorial es
  // un reto que no reta a nadie.
  const from = top >= 3 ? 2 : 1
  const span = top - from + 1
  return from + (dayHash(`${key}#level`) % span)
}

/**
 * Cuánto avanza el desafío con el resultado de UNA partida.
 *
 * @param {object} challenge  del catálogo
 * @param {number} levelId    nivel elegido (0 si el reto no lo usa)
 * @param {object} run        { won, stars, bestCombo, misses, hits, timeLeft, totalTime, levelId, isRecord }
 */
export function progressFromRun(challenge, levelId, run) {
  if (!challenge || !run) return 0
  const won = Boolean(run.won)
  const stars = Math.max(0, Math.floor(run.stars) || 0)
  const bestCombo = Math.max(0, Math.floor(run.bestCombo) || 0)
  const misses = Math.max(0, Math.floor(run.misses) || 0)
  const hits = Math.max(0, Math.floor(run.hits) || 0)
  const attempts = hits + misses
  const accuracy = attempts > 0 ? (hits / attempts) * 100 : 0
  const totalTime = Math.max(0, Number(run.totalTime) || 0)
  const timeLeft = Math.max(0, Number(run.timeLeft) || 0)
  const leftRatio = totalTime > 0 ? timeLeft / totalTime : 0

  switch (challenge.type) {
    case 'combo8':
      return bestCombo >= 8 ? 1 : 0
    case 'flawless':
      return won && misses === 0 ? 1 : 0
    case 'accuracy85':
      return won && accuracy >= 85 ? 1 : 0
    case 'perfect':
      return stars >= 3 ? 1 : 0
    case 'records':
      return run.isRecord ? 1 : 0
    case 'fastWin':
      return won && leftRatio > 0.7 ? 1 : 0
    case 'levelPerfect':
      // El único que mira QUÉ nivel se jugó.
      return won && stars >= 3 && Number(run.levelId) === Number(levelId) ? 1 : 0
    default:
      return 0
  }
}

/**
 * Aplica una partida al desafío guardado.
 * @returns {{ progress:number, done:boolean, justCompleted:boolean, reward:number }}
 */
export function applyRunToChallenge(saved, run) {
  const challenge = getChallenge(saved?.id)
  // `done` ya en true es la guarda contra cobrar dos veces el mismo desafío.
  if (!challenge || saved.done) {
    return { progress: saved?.progress || 0, done: Boolean(saved?.done), justCompleted: false, reward: 0 }
  }
  const delta = progressFromRun(challenge, saved.level, run)
  const progress = Math.min(challenge.goal, (saved.progress || 0) + delta)
  const done = progress >= challenge.goal
  return {
    progress,
    done,
    justCompleted: done,
    reward: done ? challenge.reward : 0,
  }
}

/** Vista para la UI, con el texto ya resuelto (incluye el nivel si aplica). */
export function describeChallenge(saved) {
  const challenge = getChallenge(saved?.id)
  if (!challenge) return null
  const level = Math.max(0, Math.floor(Number(saved?.level)) || 0)
  return {
    ...challenge,
    level,
    text: challenge.needsLevel ? challenge.text.replace('{level}', level) : challenge.text,
    current: Math.min(challenge.goal, Math.max(0, Math.floor(Number(saved?.progress)) || 0)),
    done: Boolean(saved?.done),
  }
}
