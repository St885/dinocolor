/**
 * audioSystem.js
 * -----------------------------------------------------------------------------
 * Sistema de audio BÁSICO de DinoColor.
 *
 * Estrategia: los efectos se SINTETIZAN con la Web Audio API. Así el juego suena
 * desde el primer momento SIN necesidad de archivos .mp3, y sin problemas de rutas
 * en GitHub Pages / Capacitor.
 *
 * 🔊 ¿Quieres usar audio real (mp3)?  Coloca los archivos según se indica en
 *    assets/audio/ (ver assets/README.md) e importa/asigna buffers aquí. Mientras
 *    no existan, se usa la síntesis como placeholder funcional.
 *
 * Rutas previstas para audio real (futuro):
 *    assets/audio/sfx/hit.mp3
 *    assets/audio/sfx/miss.mp3
 *    assets/audio/sfx/win.mp3
 *    assets/audio/sfx/lose.mp3
 *    assets/audio/music/dinocolor_theme.mp3
 * -----------------------------------------------------------------------------
 */

let ctx = null
let enabled = true

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    // try/catch: algunos WebView/navegadores restringidos lanzan al crear el contexto
    // (o al superar el límite de contextos). getCtx() se llama desde el handler de un
    // botón (unlock()), así que si esto lanzara, "mataría" ese click. Ante el fallo,
    // el juego simplemente se queda sin audio, nunca roto.
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  // Los navegadores suspenden el contexto hasta el primer gesto del usuario.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/**
 * Reproduce un tono simple.
 * @param {object} o opciones del tono
 */
function tone({ freq = 440, dur = 0.15, type = 'sine', gain = 0.2, delay = 0, slideTo = null }) {
  const ac = getCtx()
  if (!ac) return
  const t0 = ac.currentTime + delay
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  // Envolvente sencilla (ataque rápido, caída suave) para evitar clics.
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// --- API pública -------------------------------------------------------------

export function setEnabled(value) {
  enabled = !!value
}

export function isEnabled() {
  return enabled
}

/**
 * Debe llamarse en respuesta a un gesto del usuario (un click/tap) para
 * "desbloquear" el audio en móvil. Es seguro llamarlo varias veces.
 */
export function unlock() {
  getCtx()
}

export const Sounds = {
  /** Acierto: tono brillante ascendente. */
  hit() {
    if (!enabled) return
    tone({ freq: 660, slideTo: 990, dur: 0.12, type: 'triangle', gain: 0.22 })
  },
  /** Acierto rápido / combo: dos notas alegres. */
  combo() {
    if (!enabled) return
    tone({ freq: 784, dur: 0.1, type: 'triangle', gain: 0.22 })
    tone({ freq: 1175, dur: 0.12, type: 'triangle', gain: 0.2, delay: 0.08 })
  },
  /** Fallo / pulsar apagada: zumbido grave corto. */
  miss() {
    if (!enabled) return
    tone({ freq: 200, slideTo: 110, dur: 0.18, type: 'sawtooth', gain: 0.18 })
  },
  /** Victoria de nivel: arpegio ascendente. */
  win() {
    if (!enabled) return
    ;[523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.22, delay: i * 0.12 }),
    )
  },
  /** Derrota de nivel: secuencia descendente. */
  lose() {
    if (!enabled) return
    ;[440, 370, 294].forEach((f, i) =>
      tone({ freq: f, dur: 0.22, type: 'sine', gain: 0.2, delay: i * 0.16 }),
    )
  },
  /** Sonido de UI (botón). */
  click() {
    if (!enabled) return
    tone({ freq: 520, dur: 0.06, type: 'square', gain: 0.12 })
  },
  /**
   * ACIERTO POR FAMILIA DE COLOR (v0.6.3). Cada tramo del juego suena distinto sin
   * añadir ni un archivo de audio: cambian la forma de onda, el intervalo y la
   * caída. Se llama en lugar de `hit()` cuando se conoce la familia; `hit()` sigue
   * existiendo intacto como respaldo.
   *
   * Todas respetan `enabled`, igual que el resto: si el jugador silenció el juego,
   * ninguna suena.
   */
  hitFamily(family, fast) {
    if (!enabled) return
    const g = fast ? 0.24 : 0.2
    switch (family) {
      // Verde: tono limpio que sube. Es el sonido "de siempre", un poco más vivo.
      case 'leaf':
        tone({ freq: 660, slideTo: 990, dur: 0.12, type: 'triangle', gain: g })
        break
      // Cian: cristalino. Dos senos agudos muy juntos dan ese "ting" de vidrio.
      case 'crystal':
        tone({ freq: 1245, dur: 0.09, type: 'sine', gain: g })
        tone({ freq: 1660, dur: 0.13, type: 'sine', gain: g * 0.75, delay: 0.045 })
        break
      // Dorado: moneda. Dos notas en quinta, la segunda más corta y brillante.
      case 'gold':
        tone({ freq: 988, dur: 0.08, type: 'square', gain: g * 0.7 })
        tone({ freq: 1480, dur: 0.14, type: 'triangle', gain: g, delay: 0.05 })
        break
      // Naranja: cálido y corto. Diente de sierra grave que cae: una chispa.
      case 'ember':
        tone({ freq: 520, slideTo: 300, dur: 0.11, type: 'sawtooth', gain: g * 0.8 })
        tone({ freq: 780, dur: 0.07, type: 'triangle', gain: g * 0.6, delay: 0.02 })
        break
      // Rosa/morado: mágico. Tercera ascendente con una cola que sigue subiendo.
      case 'magic':
        tone({ freq: 740, dur: 0.1, type: 'sine', gain: g * 0.8 })
        tone({ freq: 932, dur: 0.1, type: 'sine', gain: g * 0.7, delay: 0.06 })
        tone({ freq: 1245, slideTo: 1660, dur: 0.16, type: 'sine', gain: g * 0.5, delay: 0.12 })
        break
      default:
        tone({ freq: 660, slideTo: 990, dur: 0.12, type: 'triangle', gain: g })
    }
  },
  /**
   * Escalón de combo alcanzado: arpegio corto que sube con el escalón. Va POR
   * ENCIMA del sonido del acierto (arranca con retardo) para que se oigan los dos
   * sin pisarse.
   */
  comboUp(tier) {
    if (!enabled) return
    const t = Math.max(1, Math.min(4, Math.floor(tier) || 1))
    const base = [523, 659, 784, 1047][t - 1]
    const notas = [base, base * 1.26, base * 1.5].slice(0, 1 + t)
    notas.forEach((f, i) =>
      tone({ freq: f, dur: 0.1, type: 'triangle', gain: 0.18, delay: 0.1 + i * 0.07 }),
    )
  },
  /**
   * Huesos ganados: tintineo de "monedas" (v0.6.1). Sigue siendo síntesis pura —
   * el juego no descarga ni un archivo de audio. Va DESPUÉS del fanfarrón de
   * victoria (delays altos) para que no se pisen.
   */
  reward() {
    if (!enabled) return
    ;[1047, 1319, 1568].forEach((f, i) =>
      tone({ freq: f, dur: 0.09, type: 'triangle', gain: 0.16, delay: 0.55 + i * 0.07 }),
    )
  },
}

export default { setEnabled, isEnabled, unlock, Sounds }
