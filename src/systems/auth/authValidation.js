/**
 * authValidation.js
 * -----------------------------------------------------------------------------
 * Validación PURA de los campos del formulario de acceso. Sin React, sin red y
 * sin efectos: se puede razonar (y probar) sobre ella de forma aislada, igual que
 * `scoringSystem.js`.
 *
 * Es validación de UX, no de seguridad: la autoridad real es Firebase (y sus
 * reglas). Sirve para dar un mensaje CLARO antes de gastar una llamada de red y
 * para no enviar basura al proveedor.
 * -----------------------------------------------------------------------------
 */

/** Tope defensivo: nada que un humano escriba de verdad se acerca a esto. */
const MAX_EMAIL = 254 // longitud máxima real de una dirección (RFC 5321)
const MAX_PASSWORD = 128
const MIN_PASSWORD = 8 // Firebase exige 6; subimos el listón en el cliente
const MAX_NAME = 24

/**
 * Comprobación de email deliberadamente simple: algo@algo.algo, sin espacios.
 * Las regex "completas" de RFC 5322 son enormes y rechazan direcciones válidas;
 * quien decide de verdad si el email existe es el proveedor.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** @returns {string|null} mensaje de error, o null si es válido. */
export function validateEmail(value) {
  const email = String(value || '').trim()
  if (!email) return 'Escribe tu correo electrónico.'
  if (email.length > MAX_EMAIL) return 'Ese correo es demasiado largo.'
  if (!EMAIL_RE.test(email)) return 'Ese correo no parece válido. Ejemplo: dino@correo.com'
  return null
}

/**
 * Contraseña para REGISTRO: mínimo 8 caracteres y que mezcle letras y números.
 * No exigimos símbolos: en un juego infantil, una regla imposible de recordar
 * hace más daño (contraseñas apuntadas en un papel) que bien.
 */
export function validateNewPassword(value) {
  const pw = String(value || '')
  if (!pw) return 'Escribe una contraseña.'
  if (pw.length < MIN_PASSWORD) return `Usa al menos ${MIN_PASSWORD} caracteres.`
  if (pw.length > MAX_PASSWORD) return 'Esa contraseña es demasiado larga.'
  if (!/[a-zA-Z]/.test(pw)) return 'Añade alguna letra.'
  if (!/[0-9]/.test(pw)) return 'Añade algún número.'
  return null
}

/**
 * Contraseña para INICIAR SESIÓN: solo comprobamos que no esté vacía. Aplicar
 * aquí las reglas de registro sería un error: quien se registró con una
 * contraseña antigua y más débil no podría volver a entrar en su propia cuenta.
 */
export function validatePassword(value) {
  const pw = String(value || '')
  if (!pw) return 'Escribe tu contraseña.'
  if (pw.length > MAX_PASSWORD) return 'Esa contraseña es demasiado larga.'
  return null
}

/** Nombre visible (opcional en el registro: si falta, se deriva del email). */
export function validateDisplayName(value, { required = false } = {}) {
  const name = String(value || '').trim()
  if (!name) return required ? 'Escribe cómo quieres que te llamemos.' : null
  if (name.length > MAX_NAME) return `Usa como mucho ${MAX_NAME} caracteres.`
  return null
}

/** Fuerza aproximada (0–3) para el medidor visual del registro. */
export function passwordStrength(value) {
  const pw = String(value || '')
  if (pw.length < MIN_PASSWORD) return 0
  let score = 1
  if (/[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)) score += 1
  if (pw.length >= 12 || /[^a-zA-Z0-9]/.test(pw)) score += 1
  return score
}

export const PASSWORD_MIN_LENGTH = MIN_PASSWORD
