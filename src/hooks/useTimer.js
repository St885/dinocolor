/**
 * useTimer.js
 * -----------------------------------------------------------------------------
 * Cuenta atrás reutilizable basada en requestAnimationFrame (suave para la barra
 * de tiempo). No usa setInterval para no acumular desfase.
 *
 * @param {object} opts
 * @param {number}  opts.duration  duración total en segundos
 * @param {boolean} opts.running   si la cuenta atrás está activa
 * @param {Function} opts.onExpire callback al llegar a 0 (se llama una sola vez)
 * @returns {{ timeLeft:number, progress:number, reset:Function }}
 *          timeLeft = segundos restantes (float), progress = 0..1 restante.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, useCallback } from 'react'

export function useTimer({ duration, running, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const startRef = useRef(null)
  const rafRef = useRef(null)
  const firedRef = useRef(false)
  const onExpireRef = useRef(onExpire)

  // Mantener la referencia del callback fresca sin reiniciar el efecto.
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const reset = useCallback(() => {
    startRef.current = null
    firedRef.current = false
    setTimeLeft(duration)
  }, [duration])

  // Reiniciar cuando cambia la duración (nuevo nivel).
  useEffect(() => {
    reset()
  }, [reset])

  // Pausa "justa" en segundo plano: el rAF se congela mientras la pestaña/app está
  // oculta. Al ocultarse soltamos el anclaje para que, al volver, NO se descuente el
  // tiempo que el juego estuvo en background (se reancla desde el timeLeft conservado).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisibility = () => {
      if (document.hidden) startRef.current = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!running) {
      // Al pausar, "congelamos" el inicio para reanudar sin saltos.
      startRef.current = null
      return
    }

    const tick = (now) => {
      if (startRef.current === null) {
        // Anclar el inicio considerando el tiempo ya consumido.
        startRef.current = now - (duration - timeLeft) * 1000
      }
      const elapsed = (now - startRef.current) / 1000
      const remaining = Math.max(0, duration - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0) {
        if (!firedRef.current) {
          firedRef.current = true
          onExpireRef.current && onExpireRef.current()
        }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // timeLeft se omite a propósito: solo se lee al re-anclar tras pausa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, duration])

  const progress = duration > 0 ? timeLeft / duration : 0
  return { timeLeft, progress, reset }
}

export default useTimer
