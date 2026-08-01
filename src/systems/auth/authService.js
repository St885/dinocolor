/**
 * authService.js
 * -----------------------------------------------------------------------------
 * FACHADA de autenticación: lo único que conoce el resto del juego. Mantiene el
 * estado de sesión, avisa a quien se suscriba y expone las acciones.
 *
 * Es un módulo con estado (no un hook) a propósito: la sesión es global y debe
 * sobrevivir a los montajes y desmontajes de escenas. `useAuth` es solo el
 * puente hacia React.
 *
 * ESTADO:
 *   status: 'loading' | 'ready'   ('loading' solo hasta resolver la sesión)
 *   user:   Profile | null
 *
 * DÓNDE ESTÁ LA VERDAD:
 *   - Cuentas reales → Firebase (`observeSession`). El espejo en localStorage es
 *     solo una caché de presentación para el primer frame.
 *   - Invitado → el espejo local ES la verdad (no hay backend detrás).
 *   Si Firebase dice "no hay sesión" y el espejo guardaba una cuenta real, gana
 *   Firebase y se limpia el espejo. Si el espejo guardaba un invitado, se
 *   respeta: cerrar sesión en Google no debe echar del juego a un invitado.
 *
 * NO TOCA EL PROGRESO. Niveles, récords, estrellas y sonido siguen viviendo en
 * `storageSystem.js` con sus mismas claves. Iniciar o cerrar sesión NO borra ni
 * migra nada: el progreso es del dispositivo. Ver docs/AUTH.md → "Progreso".
 * -----------------------------------------------------------------------------
 */

import { isAppleEnabled, isFirebaseConfigured, isGoogleEnabled } from './authConfig.js'
import { authError } from './authErrors.js'
import * as firebase from './firebaseProvider.js'
import {
  clearProfile,
  loadProfile,
  makeGuestProfile,
  saveProfile,
} from './userProfile.js'

let state = {
  status: 'loading',
  user: null,
}

const listeners = new Set()

function emit() {
  // Copia del Set: un listener que se desuscriba durante la notificación no
  // debe alterar el recorrido en curso.
  listeners.forEach((fn) => {
    try {
      fn(state)
    } catch {
      /* un suscriptor roto no puede tumbar a los demás */
    }
  })
}

function setState(next) {
  state = { ...state, ...next }
  emit()
}

/** Estado actual (para el valor inicial de `useState`). */
export function getAuthState() {
  return state
}

/** Suscripción a los cambios de sesión. Devuelve la función para cancelarla. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Guarda el perfil y lo publica como sesión activa. */
function adopt(profile) {
  if (!profile) return null
  saveProfile(profile)
  setState({ status: 'ready', user: profile })
  return profile
}

// --- Arranque ----------------------------------------------------------------

let initPromise = null

/**
 * Resuelve la sesión inicial. Idempotente: se puede llamar en cada montaje.
 *
 * Orden de trabajo, pensado para que la pantalla NO parpadee:
 *   1. Espejo local → pinta algo inmediatamente (sesión previa o invitado).
 *   2. Sin Firebase configurado → listo, no hay nada más que esperar.
 *   3. Con Firebase → recoger un posible redirect y engancharse a la sesión real.
 */
export function initAuth() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const mirror = loadProfile()

    if (!isFirebaseConfigured) {
      // Sin backend, solo puede sobrevivir una sesión de invitado. Un perfil de
      // Google guardado de una build anterior (con config) ya no es verificable:
      // se descarta en vez de fingir que sigue conectado.
      if (mirror && mirror.isGuest) setState({ status: 'ready', user: mirror })
      else {
        if (mirror) clearProfile()
        setState({ status: 'ready', user: null })
      }
      return
    }

    // Con Firebase configurado, un invitado sigue siendo un invitado: no hay que
    // esperar a la red para dejarle jugar.
    if (mirror && mirror.isGuest) setState({ status: 'ready', user: mirror })

    try {
      // Debe ir ANTES de observeSession: si el jugador vuelve de un redirect,
      // esta llamada es la que completa el intercambio de credenciales.
      await firebase.resolveRedirect()
    } catch {
      /* No había redirect pendiente, o falló. onAuthStateChanged decide. */
    }

    try {
      await firebase.observeSession((profile) => {
        if (profile) {
          adopt(profile)
          return
        }
        // Firebase dice "sin sesión": solo se respeta al invitado.
        const current = loadProfile()
        if (current && current.isGuest) setState({ status: 'ready', user: current })
        else {
          clearProfile()
          setState({ status: 'ready', user: null })
        }
      })
    } catch {
      // El SDK no cargó (offline, bloqueado). El juego debe seguir siendo
      // jugable: se cae al espejo local si era invitado.
      setState({ status: 'ready', user: mirror && mirror.isGuest ? mirror : null })
    }
  })()

  return initPromise
}

// --- Acciones ----------------------------------------------------------------

/** Continuar sin cuenta. No necesita red ni configuración. */
export function continueAsGuest() {
  // Si ya era invitado, se conserva su uid: así el perfil no cambia de identidad
  // cada vez que pasa por la pantalla de acceso.
  const existing = loadProfile()
  const profile = existing && existing.isGuest ? existing : makeGuestProfile()
  return adopt({ ...profile, lastLogin: new Date().toISOString() })
}

/** Google. Lanza si el proveedor no está disponible. */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured) throw authError('dinocolor/not-configured')
  if (!isGoogleEnabled) throw authError('dinocolor/provider-unavailable')
  const profile = await firebase.signInWithProvider('google')
  // null = se fue por redirect; la sesión llegará por observeSession al volver.
  return profile ? adopt(profile) : null
}

/** Apple. Requiere configuración adicional en la consola de Apple (docs/AUTH.md). */
export async function signInWithApple() {
  if (!isFirebaseConfigured) throw authError('dinocolor/not-configured')
  if (!isAppleEnabled) throw authError('dinocolor/provider-unavailable')
  const profile = await firebase.signInWithProvider('apple')
  return profile ? adopt(profile) : null
}

/** Registro con correo y contraseña. */
export async function registerWithEmail(email, password, displayName) {
  if (!isFirebaseConfigured) throw authError('dinocolor/not-configured')
  return adopt(await firebase.registerWithEmail(email, password, displayName))
}

/** Inicio de sesión con correo y contraseña. */
export async function signInWithEmail(email, password) {
  if (!isFirebaseConfigured) throw authError('dinocolor/not-configured')
  return adopt(await firebase.signInWithEmail(email, password))
}

/** Correo de recuperación de contraseña. */
export async function sendPasswordReset(email) {
  if (!isFirebaseConfigured) throw authError('dinocolor/not-configured')
  await firebase.sendPasswordReset(email)
}

/**
 * Cierra la sesión. El progreso del juego (niveles, récords, estrellas) NO se
 * toca: vive en el dispositivo y no pertenece a la cuenta.
 */
export async function signOut() {
  const wasGuest = state.user && state.user.isGuest
  clearProfile()
  setState({ status: 'ready', user: null })
  if (isFirebaseConfigured && !wasGuest) {
    try {
      await firebase.signOutFirebase()
    } catch {
      /* la sesión local ya está cerrada: no hay nada que enseñar al jugador */
    }
  }
}

// --- Capacidades (para que la UI no ofrezca lo que no existe) ----------------

export const capabilities = {
  firebase: isFirebaseConfigured,
  google: isGoogleEnabled,
  apple: isAppleEnabled,
  email: isFirebaseConfigured,
  guest: true, // el invitado siempre está disponible: nunca se bloquea el juego
}
