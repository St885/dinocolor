/**
 * hitEffects.js
 * -----------------------------------------------------------------------------
 * Perfiles de efecto por FAMILIA DE COLOR. Cada color de nivel se siente distinto
 * al acertar, sin cambiar nada de la mecánica.
 *
 * ⚠️ ESTO NO CAMBIA EL COLOR DE LA PELOTA. `level.activeColor` es información de
 * juego: marca la dificultad del tramo y es la referencia de legibilidad (también
 * para daltonismo). Lo que varía aquí es el CARÁCTER del efecto — cuántas chispas
 * salen, a qué velocidad, si hay onda expansiva, si giran en espiral — y el tono
 * del sonido. El color se lee del nivel y se respeta tal cual.
 *
 * Los seis colores del juego caen en cinco familias:
 *
 *   #39ff88 verde    → leaf     hojas, pulso suave y limpio
 *   #46e0ff cian     → crystal  onda acuática amplia, chispas frías y finas
 *   #ffd23f amarillo → gold     destello de moneda, muchas chispas gordas
 *   #ff7b3f naranja  → ember    chispa caliente, rápida y corta
 *   #ff5fae rosa     → magic    espiral mágica, lenta
 *   #b06bff morado   → magic    (misma familia, el tono lo pone el nivel)
 *
 * TODOS los perfiles están acotados: como máximo 14 partículas por pelota. Con el
 * tablero más grande (9 pelotas) el peor caso son 126 puntos, y solo durante los
 * ~0,4 s que dura un estallido. Las direcciones se precalculan UNA vez por familia
 * a nivel de módulo, así que activar un efecto no reserva memoria.
 * -----------------------------------------------------------------------------
 */

/** Familia por defecto si un color no está en el mapa (nivel nuevo, por ejemplo). */
export const DEFAULT_FAMILY = 'leaf'

/**
 * Perfil de cada familia.
 *  particles   cuántas chispas salen (tope duro: 14)
 *  spread      hasta dónde llegan, en radios de pelota
 *  decay       velocidad a la que se apaga el estallido (mayor = más corto)
 *  size        tamaño de la chispa, en radios
 *  burst       tamaño del disco de destello
 *  shock       tamaño final de la ONDA EXPANSIVA (0 = esta familia no la usa)
 *  shockDecay  velocidad de la onda
 *  swirl       radianes que giran las chispas mientras se alejan (espiral)
 */
export const HIT_FAMILIES = {
  leaf: {
    id: 'leaf',
    particles: 9,
    spread: 2.9,
    decay: 2.2,
    size: 0.5,
    burst: 2.3,
    shock: 2.6,
    shockDecay: 2.4,
    swirl: 0,
  },
  crystal: {
    id: 'crystal',
    particles: 12,
    // La onda acuática es lo que define a esta familia: llega más lejos y dura más.
    spread: 3.4,
    decay: 1.9,
    size: 0.34,
    burst: 2.0,
    shock: 4.2,
    shockDecay: 1.5,
    swirl: 0,
  },
  gold: {
    id: 'gold',
    particles: 14,
    spread: 3.1,
    decay: 2.0,
    size: 0.58,
    burst: 2.8,
    shock: 3.0,
    shockDecay: 2.0,
    swirl: 0,
  },
  ember: {
    id: 'ember',
    // Pocas chispas pero MUY rápidas: la brasa salta y se apaga enseguida.
    particles: 8,
    spread: 2.4,
    decay: 3.4,
    size: 0.6,
    burst: 2.6,
    shock: 2.2,
    shockDecay: 3.2,
    swirl: 0,
  },
  magic: {
    id: 'magic',
    particles: 12,
    spread: 3.0,
    decay: 1.7,
    size: 0.42,
    burst: 2.2,
    shock: 3.4,
    shockDecay: 1.8,
    // Lo que hace "mágica" a esta familia: las chispas giran mientras se alejan.
    swirl: 2.4,
  },
}

/** Color de nivel → familia. */
const COLOR_FAMILY = {
  '#39ff88': 'leaf',
  '#46e0ff': 'crystal',
  '#ffd23f': 'gold',
  '#ff7b3f': 'ember',
  '#ff5fae': 'magic',
  '#b06bff': 'magic',
}

/**
 * Familia de un color de nivel. Si el color no está en el mapa (se añade un nivel
 * con un tono nuevo), cae en `leaf` en vez de dejar la pelota sin efecto.
 */
export function familyForColor(hex) {
  const key = String(hex || '').toLowerCase()
  return HIT_FAMILIES[COLOR_FAMILY[key] || DEFAULT_FAMILY]
}

/** Tope duro de chispas. Ningún perfil puede saltárselo. */
export const MAX_PARTICLES = 14

/**
 * Direcciones de las chispas, precalculadas UNA vez por familia. Se reparten en
 * círculo con un desorden determinista (nada de `Math.random()` por estallido: eso
 * reservaría memoria y haría cada acierto ligeramente distinto sin que se note).
 */
export const FAMILY_DIRS = Object.fromEntries(
  Object.values(HIT_FAMILIES).map((f) => {
    const n = Math.min(f.particles, MAX_PARTICLES)
    const dirs = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 2 ? 0.3 : -0.2)
      const sp = 0.85 + (i % 3) * 0.18
      dirs.push([Math.cos(a) * sp, Math.sin(a) * sp, i % 2 ? 0.25 : -0.12])
    }
    return [f.id, dirs]
  }),
)

// --- Escalones de combo -------------------------------------------------------
//
// Reutilizan el `combo` que ya lleva `useGameLoop`; NO hay un contador paralelo.
// Cada escalón solo añade presentación: el multiplicador de puntos sigue saliendo
// de `comboMultiplier` en scoringSystem, sin tocar.

export const COMBO_TIERS = [
  { at: 3, tier: 1, label: '¡COMBO x3!' },
  { at: 5, tier: 2, label: '¡EN RACHA!' },
  { at: 8, tier: 3, label: '¡IMPARABLE!' },
  { at: 12, tier: 4, label: '¡LEGENDARIO!' },
]

/** Escalón alcanzado por un combo (0 = ninguno todavía). */
export function comboTier(combo) {
  let tier = 0
  for (const t of COMBO_TIERS) if (combo >= t.at) tier = t.tier
  return tier
}

/** El escalón EXACTO que se acaba de cruzar, o null si este acierto no cruzó ninguno. */
export function comboMilestone(combo) {
  return COMBO_TIERS.find((t) => t.at === combo) || null
}
