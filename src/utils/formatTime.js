/**
 * formatTime.js — formateo de tiempo para la UI.
 */

/**
 * Formatea segundos como "m:ss" (p. ej. 30 -> "0:30", 95 -> "1:35").
 * Redondea hacia arriba para que el contador no muestre 0 mientras aún queda tiempo.
 */
export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${rem.toString().padStart(2, '0')}`
}

/** Solo los segundos como entero (para HUD compacto). */
export function formatSeconds(seconds) {
  return String(Math.max(0, Math.ceil(seconds)))
}
