/**
 * dailyStreakSystem.js
 * -----------------------------------------------------------------------------
 * Lógica PURA de la racha diaria: qué día del ciclo toca, cuánto paga y si hoy
 * se puede reclamar. Sin React y sin localStorage — igual que `scoringSystem`,
 * `missionSystem` e `inventorySystem`.
 *
 * CICLO DE 7 DÍAS QUE SE REINICIA. Se eligió frente a "quedarse fijo en el día 7"
 * porque es lo más simple de razonar y de enseñar: el jugador siempre ve siete
 * casillas, sabe dónde está y sabe que el premio gordo vuelve cada semana. Un
 * contador infinito obligaría a inventar una tabla de recompensas sin final y a
 * decidir qué enseñar cuando alguien lleva 300 días.
 *
 * REGLA DE ORO: la racha se calcula SIEMPRE a partir de la fecha del último
 * cobro, nunca de un contador que se incremente solo. Así, si el jugador no
 * abre el juego en tres días, el sistema lo deduce al volver — no hace falta que
 * nada corra en segundo plano.
 *
 * ⚠️ EL RELOJ DEL DISPOSITIVO NO ES DE FIAR. Un móvil puede cambiar de hora, de
 * zona horaria o de fecha. Aquí eso solo puede provocar tres cosas, todas
 * seguras: que hoy cuente como ya reclamado (no se paga dos veces), que la racha
 * se reinicie al día 1 (se pierde progreso, nunca se gana de más) o que se
 * avance un día. Nada de esto rompe el juego ni genera huesos negativos. Es
 * "hacerse trampas a uno mismo", igual que editar el localStorage.
 * -----------------------------------------------------------------------------
 */

import { dayKey } from './missionSystem.js'

/** Recompensa de cada día del ciclo, en huesos. El 7 es el premio gordo. */
export const STREAK_REWARDS = [20, 30, 40, 50, 70, 90, 120]

/** Longitud del ciclo. Derivada de la tabla para que no se puedan desincronizar. */
export const STREAK_LENGTH = STREAK_REWARDS.length

/** Huesos extra del día 7, además de su recompensa base. */
export const STREAK_BONUS = 60

/** Día del ciclo (1..7) saneado. Cualquier basura degrada al día 1. */
export function sanitizeStreakDay(value) {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1 || n > STREAK_LENGTH) return 1
  return n
}

/** Recompensa total de un día del ciclo (incluye el bonus del último). */
export function rewardForDay(day) {
  const d = sanitizeStreakDay(day)
  const base = STREAK_REWARDS[d - 1] || 0
  return d === STREAK_LENGTH ? base + STREAK_BONUS : base
}

/**
 * `YYYY-MM-DD` del día anterior a la fecha dada.
 *
 * Se calcula restando un día a un objeto Date en HORA LOCAL, no restando 86.400
 * segundos a un timestamp: con el cambio de hora (marzo/octubre) hay días de 23
 * y de 25 horas, y la resta de segundos se saltaría o repetiría una fecha justo
 * esa noche — el jugador perdería la racha sin haber hecho nada mal.
 */
export function previousDayKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - 1)
  return dayKey(d)
}

/**
 * Estado de la racha a día de hoy.
 *
 * @param {{ lastDay:string, day:number, total:number }} saved lo guardado
 * @param {Date} now
 * @returns {{
 *   claimedToday: boolean,   ya se cobró hoy
 *   currentDay: number,      día del ciclo que se cobraría (o el ya cobrado)
 *   reward: number,          huesos de ese día
 *   nextReward: number,      huesos de mañana (para el "vuelve mañana")
 *   continues: boolean,      si mañana sigue la racha o empieza de cero
 *   total: number,           reclamaciones acumuladas
 * }}
 */
export function streakState(saved, now = new Date()) {
  const today = dayKey(now)
  const yesterday = previousDayKey(now)
  const lastDay = typeof saved?.lastDay === 'string' ? saved.lastDay : ''
  const savedDay = sanitizeStreakDay(saved?.day)
  const total = Math.max(0, Math.floor(Number(saved?.total)) || 0)

  if (lastDay === today) {
    // Ya cobrado hoy: se enseña el día que se cobró y lo que viene mañana.
    const next = savedDay >= STREAK_LENGTH ? 1 : savedDay + 1
    return {
      claimedToday: true,
      currentDay: savedDay,
      reward: rewardForDay(savedDay),
      nextReward: rewardForDay(next),
      nextDay: next,
      continues: true,
      total,
    }
  }

  // Sin cobrar hoy: encadena si el último cobro fue AYER; si no, vuelve al día 1.
  // Ojo: cualquier fecha que no sea exactamente ayer (incluida una futura, por un
  // reloj adelantado) reinicia. Es la opción conservadora: nunca regala racha.
  const encadena = lastDay === yesterday
  const currentDay = encadena ? (savedDay >= STREAK_LENGTH ? 1 : savedDay + 1) : 1

  return {
    claimedToday: false,
    currentDay,
    reward: rewardForDay(currentDay),
    nextReward: rewardForDay(currentDay >= STREAK_LENGTH ? 1 : currentDay + 1),
    nextDay: currentDay >= STREAK_LENGTH ? 1 : currentDay + 1,
    continues: encadena,
    total,
  }
}

/**
 * Calcula el estado a guardar tras un cobro. Devuelve `null` si hoy ya se cobró
 * — la segunda pulsación no puede pagar aunque llegue aquí.
 */
export function claimStreak(saved, now = new Date()) {
  const state = streakState(saved, now)
  if (state.claimedToday) return null
  return {
    next: {
      lastDay: dayKey(now),
      day: state.currentDay,
      total: state.total + 1,
    },
    reward: state.reward,
    day: state.currentDay,
    isBonus: state.currentDay === STREAK_LENGTH,
  }
}

/** Vista de las siete casillas para pintarlas de un vistazo. */
export function describeStreak(state) {
  return STREAK_REWARDS.map((base, i) => {
    const day = i + 1
    return {
      day,
      reward: rewardForDay(day),
      isBonus: day === STREAK_LENGTH,
      // "Conseguido" son los días YA cobrados de este ciclo: los anteriores al
      // actual, más el actual si ya se cobró hoy.
      claimed: state.claimedToday ? day <= state.currentDay : day < state.currentDay,
      isToday: day === state.currentDay,
    }
  })
}
