/**
 * authErrors.js
 * -----------------------------------------------------------------------------
 * Traduce los códigos de error de Firebase Auth a mensajes en español, con el
 * tono del juego. Función PURA: entra un error, sale una cadena.
 *
 * Por qué existe: los códigos crudos ("auth/invalid-credential") no le dicen NADA
 * al jugador, y el mensaje en inglés que trae el SDK rompe el idioma del juego.
 *
 * Regla de seguridad: en los fallos de credenciales NO se distingue entre "ese
 * correo no existe" y "la contraseña es incorrecta". Hacerlo convierte el
 * formulario en un detector de cuentas registradas (enumeración de usuarios).
 * Firebase, de hecho, ya unifica ambos casos en `auth/invalid-credential` cuando
 * la protección de enumeración está activada.
 * -----------------------------------------------------------------------------
 */

const MESSAGES = {
  // --- Credenciales -------------------------------------------------------
  'auth/invalid-credential': 'Correo o contraseña incorrectos. Inténtalo de nuevo.',
  'auth/wrong-password': 'Correo o contraseña incorrectos. Inténtalo de nuevo.',
  'auth/user-not-found': 'Correo o contraseña incorrectos. Inténtalo de nuevo.',
  'auth/invalid-email': 'Ese correo no parece válido.',
  'auth/user-disabled': 'Esta cuenta está desactivada.',

  // --- Registro -----------------------------------------------------------
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
  'auth/weak-password': 'Esa contraseña es muy débil. Usa al menos 8 caracteres.',

  // --- Proveedores externos ----------------------------------------------
  'auth/popup-closed-by-user': 'Cerraste la ventana antes de terminar.',
  'auth/cancelled-popup-request': 'Se canceló el intento anterior.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana. Permite las ventanas emergentes.',
  'auth/operation-not-allowed': 'Ese método de acceso aún no está activado.',
  'auth/operation-not-supported-in-this-environment':
    'Este método no funciona en este navegador.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado para iniciar sesión.',
  'auth/account-exists-with-different-credential':
    'Ya usaste otro método con ese correo. Entra con el que usaste la primera vez.',

  // --- Red / límites ------------------------------------------------------
  'auth/network-request-failed': 'Sin conexión. Comprueba tu internet e inténtalo otra vez.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a probar.',
  'auth/internal-error': 'Algo falló por nuestro lado. Inténtalo otra vez.',

  // --- Propios del proyecto ----------------------------------------------
  'dinocolor/not-configured':
    'El acceso con cuenta todavía no está configurado. Puedes jugar como invitado.',
  'dinocolor/provider-unavailable': 'Ese método de acceso no está disponible ahora mismo.',
  'dinocolor/load-failed': 'No se pudo cargar el sistema de acceso. Revisa tu conexión.',
  'dinocolor/csp-blocked':
    'El navegador bloqueó el login de Google por una política de seguridad. Revisa la CSP.',
}

/** Mensaje genérico: nunca se enseña un stack trace ni el código crudo. */
const FALLBACK = 'No hemos podido completar la operación. Inténtalo de nuevo.'

/**
 * @param {unknown} error error de Firebase (o cualquier cosa)
 * @returns {string} mensaje listo para enseñar al jugador
 */
export function authErrorMessage(error) {
  const code = error && typeof error === 'object' ? error.code : null
  const base = typeof code === 'string' && MESSAGES[code] ? MESSAGES[code] : FALLBACK
  // En DESARROLLO se añade el detalle técnico que traiga el error (qué directiva
  // bloqueó qué origen, por ejemplo). En producción NUNCA: al jugador no le sirve
  // y es la clase de dato que acaba en una captura de pantalla. `technical` lo
  // rellena quien crea el error, y solo con datos de configuración — jamás con
  // correos, tokens ni nada de la cuenta.
  if (import.meta.env.DEV && error && typeof error === 'object' && error.technical) {
    return `${base} [${error.technical}]`
  }
  return base
}

/**
 * Errores que NO merecen pintarse en rojo: el jugador simplemente cerró la
 * ventana del proveedor o cambió de idea. Tratarlos como fallo es agresivo.
 */
export function isCancellation(error) {
  const code = error && typeof error === 'object' ? error.code : null
  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/user-cancelled'
  )
}

/**
 * Construye un error propio con código, para que lo traduzca el mismo mapa.
 * `technical` es opcional y SOLO se enseña en desarrollo (ver authErrorMessage).
 */
export function authError(code, technical) {
  const err = new Error(MESSAGES[code] || FALLBACK)
  err.code = code
  if (technical) err.technical = technical
  return err
}
