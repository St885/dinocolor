/**
 * useGameLoop.js
 * -----------------------------------------------------------------------------
 * El CORAZÓN de DinoColor. Orquesta una partida de un nivel:
 *   - mantiene qué pelotas están iluminadas (según activeBalls del nivel)
 *   - ilumina pelotas nuevas y hace expirar (fallar) las que no se pulsan a tiempo
 *   - aplica la puntuación (aciertos, combos, penalizaciones) usando scoringSystem
 *   - detecta victoria (puntuación objetivo) y derrota (tiempo agotado)
 *   - soporta PAUSA real (congela simulación y cronómetro)
 *   - reproduce los sonidos correspondientes
 *
 * La simulación rápida vive en refs (no provoca renders); el estado para la UI se
 * "sincroniza" a React tras cada cambio. Las pelotas iluminadas se animan en el
 * propio componente 3D con useFrame, así que no necesitamos render por frame aquí.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getLayout } from '../data/boardLayouts.js'
import {
  computeHitScore,
  wrongTapPenalty,
  missPenalty,
} from '../systems/scoringSystem.js'
import { Sounds } from '../systems/audioSystem.js'
import { useTimer } from './useTimer.js'
import { pick } from '../utils/random.js'

const TICK_MS = 90 // frecuencia de actualización de la simulación de luces

const now = () =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now()

/**
 * Contador monótono para las `key` de los eventos de feedback.
 * Antes se usaba el timestamp (y en los fallos `timestamp + puntuación`), lo que
 * podía repetir la misma key en dos eventos distintos: la animación del popup no se
 * reiniciaba y el jugador se perdía un "+100" o un "¡FALLO!".
 */
let eventSeq = 0
const nextEventKey = () => ++eventSeq

const freshSim = () => ({
  lights: new Map(), // cellId -> { activatedAt, expireAt }
  score: 0,
  combo: 0,
  bestCombo: 0,
  hits: 0,
  misses: 0,
  finished: false,
})

export function useGameLoop({ level, onFinish }) {
  // Memoizado por forma: mantiene una identidad estable del layout entre renders, así
  // Board3D no reconstruye su geometría (THREE.Shape) al cambiar la puntuación.
  const layout = useMemo(() => getLayout(level.layout), [level.layout])

  // --- Estado mutable de la simulación (no provoca renders) ---
  const sim = useRef(freshSim())

  // --- Estado espejo para la UI ---
  const [status, setStatus] = useState('playing') // 'playing' | 'won' | 'lost'
  const [paused, setPaused] = useState(false)
  const [activeIds, setActiveIds] = useState(() => new Set())
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [lastEvent, setLastEvent] = useState(null) // feedback visual puntual

  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  // Vuelca el estado de la simulación a React.
  const sync = useCallback(() => {
    const s = sim.current
    setActiveIds(new Set(s.lights.keys()))
    setScore(s.score)
    setCombo(s.combo)
    setHits(s.hits)
    setMisses(s.misses)
  }, [])

  const finish = useCallback(
    (outcome) => {
      const s = sim.current
      if (s.finished) return
      s.finished = true
      // Apagar el tablero: si no, las pelotas se quedaban encendidas durante la
      // transición a la pantalla de resultado (y seguían pareciendo pulsables).
      s.lights.clear()
      setActiveIds(new Set())
      setStatus(outcome)
      onFinishRef.current &&
        onFinishRef.current({
          outcome, // 'won' | 'lost'
          levelId: level.id,
          score: s.score,
          hits: s.hits,
          misses: s.misses,
          bestCombo: s.bestCombo,
          targetScore: level.targetScore,
        })
    },
    [level.id, level.targetScore],
  )

  // --- Reinicio al (re)entrar a un nivel ---
  useEffect(() => {
    sim.current = freshSim()
    setStatus('playing')
    setPaused(false)
    setLastEvent(null)
    sync()
    // Reaccionamos al id del nivel: cada nivel es una partida nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id])

  // "Vivo" = jugando y sin pausar. Congela simulación y cronómetro a la vez.
  const live = status === 'playing' && !paused

  // --- Bucle de simulación de luces ---
  useEffect(() => {
    if (!live) return undefined

    const allCellIds = layout.cells.map((c) => c.id)

    const tick = () => {
      const s = sim.current
      if (s.finished) return
      const t = now()
      let changed = false
      let expired = 0

      // 1) Expirar pelotas no pulsadas a tiempo -> fallo
      for (const [cellId, light] of s.lights) {
        if (t >= light.expireAt) {
          s.lights.delete(cellId)
          s.score = Math.max(0, s.score - missPenalty())
          s.combo = 0
          s.misses += 1
          expired += 1
          changed = true
        }
      }
      if (expired > 0) {
        // Un solo sonido y un solo popup aunque expiren varias a la vez (antes se
        // solapaban N zumbidos y solo sobrevivía el último evento del bucle).
        Sounds.miss()
        setLastEvent({ type: 'miss', count: expired, key: nextEventKey() })
      }

      // 2) Rellenar hasta activeBalls con celdas libres
      const target = Math.min(level.activeBalls, allCellIds.length)
      while (s.lights.size < target) {
        const free = allCellIds.filter((id) => !s.lights.has(id))
        if (free.length === 0) break
        s.lights.set(pick(free), {
          activatedAt: t,
          expireAt: t + level.reactionTime * 1000,
        })
        changed = true
      }

      if (changed) sync()
    }

    // Primer tick inmediato para que el tablero no arranque vacío.
    tick()
    const intervalId = setInterval(tick, TICK_MS)
    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, level.id])

  // --- Timer de la partida ---
  const handleExpire = useCallback(() => {
    const s = sim.current
    if (s.finished) return
    finish(s.score >= level.targetScore ? 'won' : 'lost')
  }, [finish, level.targetScore])

  const { timeLeft, progress: timeProgress } = useTimer({
    duration: level.totalTime,
    running: live,
    onExpire: handleExpire,
  })

  // --- Interacción: el jugador pulsa una pelota ---
  const onBallTap = useCallback(
    (cellId) => {
      const s = sim.current
      if (s.finished || !live) return
      const t = now()

      if (s.lights.has(cellId)) {
        // ACIERTO
        const light = s.lights.get(cellId)
        s.lights.delete(cellId)
        s.combo += 1
        if (s.combo > s.bestCombo) s.bestCombo = s.combo
        const { points, fast, multiplier } = computeHitScore(
          t - light.activatedAt,
          level.reactionTime,
          s.combo,
        )
        s.score += points
        s.hits += 1
        if (fast || s.combo >= 3) Sounds.combo()
        else Sounds.hit()
        setLastEvent({
          type: 'hit',
          points,
          combo: s.combo,
          fast,
          multiplier,
          key: nextEventKey(),
        })
        sync()
        if (s.score >= level.targetScore) finish('won')
      } else {
        // FALLO: pulsar una pelota apagada
        s.score = Math.max(0, s.score - wrongTapPenalty(level))
        s.combo = 0
        s.misses += 1
        Sounds.miss()
        setLastEvent({ type: 'wrong', key: nextEventKey() })
        sync()
      }
    },
    [live, level, finish, sync],
  )

  const pause = useCallback(() => setPaused(true), [])
  const resume = useCallback(() => setPaused(false), [])

  return {
    layout,
    status,
    paused,
    pause,
    resume,
    activeIds,
    score,
    combo,
    hits,
    misses,
    lastEvent,
    timeLeft,
    timeProgress,
    scoreProgress: Math.min(1, score / level.targetScore),
    onBallTap,
  }
}

export default useGameLoop
