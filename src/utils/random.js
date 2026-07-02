/**
 * random.js — utilidades de aleatoriedad.
 */

/** Entero aleatorio en [min, max] (ambos incluidos). */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Elige un elemento aleatorio de un array. */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Devuelve una copia barajada (Fisher–Yates) sin mutar el original. */
export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Toma n elementos distintos al azar de un array. */
export function sampleN(arr, n) {
  return shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)))
}
