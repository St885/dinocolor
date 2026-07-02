/**
 * boardLayouts.js
 * -----------------------------------------------------------------------------
 * Definición de las FORMAS de tablero de DinoColor.
 *
 * Cada layout es una lista de celdas en coordenadas de cuadrícula (col, row),
 * agnósticas al render 3D. El componente <Board3D> convierte esas coordenadas a
 * posiciones del mundo, centra el tablero y lo escala para que quepa en pantalla.
 *
 * ➕ Para AÑADIR una forma nueva:
 *    1. Crea un array de pares [col, row] (origen arriba-izquierda).
 *    2. Regístralo en BOARD_LAYOUTS con un id único.
 *    3. Úsalo en src/data/levels.js poniendo ese id en `layout`.
 *    ¡Eso es todo! El sistema calcula tamaño, centrado y posiciones solo.
 *
 * Convención de coordenadas: col crece hacia la derecha (X+), row crece hacia
 * abajo (en pantalla). En el mundo 3D, row se invierte para que la fila 0 quede
 * arriba.
 * -----------------------------------------------------------------------------
 */

// --- Definiciones de celdas por forma (pares [col, row]) ---------------------

// 1) Cuadrado 3x3 — la forma base del MVP (9 celdas)
const SQUARE_3X3 = [
  [0, 0], [1, 0], [2, 0],
  [0, 1], [1, 1], [2, 1],
  [0, 2], [1, 2], [2, 2],
]

// 2) Cruz / Plus sobre una rejilla 3x3 (5 celdas)
const CROSS = [
  [1, 0],
  [0, 1], [1, 1], [2, 1],
  [1, 2],
]

// 3) Diamante (rombo) sobre rejilla 5x5 (9 celdas)
const DIAMOND = [
  [2, 0],
  [1, 1], [3, 1],
  [0, 2], [2, 2], [4, 2],
  [1, 3], [3, 3],
  [2, 4],
]

// --- Formas EXTRA, ya listas para usar en niveles avanzados ------------------
// (El sistema es genérico: estas funcionan exactamente igual que las anteriores.)

// 4) Círculo aproximado sobre rejilla 5x5 (anillo de 8 + centro opcional)
const CIRCLE = [
  [1, 0], [2, 0], [3, 0],
  [0, 1], [4, 1],
  [0, 2], [4, 2],
  [0, 3], [4, 3],
  [1, 4], [2, 4], [3, 4],
]

// 5) Hexágono sobre rejilla 5x5
const HEXAGON = [
  [1, 0], [2, 0], [3, 0],
  [0, 1], [4, 1],
  [0, 2], [4, 2],
  [1, 3], [2, 3], [3, 3],
]

// 6) Triángulo (apunta hacia arriba) sobre rejilla 5x4
const TRIANGLE = [
  [2, 0],
  [1, 1], [2, 1], [3, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
]

// 7) Diagonales en X sobre rejilla 5x5
const DIAGONALS = [
  [0, 0], [4, 0],
  [1, 1], [3, 1],
  [2, 2],
  [1, 3], [3, 3],
  [0, 4], [4, 4],
]

/**
 * Registro central de layouts.
 * `cells` es la lista de celdas; el resto (cols, rows) se calcula solo.
 */
export const BOARD_LAYOUTS = {
  square3x3: { id: 'square3x3', name: 'Cuadrado 3×3', cells: SQUARE_3X3 },
  cross: { id: 'cross', name: 'Cruz', cells: CROSS },
  diamond: { id: 'diamond', name: 'Diamante', cells: DIAMOND },
  // Extras listos para usar:
  circle: { id: 'circle', name: 'Círculo', cells: CIRCLE },
  hexagon: { id: 'hexagon', name: 'Hexágono', cells: HEXAGON },
  triangle: { id: 'triangle', name: 'Triángulo', cells: TRIANGLE },
  diagonals: { id: 'diagonals', name: 'Diagonales', cells: DIAGONALS },
}

export const DEFAULT_LAYOUT_ID = 'square3x3'

/**
 * Devuelve un layout normalizado y listo para render:
 *   { id, name, cols, rows, cells: [{ id, col, row }] }
 * Cada celda recibe un id estable basado en su posición ("c{col}r{row}").
 */
export function getLayout(layoutId) {
  const raw = BOARD_LAYOUTS[layoutId] || BOARD_LAYOUTS[DEFAULT_LAYOUT_ID]
  let maxCol = 0
  let maxRow = 0
  const cells = raw.cells.map(([col, row]) => {
    if (col > maxCol) maxCol = col
    if (row > maxRow) maxRow = row
    return { id: `c${col}r${row}`, col, row }
  })
  return {
    id: raw.id,
    name: raw.name,
    cols: maxCol + 1,
    rows: maxRow + 1,
    cells,
  }
}

/**
 * Convierte un layout en posiciones del mundo 3D centradas en el origen.
 * Devuelve celdas con `position: [x, y, z]` (z = 0, las pelotas miran a la cámara).
 *
 * @param {object} layout  resultado de getLayout()
 * @param {number} spacing separación entre celdas en unidades de mundo
 */
export function layoutToWorld(layout, spacing = 1) {
  const centerX = (layout.cols - 1) / 2
  const centerY = (layout.rows - 1) / 2
  return layout.cells.map((cell) => ({
    ...cell,
    position: [
      (cell.col - centerX) * spacing,
      // Invertimos row para que la fila 0 quede arriba en pantalla.
      (centerY - cell.row) * spacing,
      0,
    ],
  }))
}
