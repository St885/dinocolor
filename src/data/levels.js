/**
 * levels.js
 * -----------------------------------------------------------------------------
 * Configuración de NIVELES de DinoColor.
 *
 * ➕ Para AÑADIR o EDITAR un nivel: modifica el array LEVELS. La dificultad sube
 *    cambiando estos parámetros. No hace falta tocar código del juego.
 *
 * Campos de cada nivel:
 *   - id            number   identificador único y orden (1, 2, 3, ...)
 *   - name          string   nombre visible del nivel
 *   - layout        string   id de forma de tablero (ver src/data/boardLayouts.js)
 *   - activeBalls   number   cuántas pelotas están iluminadas a la vez
 *   - totalTime     number   duración del nivel en segundos
 *   - reactionTime  number   segundos que una pelota permanece iluminada antes de fallar
 *   - targetScore   number   puntuación objetivo para ganar el nivel
 *   - penalty       number   puntos que se restan al pulsar una pelota apagada
 *   - activeColor   string   color (hex) del brillo de las pelotas activas
 *   - difficulty    string   etiqueta de dificultad visual ('facil' | 'media' | 'dificil' | 'extrema')
 * -----------------------------------------------------------------------------
 */

export const LEVELS = [
  {
    id: 1,
    name: 'Primer reflejo',
    layout: 'square3x3',
    activeBalls: 1,
    totalTime: 30,
    reactionTime: 2.5,
    targetScore: 300,
    penalty: 25,
    activeColor: '#39ff88',
    difficulty: 'facil',
  },
  {
    id: 2,
    name: 'Calienta los dedos',
    layout: 'square3x3',
    activeBalls: 1,
    totalTime: 30,
    reactionTime: 2.2,
    targetScore: 400,
    penalty: 25,
    activeColor: '#39ff88',
    difficulty: 'facil',
  },
  {
    id: 3,
    name: 'En forma de cruz',
    layout: 'cross',
    activeBalls: 1,
    totalTime: 28,
    reactionTime: 2.0,
    targetScore: 450,
    penalty: 25,
    activeColor: '#46e0ff',
    difficulty: 'facil',
  },
  {
    id: 4,
    name: 'Más rápido',
    layout: 'square3x3',
    activeBalls: 1,
    totalTime: 28,
    reactionTime: 1.8,
    targetScore: 550,
    penalty: 30,
    activeColor: '#46e0ff',
    difficulty: 'media',
  },
  {
    id: 5,
    name: 'Doble objetivo',
    layout: 'square3x3',
    activeBalls: 2,
    totalTime: 30,
    reactionTime: 2.0,
    targetScore: 600,
    penalty: 30,
    activeColor: '#ffd23f',
    difficulty: 'media',
  },
  {
    id: 6,
    name: 'Cruz veloz',
    layout: 'cross',
    activeBalls: 2,
    totalTime: 28,
    reactionTime: 1.8,
    targetScore: 700,
    penalty: 35,
    activeColor: '#ffd23f',
    difficulty: 'media',
  },
  {
    id: 7,
    name: 'Lluvia de luces',
    layout: 'square3x3',
    activeBalls: 2,
    totalTime: 26,
    reactionTime: 1.6,
    targetScore: 750,
    penalty: 35,
    activeColor: '#ff7b3f',
    difficulty: 'media',
  },
  {
    id: 8,
    name: 'Triple amenaza',
    layout: 'square3x3',
    activeBalls: 3,
    totalTime: 28,
    reactionTime: 1.8,
    targetScore: 800,
    penalty: 40,
    activeColor: '#ff7b3f',
    difficulty: 'dificil',
  },
  {
    id: 9,
    name: 'Diamante en bruto',
    layout: 'diamond',
    activeBalls: 2,
    totalTime: 26,
    reactionTime: 1.6,
    targetScore: 850,
    penalty: 40,
    activeColor: '#ff5fae',
    difficulty: 'dificil',
  },
  {
    id: 10,
    name: 'Diamante brillante',
    layout: 'diamond',
    activeBalls: 3,
    totalTime: 25,
    reactionTime: 1.5,
    targetScore: 900,
    penalty: 45,
    activeColor: '#ff5fae',
    difficulty: 'dificil',
  },
  {
    id: 11,
    name: 'Tormenta de reflejos',
    layout: 'diamond',
    activeBalls: 4,
    totalTime: 26,
    reactionTime: 1.4,
    targetScore: 1100,
    penalty: 50,
    activeColor: '#b06bff',
    difficulty: 'extrema',
  },
  {
    id: 12,
    name: 'Maestro DinoColor',
    layout: 'diamond',
    activeBalls: 4,
    totalTime: 24,
    reactionTime: 1.2,
    targetScore: 1300,
    penalty: 50,
    activeColor: '#b06bff',
    difficulty: 'extrema',
  },
]

export default LEVELS
