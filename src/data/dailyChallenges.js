/**
 * dailyChallenges.js
 * -----------------------------------------------------------------------------
 * Catálogo del DESAFÍO DEL DÍA: un solo reto, más exigente que una misión y
 * mejor pagado.
 *
 * POR QUÉ NINGUNO REPITE UNA MISIÓN. Las misiones diarias (`src/data/missions.js`)
 * ya piden "un combo de x5", "un nivel sin fallar", "3 estrellas en un nivel" o
 * "supera tu récord". Tener el mismo objetivo en dos sitios haría que una sola
 * partida marcase las dos cosas y el desafío dejaría de sentirse especial. Aquí
 * todos suben el listón (x8 en vez de x5, dos niveles en vez de uno) o miden algo
 * que las misiones no miran (precisión, rapidez).
 *
 * `needsLevel` marca los retos que apuntan a un NIVEL CONCRETO. Ese nivel se
 * elige al crear el desafío del día entre los que el jugador tiene desbloqueados
 * y se GUARDA: si se recalculara en cada render, desbloquear un nivel a mitad del
 * día cambiaría el reto por debajo de los pies del jugador.
 * -----------------------------------------------------------------------------
 */

export const CHALLENGE_POOL = [
  {
    id: 'combo8',
    type: 'combo8',
    goal: 1,
    icon: '🔥',
    text: 'Logra un combo de x8 en una partida',
    hint: 'Encadena 8 aciertos seguidos sin fallar ninguno.',
    reward: 70,
  },
  {
    id: 'flawless2',
    type: 'flawless',
    goal: 2,
    icon: '🎯',
    text: 'Completa 2 niveles sin fallar ni uno',
    hint: 'Ni pelotas apagadas ni toques en falso. Ve a tu ritmo.',
    reward: 80,
  },
  {
    id: 'accuracy85',
    type: 'accuracy85',
    goal: 1,
    icon: '🏹',
    text: 'Gana un nivel con 85 % de precisión',
    hint: 'Toca solo las que brillan: cada fallo baja la precisión.',
    reward: 65,
  },
  {
    id: 'perfect2',
    type: 'perfect',
    goal: 2,
    icon: '🌟',
    text: 'Consigue 3 estrellas en 2 niveles',
    hint: 'Las 3 estrellas se ganan llegando MUY rápido a la meta.',
    reward: 85,
  },
  {
    id: 'record2',
    type: 'records',
    goal: 2,
    icon: '📈',
    text: 'Supera tu récord en 2 niveles',
    hint: 'Los niveles fáciles que ya dominas son los más agradecidos.',
    reward: 70,
  },
  {
    id: 'fastWin',
    type: 'fastWin',
    goal: 1,
    icon: '⚡',
    text: 'Gana un nivel con más del 70 % del tiempo de sobra',
    hint: 'Velocidad pura: llega a la meta casi sin gastar reloj.',
    reward: 75,
  },
  {
    id: 'levelPerfect',
    type: 'levelPerfect',
    goal: 1,
    icon: '🏅',
    needsLevel: true,
    // El texto se completa con el nivel elegido (ver `describeChallenge`).
    text: 'Consigue 3 estrellas en el nivel {level}',
    hint: 'Un nivel concreto, elegido entre los que ya tienes abiertos.',
    reward: 90,
  },
]

export function getChallenge(id) {
  return CHALLENGE_POOL.find((c) => c.id === id) || null
}

export function isKnownChallengeId(id) {
  return CHALLENGE_POOL.some((c) => c.id === id)
}
