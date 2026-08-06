/**
 * skins.js
 * -----------------------------------------------------------------------------
 * Catálogo de aspectos de T-Rexo. **No hay un GLB por skin**: todas usan el MISMO
 * modelo de 1,3 MB y solo cambian parámetros de material. Cero peso añadido.
 *
 * CÓMO SE TIÑE UN MODELO CON TEXTURA (y por qué no basta con `color`):
 * `material.color` se MULTIPLICA por la textura de color base. Sobre un dinosaurio
 * azul eso sirve para aclarar, oscurecer o desplazar el tono dentro de su familia
 * (azules, turquesas), pero es incapaz de volverlo naranja: el azul casi no tiene
 * canal rojo, así que multiplicar por naranja da casi negro.
 *
 * Por eso cada skin combina DOS cosas:
 *   - `color`     multiplica  → controla el tono base y el brillo
 *   - `emissive`  SUMA luz    → puede meter calor (fuego, oro) donde el multiplicado
 *                               no llega, sin depender del canal que falta
 * y opcionalmente `metalness`/`roughness`, que en three.js multiplican al mapa
 * metallic-roughness del modelo (de ahí el acabado pulido del cristal y el oro).
 *
 * ⚠️ El material del GLB se COMPARTE entre instancias (`SkeletonUtils.clone` clona
 * el grafo, no los materiales). Aplicar esto sin clonar el material teñiría a la vez
 * al héroe, al mini de la partida y al de la pantalla final. Ver `DinoMascot.jsx`.
 * -----------------------------------------------------------------------------
 */

/** Skin por defecto: la que ve cualquiera que empiece a jugar. */
export const DEFAULT_SKIN = 'classic'

export const SKINS = [
  {
    id: 'classic',
    name: 'T-Rexo clásico',
    description: 'El de siempre. Azul, valiente y con su pañuelo rojo.',
    price: 0,
    aura: 'classic',
    // Sin tinte: el material se deja exactamente como viene del GLB.
    material: { color: '#ffffff', emissive: '#000000', emissiveIntensity: 0 },
  },
  {
    id: 'tropical',
    name: 'T-Rexo tropical',
    description: 'Turquesa de laguna, como recién salido del agua.',
    price: 80,
    aura: 'tropical',
    material: {
      color: '#a9ffe4',
      emissive: '#0b5a44',
      emissiveIntensity: 0.22,
      roughness: 0.85,
    },
  },
  {
    id: 'volcanic',
    name: 'T-Rexo volcánico',
    description: 'Piel de ceniza y brasas encendidas por dentro.',
    price: 120,
    aura: 'volcanic',
    material: {
      // El multiplicado apaga el azul (queda ceniza) y la emisión pone el fuego.
      color: '#c98a72',
      emissive: '#ff5a1e',
      emissiveIntensity: 0.42,
      roughness: 0.95,
    },
  },
  {
    id: 'crystal',
    name: 'T-Rexo cristal',
    description: 'Hielo pulido que brilla con luz propia.',
    price: 160,
    aura: 'crystal',
    material: {
      color: '#dff6ff',
      emissive: '#3fd0ff',
      emissiveIntensity: 0.34,
      metalness: 0.9,
      roughness: 0.14,
    },
  },
  {
    id: 'golden',
    name: 'T-Rexo dorado',
    description: 'Oro puro. Para presumir de récords.',
    price: 250,
    aura: 'golden',
    material: {
      // El multiplicado NO puede dorar un dinosaurio azul: al tener poco canal
      // rojo, cualquier tono cálido lo desatura y sale color hueso (probado). El
      // truco es OSCURECER y templar con `color` para quitarle el azul, y dejar
      // que sea la EMISIÓN la que ponga el oro. De ahí una intensidad tan alta.
      color: '#9c8558',
      emissive: '#ffb02a',
      emissiveIntensity: 0.62,
      metalness: 1,
      roughness: 0.22,
    },
  },
]

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || null
}

export function isKnownSkinId(id) {
  return SKINS.some((s) => s.id === id)
}

/** Skins gratuitas: se consideran desbloqueadas desde el primer día. */
export const FREE_SKINS = SKINS.filter((s) => s.price === 0).map((s) => s.id)
