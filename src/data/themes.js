/**
 * themes.js
 * -----------------------------------------------------------------------------
 * Ambientes desbloqueables. Un tema cambia la ATMÓSFERA (fondos, acentos, brillos)
 * de las pantallas y el color del cielo de la partida.
 *
 * QUÉ NO TOCA UN TEMA, Y POR QUÉ:
 *   - El **color de la pelota activa** (`level.activeColor`). Es información de
 *     juego, no decoración: cambia por nivel para marcar la dificultad y es la
 *     referencia de legibilidad (también para daltonismo). Un tema que lo repintara
 *     rompería la mecánica.
 *   - La textura del fondo 3D (`Background3D`), que se dibuja una vez en un
 *     CanvasTexture. Regenerarla por tema costaría trabajo de CPU en cada cambio
 *     para un efecto que ya se consigue con el color del cielo y un velo en CSS.
 *
 * CÓMO SE APLICA: `MobileLayout` pone `data-theme="<id>"` en `.app-frame`, y el CSS
 * redefine ahí un puñado de variables. Cambiar de tema es un repintado, no un
 * re-render del árbol 3D. `sky` y `tint` los consume GameScene.
 * -----------------------------------------------------------------------------
 */

export const DEFAULT_THEME = 'jungle'

export const THEMES = [
  {
    id: 'jungle',
    name: 'Selva clásica',
    description: 'La jungla jurásica de siempre, verde y frondosa.',
    price: 0,
    swatch: ['#2a6e4e', '#54ff9d', '#ffd23f'],
    sky: '#071711',
    tint: 'transparent',
  },
  {
    id: 'sunrise',
    name: 'Amanecer tropical',
    description: 'Cielo de mango y mar turquesa al fondo.',
    price: 100,
    swatch: ['#f8a65a', '#ffd23f', '#4fe3ff'],
    sky: '#2a1408',
    tint: 'radial-gradient(125% 62% at 50% 0%, rgba(255, 150, 50, 0.5), transparent 70%), radial-gradient(120% 40% at 50% 100%, rgba(120, 40, 80, 0.34), transparent 70%)',
  },
  {
    id: 'neon',
    name: 'Cueva neón',
    description: 'Roca oscura y luces de neón cian y magenta.',
    price: 140,
    swatch: ['#12203a', '#4fe3ff', '#ff6bb3'],
    sky: '#050b18',
    tint: 'radial-gradient(125% 60% at 50% 100%, rgba(40, 190, 255, 0.46), transparent 70%), radial-gradient(120% 45% at 50% 0%, rgba(120, 40, 160, 0.4), transparent 72%)',
  },
  {
    id: 'volcano',
    name: 'Volcán naranja',
    description: 'Lava, humo y un cielo que arde.',
    price: 180,
    swatch: ['#3a1206', '#ff8a3d', '#ffd23f'],
    sky: '#1c0703',
    tint: 'radial-gradient(125% 65% at 50% 100%, rgba(255, 80, 20, 0.52), transparent 70%), radial-gradient(120% 45% at 50% 0%, rgba(90, 25, 10, 0.45), transparent 72%)',
  },
  {
    id: 'crystal',
    name: 'Cristales morados',
    description: 'Una cueva de amatista que brilla en la penumbra.',
    price: 220,
    swatch: ['#2a1147', '#b98cff', '#4fe3ff'],
    sky: '#120626',
    tint: 'radial-gradient(125% 62% at 50% 0%, rgba(150, 90, 255, 0.5), transparent 70%), radial-gradient(120% 45% at 50% 100%, rgba(60, 20, 120, 0.42), transparent 72%)',
  },
]

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || null
}

export function isKnownThemeId(id) {
  return THEMES.some((t) => t.id === id)
}

export const FREE_THEMES = THEMES.filter((t) => t.price === 0).map((t) => t.id)

/** Tema equipado resuelto con respaldo, para que la UI nunca reciba null. */
export function resolveTheme(id) {
  return getTheme(id) || getTheme(DEFAULT_THEME)
}
