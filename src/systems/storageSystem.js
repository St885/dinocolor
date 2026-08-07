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
  // v0.6.0 — moneda local (huesos) y misiones diarias.
  bones: 'dinocolor.bones',
  dailyDay: 'dinocolor.daily.day',
  dailyIds: 'dinocolor.daily.ids',
  dailyProgress: 'dinocolor.daily.progress',
  dailyDone: 'dinocolor.daily.done',
  // v0.6.1 — inventario de la tienda (aspectos y ambientes).
  skinsOwned: 'dinocolor.shop.skins',
  skinEquipped: 'dinocolor.shop.skin',
  themesOwned: 'dinocolor.shop.themes',
  themeEquipped: 'dinocolor.shop.theme',
  // v0.6.2 — retención diaria: racha de entrada.
  streakLastDay: 'dinocolor.streak.day',
  streakDay: 'dinocolor.streak.n',
  streakTotal: 'dinocolor.streak.total',
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

// --- Huesos: la moneda local (v0.6.0) ----------------------------------------
//
// Es una recompensa PURAMENTE LOCAL y decorativa: no se compra, no se vende, no
// sale del dispositivo y no desbloquea nada que afecte a la dificultad. Se guarda
// como un entero de texto, con el mismo criterio defensivo que el resto.

/** Tope de seguridad: por encima de esto el número deja de caber bien en el HUD. */
const BONES_MAX = 9_999_999

export function getBones() {
  const v = parseInt(readRaw(KEYS.bones), 10)
  return Number.isFinite(v) && v >= 0 ? Math.min(v, BONES_MAX) : 0
}

/** Suma huesos (ignora cantidades no válidas o negativas). Devuelve el total. */
export function addBones(amount) {
  const n = Math.floor(Number(amount))
  if (!Number.isFinite(n) || n <= 0) return getBones()
  const total = Math.min(BONES_MAX, getBones() + n)
  writeRaw(KEYS.bones, String(total))
  return total
}

/**
 * Resta huesos. Devuelve `null` si no hay saldo suficiente (y NO toca nada), o el
 * total resultante si el gasto se aplicó.
 *
 * Que devuelva null en vez de recortar a cero es deliberado: quien llama debe poder
 * distinguir "cobrado" de "no te llega" para no entregar el artículo igualmente.
 * Un importe negativo o no numérico se rechaza — si no, "comprar" algo con precio
 * -100 sería una forma de fabricar huesos.
 */
export function spendBones(amount) {
  const n = Math.floor(Number(amount))
  if (!Number.isFinite(n) || n < 0) return null
  const current = getBones()
  if (n > current) return null
  const total = current - n
  writeRaw(KEYS.bones, String(total))
  return total
}

// --- Misiones diarias (v0.6.0) -----------------------------------------------
//
// Se guardan en CUATRO claves de texto plano, sin JSON.parse (docs/SECURITY.md):
//   daily.day      'YYYY-MM-DD' del día local al que pertenecen
//   daily.ids      ids del catálogo separados por '|'   -> 'win3|stars5|combo5'
//   daily.progress enteros separados por '|'            -> '2|0|1'
//   daily.done     un dígito 0/1 por misión             -> '100'
//
// Cualquier incoherencia (día distinto, id desconocido, longitudes que no cuadran,
// texto corrupto) hace que `readDaily` devuelva null y el sistema genere misiones
// nuevas. Nunca lanza y nunca deja al jugador sin misiones.

const SEP = '|'

/** Lee el bloque diario ya saneado, o null si hay que regenerarlo. */
export function readDaily(expectedDay, isKnownId, count) {
  const day = readRaw(KEYS.dailyDay)
  if (!day || day !== expectedDay) return null

  const ids = String(readRaw(KEYS.dailyIds) || '').split(SEP).filter(Boolean)
  if (ids.length !== count) return null
  if (!ids.every((id) => isKnownId(id))) return null
  // Ids repetidos significarían un guardado manipulado: se descarta el bloque.
  if (new Set(ids).size !== ids.length) return null

  const rawProgress = String(readRaw(KEYS.dailyProgress) || '').split(SEP)
  const progress = ids.map((_, i) => {
    const n = parseInt(rawProgress[i], 10)
    return Number.isFinite(n) && n >= 0 ? Math.min(n, 9999) : 0
  })

  const rawDone = String(readRaw(KEYS.dailyDone) || '')
  const done = ids.map((_, i) => rawDone.charAt(i) === '1')

  return { day, ids, progress, done }
}

/** Guarda el bloque diario. Los tres arrays deben tener la misma longitud. */
export function writeDaily({ day, ids, progress, done }) {
  writeRaw(KEYS.dailyDay, String(day))
  writeRaw(KEYS.dailyIds, ids.join(SEP))
  writeRaw(KEYS.dailyProgress, progress.map((n) => String(Math.max(0, Math.floor(n) || 0))).join(SEP))
  writeRaw(KEYS.dailyDone, done.map((b) => (b ? '1' : '0')).join(''))
}

// --- Inventario de la tienda (v0.6.1) ----------------------------------------
//
// Dos listas de ids separadas por '|' y dos ids sueltos. Mismo criterio que el
// resto: texto plano, sin JSON.parse, y TODO se valida contra el catálogo al leer.
// Un id desconocido (guardado antiguo, catálogo cambiado o manipulación) se ignora
// en silencio en vez de romper la tienda.

const SEP_INV = '|'

/**
 * Lee una lista de ids, descartando los que no existan y los repetidos.
 * @param {(id:string)=>boolean} isKnown validador del catálogo correspondiente
 * @param {string[]} always ids que siempre se consideran en propiedad (los gratis)
 */
function readIdList(key, isKnown, always = []) {
  const raw = String(readRaw(key) || '')
  const seen = new Set(always.filter(isKnown))
  raw
    .split(SEP_INV)
    .map((s) => s.trim())
    .filter((s) => s && isKnown(s))
    .forEach((s) => seen.add(s))
  return [...seen]
}

function writeIdList(key, ids) {
  writeRaw(key, ids.join(SEP_INV))
}

export function getOwnedSkins(isKnown, free) {
  return readIdList(KEYS.skinsOwned, isKnown, free)
}
export function setOwnedSkins(ids) {
  writeIdList(KEYS.skinsOwned, ids)
}
export function getOwnedThemes(isKnown, free) {
  return readIdList(KEYS.themesOwned, isKnown, free)
}
export function setOwnedThemes(ids) {
  writeIdList(KEYS.themesOwned, ids)
}

/**
 * Id equipado. Devuelve `fallback` si está vacío, si no existe en el catálogo o
 * si NO está entre los desbloqueados — así, un localStorage manipulado para
 * equipar algo sin comprarlo simplemente no surte efecto.
 */
export function getEquipped(kind, isKnown, owned, fallback) {
  const key = kind === 'skin' ? KEYS.skinEquipped : KEYS.themeEquipped
  const raw = String(readRaw(key) || '').trim()
  if (!raw || !isKnown(raw) || !owned.includes(raw)) return fallback
  return raw
}

export function setEquipped(kind, id) {
  writeRaw(kind === 'skin' ? KEYS.skinEquipped : KEYS.themeEquipped, String(id))
}

// --- Racha diaria (v0.6.2) ---------------------------------------------------
//
// Tres claves de texto plano. La FECHA del último cobro es el dato importante:
// de ella se deduce todo lo demás (si hoy toca, si la racha sigue o se rompe),
// así que no hay ningún contador que pueda "adelantarse" solo.
//
// `readStreak` nunca lanza y nunca devuelve null: si algo está corrupto, entrega
// una racha en blanco. Un jugador con el almacenamiento manipulado empieza de
// cero, que es lo peor que le puede pasar.

/** Formato de fecha admitido. Cualquier otra cosa se trata como "sin fecha". */
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function readStreak() {
  const raw = String(readRaw(KEYS.streakLastDay) || '')
  const lastDay = DAY_RE.test(raw) ? raw : ''
  const n = parseInt(readRaw(KEYS.streakDay), 10)
  const t = parseInt(readRaw(KEYS.streakTotal), 10)
  return {
    lastDay,
    day: Number.isFinite(n) && n >= 1 ? n : 1,
    total: Number.isFinite(t) && t >= 0 ? Math.min(t, 99999) : 0,
  }
}

export function writeStreak({ lastDay, day, total }) {
  writeRaw(KEYS.streakLastDay, String(lastDay || ''))
  writeRaw(KEYS.streakDay, String(Math.max(1, Math.floor(day) || 1)))
  writeRaw(KEYS.streakTotal, String(Math.max(0, Math.floor(total) || 0)))
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
