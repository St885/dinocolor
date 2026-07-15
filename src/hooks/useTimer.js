/**
 * useTimer.js
 * -----------------------------------------------------------------------------
 * Cuenta atrás reutilizable basada en requestAnimationFrame (no acumula desfase).
 *
 * RENDIMIENTO — separación de estado visual y de gameplay:
 *   El valor EXACTO (float) vive en refs y se actualiza cada frame SIN provocar
 *   renders. A React solo se le avisa cuando cambia el SEGUNDO MOSTRADO, o sea
 *   1 vez por segundo en vez de 60. La barra de tiempo se interpola con una
 *   transición CSS lineal de 1s, así que se sigue viendo continua.
 *
 * @param {object} opts
 * @param {number}   opts.duration  duración total en segundos
 * @param {boolean}  opts.running   si la cuenta atrás está activa
 * @param {Function} opts.onExpire  callback al llegar a 0 (se llama una sola vez)
 * @returns {{ timeLeft:number, progress:number, timeLeftRef:object, reset:Function }}
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, useCallback } from 'react'

export function useTimer({ duration, running, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(duration)

  // Valor exacto vivo. Es la ÚNICA fuente de verdad del tiempo restante; el estado
  // de React es solo un espejo redondeado para pintar.
  const timeLeftRef = useRef(duration)
  const shownRef = useRef(Math.ceil(duration))

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
    timeLeftRef.current = duration
    shownRef.current = Math.ceil(duration)
    setTimeLeft(duration)
  }, [duration])

  // Reiniciar cuando cambia la duración (nuevo nivel).
  useEffect(() => {
    reset()
  }, [reset])

  // Pausa "justa" en segundo plano: el rAF se congela mientras la pestaña/app está
  // oculta. Al ocultarse soltamos el anclaje para que, al volver, NO se descuente el
  // tiempo que el juego estuvo en background: se reancla desde timeLeftRef.
  //
  // BUG CORREGIDO: antes se reanclaba leyendo `timeLeft` del closure del efecto, que
  // estaba CONGELADO en su valor inicial (deps: [running, duration]). Resultado: al
  // volver de segundo plano el cronómetro se reiniciaba a la duración COMPLETA —
  // tiempo infinito minimizando y restaurando la app. Ahora se lee de la ref viva.
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
      // Al pausar, "soltamos" el anclaje para reanudar sin saltos de tiempo.
      startRef.current = null
      return undefined
    }

    const tick = (now) => {
      if (startRef.current === null) {
        // Anclar considerando el tiempo YA consumido (ref viva, nunca el closure).
        startRef.current = now - (duration - timeLeftRef.current) * 1000
      }
      const elapsed = (now - startRef.current) / 1000
      const remaining = Math.max(0, duration - elapsed)
      timeLeftRef.current = remaining

      // Solo re-renderizamos cuando cambia el segundo que se ve en pantalla.
      const shown = Math.ceil(remaining)
      if (shown !== shownRef.current) {
        shownRef.current = shown
        setTimeLeft(remaining)
      }

      if (remaining <= 0) {
        if (!firedRef.current) {
          firedRef.current = true
          setTimeLeft(0)
          onExpireRef.current && onExpireRef.current()
        }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [running, duration])

  const progress = duration > 0 ? Math.max(0, Math.min(1, timeLeft / duration)) : 0
  return { timeLeft, progress, timeLeftRef, reset }
}

export default useTimer
