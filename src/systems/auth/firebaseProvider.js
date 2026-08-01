/**
 * firebaseProvider.js
 * -----------------------------------------------------------------------------
 * Adaptador de Firebase Auth. ES EL ÚNICO ARCHIVO DEL PROYECTO QUE IMPORTA
 * `firebase`. Todo lo demás habla con `authService.js`, así que cambiar de
 * backend (Supabase, backend propio…) significa reescribir SOLO este archivo.
 *
 * CARGA PEREZOSA (import dinámico), a propósito:
 *   El SDK de Firebase pesa bastante más que la lógica del juego. Con `import()`
 *   dentro de la función, Rollup lo emite en un CHUNK APARTE que el navegador
 *   solo descarga cuando el jugador abre de verdad la pantalla de acceso. Quien
 *   entra como invitado (o ya tiene sesión de invitado) nunca lo descarga.
 *   Un `import` estático arriba lo metería en el bundle inicial y retrasaría el
 *   primer frame del juego — justo lo contrario de "mobile-first".
 *
 * REDIRECT vs POPUP:
 *   Se usa POPUP por defecto. `signInWithRedirect` depende de cookies de tercero
 *   contra `<proyecto>.firebaseapp.com`; Safari (ITP) y Chrome las bloquean, y el
 *   usuario vuelve del redirect SIN sesión y sin ningún error visible. Si el
 *   navegador bloquea la ventana emergente, se cae a redirect como plan B.
 *   Ver docs/AUTH.md → "Dominio propio".
 * -----------------------------------------------------------------------------
 */

import { firebaseConfig, isFirebaseConfigured } from './authConfig.js'
import { authError } from './authErrors.js'
import { profileFromFirebaseUser } from './userProfile.js'

/** Promesa cacheada: el SDK se carga e inicializa UNA sola vez por sesión. */
let sdkPromise = null

/**
 * Carga e inicializa Firebase App + Auth. Devuelve `{ auth, fns }` donde `fns`
 * son las funciones sueltas del SDK modular (v9+), que no cuelgan del objeto
 * `auth` sino que se importan por separado.
 */
function loadSdk() {
  if (!isFirebaseConfigured) return Promise.reject(authError('dinocolor/not-configured'))
  if (sdkPromise) return sdkPromise

  sdkPromise = (async () => {
    const [{ initializeApp, getApps, getApp }, authMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ])
    // getApps(): en desarrollo, el HMR de Vite puede re-ejecutar este módulo;
    // `initializeApp` dos veces con el mismo nombre lanza.
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const auth = authMod.getAuth(app)
    // El idioma de las pantallas de Google/Apple sigue al del dispositivo.
    auth.useDeviceLanguage()
    return { auth, fns: authMod }
  })().catch((err) => {
    // No cachear un fallo de red: el siguiente intento debe poder reintentar.
    sdkPromise = null
    if (err && err.code) throw err
    throw authError('dinocolor/load-failed')
  })

  return sdkPromise
}

/** Construye el objeto de proveedor OAuth con los scopes correctos. */
function buildProvider(fns, kind) {
  if (kind === 'google') {
    const provider = new fns.GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    // `select_account`: si el jugador tiene varias cuentas de Google, que elija.
    // Sin esto Google entra con la última usada sin preguntar, y cambiar de
    // cuenta se vuelve imposible desde el juego.
    provider.setCustomParameters({ prompt: 'select_account' })
    return provider
  }
  if (kind === 'apple') {
    // Apple no tiene clase propia: se usa OAuthProvider con el id 'apple.com'.
    const provider = new fns.OAuthProvider('apple.com')
    // Apple solo entrega nombre y correo LA PRIMERA VEZ que el usuario acepta.
    // Si no se piden aquí, no hay forma de recuperarlos después.
    provider.addScope('email')
    provider.addScope('name')
    return provider
  }
  throw authError('dinocolor/provider-unavailable')
}

/** ¿El fallo del popup justifica reintentar por redirect? */
function shouldFallbackToRedirect(err) {
  const code = err && err.code
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment'
  )
}

/**
 * Entrada con proveedor externo (Google / Apple).
 * @returns {Promise<object|null>} perfil, o null si se fue por redirect (en ese
 * caso la página se recarga y el resultado lo recoge `resolveRedirect`).
 */
export async function signInWithProvider(kind) {
  const { auth, fns } = await loadSdk()
  const provider = buildProvider(fns, kind)
  try {
    const cred = await fns.signInWithPopup(auth, provider)
    return profileFromFirebaseUser(cred.user, kind)
  } catch (err) {
    if (shouldFallbackToRedirect(err)) {
      await fns.signInWithRedirect(auth, provider)
      return null // la navegación se lleva la página por delante
    }
    throw err
  }
}

/**
 * Recoge el resultado de un `signInWithRedirect` pendiente. Se llama UNA vez al
 * arrancar. Si no había redirect en curso devuelve null (caso normal).
 */
export async function resolveRedirect() {
  const { auth, fns } = await loadSdk()
  const result = await fns.getRedirectResult(auth)
  return result ? profileFromFirebaseUser(result.user) : null
}

/** Registro con correo y contraseña. `displayName` es opcional. */
export async function registerWithEmail(email, password, displayName) {
  const { auth, fns } = await loadSdk()
  const cred = await fns.createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await fns.updateProfile(cred.user, { displayName })
    // updateProfile NO refresca el objeto que ya tenemos en memoria: sin
    // reload(), el perfil recién creado se quedaría sin nombre hasta la
    // siguiente sesión.
    await cred.user.reload()
  }
  return profileFromFirebaseUser(auth.currentUser || cred.user, 'password')
}

/** Inicio de sesión con correo y contraseña. */
export async function signInWithEmail(email, password) {
  const { auth, fns } = await loadSdk()
  const cred = await fns.signInWithEmailAndPassword(auth, email, password)
  return profileFromFirebaseUser(cred.user, 'password')
}

/** Envía el correo de restablecimiento de contraseña. */
export async function sendPasswordReset(email) {
  const { auth, fns } = await loadSdk()
  await fns.sendPasswordResetEmail(auth, email)
}

/** Cierra la sesión de Firebase (no toca el progreso local del juego). */
export async function signOutFirebase() {
  const { auth, fns } = await loadSdk()
  await fns.signOut(auth)
}

/**
 * Suscribe a los cambios de sesión de Firebase. Es la FUENTE DE VERDAD: cubre
 * la restauración de sesión al recargar, la expiración del token y el cierre de
 * sesión desde otra pestaña.
 * @returns {Promise<() => void>} función para desuscribirse
 */
export async function observeSession(onChange) {
  const { auth, fns } = await loadSdk()
  return fns.onAuthStateChanged(auth, (user) => {
    onChange(user ? profileFromFirebaseUser(user) : null)
  })
}
