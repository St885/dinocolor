/**
 * levels.js
 * -----------------------------------------------------------------------------
 * Configuración de NIVELES de DinoColor. Única fuente de dificultad del juego.
 *
 * 42 niveles con una curva de dificultad GRADUAL en 5 tramos:
 *   1–5   Tutorial   1 bola, tiempo cómodo, reacción generosa, meta baja (square3x3).
 *   6–12  Principiante 1–2 bolas, reacción algo menor, se introducen cross/diamond/circle.
 *   13–22 Intermedio 2–3 bolas, reacción menor, más variedad de layouts y colores.
 *   23–32 Avanzado   3–4 bolas, menos tiempo, más penalización, metas altas.
 *   33–42 Experto    4 bolas, reacción rápida pero jugable, metas y penalización altas.
 *
 * PRINCIPIOS DE EQUILIBRIO (ver docs/STATUS.md → "Criterios de progresión"):
 *   - El nivel 1 se gana fácil; 2–3 siguen cómodos.
 *   - Nunca subimos varias dimensiones a la vez: al introducir +1 bola se AFLOJA la
 *     reacción; al acelerar la reacción se bajan las bolas o se sube menos la meta.
 *   - `activeBalls` nunca supera las celdas del layout (validado en dev, ver abajo).
 *   - reactionTime nunca baja de 1.1s (más allá sería injusto en móvil).
 *   - targetScore/totalTime (pace) sube de ~9 a ~85 pts/s, siempre por debajo de lo
 *     alcanzable por un jugador hábil (validateLevels avisa si se pasa de 130).
 *
 * Campos de cada nivel:
 *   - id            number   identificador único y orden (1..42)
 *   - name          string   nombre visible del nivel
 *   - layout        string   id de forma de tablero (ver src/data/boardLayouts.js)
 *   - activeBalls   number   cuántas pelotas están iluminadas a la vez
 *   - totalTime     number   duración del nivel en segundos
 *   - reactionTime  number   segundos que una pelota permanece iluminada antes de fallar
 *   - targetScore   number   puntuación objetivo para ganar el nivel
 *   - penalty       number   puntos que se restan al pulsar una pelota apagada
 *   - activeColor   string   color (hex #rrggbb) del brillo de las pelotas activas
 *   - difficulty    string   'facil' | 'media' | 'dificil' | 'extrema' (tienen estilo CSS)
 * -----------------------------------------------------------------------------
 */

import { BOARD_LAYOUTS } from './boardLayouts.js'
import { CHAPTERS } from './chapters.js'
import { validateLevels, validateChapters } from '../systems/levelValidation.js'

export const LEVELS = [
  // ─────────────── 1–5 · Tutorial (fácil, verde) ───────────────
  { id: 1,  name: 'Primer reflejo',     layout: 'square3x3', activeBalls: 1, totalTime: 32, reactionTime: 2.6,  targetScore: 300,  penalty: 20, activeColor: '#39ff88', difficulty: 'facil' },
  { id: 2,  name: 'Calienta los dedos', layout: 'square3x3', activeBalls: 1, totalTime: 32, reactionTime: 2.5,  targetScore: 340,  penalty: 20, activeColor: '#39ff88', difficulty: 'facil' },
  { id: 3,  name: 'Ojo despierto',      layout: 'square3x3', activeBalls: 1, totalTime: 30, reactionTime: 2.4,  targetScore: 380,  penalty: 20, activeColor: '#39ff88', difficulty: 'facil' },
  { id: 4,  name: 'Toque rápido',       layout: 'square3x3', activeBalls: 1, totalTime: 30, reactionTime: 2.3,  targetScore: 430,  penalty: 25, activeColor: '#39ff88', difficulty: 'facil' },
  { id: 5,  name: 'Ritmo dino',         layout: 'square3x3', activeBalls: 1, totalTime: 30, reactionTime: 2.2,  targetScore: 480,  penalty: 25, activeColor: '#39ff88', difficulty: 'facil' },

  // ─────────────── 6–12 · Principiante (media, cian) ───────────────
  { id: 6,  name: 'Cruce sencillo',     layout: 'cross',     activeBalls: 1, totalTime: 30, reactionTime: 2.2,  targetScore: 520,  penalty: 25, activeColor: '#46e0ff', difficulty: 'media' },
  { id: 7,  name: 'Doble chispa',       layout: 'square3x3', activeBalls: 2, totalTime: 32, reactionTime: 2.3,  targetScore: 580,  penalty: 25, activeColor: '#46e0ff', difficulty: 'media' },
  { id: 8,  name: 'Diamante tranquilo', layout: 'diamond',   activeBalls: 1, totalTime: 28, reactionTime: 2.1,  targetScore: 600,  penalty: 25, activeColor: '#46e0ff', difficulty: 'media' },
  { id: 9,  name: 'Cruz doble',         layout: 'cross',     activeBalls: 2, totalTime: 30, reactionTime: 2.1,  targetScore: 650,  penalty: 30, activeColor: '#46e0ff', difficulty: 'media' },
  { id: 10, name: 'Manos listas',       layout: 'square3x3', activeBalls: 2, totalTime: 30, reactionTime: 2.0,  targetScore: 700,  penalty: 30, activeColor: '#46e0ff', difficulty: 'media' },
  { id: 11, name: 'Rombo brillante',    layout: 'diamond',   activeBalls: 2, totalTime: 28, reactionTime: 2.0,  targetScore: 750,  penalty: 30, activeColor: '#46e0ff', difficulty: 'media' },
  { id: 12, name: 'Círculo de luces',   layout: 'circle',    activeBalls: 2, totalTime: 30, reactionTime: 1.95, targetScore: 800,  penalty: 30, activeColor: '#46e0ff', difficulty: 'media' },

  // ─────────────── 13–22 · Intermedio (difícil, amarillo→naranja) ───────────────
  { id: 13, name: 'Panal veloz',        layout: 'hexagon',   activeBalls: 2, totalTime: 28, reactionTime: 1.9,  targetScore: 820,  penalty: 35, activeColor: '#ffd23f', difficulty: 'dificil' },
  { id: 14, name: 'Punta de flecha',    layout: 'triangle',  activeBalls: 2, totalTime: 28, reactionTime: 1.9,  targetScore: 870,  penalty: 35, activeColor: '#ffd23f', difficulty: 'dificil' },
  { id: 15, name: 'Trío de reflejos',   layout: 'square3x3', activeBalls: 3, totalTime: 30, reactionTime: 2.0,  targetScore: 920,  penalty: 35, activeColor: '#ffd23f', difficulty: 'dificil' },
  { id: 16, name: 'Diamante triple',    layout: 'diamond',   activeBalls: 3, totalTime: 28, reactionTime: 1.9,  targetScore: 970,  penalty: 40, activeColor: '#ffd23f', difficulty: 'dificil' },
  { id: 17, name: 'Órbita rápida',      layout: 'circle',    activeBalls: 3, totalTime: 28, reactionTime: 1.85, targetScore: 1020, penalty: 40, activeColor: '#ffd23f', difficulty: 'dificil' },
  { id: 18, name: 'Zigzag',             layout: 'diagonals', activeBalls: 2, totalTime: 26, reactionTime: 1.75, targetScore: 980,  penalty: 40, activeColor: '#ff7b3f', difficulty: 'dificil' },
  { id: 19, name: 'Colmena ágil',       layout: 'hexagon',   activeBalls: 3, totalTime: 28, reactionTime: 1.8,  targetScore: 1080, penalty: 40, activeColor: '#ff7b3f', difficulty: 'dificil' },
  { id: 20, name: 'Cruz relámpago',     layout: 'cross',     activeBalls: 2, totalTime: 24, reactionTime: 1.6,  targetScore: 950,  penalty: 40, activeColor: '#ff7b3f', difficulty: 'dificil' },
  { id: 21, name: 'Flecha triple',      layout: 'triangle',  activeBalls: 3, totalTime: 28, reactionTime: 1.75, targetScore: 1130, penalty: 45, activeColor: '#ff7b3f', difficulty: 'dificil' },
  { id: 22, name: 'Rejilla veloz',      layout: 'square3x3', activeBalls: 3, totalTime: 26, reactionTime: 1.65, targetScore: 1180, penalty: 45, activeColor: '#ff7b3f', difficulty: 'dificil' },

  // ─────────────── 23–32 · Avanzado (extrema, rosa) ───────────────
  { id: 23, name: 'Diamante feroz',     layout: 'diamond',   activeBalls: 3, totalTime: 26, reactionTime: 1.6,  targetScore: 1220, penalty: 45, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 24, name: 'Cuatro en órbita',   layout: 'circle',    activeBalls: 4, totalTime: 30, reactionTime: 1.8,  targetScore: 1280, penalty: 45, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 25, name: 'Panal salvaje',      layout: 'hexagon',   activeBalls: 4, totalTime: 28, reactionTime: 1.7,  targetScore: 1340, penalty: 50, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 26, name: 'Cuadrícula intensa', layout: 'square3x3', activeBalls: 4, totalTime: 28, reactionTime: 1.6,  targetScore: 1400, penalty: 50, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 27, name: 'Punta afilada',      layout: 'triangle',  activeBalls: 3, totalTime: 24, reactionTime: 1.5,  targetScore: 1330, penalty: 50, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 28, name: 'Diamante turbo',     layout: 'diamond',   activeBalls: 4, totalTime: 26, reactionTime: 1.6,  targetScore: 1440, penalty: 50, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 29, name: 'Ciclón de luces',    layout: 'circle',    activeBalls: 4, totalTime: 26, reactionTime: 1.55, targetScore: 1500, penalty: 55, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 30, name: 'Zigzag extremo',     layout: 'diagonals', activeBalls: 3, totalTime: 24, reactionTime: 1.5,  targetScore: 1440, penalty: 55, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 31, name: 'Colmena furiosa',    layout: 'hexagon',   activeBalls: 4, totalTime: 26, reactionTime: 1.5,  targetScore: 1540, penalty: 55, activeColor: '#ff5fae', difficulty: 'extrema' },
  { id: 32, name: 'Rejilla imposible',  layout: 'square3x3', activeBalls: 4, totalTime: 24, reactionTime: 1.45, targetScore: 1560, penalty: 55, activeColor: '#ff5fae', difficulty: 'extrema' },

  // ─────────────── 33–42 · Experto (extrema, morado) ───────────────
  { id: 33, name: 'Diamante experto',    layout: 'diamond',   activeBalls: 4, totalTime: 26, reactionTime: 1.4,  targetScore: 1600, penalty: 55, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 34, name: 'Órbita experta',      layout: 'circle',    activeBalls: 4, totalTime: 26, reactionTime: 1.4,  targetScore: 1660, penalty: 60, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 35, name: 'Panal maestro',       layout: 'hexagon',   activeBalls: 4, totalTime: 24, reactionTime: 1.35, targetScore: 1700, penalty: 60, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 36, name: 'Flecha del rayo',     layout: 'triangle',  activeBalls: 3, totalTime: 22, reactionTime: 1.3,  targetScore: 1560, penalty: 60, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 37, name: 'Cuadrícula maestra',  layout: 'square3x3', activeBalls: 4, totalTime: 24, reactionTime: 1.3,  targetScore: 1740, penalty: 60, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 38, name: 'Diamante legendario', layout: 'diamond',   activeBalls: 4, totalTime: 24, reactionTime: 1.3,  targetScore: 1800, penalty: 65, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 39, name: 'Vórtice final',       layout: 'circle',    activeBalls: 4, totalTime: 24, reactionTime: 1.25, targetScore: 1860, penalty: 65, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 40, name: 'Colmena legendaria',  layout: 'hexagon',   activeBalls: 4, totalTime: 24, reactionTime: 1.2,  targetScore: 1920, penalty: 65, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 41, name: 'Última chispa',       layout: 'diamond',   activeBalls: 4, totalTime: 22, reactionTime: 1.15, targetScore: 1960, penalty: 70, activeColor: '#b06bff', difficulty: 'extrema' },
  { id: 42, name: 'Maestro DinoColor',   layout: 'circle',    activeBalls: 4, totalTime: 24, reactionTime: 1.1,  targetScore: 2050, penalty: 70, activeColor: '#b06bff', difficulty: 'extrema' },
]

// Autovalidación SOLO en desarrollo: avisa por consola si algún nivel está mal formado
// (id duplicado, layout inexistente, activeBalls > celdas, meta inalcanzable, etc.).
// `import.meta.env?.DEV` es falsy en producción (código muerto que se elimina en el
// build) y también en Node sin Vite, así que no rompe tests ni scripts de validación.
if (import.meta.env?.DEV) {
  const problems = [
    ...validateLevels(LEVELS, BOARD_LAYOUTS),
    // Los capítulos del menú deben cubrir los 42 niveles: uno que se quede fuera de
    // todo capítulo sería invisible en el selector.
    ...validateChapters(LEVELS, CHAPTERS),
  ]
  if (problems.length) {
    console.warn(`[DinoColor] ${problems.length} problema(s) en los niveles:\n- ` + problems.join('\n- '))
  } else {
    console.info(`[DinoColor] ${LEVELS.length} niveles y ${CHAPTERS.length} capítulos validados correctamente ✓`)
  }
}

export default LEVELS
