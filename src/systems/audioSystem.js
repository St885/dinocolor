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
    ctx = new AC()
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
}

export default { setEnabled, isEnabled, unlock, Sounds }
