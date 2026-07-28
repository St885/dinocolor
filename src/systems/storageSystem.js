/**
 * storageSystem.js
 * -----------------------------------------------------------------------------
 * Guardado local con localStorage (con fallback en memoria si no está disponible,
 * p. ej. modo privado o WebView restringido). Namespaced bajo "dinocolor.".
 *
 * Guarda:
 *   - nivel máximo desbloqueado y nivel más alto superado
 *   - mejor puntuación global y récord POR NIVEL
 *   - estrellas por nivel (0..3), como cadena compacta de dígitos
 *   - preferencia de sonido (on/off) y si ya se vio el tutorial
 *
 * Todo se lee de forma DEFENSIVA: sin JSON.parse (ver docs/SECURITY.md) y con
 * saneado de valores, así un localStorage corrupto o manipulado degrada a los
 * valores por defecto en vez de romper el juego.
 * -----------------------------------------------------------------------------
 */

const KEYS = {
  maxLevel: 'dinocolor.maxLevel',
  bestScore: 'dinocolor.bestScore',
  soundEnabled: 'dinocolor.soundEnabled',
  clearedLevel: 'dinocolor.clearedLevel',
  stars: 'dinocolor.stars',
  tutorialSeen: 'dinocolor.tutorialSeen',
}

/** Prefijo de las claves de récord POR NIVEL (`dinocolor.best.7`). */
const BEST_PREFIX = 'dinocolor.best.'

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

// --- Récord POR NIVEL ---------------------------------------------------------
//
// El récord GLOBAL (`bestScore`) sigue existiendo para el menú, pero no sirve dentro
// de una partida: el HUD mostraba "🏆 2050" (récord del nivel 42) mientras jugabas el
// nivel 1, cuya meta es 300. Un número imposible de batir no motiva, desconcierta.
// Cada nivel guarda su propio récord en su propia clave (`dinocolor.best.7`): así no
// hay que serializar un mapa y se mantiene el criterio de "0 JSON.parse" de SECURITY.md.

export function getLevelBest(levelId) {
  const v = parseInt(readRaw(BEST_PREFIX + levelId), 10)
  return Number.isFinite(v) && v >= 0 ? v : 0
}

/** Guarda solo si es récord. Devuelve true si lo era (para celebrarlo en pantalla). */
export function setLevelBest(levelId, score) {
  if (!Number.isFinite(score) || score <= getLevelBest(levelId)) return false
  writeRaw(BEST_PREFIX + levelId, String(score))
  return true
}

// --- Estrellas por nivel (0..3) ----------------------------------------------
//
// Se guardan como una CADENA DE DÍGITOS: el carácter i-1 son las estrellas del nivel i
// ("3200..." = 3⭐ en el 1, 2⭐ en el 2, sin jugar el 3 y el 4). Ocupa 42 bytes, se lee
// carácter a carácter y NO necesita JSON.parse (ver docs/SECURITY.md): un valor corrupto
// degrada a 0 estrellas en ese nivel, nunca rompe el juego ni desbloquea nada.

const STAR_RE = /^[0-3]$/

export function getLevelStars(levelId) {
  if (!Number.isFinite(levelId) || levelId < 1) return 0
  const raw = readRaw(KEYS.stars) || ''
  const ch = raw.charAt(levelId - 1)
  return STAR_RE.test(ch) ? Number(ch) : 0
}

/** Guarda las estrellas de un nivel solo si mejoran las que ya tenía. */
export function setLevelStars(levelId, stars) {
  if (!Number.isFinite(levelId) || levelId < 1) return
  const next = Math.max(0, Math.min(3, Math.round(stars) || 0))
  if (next <= getLevelStars(levelId)) return
  const raw = readRaw(KEYS.stars) || ''
  // Rellenar con ceros hasta la posición del nivel (los huecos son "sin jugar").
  const padded = raw.padEnd(levelId, '0')
  const chars = padded.split('')
  chars[levelId - 1] = String(next)
  // Sanea de paso cualquier carácter heredado que no sea 0-3.
  writeRaw(KEYS.stars, chars.map((c) => (STAR_RE.test(c) ? c : '0')).join(''))
}

/** Suma de estrellas ganadas en los niveles 1..totalLevels. */
export function getTotalStars(totalLevels) {
  const raw = readRaw(KEYS.stars) || ''
  let sum = 0
  const n = Math.min(raw.length, Math.max(0, totalLevels || 0))
  for (let i = 0; i < n; i++) {
    const c = raw.charAt(i)
    if (STAR_RE.test(c)) sum += Number(c)
  }
  return sum
}

// --- Tutorial ----------------------------------------------------------------

export function getTutorialSeen() {
  return readRaw(KEYS.tutorialSeen) === 'true'
}

export function setTutorialSeen() {
  writeRaw(KEYS.tutorialSeen, 'true')
}

/** Borra todo el progreso de DinoColor (útil para debug / "reiniciar progreso"). */
export function resetProgress() {
  const keys = [KEYS.maxLevel, KEYS.bestScore, KEYS.clearedLevel, KEYS.stars]
  // Récords por nivel: son N claves con prefijo, así que se descubren en vez de
  // asumir cuántos niveles hay (storageSystem no conoce el catálogo de niveles).
  Object.keys(memory).forEach((k) => {
    if (k.startsWith(BEST_PREFIX)) keys.push(k)
  })
  if (available) {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k && k.startsWith(BEST_PREFIX)) keys.push(k)
      }
    } catch {
      /* noop */
    }
  }
  keys.forEach((key) => {
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
