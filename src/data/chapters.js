/**
 * chapters.js
 * -----------------------------------------------------------------------------
 * Agrupación de los 42 niveles en CAPÍTULOS (los cinco tramos de la curva de
 * dificultad que ya define `levels.js`).
 *
 * POR QUÉ EXISTE: el menú pintaba las 42 tarjetas de golpe en una rejilla de 3
 * columnas. Son 14 filas, más de 1.400 px de scroll, y el jugador que iba por el
 * nivel 30 tenía que arrastrar media pantalla cada vez que entraba para encontrar
 * dónde estaba. También se veía "pesado": una pared de tarjetas grises bloqueadas
 * es lo primero que ve alguien que acaba de empezar.
 *
 * Los rangos son EXACTAMENTE los tramos documentados en `levels.js` y en
 * `docs/STATUS.md`. Si cambia la curva de niveles, hay que actualizarlos aquí
 * (`levelValidation` avisa si algún nivel se queda fuera de todo capítulo).
 * -----------------------------------------------------------------------------
 */

export const CHAPTERS = [
  { id: 'tutorial', name: 'Primeros pasos', short: 'Inicio', from: 1, to: 5, icon: '🥚' },
  { id: 'principiante', name: 'Principiante', short: 'Fácil', from: 6, to: 12, icon: '🦕' },
  { id: 'intermedio', name: 'Intermedio', short: 'Medio', from: 13, to: 22, icon: '🌋' },
  { id: 'avanzado', name: 'Avanzado', short: 'Duro', from: 23, to: 32, icon: '⚡' },
  { id: 'experto', name: 'Experto', short: 'Experto', from: 33, to: 42, icon: '👑' },
]

/** Capítulo que contiene un nivel (el último como red de seguridad). */
export function chapterOfLevel(levelId) {
  return (
    CHAPTERS.find((c) => levelId >= c.from && levelId <= c.to) ||
    CHAPTERS[CHAPTERS.length - 1]
  )
}

/** Índice del capítulo que contiene un nivel. */
export function chapterIndexOfLevel(levelId) {
  const i = CHAPTERS.findIndex((c) => levelId >= c.from && levelId <= c.to)
  return i === -1 ? CHAPTERS.length - 1 : i
}

export default CHAPTERS
