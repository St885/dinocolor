/**
 * userProfile.js
 * -----------------------------------------------------------------------------
 * Perfil básico del jugador y su espejo local en localStorage.
 *
 * Forma del perfil (lo que pidió el diseño del flujo):
 *   uid · displayName · email · provider · createdAt · lastLogin · isGuest
 *
 * POR QUÉ SE GUARDA CAMPO A CAMPO Y NO COMO JSON:
 * el proyecto tiene una regla explícita (docs/SECURITY.md) de no introducir
 * `JSON.parse` sobre datos que el usuario puede editar — un localStorage
 * manipulado no debe poder lanzar ni inyectar una forma inesperada. Cada campo
 * se guarda como su propia clave de texto y se SANEA al leer, igual que hace
 * `storageSystem.js` con el progreso.
 *
 * QUÉ NO SE GUARDA AQUÍ: ningún token, ninguna contraseña, ningún refresh token.
 * La sesión real la gestiona el SDK de Firebase en su propio almacenamiento; esto
 * es solo una copia de PRESENTACIÓN, para poder saludar al jugador por su nombre
 * en el primer frame sin esperar a la red (y para sostener el modo invitado, que
 * no tiene backend).
 * -----------------------------------------------------------------------------
 */

const KEYS = {
  uid: 'dinocolor.auth.uid',
  displayName: 'dinocolor.auth.displayName',
  email: 'dinocolor.auth.email',
  provider: 'dinocolor.auth.provider',
  createdAt: 'dinocolor.auth.createdAt',
  lastLogin: 'dinocolor.auth.lastLogin',
}

/** Proveedores admitidos. Cualquier otro valor leído se degrada a 'guest'. */
export const PROVIDERS = ['google', 'apple', 'password', 'guest']

const MAX_FIELD = 254 // mismo tope que el email; corta cualquier valor absurdo

// Fallback en memoria (Safari privado / WebView restringido), igual que storageSystem.
const memory = {}

function storageAvailable() {
  try {
    const k = '__dinocolor_auth_test__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

const available = typeof window !== 'undefined' && storageAvailable()

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

function removeRaw(key) {
  delete memory[key]
  if (available) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* nada que hacer */
    }
  }
}

/** Recorta y limpia un texto leído de almacenamiento (o de un proveedor). */
function sanitizeText(value, max = MAX_FIELD) {
  if (typeof value !== 'string') return ''
  // Fuera controles (incluido \n) para que un nombre no rompa el layout del HUD.
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max)
}

/** Fecha ISO válida, o cadena vacía. */
function sanitizeDate(value) {
  const s = sanitizeText(value, 40)
  if (!s) return ''
  const t = Date.parse(s)
  return Number.isFinite(t) ? new Date(t).toISOString() : ''
}

/**
 * Construye un perfil normalizado a partir de datos sueltos. Único sitio donde
 * se decide la forma del objeto: proveedores y almacenamiento pasan por aquí.
 */
export function makeProfile({
  uid,
  displayName,
  email,
  provider,
  createdAt,
  lastLogin,
} = {}) {
  const cleanProvider = PROVIDERS.includes(provider) ? provider : 'guest'
  const cleanEmail = sanitizeText(email)
  const now = new Date().toISOString()
  return {
    uid: sanitizeText(uid, 128),
    // Si el proveedor no da nombre (habitual con Apple si el usuario oculta sus
    // datos, o con un registro por email sin nombre), usamos la parte local del
    // correo. Nunca enseñamos el email entero como nombre: es dato personal.
    displayName:
      sanitizeText(displayName, 24) ||
      (cleanEmail ? sanitizeText(cleanEmail.split('@')[0], 24) : 'Explorador'),
    email: cleanEmail,
    provider: cleanProvider,
    createdAt: sanitizeDate(createdAt) || now,
    lastLogin: sanitizeDate(lastLogin) || now,
    isGuest: cleanProvider === 'guest',
  }
}

/** Guarda el espejo local del perfil. */
export function saveProfile(profile) {
  if (!profile || !profile.uid) return
  writeRaw(KEYS.uid, profile.uid)
  writeRaw(KEYS.displayName, profile.displayName || '')
  writeRaw(KEYS.email, profile.email || '')
  writeRaw(KEYS.provider, profile.provider || 'guest')
  writeRaw(KEYS.createdAt, profile.createdAt || '')
  writeRaw(KEYS.lastLogin, profile.lastLogin || '')
}

/** Lee el espejo local. Devuelve null si no hay sesión guardada. */
export function loadProfile() {
  const uid = sanitizeText(readRaw(KEYS.uid), 128)
  if (!uid) return null
  return makeProfile({
    uid,
    displayName: readRaw(KEYS.displayName),
    email: readRaw(KEYS.email),
    provider: readRaw(KEYS.provider),
    createdAt: readRaw(KEYS.createdAt),
    lastLogin: readRaw(KEYS.lastLogin),
  })
}

/** Borra el espejo local (al cerrar sesión). */
export function clearProfile() {
  Object.values(KEYS).forEach(removeRaw)
}

/**
 * Crea un identificador de invitado. `crypto.randomUUID` está en todos los
 * navegadores modernos; el respaldo cubre WebViews antiguos sin caer nunca en
 * `Math.random()` a secas para algo que identifica una sesión.
 */
export function createGuestId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `guest-${crypto.randomUUID()}`
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      return `guest-${hex}`
    }
  } catch {
    /* seguimos al respaldo */
  }
  return `guest-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

/** Perfil de invitado, listo para usar. */
export function makeGuestProfile() {
  return makeProfile({
    uid: createGuestId(),
    displayName: 'Invitado',
    provider: 'guest',
  })
}

/**
 * Traduce el usuario de Firebase a nuestro perfil. Vive aquí (y no en el
 * proveedor) para que la forma del perfil se decida en un único archivo.
 */
export function profileFromFirebaseUser(user, providerHint) {
  if (!user) return null
  // `providerData[0]` dice con qué proveedor entró de verdad; el hint solo cubre
  // el instante justo después del popup, antes de que se pueble providerData.
  const raw = (user.providerData && user.providerData[0]?.providerId) || ''
  const provider =
    raw === 'google.com'
      ? 'google'
      : raw === 'apple.com'
        ? 'apple'
        : raw === 'password'
          ? 'password'
          : providerHint || 'password'

  return makeProfile({
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    provider,
    createdAt: user.metadata?.creationTime,
    lastLogin: user.metadata?.lastSignInTime,
  })
}
