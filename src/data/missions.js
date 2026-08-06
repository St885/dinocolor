/**
 * missions.js
 * -----------------------------------------------------------------------------
 * Catálogo de misiones diarias. Es la ÚNICA fuente de verdad de qué se puede pedir
 * al jugador y cuánto paga; la lógica de qué tres tocan hoy y cómo avanzan vive en
 * `src/systems/missionSystem.js`.
 *
 * Reglas de diseño:
 *   - Todas se pueden cumplir jugando NIVELES QUE YA TIENES desbloqueados. Ninguna
 *     obliga a llegar a un nivel concreto, así que un jugador nuevo del nivel 3
 *     puede completar las tres el primer día.
 *   - Ninguna pide gastar dinero ni conectarse: son locales y funcionan de invitado.
 *   - `goal` está en las mismas unidades que devuelve `progressFromRun`.
 *
 * Si añades una misión: dale un `id` corto y ESTABLE (se guarda en localStorage) y
 * un `type` que `progressFromRun` sepa puntuar, o no avanzará nunca.
 * -----------------------------------------------------------------------------
 */

/** Cuántas misiones se ofrecen cada día. */
export const DAILY_COUNT = 3

export const MISSION_POOL = [
  {
    id: 'win3',
    type: 'wins',
    goal: 3,
    icon: '🏆',
    text: 'Gana 3 niveles',
    reward: 30,
  },
  {
    id: 'win5',
    type: 'wins',
    goal: 5,
    icon: '🏆',
    text: 'Gana 5 niveles',
    reward: 45,
  },
  {
    id: 'stars5',
    type: 'stars',
    goal: 5,
    icon: '⭐',
    text: 'Consigue 5 estrellas',
    reward: 40,
  },
  {
    id: 'play5',
    type: 'plays',
    goal: 5,
    icon: '🎮',
    text: 'Juega 5 partidas',
    reward: 20,
  },
  {
    id: 'combo5',
    type: 'combo5',
    goal: 1,
    icon: '🔥',
    text: 'Logra un combo de x5',
    reward: 25,
  },
  {
    id: 'record1',
    type: 'records',
    goal: 1,
    icon: '📈',
    text: 'Supera tu récord en cualquier nivel',
    reward: 30,
  },
  {
    id: 'flawless1',
    type: 'flawless',
    goal: 1,
    icon: '🎯',
    text: 'Completa un nivel sin fallar',
    reward: 45,
  },
  {
    id: 'perfect1',
    type: 'perfect',
    goal: 1,
    icon: '🌟',
    text: 'Consigue 3 estrellas en un nivel',
    reward: 50,
  },
]

/** Misión por id, o null si el id no existe (guardado antiguo o manipulado). */
export function getMission(id) {
  return MISSION_POOL.find((m) => m.id === id) || null
}

export function isKnownMissionId(id) {
  return MISSION_POOL.some((m) => m.id === id)
}
