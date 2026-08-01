/**
 * authConfig.js
 * -----------------------------------------------------------------------------
 * Configuración de Firebase leída de variables de entorno (Vite las inyecta en
 * build; ver `.env.example`). NADA de esto se escribe en el repositorio.
 *
 * ⚠️ Sobre "secretos": la config web de Firebase (apiKey, appId…) NO es un secreto
 * — va en el cliente por diseño y Google la considera pública. Lo que protege el
 * proyecto son las reglas del backend y la lista de dominios autorizados en la
 * consola de Firebase. Aun así vive en `.env` (gitignored) para:
 *   1) no atar el repositorio a un proyecto Firebase concreto,
 *   2) poder tener proyecto de desarrollo y de producción sin tocar código,
 *   3) que el build sepa si debe abrir la CSP a los dominios de Google/Apple.
 *
 * Si falta cualquier clave, el juego arranca igual: `isFirebaseConfigured` es
 * false, la AuthScene lo dice con un mensaje claro y el modo invitado sigue
 * funcionando. NUNCA se rompe la partida por no tener credenciales.
 * -----------------------------------------------------------------------------
 */

/** Claves obligatorias para poder inicializar Firebase Auth. */
const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

const env = import.meta.env || {}

/** Devuelve el valor de una variable, o '' si está vacía/ausente. */
function read(key) {
  const v = env[key]
  return typeof v === 'string' ? v.trim() : ''
}

/** Claves obligatorias que faltan. Vacío = configuración completa. */
export const missingConfigKeys = REQUIRED.filter((k) => !read(k))

/** ¿Se puede inicializar Firebase Auth de verdad? */
export const isFirebaseConfigured = missingConfigKeys.length === 0

/**
 * Objeto de configuración que espera `initializeApp`. Solo tiene sentido cuando
 * `isFirebaseConfigured` es true; si no, sus campos están vacíos.
 */
export const firebaseConfig = {
  apiKey: read('VITE_FIREBASE_API_KEY'),
  authDomain: read('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: read('VITE_FIREBASE_PROJECT_ID'),
  appId: read('VITE_FIREBASE_APP_ID'),
  // Opcionales: no bloquean el arranque de Auth, pero si están se pasan tal cual.
  storageBucket: read('VITE_FIREBASE_STORAGE_BUCKET') || undefined,
  messagingSenderId: read('VITE_FIREBASE_MESSAGING_SENDER_ID') || undefined,
}

/**
 * Apple Sign-In requiere configuración PROPIA en la consola de Apple, además de
 * habilitar el proveedor en Firebase (ver docs/AUTH.md). Esta bandera permite
 * ocultar/anunciar el botón sin tocar código: si el proveedor no está dado de
 * alta, Firebase devuelve `auth/operation-not-allowed` y el usuario vería un
 * error críptico. Por defecto se ANUNCIA solo si Firebase está configurado.
 */
export const isAppleEnabled =
  isFirebaseConfigured && read('VITE_AUTH_APPLE_ENABLED') !== 'false'

/** Google se habilita con un clic en la consola de Firebase; se asume activo. */
export const isGoogleEnabled =
  isFirebaseConfigured && read('VITE_AUTH_GOOGLE_ENABLED') !== 'false'
