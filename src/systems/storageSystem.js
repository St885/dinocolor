/**
 * storageSystem.js
 * -----------------------------------------------------------------------------
 * Guardado local con localStorage (con fallback en memoria si no está disponible,
 * p. ej. modo privado o WebView restringido). Namespaced bajo "dinocolor.".
 *
 * Guarda:
 *   - nivel máximo desbloqueado
 *   - mejor puntuación
 *   - preferencia de sonido (on/off)
 * -----------------------------------------------------------------------------
 */

const KEYS = {
  maxLevel: 'dinocolor.maxLevel',
  bestScore: 'dinocolor.bestScore',
  soundEnabled: 'dinocolor.soundEnabled',
  clearedLevel: 'dinocolor.clearedLevel',
}

// Fallback en memoria por si localStorage lanza (Safari privado, WebView, etc.)
const memory = {}

function isStorageAvailable() {
  try {
    const k = '__dinocolor_test__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

const available = typeof window !== 'undefined' && isStorageAvailable()

function readRaw(key) {
  if (available) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return memory[key] ?? null
    }
  }
  return memory[key] ?? null
}

function writeRaw(key, value) {
  memory[key] = value
  if (available) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* se queda solo en memoria */
    }
  }
}

// --- API pública -------------------------------------------------------------

export function getMaxLevel() {
  const v = parseInt(readRaw(KEYS.maxLevel), 10)
  return Number.isFinite(v) && v >= 1 ? v : 1
}

export function setMaxLevel(levelId) {
  const current = getMaxLevel()
  if (levelId > current) writeRaw(KEYS.maxLevel, String(levelId))
}

/**
 * Nivel más alto SUPERADO (no "desbloqueado"). Se guarda aparte de maxLevel porque
 * el último nivel del juego no desbloquea ninguno posterior: sin este dato, ganarlo
 * era invisible para el progreso y el menú se quedaba clavado en "11/12".
 *
 * Compatibilidad: para partidas guardadas ANTES de existir esta clave, se deduce de
 * maxLevel (si tienes desbloqueado el nivel N, superaste N-1).
 */
export function getClearedLevel() {
  const v = parseInt(readRaw(KEYS.clearedLevel), 10)
  if (Number.isFinite(v) && v >= 0) return v
  return Math.max(0, getMaxLevel() - 1)
}

export function setClearedLevel(levelId) {
  if (levelId > getClearedLevel()) writeRaw(KEYS.clearedLevel, String(levelId))
}

export function getBestScore() {
  const v = parseInt(readRaw(KEYS.bestScore), 10)
  return Number.isFinite(v) && v >= 0 ? v : 0
}

export function setBestScore(score) {
  const current = getBestScore()
  if (score > current) writeRaw(KEYS.bestScore, String(score))
}

export function getSoundEnabled() {
  const v = readRaw(KEYS.soundEnabled)
  // Por defecto, sonido activado.
  return v === null ? true : v === 'true'
}

export function setSoundEnabled(enabled) {
  writeRaw(KEYS.soundEnabled, enabled ? 'true' : 'false')
}

/** Borra todo el progreso de DinoColor (útil para debug / "reiniciar progreso"). */
export function resetProgress() {
  ;[KEYS.maxLevel, KEYS.bestScore, KEYS.clearedLevel].forEach((key) => {
    delete memory[key]
    if (available) {
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* noop */
      }
    }
  })
}
